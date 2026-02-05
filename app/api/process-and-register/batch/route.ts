import { NextResponse } from "next/server"
import crypto from "crypto"
import { cleanMedicalText } from "@/lib/clean/medical-text"
import { extractPatientData } from "@/lib/parsers/patient"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  DEFAULT_SUPABASE,
  createDataSupabaseClient,
  getOrCreateAuthUser,
  slugifyName,
} from "@/lib/process-and-register"

interface BatchItemPayload {
  rawText: string
  sourceName?: string
}

interface BatchPayload {
  items: BatchItemPayload[]
  debugLogin?: boolean
}

interface BatchItemResult {
  index: number
  sourceName?: string
  status: "created" | "duplicate" | "error"
  message?: string
  patientId?: string
  documentId?: string
  hashSha256?: string
  credentials?: {
    loginName?: string
    password?: string
    existing?: boolean
  }
}

const MAX_BATCH_SIZE = 100

export async function POST(request: Request) {
  try {
    const body: BatchPayload = await request.json()
    const { items, debugLogin = true } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items deve ser um array com pelo menos 1 relatório" }, { status: 400 })
    }

    if (items.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Limite de ${MAX_BATCH_SIZE} relatórios por requisição` },
        { status: 400 },
      )
    }

    const prepared = items.map((item, index) => {
      if (!item?.rawText || typeof item.rawText !== "string") {
        return {
          index,
          sourceName: item?.sourceName,
          error: "rawText é obrigatório e deve ser uma string",
        }
      }

      const { cleanText, logs } = cleanMedicalText(item.rawText)
      const parsed = extractPatientData(cleanText)
      const missing = parsed.missing ?? []

      if (missing.length > 0) {
        return {
          index,
          sourceName: item.sourceName,
          cleanText,
          logs,
          parsed,
          error: "Não foi possível extrair nome completo e data de nascimento do relatório",
        }
      }

      const hashSha256 = crypto.createHash("sha256").update(cleanText).digest("hex")
      return {
        index,
        sourceName: item.sourceName,
        cleanText,
        logs,
        parsed,
        hashSha256,
      }
    })

    const dataSupabase = createDataSupabaseClient()

    let supabase
    try {
      supabase = createAdminClient()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao inicializar cliente admin"
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const hashes = prepared
      .filter((item) => item.hashSha256)
      .map((item) => item.hashSha256 as string)

    const existingHashes = new Map<string, { id: string; patient_id: string; file_name: string | null }>()
    const seenHashes = new Set<string>()
    if (hashes.length > 0) {
      const { data: existingDocs, error: existingDocsError } = await dataSupabase
        .from("documents")
        .select("id, patient_id, file_name, hash_sha256")
        .in("hash_sha256", hashes)

      if (existingDocsError) {
        return NextResponse.json(
          { error: `Erro ao verificar relatórios existentes: ${existingDocsError.message}` },
          { status: 500 },
        )
      }

      existingDocs?.forEach((doc) => {
        if (doc.hash_sha256) {
          existingHashes.set(doc.hash_sha256, {
            id: doc.id,
            patient_id: doc.patient_id,
            file_name: doc.file_name,
          })
        }
      })
    }

    const results: BatchItemResult[] = []

    for (const item of prepared) {
      if ("error" in item && item.error) {
        results.push({
          index: item.index,
          sourceName: item.sourceName,
          status: "error",
          message: item.error,
        })
        continue
      }

      const hash = item.hashSha256 as string
      if (seenHashes.has(hash)) {
        results.push({
          index: item.index,
          sourceName: item.sourceName,
          status: "duplicate",
          message: "Relatório duplicado no próprio lote (hash_sha256)",
          hashSha256: hash,
        })
        continue
      }
      seenHashes.add(hash)

      const duplicate = existingHashes.get(hash)
      if (duplicate) {
        results.push({
          index: item.index,
          sourceName: item.sourceName,
          status: "duplicate",
          message: "Relatório já existe no banco (hash_sha256)",
          patientId: duplicate.patient_id,
          documentId: duplicate.id,
          hashSha256: hash,
        })
        continue
      }

      const parsed = item.parsed!
      const password = parsed.birthDate!.replace(/-/g, "")
      const loginEmail = `${slugifyName(parsed.fullName!)}@patients.local`

      const authUser = await getOrCreateAuthUser(supabase, loginEmail, password)

      if (debugLogin) {
        const { error: debugAuthError } = await dataSupabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        })

        if (debugAuthError) {
          results.push({
            index: item.index,
            sourceName: item.sourceName,
            status: "error",
            message: `Falha ao autenticar com as credenciais geradas: ${debugAuthError.message}`,
          })
          continue
        }
      }

      const { data: existingPatient, error: existingPatientError } = await dataSupabase
        .from("patients")
        .select("id, full_name, cpf, birth_date")
        .eq("full_name", parsed.fullName)
        .eq("birth_date", parsed.birthDate)
        .maybeSingle()

      if (existingPatientError) {
        results.push({
          index: item.index,
          sourceName: item.sourceName,
          status: "error",
          message: `Erro ao verificar paciente existente: ${existingPatientError.message}`,
        })
        continue
      }

      let patientRecord = {
        id: authUser.id,
        full_name: parsed.fullName!,
        cpf: null as string | null,
        birth_date: parsed.birthDate!,
      }
      let patientExists = false

      if (existingPatient) {
        patientExists = true

        if (existingPatient.id !== authUser.id) {
          const { error: updatePatientIdError } = await dataSupabase
            .from("patients")
            .update({ id: authUser.id })
            .eq("id", existingPatient.id)

          if (updatePatientIdError) {
            results.push({
              index: item.index,
              sourceName: item.sourceName,
              status: "error",
              message: `Erro ao alinhar paciente ao usuário de login: ${updatePatientIdError.message}`,
            })
            continue
          }

          const { error: updateDocsError } = await dataSupabase
            .from("documents")
            .update({ patient_id: authUser.id })
            .eq("patient_id", existingPatient.id)

          if (updateDocsError) {
            results.push({
              index: item.index,
              sourceName: item.sourceName,
              status: "error",
              message: `Paciente realinhado, mas falha ao atualizar documentos: ${updateDocsError.message}`,
            })
            continue
          }
        }

        patientRecord = { ...existingPatient, id: authUser.id }
      } else {
        const { error: patientError } = await dataSupabase.from("patients").insert({
          id: authUser.id,
          full_name: parsed.fullName,
          cpf: null,
          birth_date: parsed.birthDate,
          first_access: true,
          source_name: item.sourceName || null,
        })

        if (patientError && patientError.code !== "23505") {
          results.push({
            index: item.index,
            sourceName: item.sourceName,
            status: "error",
            message: `Erro ao criar paciente: ${patientError.message}`,
          })
          continue
        }
      }

      const documentName = item.sourceName || `${patientRecord.full_name || "paciente"}.txt`

      const { data: document, error: documentError } = await dataSupabase
        .from("documents")
        .insert({
          patient_id: authUser.id,
          file_name: documentName,
          clean_text: item.cleanText,
          hash_sha256: item.hashSha256,
        })
        .select("id, patient_id, file_name, clean_text, hash_sha256, pdf_url")
        .single()

      if (documentError) {
        results.push({
          index: item.index,
          sourceName: item.sourceName,
          status: "error",
          message: `Falha ao registrar relatório processado: ${documentError.message}`,
        })
        continue
      }

      results.push({
        index: item.index,
        sourceName: item.sourceName,
        status: "created",
        patientId: patientRecord.id,
        documentId: document.id,
        hashSha256: item.hashSha256,
        credentials: {
          loginName: parsed.fullName,
          password,
          existing: patientExists,
        },
      })
    }

    const created = results.filter((item) => item.status === "created").length
    const duplicates = results.filter((item) => item.status === "duplicate").length
    const failed = results.filter((item) => item.status === "error").length

    return NextResponse.json(
      {
        results,
        summary: {
          total: results.length,
          created,
          duplicates,
          failed,
        },
        supabaseUrl: DEFAULT_SUPABASE.url,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Erro ao processar lote de relatórios:", error)
    const message = error instanceof Error ? error.message : "Falha ao processar lote de relatórios"
    const isPermissionIssue =
      message.toLowerCase().includes("not allowed") || message.toLowerCase().includes("permission")

    return NextResponse.json(
      {
        error: message,
        suggestion: isPermissionIssue
          ? "Garanta que SUPABASE_SERVICE_ROLE_KEY (service_role) esteja configurada para permitir operações administrativas"
          : undefined,
      },
      { status: 500 },
    )
  }
}
