import { NextRequest, NextResponse } from "next/server"

import { ADMIN_SESSION_COOKIE, hasValidAdminSession } from "@/lib/admin-auth"
import { sanitizeHtml } from "@/lib/html-sanitizer"
import { renderMedicalReportHtml, StructuredMedicalReport } from "@/lib/medical-report"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

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

function stripMarkdownFences(input: string) {
  return input
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim()
}

function normalizeQuotes(input: string) {
  return input
    .replace(/\uFEFF/g, "")
    .replace(/[\u201C\u201D]/g, "\"")
    .replace(/[\u2018\u2019]/g, "'")
}

function stripJsonComments(input: string) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n\r]*/g, "")
    .trim()
}

function escapeNewlinesInStrings(input: string) {
  let inString = false
  let escapeNext = false
  let result = ""

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]

    if (escapeNext) {
      result += char
      escapeNext = false
      continue
    }

    if (char === "\\") {
      if (inString) {
        escapeNext = true
      }
      result += char
      continue
    }

    if (char === "\"") {
      inString = !inString
      result += char
      continue
    }

    if (inString && (char === "\n" || char === "\r")) {
      if (char === "\r" && input[i + 1] === "\n") {
        i += 1
      }
      result += "\\n"
      continue
    }

    if (char < " " && char !== "\t" && char !== "\n" && char !== "\r") {
      continue
    }

    result += char
  }

  return result
}

function stripTrailingCommas(input: string) {
  return input.replace(/,\s*([}\]])/g, "$1")
}

function extractBalancedJsonObject(input: string) {
  const startIndex = input.indexOf("{")
  if (startIndex === -1) return null

  let inString = false
  let escapeNext = false
  let depth = 0

  for (let i = startIndex; i < input.length; i += 1) {
    const char = input[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === "\\") {
      if (inString) {
        escapeNext = true
      }
      continue
    }

    if (char === "\"") {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === "{") {
      depth += 1
    } else if (char === "}") {
      depth -= 1
      if (depth === 0) {
        return input.slice(startIndex, i + 1)
      }
    }
  }

  return null
}

function parseGeminiJson(rawText: string) {
  const attempts: string[] = []
  const normalized = normalizeQuotes(rawText)
  attempts.push(normalized)
  attempts.push(stripMarkdownFences(normalized))

  const extracted = extractBalancedJsonObject(normalized)
  if (extracted) {
    attempts.push(extracted)
  }

  const cleanedAttempts = attempts.flatMap((attempt) => {
    const noComments = stripJsonComments(attempt)
    const noTrailing = stripTrailingCommas(noComments)
    return [
      noComments,
      noTrailing,
      escapeNewlinesInStrings(noComments),
      escapeNewlinesInStrings(noTrailing),
    ]
  })

  for (const candidate of cleanedAttempts) {
    try {
      return JSON.parse(candidate) as StructuredMedicalReport
    } catch {
      continue
    }
  }

  throw new Error("Invalid JSON response")
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
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
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
  const debug =
    debugParam === "false" || body?.debug === false || body?.debug === "false"
      ? false
      : isAdmin

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
  let rawGeminiText = ""
  try {
    rawGeminiText = await callGemini(document.clean_text, apiKey)
    structured = parseGeminiJson(rawGeminiText)
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

    console.error("Erro ao interpretar JSON do Gemini", { error, ...debugInfo })

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

  if (debug && isAdmin) {
    return NextResponse.json({
      html: sanitizedHtml,
      structured,
      debug: {
        raw: rawGeminiText,
        rawLength: rawGeminiText.length,
      },
    })
  }

  return NextResponse.json({ html: sanitizedHtml })
}
