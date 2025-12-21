import { NextRequest, NextResponse } from "next/server"

import crypto from "crypto"

import { generatePremiumPDFHTML, extractAllVariables } from "@/app/api/generate-pdf/route"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const documentId = params.id
  if (!documentId || documentId === "undefined") {
    return NextResponse.json({ error: "Documento inválido" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: document, error } = await admin
    .from("documents")
    .select("id, patient_id, file_name, clean_text")
    .eq("id", documentId)
    .maybeSingle()

  if (error) {
    console.error("Erro ao buscar documento do paciente", error)
    return NextResponse.json({ error: "Não foi possível carregar o documento" }, { status: 500 })
  }

  if (!document || document.patient_id !== user.id) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
  }

  if (!document.clean_text) {
    return NextResponse.json({ error: "Documento sem clean_text" }, { status: 400 })
  }

  try {
    const patientName = document.file_name?.replace(/\.[^/.]+$/, "") || "Paciente"
    const documentHash = crypto.createHash("sha256").update(document.clean_text).digest("hex").slice(0, 16)
    const variables = extractAllVariables(document.clean_text, patientName, "", {})
    const html = generatePremiumPDFHTML(variables, documentHash)

    return NextResponse.json(
      { html, documentHash },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    )
  } catch (err) {
    console.error("Erro inesperado ao gerar HTML estilizado", err)
    return NextResponse.json({ error: "Falha ao gerar o PDF estilizado" }, { status: 500 })
  }
}
