import { NextRequest, NextResponse } from "next/server"

import crypto from "crypto"

import { generatePremiumPDFHTML, extractAllVariables } from "@/app/api/generate-pdf/route"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { sanitizeText } from "@/lib/pdf-generator"

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
    const sanitizedText = sanitizeText(document.clean_text)
    const patientName = document.file_name?.replace(/\.[^/.]+$/, "") || "Paciente"
    const documentHash = crypto.createHash("sha256").update(sanitizedText).digest("hex").slice(0, 16)

    let html: string | null = null

    try {
      const variables = extractAllVariables(sanitizedText, patientName, "", {})
      html = generatePremiumPDFHTML(variables, documentHash)
    } catch (templateError) {
      console.error("Erro ao gerar HTML estilizado via template, usando fallback simples", templateError)
    }

    if (!html) {
      const safeText = sanitizedText || "Relatório indisponível"
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
