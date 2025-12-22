import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

interface PatientDocument {
  id: string
  patient_id: string
  file_name: string
  created_at: string
  pdf_url: string | null
  clean_text: string | null
  hash_sha256: string | null
}

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const searchParams = request.nextUrl.searchParams
  const documentId = searchParams.get("id")

  const baseSelect =
    "id, patient_id, file_name, created_at, pdf_url, clean_text, hash_sha256"

  // Quando um ID específico é informado, buscamos primeiro o documento e
  // validamos se pertence ao usuário autenticado. Assim evitamos `null`
  // silencioso e retornamos 404 quando não é do paciente.
  if (documentId) {
    if (documentId === "undefined") {
      return NextResponse.json(
        { error: "Documento inválido" },
        { status: 400 },
      )
    }

    const { data: document, error } = await admin
      .from("documents")
      .select(baseSelect)
      .eq("id", documentId)
      .maybeSingle()

    if (error) {
      console.error("Erro ao buscar documento do paciente", error)
      return NextResponse.json(
        { error: "Não foi possível carregar documentos" },
        { status: 500 },
      )
    }

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    if (document.patient_id !== user.id) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ documents: document })
  }

  const { data, error } = await admin
    .from("documents")
    .select(baseSelect)
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Erro ao buscar documentos do paciente", error)
    return NextResponse.json(
      { error: "Não foi possível carregar documentos" },
      { status: 500 },
    )
  }

  return NextResponse.json({ documents: data as PatientDocument[] })
}
