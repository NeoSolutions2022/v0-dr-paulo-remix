import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { hasValidAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin-auth"

const DEFAULT_SUPABASE_URL = "https://fhznxprnzdswjzpesgal.supabase.co"
const DEFAULT_SUPABASE_KEY = "sb_secret_42Y_GaLCMAj6glqzVN8rOQ_RfHvzNg5"
const DEFAULT_SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  DEFAULT_SUPABASE_KEY

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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

const removeDangerousTags = (html: string) =>
  html.replace(/<(script|iframe|object|embed)[\s\S]*?>[\s\S]*?<\/\1>/gi, "")

const sanitizeHtml = (rawHtml: string) => {
  const allowedTags = new Set([
    "html",
    "head",
    "meta",
    "style",
    "body",
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
      if (tag === "meta") {
        return `<meta charset="utf-8">`
      }
      return `<${tag}>`
    })
    .trim()
}

const safeValue = (value: unknown) => {
  if (value === null || value === undefined) return "-"
  const text = String(value).trim()
  return text.length ? escapeHtml(text) : "-"
}

const renderSections = (sections: any[]) => {
  if (!Array.isArray(sections) || sections.length === 0) {
    return `<div class="muted">-</div>`
  }
  return sections
    .map((section) => {
      const title = safeValue(section?.title)
      if (section?.kind === "kv" && Array.isArray(section?.items)) {
        const rows = section.items
          .map((item: any) => `<tr><td>${safeValue(item?.k)}</td><td>${safeValue(item?.v)}</td></tr>`)
          .join("")
        return `
          <details class="accordion" open>
            <summary>${title}</summary>
            <table class="kv">
              <tbody>${rows || "<tr><td>-</td><td>-</td></tr>"}</tbody>
            </table>
          </details>
        `
      }
      const text = safeValue(section?.text)
      return `
        <details class="accordion" open>
          <summary>${title}</summary>
          <p>${text}</p>
        </details>
      `
    })
    .join("")
}

const renderEvolutions = (evolucoes: any[]) => {
  if (!Array.isArray(evolucoes) || evolucoes.length === 0) {
    return `<p class="muted">Sem evoluções.</p>`
  }
  return evolucoes
    .map((evolucao) => {
      const datetime = safeValue(evolucao?.datetime)
      const summary = safeValue(evolucao?.summary)
      const title = safeValue(evolucao?.title || "Evolução")
      const ipssItems = Array.isArray(evolucao?.ipss?.items) ? evolucao.ipss.items : []
      const ipssRows = ipssItems
        .map(
          (item: any) =>
            `<tr><td>${safeValue(item?.label)}</td><td>${safeValue(item?.score)}</td><td><div class="bar"><span style="width:${Math.min(Number(item?.score) * 12, 100)}%"></span></div></td></tr>`,
        )
        .join("")
      const qualidadeVida = evolucao?.ipss?.qualidade_vida ?? "-"
      const fullText = safeValue(evolucao?.full_text)
      return `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-card">
            <div class="timeline-header">
              <span class="badge">${title}</span>
              <span class="timestamp">${datetime}</span>
            </div>
            <p class="summary">${summary}</p>
            ${ipssRows ? `
              <div class="ipss">
                <h4>IPSS</h4>
                <table>
                  <thead><tr><th>Pergunta</th><th>Score</th><th></th></tr></thead>
                  <tbody>${ipssRows}</tbody>
                </table>
                <p class="muted">Qualidade de vida: ${safeValue(qualidadeVida)}</p>
              </div>
            ` : ""}
            ${renderSections(evolucao?.sections)}
            <details class="accordion">
              <summary>Texto completo</summary>
              <pre>${fullText}</pre>
            </details>
          </div>
        </div>
      `
    })
    .join("")
}

const renderMedicalReportHtml = (structuredJson: any) => {
  const patient = structuredJson?.patient ?? {}
  const evolucoes = structuredJson?.evolucoes ?? []
  const globalSections = structuredJson?.global_sections ?? []
  const rawText = safeValue(structuredJson?.raw_text_clean)

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    :root { --bg:#f7f8fb; --card:#fff; --text:#111827; --muted:#6b7280; --primary:#2563eb; --border:#e5e7eb; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, Arial, sans-serif; background: var(--bg); color: var(--text); }
    .container { max-width: 960px; margin: 0 auto; padding: 24px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 6px 18px rgba(15,23,42,0.06); }
    .header { display:flex; flex-wrap:wrap; gap:16px; align-items:center; justify-content:space-between; }
    .badge { background: #e0e7ff; color: #1e3a8a; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 600; }
    .muted { color: var(--muted); font-size: 13px; }
    h1,h2,h3,h4 { margin:0 0 8px 0; }
    .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .stat { padding: 12px; border:1px solid var(--border); border-radius: 10px; background: #f9fafb; }
    .timeline { position: relative; padding-left: 20px; }
    .timeline:before { content:""; position:absolute; left:7px; top:0; bottom:0; width:2px; background:#dbeafe; }
    .timeline-item { position: relative; margin-bottom: 16px; }
    .timeline-dot { position:absolute; left:0; top:16px; width:14px; height:14px; background:#2563eb; border-radius:50%; }
    .timeline-card { margin-left: 20px; border:1px solid var(--border); border-radius: 12px; padding: 16px; background: #fff; }
    .timeline-header { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap: 8px; }
    .timestamp { font-size: 12px; color: var(--muted); }
    table { width:100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 8px; border-bottom: 1px solid var(--border); text-align: left; }
    .kv td:first-child { width: 40%; font-weight: 600; color: var(--muted); }
    .bar { background:#e5e7eb; height:6px; border-radius:999px; overflow:hidden; }
    .bar span { display:block; height:100%; background:#2563eb; }
    details.accordion { border:1px solid var(--border); border-radius:10px; padding:8px 12px; margin-top:10px; }
    summary { cursor:pointer; font-weight:600; color:#1f2937; }
    pre { background:#f3f4f6; padding:12px; border-radius:10px; max-height:240px; overflow:auto; white-space:pre-wrap; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card header">
      <div>
        <h1>${safeValue(patient?.nome)}</h1>
        <p class="muted">Código: ${safeValue(patient?.codigo)}</p>
      </div>
      <div class="badge">Relatório médico</div>
    </div>
    <div class="card">
      <h2>Ficha do paciente</h2>
      <div class="grid">
        <div class="stat"><p class="muted">Código</p><strong>${safeValue(patient?.codigo)}</strong></div>
        <div class="stat"><p class="muted">Nascimento</p><strong>${safeValue(patient?.nascimento)}</strong></div>
        <div class="stat"><p class="muted">Telefone</p><strong>${safeValue(patient?.telefone)}</strong></div>
      </div>
    </div>
    <div class="card">
      <h2>Resumo clínico</h2>
      ${renderSections(globalSections)}
    </div>
    <div class="card">
      <h2>Linha do tempo</h2>
      <div class="timeline">
        ${renderEvolutions(evolucoes)}
      </div>
    </div>
    <div class="card">
      <h2>Texto completo</h2>
      <details class="accordion" open>
        <summary>Texto completo</summary>
        <pre>${rawText}</pre>
      </details>
    </div>
  </div>
</body>
</html>`
}

const parseGeminiJson = (text: string) => {
  try {
    return JSON.parse(text)
  } catch (error) {
    const start = text.indexOf("{")
    const end = text.lastIndexOf("}")
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1))
      } catch (fallbackError) {
        throw fallbackError
      }
    }
    throw error
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

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || "Falha ao gerar JSON com Gemini")
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text || typeof text !== "string") {
    throw new Error("Gemini returned empty content")
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
    return NextResponse.json({ error: "Missing GOOGLE_GEMINI_API_KEY" }, { status: 500 })
  }

  let structuredJson: any
  try {
    const geminiText = await callGemini(document.clean_text, apiKey)
    structuredJson = parseGeminiJson(geminiText)
  } catch (err) {
    console.error("[gemini] Falha ao interpretar JSON:", err)
    return NextResponse.json({ error: "Falha ao interpretar JSON do Gemini" }, { status: 502 })
  }

  const html = renderMedicalReportHtml(structuredJson)
  const sanitizedHtml = sanitizeHtml(html)

  const { error: updateError } = await supabase
    .from("documents")
    .update({ html: sanitizedHtml, html_generated_at: new Date().toISOString() })
    .eq("id", id)

  if (updateError) {
    return NextResponse.json({ error: "Falha ao salvar HTML" }, { status: 500 })
  }

  return NextResponse.json({ html: sanitizedHtml })
}
