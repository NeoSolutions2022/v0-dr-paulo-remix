import { NextResponse } from "next/server"
import { cleanMedicalText } from "@/lib/clean/medical-text"
import { extractPatientData } from "@/lib/parsers/patient"
import { createPatientAuthWithEmail } from "@/lib/auth-helpers"
import { createAdminClient } from "@/lib/supabase/admin"

interface ProcessPayload {
  rawText: string
  sourceName?: string
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

export async function POST(request: Request) {
  try {
    const body: ProcessPayload = await request.json()
    const { rawText, sourceName } = body

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

    const { data: existingPatient } = await supabase
      .from("patients")
      .select("id, full_name, cpf, birth_date")
      .eq("full_name", parsed.fullName)
      .eq("birth_date", parsed.birthDate)
      .maybeSingle()

    if (existingPatient) {
      return NextResponse.json(
        {
          cleanText,
          logs,
          patient: existingPatient,
          credentials: {
            loginName: parsed.fullName,
            password: parsed.birthDate?.replace(/-/g, ""),
            existing: true,
          },
          message: "Paciente já cadastrado. Login permanece Nome completo + data de nascimento.",
        },
        { status: 200 },
      )
    }

    const password = parsed.birthDate!.replace(/-/g, "")
    const loginEmail = `${slugifyName(parsed.fullName!)}@patients.local`
    const authUser = await createPatientAuthWithEmail(loginEmail, password)

    const { error: patientError } = await supabase.from("patients").insert({
      id: authUser.id,
      full_name: parsed.fullName,
      cpf: null,
      birth_date: parsed.birthDate,
      first_access: true,
      source_name: sourceName || null,
    })

    if (patientError) {
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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha ao processar e registrar paciente",
      },
      { status: 500 },
    )
  }
}
