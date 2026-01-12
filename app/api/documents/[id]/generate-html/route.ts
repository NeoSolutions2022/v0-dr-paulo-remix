import { NextRequest, NextResponse } from "next/server"

import { ADMIN_SESSION_COOKIE, hasValidAdminSession } from "@/lib/admin-auth"
import { sanitizeHtml } from "@/lib/html-sanitizer"
import { renderMedicalReportHtml, StructuredMedicalReport } from "@/lib/medical-report"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

const geminiPrompt = `
Você receberá um texto clínico bruto (clean_text). Ele pode ter muitas seções e formatos.

RETORNE SOMENTE UM JSON VÁLIDO (sem markdown, sem comentários). Não invente dados.
Se não puder extrair algo com segurança, use "" ou null.

OBJETIVO:
- Extrair o máximo de estrutura possível.
- Qualquer conteúdo que não se encaixe claramente deve ir para "sections" para não perder informação.
- Inclua também "raw_text_clean" como fallback com o texto limpo completo (sem comandos RTF).

FORMATO OBRIGATÓRIO DO JSON:
{
  "patient": { "codigo": "", "nome": "", "nascimento": "", "telefone": "" },
  "evolucoes": [
    {
      "datetime": "",
      "title": "Evolução",
      "summary": "",
      "ipss": {
        "items": [ { "label": "", "score": null } ],
        "qualidade_vida": null,
        "total": null
      },
      "sections": [
        { "title": "", "kind": "kv", "items": [ { "k": "", "v": "" } ] },
        { "title": "", "kind": "text", "text": "" }
      ],
      "full_text": ""
    }
  ],
  "global_sections": [
    { "title": "", "kind": "kv", "items": [ { "k": "", "v": "" } ] },
    { "title": "", "kind": "text", "text": "" }
  ],
  "raw_text_clean": ""
}

REGRAS:
- "sections.kind" pode ser apenas: "kv" ou "text".
- Não exclua dados. Se não conseguir categorizar, crie uma section "Outros" com kind "text".
- "evolucoes" deve ser uma lista; se detectar duplicadas idênticas, deduplicar.
- Se houver IPSS, preencher ipss.items com label e score; se não houver, usar score null.
- "raw_text_clean" deve remover lixo RTF e caracteres estranhos; manter legível.
`

function parseGeminiJson(rawText: string) {
  try {
    return JSON.parse(rawText) as StructuredMedicalReport
  } catch (error) {
    const startIndex = rawText.indexOf("{")
    const endIndex = rawText.lastIndexOf("}")
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      throw error
    }

    const sliced = rawText.slice(startIndex, endIndex + 1)
    return JSON.parse(sliced) as StructuredMedicalReport
  }
}

async function callGemini(cleanText: string, apiKey: string) {
  const promptFinal = `${geminiPrompt}\n\nEntrada (clean_text):\n${cleanText}`

  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: promptFinal }] }],
      generationConfig: { temperature: 0.2, topP: 0.9, maxOutputTokens: 8192 },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error("Erro ao chamar Gemini", response.status, body)
    throw new Error("Gemini request failed")
  }

  const payload = await response.json()
  const rawText = payload?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    throw new Error("Gemini returned empty content")
  }

  return rawText
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: documentId } = await params
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Missing GOOGLE_GEMINI_API_KEY" }, { status: 500 })
  }
  if (!documentId || documentId === "undefined") {
    return NextResponse.json({ error: "Documento inválido" }, { status: 400 })
  }

  let body: { force?: boolean | string } | null = null
  try {
    body = await request.json()
  } catch {
    body = null
  }

  const forceParam = request.nextUrl.searchParams.get("force")
  const force =
    forceParam === "true" || body?.force === true || body?.force === "true"

  const adminCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const isAdmin = hasValidAdminSession(adminCookie)

  let userId: string | null = null
  if (!isAdmin) {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    userId = user.id
  }

  const admin = createAdminClient()
  const { data: document, error } = await admin
    .from("documents")
    .select("id, patient_id, clean_text, html")
    .eq("id", documentId)
    .maybeSingle()

  if (error) {
    console.error("Erro ao buscar documento", error)
    return NextResponse.json({ error: "Não foi possível carregar o documento" }, { status: 500 })
  }

  if (!document) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
  }

  if (!isAdmin && userId && document.patient_id !== userId) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
  }

  if (document.html && document.html.trim() && !force) {
    return NextResponse.json({ html: document.html })
  }

  if (!document.clean_text) {
    return NextResponse.json({ error: "Documento sem clean_text" }, { status: 400 })
  }

  let structured: StructuredMedicalReport
  try {
    const rawText = await callGemini(document.clean_text, apiKey)
    structured = parseGeminiJson(rawText)
  } catch (error: any) {
    const message = error?.message === "Gemini returned empty content"
      ? "Gemini returned empty content"
      : "Falha ao interpretar a resposta do Gemini"
    console.error("Erro ao interpretar JSON do Gemini", error)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  if (!structured.raw_text_clean?.trim()) {
    structured = {
      ...structured,
      raw_text_clean: document.clean_text,
    }
  }

  const renderedHtml = renderMedicalReportHtml(structured)
  const sanitizedHtml = sanitizeHtml(renderedHtml)

  const { error: updateError } = await admin
    .from("documents")
    .update({ html: sanitizedHtml })
    .eq("id", documentId)

  if (updateError) {
    console.error("Erro ao salvar HTML do documento", updateError)
    return NextResponse.json({ error: "Não foi possível salvar o HTML" }, { status: 500 })
  }

  return NextResponse.json({ html: sanitizedHtml })
}
