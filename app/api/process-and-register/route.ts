import { NextResponse } from "next/server"
import crypto from "crypto"
import { cleanMedicalText } from "@/lib/clean/medical-text"
import { extractPatientData, normalizeBirthDate } from "@/lib/parsers/patient"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const DEFAULT_SUPABASE_URL = "https://fhznxprnzdswjzpesgal.supabase.co"
const DEFAULT_SUPABASE_KEY = "sb_secret_42Y_GaLCMAj6glqzVN8rOQ_RfHvzNg5"
const DEFAULT_SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  DEFAULT_SUPABASE_KEY

interface ProcessPayload {
  rawText: string
  sourceName?: string
  debugLogin?: boolean
  debug?: boolean
}

function slugifyName(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "")

  // Supabase Auth local-part length limit safeguard (<=64 chars)
  return slug.slice(0, 60)
}

async function getOrCreateAuthUser(
  supabase: ReturnType<typeof createAdminClient>,
  email: string,
  password: string,
) {
  // Supabase-js v2 não expõe getUserByEmail; listamos e filtramos manualmente.
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (listError) {
    throw listError
  }

  const existingUser = usersData?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase())
  if (existingUser) {
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
    })

    if (updateError) {
      throw updateError
    }

    return updatedUser?.user || existingUser
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (!createError && created?.user) return created.user

  throw createError || new Error("Falha ao criar usuário")
}

function diffTextSnapshot(original: string, current: string) {
  if (original === current) {
    return { matches: true, length: original.length }
  }

  const minLength = Math.min(original.length, current.length)
  let index = 0
  while (index < minLength && original[index] === current[index]) {
    index += 1
  }

  return {
    matches: false,
    length: current.length,
    originalLength: original.length,
    firstMismatchIndex: index,
    originalSnippet: original.slice(Math.max(0, index - 20), index + 20),
    currentSnippet: current.slice(Math.max(0, index - 20), index + 20),
  }
}

function normalizeHeaderText(text: string) {
  return text
    .replace(/\s+(Código|Nome|Data de Nascimento|Telefone):/gi, "\n$1:")
    .replace(/[ \t]+/g, " ")
    .trim()
}

function extractPatientFromHeader(text: string) {
  const normalizedHeader = normalizeHeaderText(text)
  const nameMatch = normalizedHeader.match(/Nome:\s*([^\n]+)/i)
  const birthMatch = normalizedHeader.match(/Data de Nascimento:\s*([0-9./\-\s]+)/i)

  const fullName = nameMatch?.[1]?.trim()
  const birthDate = normalizeBirthDate(birthMatch?.[1])

  return {
    fullName: fullName || undefined,
    birthDate,
  }
}

export async function POST(request: Request) {
  try {
    const body: ProcessPayload = await request.json()
    const { rawText, sourceName, debugLogin = true, debug = false } = body

    if (!rawText || typeof rawText !== "string") {
      return NextResponse.json({ error: "rawText é obrigatório e deve ser uma string" }, { status: 400 })
    }

    const { cleanText, logs } = cleanMedicalText(rawText)
    const cleanTextSnapshot = cleanText
    const headerParsed = extractPatientFromHeader(cleanTextSnapshot)
    const parsed =
      headerParsed.fullName && headerParsed.birthDate
        ? {
            ...headerParsed,
            missing: [] as string[],
          }
        : extractPatientData(cleanTextSnapshot, { debug })
    const cleanTextDiff = debug ? diffTextSnapshot(cleanTextSnapshot, cleanText) : undefined

    if (parsed.missing.length > 0) {
      return NextResponse.json(
        {
          cleanText: cleanTextSnapshot,
          logs,
          missing: parsed.missing,
          debug: debug
            ? {
                parser: parsed.debug,
                cleanTextDiff,
              }
            : undefined,
          error: "Não foi possível extrair nome completo e data de nascimento do relatório",
        },
        { status: 422 },
      )
    }

    const supabaseUrl = DEFAULT_SUPABASE_URL
    const supabaseServiceKey = DEFAULT_SUPABASE_SERVICE_KEY

    const dataSupabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

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
