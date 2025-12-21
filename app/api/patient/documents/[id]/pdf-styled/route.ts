import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import puppeteer, { Browser } from "puppeteer"

import { extractAllVariables, generatePremiumPDFHTML } from "@/app/api/generate-pdf/route"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

let browserPromise: Promise<Browser> | null = null

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
      })
      .catch((error) => {
        browserPromise = null
        throw error
      })
  }

  return browserPromise
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
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
    console.error("Erro ao buscar documento para PDF estilizado", documentError)
    return NextResponse.json({ error: "Não foi possível gerar o PDF" }, { status: 500 })
  }

  if (!document || document.patient_id !== user.id) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
  }

  if (!document.clean_text) {
    return NextResponse.json({ error: "Documento sem clean_text" }, { status: 400 })
  }

  const patientName = document.file_name?.replace(/\.[^/.]+$/, "") || "Paciente"
  const documentHash = crypto.createHash("sha256").update(document.clean_text).digest("hex").slice(0, 16)

  let html: string | null = null

  try {
    const variables = extractAllVariables(document.clean_text, patientName, "", {})
    html = generatePremiumPDFHTML(variables, documentHash)
  } catch (templateError) {
    console.error("Erro ao montar HTML premium para PDF estilizado, usando fallback", templateError)
  }

  if (!html) {
    const safeText = document.clean_text.replace(/[\u0000\u0001\u0002\u0003]/g, "").trim() || "Relatório indisponível"
    const escaped = safeText
      .split("\n")
      .map((line) => line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")).join("<br />")

    html = `<!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>${patientName}</title>
          <style>
            body { font-family: 'Noto Sans', 'Helvetica', 'Arial', sans-serif; padding: 24px; line-height: 1.5; }
            h1 { font-size: 20px; margin-bottom: 12px; color: #0f172a; }
            .content { white-space: normal; font-size: 12px; color: #0f172a; }
          </style>
        </head>
        <body>
          <h1>Relatório do paciente</h1>
          <div class="content">${escaped}</div>
        </body>
      </html>`
  }

  try {
    const browser = await getBrowser()
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 1800 })
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 })
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      preferCSSPageSize: true,
    })
    await page.close()

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=\"${patientName}.pdf\"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Falha ao gerar PDF estilizado com puppeteer", { error })
    // se falhar, devolve mensagem para o cliente ativar o fallback textual
    return NextResponse.json({ error: "Não foi possível gerar o PDF estilizado" }, { status: 500 })
  }
}
