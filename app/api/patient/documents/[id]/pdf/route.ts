import { NextRequest, NextResponse } from "next/server"

import { generatePdfFromText } from "@/lib/pdf-generator"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const documentId = params.id?.trim()
  if (!documentId || documentId === "undefined" || documentId === "null") {
    return NextResponse.json({ error: "Documento inválido" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: document, error: documentError } = await admin
    .from("documents")
    .select("id, patient_id, file_name, clean_text")
    .eq("id", documentId)
    .maybeSingle()

  if (documentError) {
    console.error("Erro ao buscar documento para PDF", documentError)
    return NextResponse.json({ error: "Não foi possível gerar o PDF" }, { status: 500 })
  }

  if (!document || document.patient_id !== user.id) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
  }

  if (!document.clean_text || !document.clean_text.trim()) {
    return NextResponse.json({ error: "Documento sem texto processado" }, { status: 404 })
  }

  try {
    const pdfBytes = await generatePdfFromText(
      document.clean_text,
      document.id,
      document.file_name,
    )

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=\"${
          document.file_name.replace(/\.[^/.]+$/, "") || document.id
        }.pdf\"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Erro ao gerar PDF a partir do clean_text", {
      documentId,
      patientId: user.id,
      error,
    })
    return NextResponse.json({ error: "Não foi possível gerar o PDF" }, { status: 500 })
  }
}
