import { NextRequest, NextResponse } from "next/server"

import { generatePdfFromText } from "@/lib/pdf-generator"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  let body: {
    cleanText?: string
    fileName?: string
    documentId?: string
  }

  try {
    body = await request.json()
  } catch (error) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const cleanText = body.cleanText?.trim()

  if (!cleanText) {
    return NextResponse.json({ error: "Documento inválido" }, { status: 400 })
  }

  const fileName = body.fileName?.trim() || "documento.pdf"
  const documentId = body.documentId?.trim() || "preview"

  try {
    const pdfBytes = await generatePdfFromText(cleanText, documentId, fileName)

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=\"${
          fileName.replace(/\.[^/.]+$/, "") || documentId
        }.pdf\"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Erro ao gerar PDF do documento do paciente", {
      documentId,
      patientId: user.id,
      error,
    })

    return NextResponse.json({ error: "Não foi possível gerar o PDF" }, { status: 500 })
  }
}
