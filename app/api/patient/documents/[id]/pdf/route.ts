import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

async function buildPdf(cleanText: string, fileName: string, patientName?: string) {
  const pdfDoc = await PDFDocument.create()
  let page = pdfDoc.addPage([595, 842])
  const { height } = page.getSize()

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const title = fileName.replace(/\.[^/.]+$/, "") || "Relatório"
  page.drawText("DOCUMENTO MÉDICO", {
    x: 50,
    y: height - 50,
    size: 16,
    font: bold,
    color: rgb(0.1, 0.3, 0.6),
  })

  page.drawText(patientName || title, {
    x: 50,
    y: height - 75,
    size: 10,
    font: regular,
    color: rgb(0.35, 0.35, 0.35),
  })

  const maxWidth = 595 - 100
  const lineHeight = 14
  let y = height - 110

  const flushLine = (text: string, targetPage: typeof page, targetY: number) => {
    targetPage.drawText(text, {
      x: 50,
      y: targetY,
      size: 11,
      font: regular,
      color: rgb(0, 0, 0),
    })
  }

  const lines = cleanText.split("\n")

  for (const rawLine of lines) {
    const words = rawLine.split(" ")
    let currentLine = ""

    for (const word of words) {
      const testLine = `${currentLine}${word} `
      const width = regular.widthOfTextAtSize(testLine, 11)

      if (width > maxWidth && currentLine.trim() !== "") {
        flushLine(currentLine.trim(), page, y)
        currentLine = `${word} `
        y -= lineHeight
      } else {
        currentLine = testLine
      }
    }

    if (currentLine.trim() !== "") {
      flushLine(currentLine.trim(), page, y)
      y -= lineHeight
    }

    if (y < 80) {
      page = pdfDoc.addPage([595, 842])
      y = page.getSize().height - 80
    }
  }

  return pdfDoc.save()
}

export async function GET(
  request: NextRequest,
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

  const admin = createAdminClient()
  const documentId = params.id

  if (!documentId) {
    return NextResponse.json({ error: "Documento inválido" }, { status: 400 })
  }

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

  if (!document.clean_text) {
    return NextResponse.json({ error: "Documento sem texto processado" }, { status: 404 })
  }

  const { data: patientData } = await admin
    .from("patients")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle()

  const pdfBytes = await buildPdf(document.clean_text, document.file_name, patientData?.full_name)

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"${document.file_name.replace(/\.[^/.]+$/, '') || document.id}.pdf\"`,
      "Cache-Control": "no-store",
    },
  })
}
