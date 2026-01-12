import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { hasValidAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin-auth"

const DEFAULT_SUPABASE_URL = "https://fhznxprnzdswjzpesgal.supabase.co"
const DEFAULT_SUPABASE_KEY = "sb_secret_42Y_GaLCMAj6glqzVN8rOQ_RfHvzNg5"
const DEFAULT_SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  DEFAULT_SUPABASE_KEY

const GEMINI_MODEL = "gemini-1.5-pro"
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const HTML_PROMPT = `Você receberá um texto clínico bruto (clean_text).
Gere um HTML COMPLETO para um relatório médico, seguindo ESTRITAMENTE este layout:

REGRAS:
- NÃO usar <script>, <iframe>, <img>, <link>, fontes externas ou bibliotecas.
- Usar apenas: div, header, section, h1-h4, p, span, ul, li, table, thead, tbody, tr, th, td, hr, details, summary, svg.
- Usar um <style> interno pequeno para layout.
- NÃO inventar dados.
- Se algo não existir, usar "-".
- O layout deve ser consistente entre pacientes.

ESTRUTURA:
1) Cabeçalho
   - Nome
   - Código
   - Data de nascimento
   - Telefone

2) Resumo clínico
   - DIABETES
   - CIRURGIAS
   - INTERNAMENTOS
   - ALERGIAS
   - PSA (se existir)

3) Linha do tempo
   - Cada evolução com data e resumo curto

4) IPSS
   - Tabela Pergunta | Score
   - Campo Qualidade de Vida

5) Texto completo
   - Dentro de <details><summary>Texto completo</summary>...</details>

Retorne SOMENTE o HTML.

DADOS:
{{CLEAN_TEXT}}`

const removeDangerousTags = (html: string) =>
  html.replace(/<(script|iframe|object|embed)[\s\S]*?>[\s\S]*?<\/\1>/gi, "")

const sanitizeHtml = (rawHtml: string) => {
  const allowedTags = new Set([
    "div",
    "header",
    "section",
    "h1",
    "h2",
    "h3",
    "h4",
    "p",
    "span",
    "ul",
    "li",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "hr",
    "details",
    "summary",
    "svg",
    "style",
  ])

  const withoutScripts = removeDangerousTags(rawHtml)

  return withoutScripts
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (match, tagName) => {
      const tag = tagName.toLowerCase()
      if (!allowedTags.has(tag)) {
        return ""
      }
      if (match.startsWith("</")) {
        return `</${tag}>`
      }
      return `<${tag}>`
    })
    .trim()
}

async function callGemini(cleanText: string, apiKey: string) {
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: HTML_PROMPT.replace("{{CLEAN_TEXT}}", cleanText) }],
        },
      ],
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || "Falha ao gerar HTML com Gemini")
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text || typeof text !== "string") {
    throw new Error("Resposta inválida do Gemini")
  }

  return text
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value

  if (!hasValidAdminSession(cookieValue)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = context.params
  const body = await request.json().catch(() => ({}))
  const force = Boolean(body?.force)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const supabaseServiceKey = DEFAULT_SUPABASE_SERVICE_KEY
  const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: document, error } = await supabase
    .from("documents")
    .select("id, clean_text, html")
    .eq("id", id)
    .maybeSingle()

  if (error || !document) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
  }

  if (document.html && document.html.trim() && !force) {
    return NextResponse.json({ html: document.html })
  }

  if (!document.clean_text) {
    return NextResponse.json({ error: "Documento sem clean_text" }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_GEMINI_API_KEY não configurada" }, { status: 500 })
  }

  const generatedHtml = await callGemini(document.clean_text, apiKey)
  const sanitizedHtml = sanitizeHtml(generatedHtml)

  const { error: updateError } = await supabase
    .from("documents")
    .update({ html: sanitizedHtml, html_generated_at: new Date().toISOString() })
    .eq("id", id)

  if (updateError) {
    return NextResponse.json({ error: "Falha ao salvar HTML" }, { status: 500 })
  }

  return NextResponse.json({ html: sanitizedHtml })
}
