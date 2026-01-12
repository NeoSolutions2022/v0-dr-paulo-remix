import { NextRequest, NextResponse } from "next/server"

import { ADMIN_SESSION_COOKIE, hasValidAdminSession } from "@/lib/admin-auth"
import { sanitizeHtml } from "@/lib/html-sanitizer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

const geminiPrompt = `
Você receberá um texto clínico bruto (clean_text). Ele pode ter muitas seções e formatos.

RETORNE SOMENTE HTML (sem markdown, sem comentários). Não invente dados.
Se não puder extrair algo com segurança, use "" ou omita a informação.

OBJETIVO:
- Gerar um relatório médico HTML bonito, moderno e consistente.
- Usar cards, timeline vertical, accordions (<details>/<summary>), badges e ícones SVG inline.
- Incluir um bloco final "Texto completo" com <pre> do texto limpo.

REGRAS:
- HTML auto-contido com <style> interno.
- PROIBIDO: scripts, iframes, object, embed, links externos, imagens externas, fontes externas.
- Sem bibliotecas externas.
- Responsivo (mobile/desktop).
`

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
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 8192,
        responseMimeType: "text/html",
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error("Erro ao chamar Gemini", response.status, body)
    throw new Error("Gemini request failed")
  }

  const payload = await response.json()
  const parts = payload?.candidates?.[0]?.content?.parts
  const rawText = Array.isArray(parts)
    ? parts.map((part: { text?: string }) => (typeof part?.text === "string" ? part.text : "")).join("")
    : payload?.candidates?.[0]?.content?.text || ""
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
  const debugParam = request.nextUrl.searchParams.get("debug")
  const force =
    forceParam === "true" || body?.force === true || body?.force === "true"

  const adminCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const isAdmin = hasValidAdminSession(adminCookie)
  const debug =
    debugParam === "false" || body?.debug === false || body?.debug === "false"
      ? false
      : isAdmin

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

  let rawGeminiText = ""
  try {
    rawGeminiText = await callGemini(document.clean_text, apiKey)
    if (debug && isAdmin) {
      console.log("[gemini] raw output", {
        documentId,
        rawLength: rawGeminiText.length,
        raw: rawGeminiText,
      })
    }
  } catch (error: any) {
    const message =
      error?.message === "Gemini returned empty content"
        ? "Gemini returned empty content"
        : "Falha ao interpretar a resposta do Gemini"

    const rawLength = rawGeminiText.length
    const rawHash = rawGeminiText
      ? crypto.createHash("sha256").update(rawGeminiText).digest("hex")
      : null
    const debugInfo = {
      rawLength,
      rawHash,
      hasCodeFence: /```/.test(rawGeminiText),
      hasJsonObject: rawGeminiText.includes("{") && rawGeminiText.includes("}"),
    }

    console.error("Erro ao interpretar HTML do Gemini", {
      error,
      ...debugInfo,
      raw: debug ? rawGeminiText : undefined,
    })

    if (debug && isAdmin) {
      return NextResponse.json(
        {
          error: message,
          debug: {
            ...debugInfo,
            raw: rawGeminiText,
          },
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ error: message }, { status: 502 })
  }

  const sanitizedHtml = sanitizeHtml(rawGeminiText)

  const { error: updateError } = await admin
    .from("documents")
    .update({ html: sanitizedHtml })
    .eq("id", documentId)

  if (updateError) {
    console.error("Erro ao salvar HTML do documento", updateError)
    return NextResponse.json({ error: "Não foi possível salvar o HTML" }, { status: 500 })
  }

  if (debug && isAdmin) {
    return NextResponse.json({
      html: sanitizedHtml,
      debug: {
        raw: rawGeminiText,
        rawLength: rawGeminiText.length,
      },
    })
  }

  return NextResponse.json({ html: sanitizedHtml })
}
