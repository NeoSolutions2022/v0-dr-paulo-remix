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
- Sempre incluir seção final "Texto completo" com <details> e <pre>.

<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Relatório Clínico — Template</title>

  <!--
    TEMPLATE (SEM DADOS SENSÍVEIS)
    - Substitua os placeholders {{...}} pelos dados do paciente/consulta.
    - IPSS: abre automaticamente ao carregar a página (via atributo "open" + script de reforço).
    - Paleta: azuis mais fortes / mais presença visual.
  -->

  <style>
    :root {
      /* Azul mais presente */
      --primary-color: #005BFF;         /* azul forte */
      --primary-color-2: #003DCC;       /* azul mais escuro */
      --primary-glow: rgba(0, 91, 255, 0.22);

      --secondary-color: #6c757d;
      --success-color: #20c997;
      --info-color: #0dcaf0;
      --warning-color: #ffc107;
      --danger-color: #dc3545;

      --light-bg: #F3F7FF;              /* fundo levemente azulado */
      --dark-text: #1F2A37;
      --card-bg: #ffffff;
      --card-shadow: rgba(0, 0, 0, 0.08);
      --border-color: #dbe7ff;          /* borda azulada */
      --font-family: 'Segoe UI','Roboto','Helvetica Neue',Arial,sans-serif;
    }

    body {
      font-family: var(--font-family);
      background: radial-gradient(1200px 600px at 20% -10%, rgba(0, 91, 255, 0.12), transparent 60%),
                  radial-gradient(900px 500px at 90% 10%, rgba(0, 91, 255, 0.10), transparent 55%),
                  var(--light-bg);
      margin: 0;
      padding: 20px 0;
      color: var(--dark-text);
      line-height: 1.6;
    }

    .container {
      max-width: 920px;
      margin: 0 auto;
      padding: 0 15px;
    }

    .card {
      background-color: var(--card-bg);
      border-radius: 14px;
      box-shadow: 0 10px 24px var(--card-shadow);
      padding: 26px;
      margin-bottom: 24px;
      border: 1px solid var(--border-color);
      position: relative;
      overflow: hidden;
    }

    /* faixa superior azul nos cards para reforçar */
    .card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--primary-color), var(--primary-color-2));
      opacity: 0.9;
    }

    .card-header {
      display: flex;
      align-items: center;
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--border-color);
    }

    .card-header h2, .card-header h3 {
      margin: 0;
      font-size: 1.65em;
      color: var(--primary-color);
      flex-grow: 1;
      letter-spacing: -0.2px;
    }

    .card-header .icon {
      margin-right: 14px;
      color: var(--primary-color);
      filter: drop-shadow(0 6px 10px var(--primary-glow));
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 0.85em;
      font-weight: 700;
      margin-left: 10px;
      background-color: rgba(0, 91, 255, 0.10);
      color: var(--primary-color);
      border: 1px solid rgba(0, 91, 255, 0.25);
      white-space: nowrap;
    }

    .badge.primary   { background-color: rgba(0, 91, 255, 0.10); color: var(--primary-color); border-color: rgba(0, 91, 255, 0.25); }
    .badge.success   { background-color: rgba(32, 201, 151, 0.14); color: #0b6b4f; border: 1px solid rgba(32, 201, 151, 0.35); }
    .badge.warning   { background-color: rgba(255, 193, 7, 0.16); color: #7a5b00; border: 1px solid rgba(255, 193, 7, 0.35); }
    .badge.danger    { background-color: rgba(220, 53, 69, 0.14); color: #8a1f2c; border: 1px solid rgba(220, 53, 69, 0.35); }
    .badge.secondary { background-color: rgba(108, 117, 125, 0.12); color: #3f4a52; border: 1px solid rgba(108, 117, 125, 0.25); }

    .icon {
      width: 24px;
      height: 24px;
      vertical-align: middle;
      fill: currentColor;
    }

    /* Patient Header Card */
    .patient-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 14px;
    }
    .patient-info div {
      padding: 10px 12px;
      border: 1px solid rgba(0, 91, 255, 0.14);
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(0, 91, 255, 0.06), rgba(0, 91, 255, 0.02));
    }
    .patient-info div strong {
      display: block;
      font-size: 0.88em;
      color: rgba(0, 61, 204, 0.85);
      margin-bottom: 4px;
      letter-spacing: 0.2px;
    }
    .patient-info div span {
      font-size: 1.08em;
      color: var(--dark-text);
      font-weight: 600;
    }

    /* Timeline */
    .timeline {
      position: relative;
      padding-left: 30px;
      margin-left: 15px;
      border-left: 2px solid rgba(0, 91, 255, 0.22);
    }

    .timeline-item { position: relative; margin-bottom: 30px; }

    .timeline-marker {
      position: absolute;
      left: -40px;
      top: 0;
      background: linear-gradient(180deg, var(--primary-color), var(--primary-color-2));
      border: 3px solid var(--card-bg);
      border-radius: 50%;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 0.78em;
      font-weight: 800;
      box-shadow: 0 0 0 3px rgba(0, 91, 255, 0.35), 0 10px 18px var(--primary-glow);
    }

    .timeline-content {
      background-color: var(--card-bg);
      border-radius: 12px;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
      padding: 20px;
      border: 1px solid rgba(0, 91, 255, 0.18);
    }

    .timeline-date {
      font-size: 0.92em;
      color: rgba(31, 42, 55, 0.72);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      font-weight: 600;
    }
    .timeline-date .icon {
      margin-right: 8px;
      color: rgba(0, 91, 255, 0.85);
    }

    /* Accordion */
    details {
      background-color: var(--card-bg);
      border: 1px solid rgba(0, 91, 255, 0.18);
      border-radius: 12px;
      margin-bottom: 14px;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
      overflow: hidden;
    }

    summary {
      padding: 18px 22px;
      display: block;
      cursor: pointer;
      font-weight: 800;
      font-size: 1.05em;
      color: var(--primary-color);
      outline: none;
      position: relative;
      user-select: none;
      background: linear-gradient(180deg, rgba(0, 91, 255, 0.10), rgba(0, 91, 255, 0.03));
      border-bottom: 1px solid rgba(0, 91, 255, 0.14);
    }

    summary::-webkit-details-marker { display: none; }

    summary::after {
      content: '+';
      position: absolute;
      right: 18px;
      font-size: 1.5em;
      line-height: 1;
      transition: transform 0.2s ease;
      color: rgba(0, 91, 255, 0.9);
    }

    details[open] summary::after { content: '-'; }

    details > div { padding: 16px 22px 20px 22px; }

    /* IPSS Table */
    .ipss-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 0.95em;
      border: 1px solid rgba(0, 91, 255, 0.18);
      border-radius: 12px;
      overflow: hidden;
    }

    .ipss-table th, .ipss-table td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid rgba(0, 91, 255, 0.14);
    }

    .ipss-table th {
      background: linear-gradient(180deg, rgba(0, 91, 255, 0.12), rgba(0, 91, 255, 0.06));
      font-weight: 800;
      color: var(--primary-color-2);
    }

    .ipss-table tr:last-child td { border-bottom: none; }

    .ipss-score-summary {
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid rgba(0, 91, 255, 0.16);
    }

    .score-bar-container {
      background-color: rgba(0, 91, 255, 0.10);
      border: 1px solid rgba(0, 91, 255, 0.18);
      border-radius: 10px;
      height: 22px;
      overflow: hidden;
      margin-top: 10px;
      position: relative;
    }

    .score-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--primary-color), var(--primary-color-2));
      width: 0%;
      border-radius: 10px;
      transition: width 0.5s ease-out;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 10px;
      box-sizing: border-box;
      color: #fff;
      font-weight: 900;
      font-size: 0.8em;
      text-shadow: 0 1px 0 rgba(0,0,0,0.18);
    }

    .score-bar.mild { background: linear-gradient(90deg, #20c997, #12b886); }
    .score-bar.moderate { background: linear-gradient(90deg, #ffc107, #ffb300); color: #2b2b2b; text-shadow: none; }
    .score-bar.severe { background: linear-gradient(90deg, #dc3545, #c82333); }

    .score-label {
      margin-top: 6px;
      font-size: 0.9em;
      color: rgba(31, 42, 55, 0.70);
      text-align: right;
      font-weight: 600;
    }

    .quality-of-life-score .score-bar { background: linear-gradient(90deg, #0dcaf0, #0aa2c0); }
    .quality-of-life-score .score-bar.qol-0 { background: linear-gradient(90deg, #20c997, #12b886); }
    .quality-of-life-score .score-bar.qol-1 { background: linear-gradient(90deg, #20c997, #12b886); }
    .quality-of-life-score .score-bar.qol-2 { background: linear-gradient(90deg, #0dcaf0, #0aa2c0); }
    .quality-of-life-score .score-bar.qol-3 { background: linear-gradient(90deg, #ffc107, #ffb300); color: #2b2b2b; text-shadow: none; }
    .quality-of-life-score .score-bar.qol-4 { background: linear-gradient(90deg, #dc3545, #c82333); }
    .quality-of-life-score .score-bar.qol-5 { background: linear-gradient(90deg, #dc3545, #c82333); }
    .quality-of-life-score .score-bar.qol-6 { background: linear-gradient(90deg, #dc3545, #c82333); }

    /* Raw Text Fallback */
    .raw-text-details pre {
      background-color: #f0f6ff;
      border: 1px solid rgba(0, 91, 255, 0.18);
      border-radius: 12px;
      padding: 16px;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'Cascadia Code','Consolas','Monaco',monospace;
      font-size: 0.85em;
      color: #334155;
      max-height: 420px;
      overflow-y: auto;
    }

    /* Utility */
    .mb-3 { margin-bottom: 1rem; }
    .mt-3 { margin-top: 1rem; }
    .text-muted { color: rgba(31, 42, 55, 0.65); }
    .text-primary { color: var(--primary-color); }
    .text-success { color: #12b886; font-weight: 800; }
    .text-warning { color: #b58100; font-weight: 800; }
    .text-danger  { color: #c82333; font-weight: 800; }
  </style>

  <script>
    // IPSS: garante que abra automaticamente ao carregar a página
    // (mesmo se o placeholder/geração remover o atributo "open").
    window.addEventListener('DOMContentLoaded', () => {
      const ipss = document.querySelector('[data-auto-open="ipss"]');
      if (ipss && !ipss.open) ipss.open = true;
    });
  </script>
</head>

<body>
  <div class="container">

    <!-- ============================================================
         1) FICHA DO PACIENTE (TEMPLATE)
         ============================================================ -->
    <div class="card header-card">
      <div class="card-header">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
        <h2>Ficha do Paciente</h2>
      </div>

      <div class="patient-info">
        <div>
          <strong>Código</strong>
          <span>{{patient_code}} <!-- ex: 000123 --></span>
        </div>
        <div>
          <strong>Nome</strong>
          <span>{{patient_name}} <!-- ex: Paciente Exemplo --></span>
        </div>
        <div>
          <strong>Data de Nascimento</strong>
          <span>
            {{patient_birth_date}} <!-- ex: 01/01/1970 -->
            (<span class="text-muted">{{patient_age}} <!-- ex: 54 anos --></span>)
          </span>
        </div>
        <div>
          <strong>Telefone</strong>
          <span>{{patient_phone}} <!-- ex: (00) 00000-0000 --></span>
        </div>
      </div>
    </div>

    <!-- ============================================================
         2) EVOLUÇÕES / LINHA DO TEMPO (TEMPLATE)
         ============================================================ -->
    <div class="card">
      <div class="card-header">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.49 7.81 18 8.85 18 10c0 3.31-2.69 6-6 6s-6-2.69-6-6c0-1.15.51-2.19 1.17-2.83L6.17 5.17C4.85 6.5 4 8.18 4 10c0 4.42 3.58 8 8 8s8-3.58 8-8c0-1.82-.85-3.5-2.17-4.83z"/>
        </svg>
        <h3>Evoluções</h3>
      </div>

      <div class="timeline">

        <!-- ====== EVOLUÇÃO #1 ====== -->
        <div class="timeline-item">
          <div class="timeline-marker">1</div>

          <div class="timeline-content">
            <div class="timeline-date">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM5 7V6h14v1H5z"/>
              </svg>
              {{evolutions[0].date_br}} <!-- ex: 01/12/2025 -->
              <span class="badge secondary">{{evolutions[0].time}} <!-- ex: 14:30:00 --></span>
            </div>

            <p><strong>Coração:</strong> {{evolutions[0].heart_notes}} <!-- ex: medicações, achados, observações --></p>
            <p><strong>Pulmão:</strong> {{evolutions[0].lung_notes}} <!-- ex: história respiratória, DPOC, etc. --></p>
            <p><strong>Diabetes:</strong> {{evolutions[0].diabetes_notes}} <!-- ex: controlado / sem DM / etc. --></p>
            <p><strong>Cirurgias:</strong> {{evolutions[0].surgeries}} <!-- ex: lista de cirurgias prévias --></p>
            <p><strong>Internamentos:</strong> {{evolutions[0].hospitalizations}} <!-- ex: internações relevantes --></p>
            <p><strong>Alergias:</strong> {{evolutions[0].allergies}} <!-- ex: negadas / descreva --></p>
            <p><strong>Outras:</strong> {{evolutions[0].other_notes}} <!-- ex: histórico familiar, exame físico, etc. --></p>

            <!-- IPSS: ABRE AUTOMATICAMENTE (open + script) -->
            <details class="mt-3" data-auto-open="ipss" open>
              <summary>Escala Internacional de Sintomas Prostáticos (IPSS)</summary>
              <div>

                <table class="ipss-table">
                  <thead>
                    <tr>
                      <th>Sintoma</th>
                      <th>Score</th>
                      <th>Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1. Sensação de esvaziamento incompleto</td>
                      <td>{{evolutions[0].ipss.items[0].score}} <!-- ex: 0 --></td>
                      <td>{{evolutions[0].ipss.items[0].desc}} <!-- ex: Nenhuma --></td>
                    </tr>
                    <tr>
                      <td>2. Intervalo menor que duas horas</td>
                      <td>{{evolutions[0].ipss.items[1].score}}</td>
                      <td>{{evolutions[0].ipss.items[1].desc}}</td>
                    </tr>
                    <tr>
                      <td>3. Jato intercortado</td>
                      <td>{{evolutions[0].ipss.items[2].score}}</td>
                      <td>{{evolutions[0].ipss.items[2].desc}}</td>
                    </tr>
                    <tr>
                      <td>4. Urgência miccional</td>
                      <td>{{evolutions[0].ipss.items[3].score}}</td>
                      <td>{{evolutions[0].ipss.items[3].desc}}</td>
                    </tr>
                    <tr>
                      <td>5. Jato fraco</td>
                      <td>{{evolutions[0].ipss.items[4].score}}</td>
                      <td>{{evolutions[0].ipss.items[4].desc}}</td>
                    </tr>
                    <tr>
                      <td>6. Hesitação inicial (força p/ iniciar)</td>
                      <td>{{evolutions[0].ipss.items[5].score}}</td>
                      <td>{{evolutions[0].ipss.items[5].desc}}</td>
                    </tr>
                    <tr>
                      <td>7. Nictúria</td>
                      <td>{{evolutions[0].ipss.items[6].score}}</td>
                      <td>{{evolutions[0].ipss.items[6].desc}}</td>
                    </tr>
                  </tbody>
                </table>

                <div class="ipss-score-summary">
                  <p>
                    <strong>Score Total IPSS:</strong>
                    <span class="{{evolutions[0].ipss.severity_class}}">
                      {{evolutions[0].ipss.total}}
                    </span>
                    ({{evolutions[0].ipss.severity_label}} <!-- ex: Leve/Moderado/Severo -->)
                  </p>

                  <div class="score-bar-container">
                    <div
                      class="score-bar {{evolutions[0].ipss.bar_class}}"
                      style="width: calc({{evolutions[0].ipss.total}} / 35 * 100%);"
                    >
                      {{evolutions[0].ipss.total}}/35
                    </div>
                  </div>
                  <div class="score-label">0-7 Leve | 8-19 Moderado | 20-35 Severo</div>

                  <p class="mt-3">
                    <strong>Qualidade de Vida:</strong>
                    <span class="{{evolutions[0].ipss.qol_class}}">
                      {{evolutions[0].ipss.qol}}
                    </span>
                    ({{evolutions[0].ipss.qol_label}} <!-- ex: Ótimo/Bem/... -->)
                  </p>

                  <div class="score-bar-container quality-of-life-score">
                    <div
                      class="score-bar {{evolutions[0].ipss.qol_bar_class}}"
                      style="width: calc({{evolutions[0].ipss.qol}} / 6 * 100%);"
                    >
                      {{evolutions[0].ipss.qol}}/6
                    </div>
                  </div>
                  <div class="score-label">0-Ótimo | 1-Bem | 2-Satisfeito | 3-+/- | 4-Insatisfeito | 5-Infeliz | 6-Péssimo</div>
                </div>

              </div>
            </details>
            <!-- /IPSS -->

          </div>
        </div>
        <!-- /EVOLUÇÃO #1 -->


        <!-- ====== EVOLUÇÃO #2 (MODELO) ====== -->
        <div class="timeline-item">
          <div class="timeline-marker">2</div>

          <div class="timeline-content">
            <div class="timeline-date">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM5 7V6h14v1H5z"/>
              </svg>
              {{evolutions[1].date_br}} <span class="badge secondary">{{evolutions[1].time}}</span>
            </div>

            <p><strong>Coração:</strong> {{evolutions[1].heart_notes}}</p>
            <p><strong>Pulmão:</strong> {{evolutions[1].lung_notes}}</p>
            <p><strong>Diabetes:</strong> {{evolutions[1].diabetes_notes}}</p>
            <p><strong>Cirurgias:</strong> {{evolutions[1].surgeries}}</p>
            <p><strong>Internamentos:</strong> {{evolutions[1].hospitalizations}}</p>
            <p><strong>Alergias:</strong> {{evolutions[1].allergies}}</p>
            <p><strong>Outras:</strong> {{evolutions[1].other_notes}}</p>

            <!-- IPSS opcional (sem auto-open) -->
            <details class="mt-3">
              <summary>Escala Internacional de Sintomas Prostáticos (IPSS)</summary>
              <div>
                <p class="text-muted">Sem dados de IPSS nesta evolução (ou preencha conforme o padrão).</p>
              </div>
            </details>
          </div>
        </div>

      </div>
    </div>

    <!-- ============================================================
         3) TEXTO COMPLETO (RAW) — TEMPLATE
         ============================================================ -->
    <details class="card raw-text-details">
      <summary>Texto completo (Raw)</summary>
      <div>
        <pre>
{{raw_text}}
/*
Exemplo (SANITIZADO):
INFORMAÇÕES ADICIONAIS
==================================================
FICHA DO PACIENTE
Código: 000123
Nome: Paciente Exemplo
Data de Nascimento: 1970-01-01
Telefone: 00000000000

--- Evolução em 2025-12-01 14:30:00 ---
01/12/2025
CORAÇÃO - (descrição)
PULMÃO - (descrição)
...
*/
        </pre>
      </div>
    </details>

  </div>
</body>
</html>

`

type GeminiResponse = {
  rawText: string
  finishReason?: string | null
  safetyRatings?: unknown
}

async function callGemini(cleanText: string, apiKey: string): Promise<GeminiResponse> {
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
        maxOutputTokens: 100000,
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
  let finishReason: string | null | undefined
  let safetyRatings: unknown
  try {
    const geminiResponse = await callGemini(document.clean_text, apiKey)
    rawGeminiText = geminiResponse.rawText
    finishReason = geminiResponse.finishReason
    safetyRatings = geminiResponse.safetyRatings
    if (debug && isAdmin) {
      console.log("[gemini] raw output", {
        documentId,
        rawLength: rawGeminiText.length,
        finishReason,
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
      finishReason,
      safetyRatings,
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
        finishReason,
        safetyRatings,
      },
    })
  }

  return NextResponse.json({ html: sanitizedHtml })
}