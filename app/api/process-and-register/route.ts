import { NextResponse } from "next/server"
import { cleanMedicalText } from "@/lib/clean/medical-text"
import { extractPatientData } from "@/lib/parsers/patient"
import { createPatientAuth } from "@/lib/auth-helpers"
import { createAdminClient } from "@/lib/supabase/admin"

interface ProcessPayload {
  rawText: string
  sourceName?: string
  cpf?: string
}

export async function POST(request: Request) {
  try {
    const body: ProcessPayload = await request.json()
    const { rawText, sourceName, cpf } = body

    if (!rawText || typeof rawText !== "string") {
      return NextResponse.json({ error: "rawText é obrigatório e deve ser uma string" }, { status: 400 })
    }

    const { cleanText, logs } = cleanMedicalText(rawText)
    const parsed = extractPatientData(cleanText, cpf)

    if (parsed.missing.length > 0) {
      return NextResponse.json(
        {
          cleanText,
          logs,
          missing: parsed.missing,
          error: "Não foi possível extrair todos os identificadores (CPF, data de nascimento ou nome)",
        },
        { status: 422 },
      )
    }

    const supabase = createAdminClient()

    const { data: existingPatient } = await supabase
      .from("patients")
      .select("id, full_name, cpf, birth_date")
      .eq("cpf", parsed.cpf)
      .maybeSingle()

    if (existingPatient) {
      return NextResponse.json(
        {
          cleanText,
          logs,
          patient: existingPatient,
          credentials: {
            cpf: parsed.cpf,
            loginName: parsed.fullName,
            password: parsed.birthDate?.replace(/-/g, ""),
            existing: true,
          },
          message: "Paciente já cadastrado. Credenciais preservadas (CPF + data de nascimento)",
        },
        { status: 200 },
      )
    }

    const password = parsed.birthDate!.replace(/-/g, "")
    const authUser = await createPatientAuth(parsed.cpf!, password)

    const { error: patientError } = await supabase.from("patients").insert({
      id: authUser.id,
      full_name: parsed.fullName,
      cpf: parsed.cpf,
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
          cpf: parsed.cpf,
          birth_date: parsed.birthDate,
        },
        credentials: {
          cpf: parsed.cpf,
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
