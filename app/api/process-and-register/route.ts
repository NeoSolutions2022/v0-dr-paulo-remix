import { NextResponse } from "next/server"
import { cleanMedicalText } from "@/lib/clean/medical-text"
import { extractPatientData } from "@/lib/parsers/patient"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

interface ProcessPayload {
  rawText: string
  sourceName?: string
  debugLogin?: boolean
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

export async function POST(request: Request) {
  try {
    const body: ProcessPayload = await request.json()
    const { rawText, sourceName, debugLogin = true } = body

    if (!rawText || typeof rawText !== "string") {
      return NextResponse.json({ error: "rawText é obrigatório e deve ser uma string" }, { status: 400 })
    }

    const { cleanText, logs } = cleanMedicalText(rawText)
    const parsed = extractPatientData(cleanText)

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
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fhznxprnzdswjzpesgal.supabase.co"
      const supabaseAnonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoem54cHJuemRzd2p6cGVzZ2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzU0NDcsImV4cCI6MjA4MTY1MTQ0N30.ggOs6IBd6yAsJhWsHj9boWkyaqWTi1s11wRMDWZrOQY"

      const publicClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

      const { error: debugAuthError } = await publicClient.auth.signInWithPassword({
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

    const { data: existingPatient, error: existingPatientError } = await supabase
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

    if (existingPatient) {
      // Garante que o usuário do Auth está alinhado e com senha atualizada
      if (existingPatient.id !== authUser.id) {
        // Realinha o ID do paciente ao usuário de auth encontrado/criado
        const { error: updatePatientIdError } = await supabase
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
        const { error: updateDocsError } = await supabase
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

      return NextResponse.json(
        {
          cleanText,
          logs,
          patient: { ...existingPatient, id: authUser.id },
          credentials: {
            loginName: parsed.fullName,
            password,
            existing: true,
          },
          message: "Paciente já cadastrado. Login permanece Nome completo + data de nascimento.",
        },
        { status: 200 },
      )
    }

    const { error: patientError } = await supabase.from("patients").insert({
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

    return NextResponse.json(
      {
        cleanText,
        logs,
        patient: {
          id: authUser.id,
          full_name: parsed.fullName,
          cpf: null,
          birth_date: parsed.birthDate,
        },
        credentials: {
          loginName: parsed.fullName,
          password,
          existing: false,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Erro ao processar e registrar paciente:", error)
    const message = error instanceof Error ? error.message : "Falha ao processar e registrar paciente"
    // Retorna detalhes mínimos para diagnóstico pelo usuário
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
