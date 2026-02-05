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

interface ProcessPayload {
  rawText: string
  sourceName?: string
  debugLogin?: boolean
}

export async function POST(request: Request) {
  try {
    const body: ProcessPayload = await request.json()
    const { rawText, sourceName, debugLogin = true } = body
    console.log("[process] rawText recebido:", rawText)
    console.log("[process] sourceName:", sourceName)
    if (!rawText || typeof rawText !== "string") {
      return NextResponse.json({ error: "rawText é obrigatório e deve ser uma string" }, { status: 400 })
    }

    const { cleanText, logs } = cleanMedicalText(rawText)
    const parsed = extractPatientData(cleanText)
    console.log("[process] parsed result:", parsed)
    console.log("[process] cleanText:", cleanText)
    console.log("[process] cleanMedicalText logs:", logs)
    if (parsed.missing.length > 0) {
      return NextResponse.json(
        {
          cleanText,
          logs,
          missing: parsed.missing,
          error: "Não foi possível extrair nome completo e data de nascimento do relatório",
        },
        { status: 422 },
      )
    }

    const supabaseUrl = DEFAULT_SUPABASE.url
    const dataSupabase = createDataSupabaseClient()

    let supabase
    try {
      supabase = createAdminClient()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao inicializar cliente admin"
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const password = parsed.birthDate!.replace(/-/g, "")
    const loginEmail = `${slugifyName(parsed.fullName!)}@patients.local`
    const authUser = await getOrCreateAuthUser(supabase, loginEmail, password)

    if (debugLogin) {
      const { error: debugAuthError } = await dataSupabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (debugAuthError) {
        return NextResponse.json(
          {
            error: "Falha ao autenticar com as credenciais geradas",
            detail: debugAuthError.message,
            loginEmail,
            password,
            supabaseUrl,
          },
          { status: 500 },
        )
      }
    }

    const { data: existingPatient, error: existingPatientError } = await dataSupabase
      .from("patients")
      .select("id, full_name, cpf, birth_date")
      .eq("full_name", parsed.fullName)
      .eq("birth_date", parsed.birthDate)
      .maybeSingle()
    if (existingPatientError) {
      return NextResponse.json(
        { error: `Erro ao verificar paciente existente: ${existingPatientError.message}` },
        { status: 500 },
      )
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

      // Garante que o usuário do Auth está alinhado e com senha atualizada
      if (existingPatient.id !== authUser.id) {
        // Realinha o ID do paciente ao usuário de auth encontrado/criado
        const { error: updatePatientIdError } = await dataSupabase
          .from("patients")
          .update({ id: authUser.id })
          .eq("id", existingPatient.id)

        if (updatePatientIdError) {
          return NextResponse.json(
            { error: `Erro ao alinhar paciente ao usuário de login: ${updatePatientIdError.message}` },
            { status: 500 },
          )
        }

        // Move documentos já existentes para o novo ID do paciente
        const { error: updateDocsError } = await dataSupabase
          .from("documents")
          .update({ patient_id: authUser.id })
          .eq("patient_id", existingPatient.id)

        if (updateDocsError) {
          return NextResponse.json(
            { error: `Paciente realinhado, mas falha ao atualizar documentos: ${updateDocsError.message}` },
            { status: 500 },
          )
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
        source_name: sourceName || null,
      })

      if (patientError && patientError.code !== "23505") {
        throw patientError
      }
    }

    const documentName = sourceName || `${patientRecord.full_name || "paciente"}.txt`
    const hashSha256 = crypto.createHash("sha256").update(cleanText).digest("hex")

    const { data: document, error: documentError } = await dataSupabase
      .from("documents")
      .insert({
        patient_id: authUser.id,
        file_name: documentName,
        clean_text: cleanText,
        hash_sha256: hashSha256,
      })
      .select("id, patient_id, file_name, clean_text, hash_sha256, pdf_url")
      .single()

    if (documentError) {
      return NextResponse.json(
        { error: `Falha ao registrar relatório processado: ${documentError.message}` },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        cleanText,
        logs,
        patient: patientRecord,
        document,
        credentials: {
          loginName: parsed.fullName,
          password,
          existing: patientExists,
        },
        message: patientExists
          ? "Paciente já cadastrado. Login permanece Nome completo + data de nascimento."
          : undefined,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Erro ao processar e registrar paciente:", error)
    const message = error instanceof Error ? error.message : "Falha ao processar e registrar paciente"
    const isPermissionIssue =
      message.toLowerCase().includes("not allowed") || message.toLowerCase().includes("permission")

    // Retorna detalhes mínimos para diagnóstico pelo usuário
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
