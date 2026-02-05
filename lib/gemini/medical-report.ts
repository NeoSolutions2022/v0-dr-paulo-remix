export const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

export const geminiPrompt = `
Você receberá um texto clínico bruto (clean_text). Ele pode ter muitas seções e formatos.

RETORNE SOMENTE HTML COMPLETO E VÁLIDO. Não use markdown e não inclua explicações.
O HTML deve seguir o formato abaixo e estar pronto para ser exibido diretamente.
Não use scripts, iframes, object, embed, links externos, imagens externas ou fontes externas.

REQUISITOS VISUAIS:
- Visual de relatório médico moderno e limpo.
- Layout em cards com sombra suave, tipografia legível e espaçamento confortável.
- Ícones SVG inline (sem libs externas).
- Badges para datas/tags (ex: “IPSS”, “Evolução”).
- Timeline vertical para evoluções.
- Accordion para seções extras (usar <details>/<summary>).
- IPSS: tabela + barras de score feitas em CSS (sem libs).
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Relatório Urológico — Template</title>

  <!--
    TEMPLATE (SANITIZADO / SEM DADOS SENSÍVEIS)
    - Substitua {{placeholders}} pelos dados reais.
    - "Resumo médico" e "Orientações" podem ser escritos pelo médico.
      Se a IA puder, ela pode preencher com base no texto raw.
    - Seções estruturadas para: Conduta, Cirurgia, Evolução, PSA, Comorbidades, Educação.
    - Sem accordions: tudo sempre visível.
  -->

  <style>
    :root{
      --primary:#005BFF;
      --primary2:#003DCC;
      --ink:#1F2A37;
      --muted:rgba(31,42,55,.70);
      --bg:#F3F7FF;
      --card:#fff;
      --border:#DBE7FF;
      --shadow:rgba(0,0,0,.08);
      --glow:rgba(0,91,255,.22);

      --success:#12b886;
      --warning:#ffb300;
      --danger:#c82333;

      --font:'Segoe UI','Roboto','Helvetica Neue',Arial,sans-serif;
      --mono:'Cascadia Code','Consolas','Monaco',monospace;
    }

    *{box-sizing:border-box}
    body{
      font-family:var(--font);
      margin:0;
      padding:22px 0;
      color:var(--ink);
      background:
        radial-gradient(1200px 600px at 20% -10%, rgba(0, 91, 255, 0.12), transparent 60%),
        radial-gradient(900px 500px at 90% 10%, rgba(0, 91, 255, 0.10), transparent 55%),
        var(--bg);
      line-height:1.55;
    }
    .container{max-width:980px;margin:0 auto;padding:0 16px}
    .card{
      background:var(--card);
      border:1px solid var(--border);
      border-radius:16px;
      box-shadow:0 10px 24px var(--shadow);
      padding:26px;
      margin-bottom:20px;
      position:relative;
      overflow:hidden;
    }
    .card::before{
      content:"";
      position:absolute;left:0;right:0;top:0;height:4px;
      background:linear-gradient(90deg,var(--primary),var(--primary2));
      opacity:.95;
    }

    /* Header (Hero) */
    .hero{
      display:grid;
      grid-template-columns: 1.4fr 1fr;
      gap:18px;
      align-items:start;
    }
    @media (max-width: 860px){
      .hero{grid-template-columns:1fr}
    }
    .kicker{
      color:rgba(0,61,204,.85);
      font-weight:800;
      letter-spacing:.25px;
      text-transform:uppercase;
      font-size:.85em;
      margin-bottom:6px;
    }
    .title{
      margin:0;
      font-size:1.9em;
      letter-spacing:-.3px;
      color:var(--primary);
      line-height:1.15;
    }
    .subtitle{
      margin:10px 0 0 0;
      color:var(--muted);
      font-size:1.02em;
      font-weight:600;
    }
    .pill{
      display:inline-flex;
      align-items:center;
      gap:8px;
      padding:8px 12px;
      border-radius:999px;
      border:1px solid rgba(0,91,255,.25);
      background:rgba(0,91,255,.08);
      color:var(--primary2);
      font-weight:800;
      font-size:.92em;
      margin-top:12px;
      width:max-content;
    }
    .pill svg{width:18px;height:18px;fill:currentColor}

    .info-grid{
      display:grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap:12px;
    }
    .info-box{
      border:1px solid rgba(0,91,255,.14);
      border-radius:14px;
      padding:12px 14px;
      background:linear-gradient(180deg, rgba(0, 91, 255, 0.07), rgba(0, 91, 255, 0.02));
    }
    .info-box .label{
      font-size:.82em;
      color:rgba(0,61,204,.88);
      font-weight:900;
      letter-spacing:.2px;
      margin-bottom:4px;
      text-transform:uppercase;
    }
    .info-box .value{
      font-size:1.02em;
      font-weight:700;
      color:var(--ink);
      word-break:break-word;
    }
    .info-box .value.muted{color:var(--muted);font-weight:650}

    .doctor-block{
      margin-top:12px;
      padding:14px;
      border:1px solid rgba(0,91,255,.18);
      border-radius:14px;
      background:linear-gradient(180deg, rgba(0, 91, 255, 0.10), rgba(0, 91, 255, 0.03));
    }
    .doctor-line{margin:0;color:var(--ink);font-weight:700}
    .doctor-line small{color:var(--muted);font-weight:650}
    .doctor-cred{margin-top:6px;color:rgba(31,42,55,.78);font-weight:650}

    /* Section header */
    .section-header{
      display:flex;
      align-items:center;
      gap:12px;
      padding-bottom:12px;
      margin-bottom:14px;
      border-bottom:1px solid var(--border);
    }
    .section-header h2{
      margin:0;
      font-size:1.45em;
      letter-spacing:-.2px;
      color:var(--primary);
      flex:1;
    }
    .icon{
      width:26px;height:26px;fill:var(--primary);
      filter: drop-shadow(0 10px 18px var(--glow));
    }

    /* Rich text blocks the doctor can edit */
    .editable-block{
      border:1px dashed rgba(0,91,255,.35);
      border-radius:14px;
      padding:14px 16px;
      background:rgba(0,91,255,.05);
    }
    .editable-block .hint{
      font-size:.85em;
      font-weight:800;
      color:rgba(0,61,204,.92);
      margin-bottom:8px;
      text-transform:uppercase;
      letter-spacing:.2px;
    }
    .editable-block p{margin:0 0 10px 0}
    .editable-block p:last-child{margin-bottom:0}

    /* ✅ Static “accordion look” (no buttons / always visible) */
    .details-static{
      border:1px solid rgba(0,91,255,.18);
      border-radius:14px;
      box-shadow:0 8px 18px rgba(0,0,0,.06);
      overflow:hidden;
      background:#fff;
      margin-top:12px;
    }
    .details-title{
      padding:16px 18px;
      font-weight:900;
      color:var(--primary);
      background:linear-gradient(180deg, rgba(0, 91, 255, 0.10), rgba(0, 91, 255, 0.03));
      border-bottom:1px solid rgba(0,91,255,.14);
    }
    .details-body{
      padding:14px 18px 18px 18px;
    }

    /* Tables */
    table{border-collapse:collapse;width:100%}
    th,td{padding:12px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
    th{
      background:rgba(0,91,255,.06);
      font-weight:900;
      font-size:.95em;
    }
    tbody tr:hover{background:rgba(0,91,255,.03)}

    .badge{
      display:inline-flex;
      align-items:center;
      gap:6px;
      padding:4px 10px;
      border-radius:999px;
      background:rgba(0,91,255,.10);
      border:1px solid rgba(0,91,255,.25);
      color:var(--primary2);
      font-size:.82em;
      font-weight:800;
      margin-right:6px;
      margin-bottom:6px;
    }

    .timeline{
      position:relative;
      margin:10px 0 0 0;
      padding-left:26px;
    }
    .timeline:before{
      content:"";
      position:absolute;left:8px;top:4px;bottom:4px;width:2px;background:rgba(0,91,255,.35);
    }
    .event{
      position:relative;
      margin-bottom:12px;
      padding:12px 14px;
      border:1px solid rgba(0,91,255,.18);
      border-radius:12px;
      background:rgba(0,91,255,.04);
    }
    .event:before{
      content:"";
      position:absolute;left:-22px;top:16px;width:10px;height:10px;border-radius:50%;
      background:var(--primary);
      box-shadow:0 0 0 4px rgba(0,91,255,.16);
    }
    .event .date{
      font-weight:900;
      color:var(--primary2);
      font-size:.92em;
      margin-bottom:6px;
    }

    .scores{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    }
    @media (max-width: 720px){.scores{grid-template-columns:1fr}}
    .score{
      border:1px solid rgba(0,91,255,.2);
      border-radius:12px;
      padding:12px;
      background:rgba(0,91,255,.04);
    }
    .score strong{display:block;margin-bottom:6px}
    .bar{
      height:10px;border-radius:999px;background:rgba(0,91,255,.12);position:relative;overflow:hidden;
    }
    .bar span{
      position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:linear-gradient(90deg,var(--primary),var(--primary2));
    }

    .muted{color:var(--muted)}
    .mt-6{margin-top:24px}
    .mt-8{margin-top:32px}
    .mt-10{margin-top:40px}
    .mt-12{margin-top:48px}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    @media (max-width: 720px){.grid-2{grid-template-columns:1fr}}

    .inline-svg{
      width:18px;height:18px;fill:currentColor;vertical-align:middle;margin-right:6px;
    }
    .warning{
      border-left:4px solid var(--warning);
      padding-left:12px;
      margin:8px 0;
      color:#7a5200;
    }
    .danger{
      border-left:4px solid var(--danger);
      padding-left:12px;
      margin:8px 0;
      color:#7a1b1b;
    }
    .success{
      border-left:4px solid var(--success);
      padding-left:12px;
      margin:8px 0;
      color:#0f5132;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card hero">
      <div>
        <div class="kicker">Relatório Urológico</div>
        <h1 class="title">Resumo Clínico do Paciente</h1>
        <p class="subtitle">Documento gerado em {{report_date}} • ID {{document_hash}}</p>
        <div class="pill">
          <svg viewBox="0 0 24 24"><path d="M12 2l9 4.5v5.8c0 5.3-3.9 10.1-9 11.7C6.9 22.4 3 17.6 3 12.3V6.5L12 2z"/></svg>
          Documento assinado
        </div>
      </div>
      <div class="info-grid">
        <div class="info-box">
          <div class="label">Paciente</div>
          <div class="value">{{patient_name}}</div>
        </div>
        <div class="info-box">
          <div class="label">Data Nasc.</div>
          <div class="value">{{birth_date}}</div>
        </div>
        <div class="info-box">
          <div class="label">CPF</div>
          <div class="value">{{cpf}}</div>
        </div>
        <div class="info-box">
          <div class="label">Telefone</div>
          <div class="value muted">{{phone}}</div>
        </div>
      </div>
      <div class="doctor-block">
        <p class="doctor-line">Dr. Paulo Henrique de Moura Reis <small>(CRM 123456)</small></p>
        <div class="doctor-cred">Urologista • Especialista em Próstata • Clínica Urológica</div>
      </div>
    </div>

    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24"><path d="M12 2a6 6 0 0 1 6 6c0 2.2-1.2 4.1-3 5.2V17l-3 3-3-3v-3.8A6 6 0 0 1 6 8a6 6 0 0 1 6-6z"/></svg>
        <h2>Resumo médico</h2>
      </div>
      <div class="editable-block">
        <div class="hint">Resumo médico (editável)</div>
        <p>{{medical_summary}}</p>
      </div>
    </div>

    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24"><path d="M4 4h16v4H4V4zm0 6h16v10H4V10zm3 3v4h10v-4H7z"/></svg>
        <h2>Diagnóstico e Conduta</h2>
      </div>
      <div class="grid-2">
        <div class="editable-block">
          <div class="hint">Diagnóstico</div>
          <p>{{diagnosis}}</p>
        </div>
        <div class="editable-block">
          <div class="hint">Conduta principal</div>
          <p>{{treatment_plan}}</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24"><path d="M12 2l9 4.5v5.8c0 5.3-3.9 10.1-9 11.7C6.9 22.4 3 17.6 3 12.3V6.5L12 2z"/></svg>
        <h2>Cirurgia (caso aplicável)</h2>
      </div>
      <div class="details-static">
        <div class="details-title">Detalhes da cirurgia</div>
        <div class="details-body">
          <p>{{surgery_details}}</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24"><path d="M12 2a6 6 0 0 1 6 6c0 2.2-1.2 4.1-3 5.2V17l-3 3-3-3v-3.8A6 6 0 0 1 6 8a6 6 0 0 1 6-6z"/></svg>
        <h2>Evolução clínica</h2>
      </div>
      <div class="timeline">
        {{evolution_timeline}}
      </div>
    </div>

    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24"><path d="M3 5h18v14H3V5zm3 3v8h12V8H6z"/></svg>
        <h2>PSA (Histórico)</h2>
      </div>
      <div class="details-static">
        <div class="details-title">Tabela de PSA</div>
        <div class="details-body">
          {{psa_table}}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24"><path d="M4 4h16v16H4V4zm3 4h10v2H7V8zm0 4h10v2H7v-2z"/></svg>
        <h2>Comorbidades e Exames</h2>
      </div>
      <div class="grid-2">
        <div class="editable-block">
          <div class="hint">Comorbidades</div>
          <p>{{comorbidities}}</p>
        </div>
        <div class="editable-block">
          <div class="hint">Exames complementares</div>
          <p>{{exams_summary}}</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24"><path d="M12 2l9 4.5v5.8c0 5.3-3.9 10.1-9 11.7C6.9 22.4 3 17.6 3 12.3V6.5L12 2z"/></svg>
        <h2>IPSS</h2>
      </div>
      <div class="scores">
        {{ipss_scores}}
      </div>
    </div>

    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24"><path d="M12 2l9 4.5v5.8c0 5.3-3.9 10.1-9 11.7C6.9 22.4 3 17.6 3 12.3V6.5L12 2z"/></svg>
        <h2>Orientações ao paciente</h2>
      </div>
      <div class="editable-block">
        <div class="hint">Orientações</div>
        <p>{{patient_guidance}}</p>
      </div>
    </div>
  </div>
</body>
</html>
`

type GeminiResponse = {
  rawText: string
  finishReason?: string | null
  safetyRatings?: unknown
}

export async function callGemini(cleanText: string, apiKey: string): Promise<GeminiResponse> {
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
        maxOutputTokens: 120000,
        responseMimeType: "text/plain",
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error("Erro ao chamar Gemini", response.status, body)
    throw new Error("Gemini request failed")
  }

  const payload = await response.json()
  const candidate = payload?.candidates?.[0]
  const parts = candidate?.content?.parts
  const rawText = Array.isArray(parts)
    ? parts.map((part: { text?: string }) => (typeof part?.text === "string" ? part.text : "")).join("")
    : candidate?.content?.text || ""
  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    throw new Error("Gemini returned empty content")
  }

  return {
    rawText,
    finishReason: candidate?.finishReason ?? null,
    safetyRatings: candidate?.safetyRatings ?? null,
  }
}
