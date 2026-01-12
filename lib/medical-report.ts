type KeyValueItem = {
  k?: string | null
  v?: string | null
}

type Section = {
  title?: string | null
  kind?: "kv" | "text" | null
  items?: KeyValueItem[] | null
  text?: string | null
}

type IpssItem = {
  label?: string | null
  score?: number | null
}

type Evolution = {
  datetime?: string | null
  title?: string | null
  summary?: string | null
  ipss?: {
    items?: IpssItem[] | null
    qualidade_vida?: number | null
    total?: number | null
  } | null
  sections?: Section[] | null
  full_text?: string | null
}

export type StructuredMedicalReport = {
  patient?: {
    codigo?: string | null
    nome?: string | null
    nascimento?: string | null
    telefone?: string | null
  } | null
  evolucoes?: Evolution[] | null
  global_sections?: Section[] | null
  raw_text_clean?: string | null
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function normalizeText(value?: string | null) {
  if (!value) return ""
  return escapeHtml(value.trim())
}

function renderTextBlock(value?: string | null) {
  if (!value) return ""
  const escaped = normalizeText(value).replace(/\n/g, "<br />")
  return `<p class="section-text">${escaped}</p>`
}

function renderKvItems(items?: KeyValueItem[] | null) {
  const safeItems = Array.isArray(items) ? items : []
  if (safeItems.length === 0) {
    return `<p class="section-empty">Sem informações adicionais.</p>`
  }

  const rows = safeItems
    .map((item) => {
      const key = normalizeText(item?.k || "")
      const value = normalizeText(item?.v || "")
      return `<div class="kv-row"><span class="kv-key">${key || "-"}</span><span class="kv-value">${value || "-"}</span></div>`
    })
    .join("")

  return `<div class="kv-grid">${rows}</div>`
}

function renderSections(sections?: Section[] | null) {
  const safeSections = Array.isArray(sections) ? sections : []
  if (safeSections.length === 0) {
    return `<p class="section-empty">Nenhuma seção adicional.</p>`
  }

  return safeSections
    .map((section, index) => {
      const title = normalizeText(section?.title || `Seção ${index + 1}`)
      const kind = section?.kind === "kv" ? "kv" : "text"
      const content = kind === "kv" ? renderKvItems(section?.items) : renderTextBlock(section?.text)
      return `<details class="section-details" open>
        <summary>${title}</summary>
        <div class="section-content">${content}</div>
      </details>`
    })
    .join("")
}

function renderIpss(ipss?: Evolution["ipss"]) {
  if (!ipss) return ""
  const items = Array.isArray(ipss.items) ? ipss.items : []
  if (items.length === 0 && ipss.total == null && ipss.qualidade_vida == null) {
    return ""
  }

  const rows = items
    .map((item) => {
      const label = normalizeText(item?.label || "")
      const score = typeof item?.score === "number" ? item.score : null
      const normalizedScore = score != null ? Math.min(Math.max(score, 0), 5) : 0
      const width = `${(normalizedScore / 5) * 100}%`
      return `<tr>
        <td>${label || "-"}</td>
        <td class="ipss-score">${score != null ? score : "-"}</td>
        <td>
          <div class="score-bar"><span style="width:${width}"></span></div>
        </td>
      </tr>`
    })
    .join("")

  const totalBadge = ipss.total != null ? `<span class="badge badge-primary">Total: ${ipss.total}</span>` : ""
  const qualityBadge =
    ipss.qualidade_vida != null
      ? `<span class="badge badge-secondary">Qualidade de Vida: ${ipss.qualidade_vida}</span>`
      : ""

  return `<div class="ipss-card">
      <div class="section-header">
        <div class="section-title">
          ${iconClipboard}
          <h4>IPSS</h4>
        </div>
        <div class="badge-row">${totalBadge}${qualityBadge}</div>
      </div>
      <table class="ipss-table">
        <thead>
          <tr><th>Item</th><th>Score</th><th>Indicador</th></tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="3">Sem itens de IPSS.</td></tr>`}</tbody>
      </table>
    </div>`
}

const iconUser = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2-8 4.5V21h16v-2.5c0-2.5-3.6-4.5-8-4.5Z"/></svg>`
const iconFile = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 2.5L18.5 9H14Z"/></svg>`
const iconClock = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 10.4 3.2 3.2-1.4 1.4L11 13V6h2Z"/></svg>`
const iconClipboard = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 4h-1.2a3 3 0 0 0-5.6 0H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm-4-1a1 1 0 0 1 1 1h-2a1 1 0 0 1 1-1Z"/></svg>`
const iconLayers = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 9 5-9 5-9-5Zm0 9.5 7.5-4.1V14L12 18.5 4.5 14V7.4Z"/></svg>`

export function renderMedicalReportHtml(data: StructuredMedicalReport) {
  const patient = data?.patient || {}
  const evolucoes = Array.isArray(data?.evolucoes) ? data.evolucoes : []
  const globalSections = Array.isArray(data?.global_sections) ? data.global_sections : []
  const rawText = data?.raw_text_clean?.trim() || ""

  const patientInfo = [
    { label: "Código", value: patient.codigo },
    { label: "Nome", value: patient.nome },
    { label: "Nascimento", value: patient.nascimento },
    { label: "Telefone", value: patient.telefone },
  ]
    .map(
      (item) =>
        `<div class="info-item"><span>${item.label}</span><strong>${normalizeText(item.value || "") || "-"}</strong></div>`,
    )
    .join("")

  const evolucaoCards = evolucoes
    .map((evolucao, index) => {
      const title = normalizeText(evolucao?.title || "Evolução")
      const datetime = normalizeText(evolucao?.datetime || "Data não informada")
      const summary = renderTextBlock(evolucao?.summary)
      const fullText = evolucao?.full_text
        ? `<details class="section-details"><summary>Texto completo da evolução</summary><div class="section-content">${renderTextBlock(evolucao.full_text)}</div></details>`
        : ""
      const sections = renderSections(evolucao?.sections)
      const ipssHtml = renderIpss(evolucao?.ipss)
      return `<div class="timeline-item">
          <div class="timeline-marker">${index + 1}</div>
          <div class="card timeline-card">
            <div class="card-header">
              <div class="card-title">
                ${iconFile}
                <h3>${title}</h3>
              </div>
              <span class="badge badge-outline">${iconClock}<span>${datetime}</span></span>
            </div>
            ${summary ? `<div class="summary">${summary}</div>` : ""}
            ${ipssHtml}
            <div class="sections">${sections}</div>
            ${fullText}
          </div>
        </div>`
    })
    .join("")

  const globalSectionsHtml = globalSections.length
    ? `<div class="card">
        <div class="card-header">
          <div class="card-title">
            ${iconLayers}
            <h3>Resumo geral</h3>
          </div>
          <span class="badge badge-secondary">Seções globais</span>
        </div>
        <div class="sections">${renderSections(globalSections)}</div>
      </div>`
    : ""

  const rawTextBlock = rawText
    ? `<details class="section-details">
        <summary>Texto completo</summary>
        <div class="section-content">
          <pre>${escapeHtml(rawText)}</pre>
        </div>
      </details>`
    : `<p class="section-empty">Texto completo indisponível.</p>`

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Relatório médico</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f8fafc;
        --card: #ffffff;
        --text: #0f172a;
        --muted: #64748b;
        --primary: #2563eb;
        --accent: #14b8a6;
        --border: #e2e8f0;
        --shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
        background: var(--bg);
        color: var(--text);
      }

      h1, h2, h3, h4 {
        margin: 0;
        font-weight: 600;
      }

      .container {
        max-width: 1100px;
        margin: 0 auto;
        padding: 32px 20px 48px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .card {
        background: var(--card);
        border-radius: 18px;
        padding: 24px;
        box-shadow: var(--shadow);
        border: 1px solid var(--border);
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }

      .card-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .card-title svg {
        width: 22px;
        height: 22px;
        fill: var(--primary);
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        color: var(--primary);
        background: rgba(37, 99, 235, 0.12);
      }

      .badge svg { width: 14px; height: 14px; fill: currentColor; }

      .badge-secondary {
        color: #0f766e;
        background: rgba(20, 184, 166, 0.14);
      }

      .badge-outline {
        background: transparent;
        border: 1px solid var(--border);
        color: var(--muted);
      }

      .badge-row { display: flex; flex-wrap: wrap; gap: 8px; }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
        margin-top: 16px;
      }

      .info-item span {
        display: block;
        font-size: 12px;
        color: var(--muted);
        margin-bottom: 4px;
      }

      .info-item strong {
        font-size: 15px;
        font-weight: 600;
      }

      .timeline {
        position: relative;
        padding-left: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .timeline::before {
        content: "";
        position: absolute;
        top: 8px;
        bottom: 8px;
        left: 10px;
        width: 2px;
        background: var(--border);
      }

      .timeline-item {
        display: flex;
        gap: 16px;
        position: relative;
      }

      .timeline-marker {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--primary);
        color: #fff;
        font-size: 11px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-left: -2px;
      }

      .timeline-card {
        flex: 1;
      }

      .summary {
        margin-top: 12px;
        padding: 12px 16px;
        background: rgba(37, 99, 235, 0.06);
        border-radius: 12px;
        font-size: 14px;
        color: var(--text);
      }

      .sections {
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .section-details {
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 12px 16px;
        background: #fff;
      }

      .section-details summary {
        font-weight: 600;
        cursor: pointer;
        list-style: none;
      }

      .section-details summary::-webkit-details-marker { display: none; }

      .section-content { margin-top: 10px; font-size: 14px; color: var(--text); }

      .kv-grid { display: grid; gap: 8px; }

      .kv-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 12px;
        border-radius: 10px;
        background: #f8fafc;
      }

      .kv-key { color: var(--muted); font-weight: 600; font-size: 13px; }
      .kv-value { color: var(--text); font-size: 13px; }

      .section-text { margin: 0; line-height: 1.6; }
      .section-empty { color: var(--muted); font-size: 13px; margin: 0; }

      .ipss-card {
        margin-top: 16px;
        padding: 16px;
        border-radius: 14px;
        border: 1px solid rgba(37, 99, 235, 0.15);
        background: rgba(37, 99, 235, 0.05);
      }

      .ipss-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
        font-size: 13px;
      }

      .ipss-table th,
      .ipss-table td {
        text-align: left;
        padding: 8px;
        border-bottom: 1px solid rgba(15, 23, 42, 0.08);
      }

      .ipss-score { font-weight: 600; }

      .score-bar {
        width: 100%;
        height: 8px;
        background: #e2e8f0;
        border-radius: 999px;
        overflow: hidden;
      }

      .score-bar span {
        display: block;
        height: 100%;
        background: var(--accent);
      }

      pre {
        white-space: pre-wrap;
        word-break: break-word;
        margin: 0;
        font-family: "Fira Mono", "Courier New", monospace;
        font-size: 12px;
        color: var(--text);
      }

      @media (max-width: 768px) {
        .card { padding: 18px; }
        .timeline { padding-left: 16px; }
        .timeline::before { left: 6px; }
        .timeline-marker { width: 18px; height: 18px; font-size: 10px; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            ${iconUser}
            <h1>Relatório médico</h1>
          </div>
          <span class="badge">Documento estruturado</span>
        </div>
        <div class="info-grid">${patientInfo}</div>
      </div>

      ${globalSectionsHtml}

      <div class="card">
        <div class="card-header">
          <div class="card-title">
            ${iconFile}
            <h2>Evoluções clínicas</h2>
          </div>
          <span class="badge badge-outline">Timeline</span>
        </div>
        <div class="timeline">${evolucaoCards || `<p class="section-empty">Nenhuma evolução registrada.</p>`}</div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">
            ${iconLayers}
            <h2>Texto completo</h2>
          </div>
          <span class="badge badge-secondary">Fallback</span>
        </div>
        <div class="sections">${rawTextBlock}</div>
      </div>
    </div>
  </body>
</html>`
}
