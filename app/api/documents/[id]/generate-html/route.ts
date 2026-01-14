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
  <title>Relatório Urológico — Template</title>

  <!--
    TEMPLATE (SANITIZADO / SEM DADOS SENSÍVEIS)
    - Substitua {{placeholders}} pelos dados reais.
    - "Resumo médico" e "Orientações" podem ser escritos pelo médico.
      Se a IA puder, ela pode preencher versões genéricas com base no texto raw.
    - Seções estruturadas para: Conduta, Cirurgia, Evolução, PSA, Comorbidades, Educação.
    - IPSS: abre automaticamente ao carregar (se estiver presente).
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

    /* Details / accordion */
    details{
      border:1px solid rgba(0,91,255,.18);
      border-radius:14px;
      box-shadow:0 8px 18px rgba(0,0,0,.06);
      overflow:hidden;
      background:#fff;
      margin-top:12px;
    }
    summary{
      padding:16px 18px;
      cursor:pointer;
      font-weight:900;
      color:var(--primary);
      background:linear-gradient(180deg, rgba(0, 91, 255, 0.10), rgba(0, 91, 255, 0.03));
      border-bottom:1px solid rgba(0,91,255,.14);
      position:relative;
      list-style:none;
      user-select:none;
    }
    summary::-webkit-details-marker{display:none}
    summary::after{
      content:"+";
      position:absolute;
      right:16px;
      top:50%;
      transform:translateY(-50%);
      font-size:1.4em;
      color:rgba(0,91,255,.9);
    }
    details[open] summary::after{content:"-"}
    details > div{padding:14px 18px 18px 18px}

    /* Tables */
    table{
      width:100%;
      border-collapse:collapse;
      border:1px solid rgba(0,91,255,.18);
      border-radius:14px;
      overflow:hidden;
      background:#fff;
    }
    th,td{
      padding:12px 14px;
      text-align:left;
      border-bottom:1px solid rgba(0,91,255,.14);
      vertical-align:top;
      font-size:.95em;
    }
    th{
      font-weight:900;
      color:var(--primary2);
      background:linear-gradient(180deg, rgba(0, 91, 255, 0.12), rgba(0, 91, 255, 0.06));
    }
    tr:last-child td{border-bottom:none}

    /* PSA chart-like bars */
    .psa-block{
      display:grid;
      grid-template-columns: 1fr;
      gap:14px;
    }
    .psa-summary{
      border:1px solid rgba(0,91,255,.18);
      border-radius:14px;
      padding:14px 16px;
      background:linear-gradient(180deg, rgba(0, 91, 255, 0.06), rgba(0, 91, 255, 0.02));
    }
    .psa-summary .row{
      display:flex;gap:10px;flex-wrap:wrap;align-items:baseline;
      margin:0 0 8px 0;
    }
    .chip{
      display:inline-flex;
      align-items:center;
      gap:8px;
      padding:7px 10px;
      border-radius:999px;
      border:1px solid rgba(0,91,255,.25);
      background:rgba(0,91,255,.08);
      color:var(--primary2);
      font-weight:900;
      font-size:.88em;
      white-space:nowrap;
    }
    .chip.muted{
      background:rgba(31,42,55,.06);
      border-color:rgba(31,42,55,.12);
      color:rgba(31,42,55,.78);
    }

    .barlist{display:grid;gap:10px}
    .baritem{
      border:1px solid rgba(0,91,255,.18);
      border-radius:14px;
      padding:12px 12px;
      background:#fff;
    }
    .barhead{
      display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;
      font-weight:800;color:rgba(31,42,55,.82);
      margin-bottom:8px;
    }
    .barwrap{
      height:18px;
      border-radius:10px;
      background:rgba(0,91,255,.10);
      border:1px solid rgba(0,91,255,.18);
      overflow:hidden;
    }
    .bar{
      height:100%;
      width:0%;
      background:linear-gradient(90deg,var(--primary),var(--primary2));
      border-radius:10px;
      display:flex;justify-content:flex-end;align-items:center;
      padding-right:8px;
      color:#fff;font-weight:900;font-size:.78em;
      text-shadow:0 1px 0 rgba(0,0,0,.18);
      transition:width .5s ease;
    }

    /* IPSS score bars (kept) */
    .score-bar-container{
      background-color:rgba(0,91,255,.10);
      border:1px solid rgba(0,91,255,.18);
      border-radius:10px;
      height:22px;
      overflow:hidden;
      margin-top:10px;
      position:relative;
    }
    .score-bar{
      height:100%;
      width:0%;
      border-radius:10px;
      transition:width .5s ease-out;
      display:flex;
      align-items:center;
      justify-content:flex-end;
      padding-right:10px;
      color:#fff;
      font-weight:900;
      font-size:.8em;
      background:linear-gradient(90deg,var(--primary),var(--primary2));
    }
    .score-bar.mild{background:linear-gradient(90deg,#20c997,#12b886)}
    .score-bar.moderate{background:linear-gradient(90deg,#ffc107,#ffb300);color:#2b2b2b}
    .score-bar.severe{background:linear-gradient(90deg,#dc3545,#c82333)}
    .score-label{
      margin-top:6px;
      font-size:.9em;
      color:rgba(31,42,55,.70);
      text-align:right;
      font-weight:650;
    }

    /* Raw text */
    .raw pre{
      font-family:var(--mono);
      font-size:.85em;
      background:#f0f6ff;
      border:1px solid rgba(0,91,255,.18);
      border-radius:14px;
      padding:14px;
      max-height:420px;
      overflow:auto;
      white-space:pre-wrap;
      word-break:break-word;
      color:#334155;
      margin:0;
    }

    /* Small helpers */
    .muted{color:var(--muted)}
    .mt-8{margin-top:8px}
    .mt-12{margin-top:12px}
    .mt-16{margin-top:16px}
  </style>

  <script>
    // IPSS: abre automaticamente ao carregar a página, se existir.
    window.addEventListener('DOMContentLoaded', () => {
      const ipss = document.querySelector('[data-auto-open="ipss"]');
      if (ipss && !ipss.open) ipss.open = true;
    });
  </script>
</head>

<body>
  <div class="container">

    <!-- ============================================================
         CAPA / CABEÇALHO (TEMPLATE)
         ============================================================ -->
    <div class="card">
      <div class="hero">
        <div>
          <div class="kicker">{{clinic_section_title}} <!--  SEU HISTÓRICO CLÍNICO UROLÓGICO --></div>
          <h1 class="title">{{report_title}} <!--  Relatório de Acompanhamento Personalizado — Uma Visão Clara do Seu Tratamento e Evolução --></h1>
          <p class="subtitle">{{report_subtitle}} <!--  Documento de apoio para entendimento do tratamento, exames e próximos passos. --></p>

          <div class="pill" title="Identificação do paciente">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            {{patient_name}} <!-- ex: Paciente Exemplo -->
          </div>

          <div class="doctor-block">
            <p class="doctor-data"> <small>—  Dr. Paulo Henrique de Moura Reis Rua Padre Valdevino, 2000 - Fortaleza/CE CRM 3497 CE - RQE 1595 - RQE 1594 --></small></p>
          </div>
        </div>

        <div>
          <div class="info-grid">
            <div class="info-box">
              <div class="label">Data de Nascimento</div>
              <div class="value">{{patient_birth_date}} <span class="muted">({{patient_age}})</span></div>
            </div>
            <div class="info-box">
              <div class="label">Código / Prontuário</div>
              <div class="value">{{patient_record_code}} <!-- ex: 00000000 --></div>
            </div>
            <div class="info-box">
              <div class="label">Data do Relatório</div>
              <div class="value">{{report_date}} <!-- ex: 14/01/2026 --></div>
            </div>
            <div class="info-box">
              <div class="label">Contato</div>
              <div class="value muted">{{clinic_contact}} <!-- ex: (00) 0000-0000 | WhatsApp --></div>
            </div>
          </div>

          <div class="info-box mt-12">
            <div class="label">Identificadores (opcional)</div>
            <div class="value muted">
              {{optional_ids}}
              <!-- ex: Convênio: {{insurance}} | Cartão: {{card_number_masked}} | Documento: {{doc_masked}} -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================
         NOSSO COMPROMISSO COM VOCÊ (TEMPLATE)
         ============================================================ -->
    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l3 7h7l-5.5 4.1L18.5 21 12 16.8 5.5 21l2-7.9L2 9h7z"/>
        </svg>
        <h2>{{commitment_title}} <!-- ex: NOSSO COMPROMISSO COM VOCÊ --></h2>
      </div>

      <div class="editable-block">
        <div class="hint"></div>
        <p>{{commitment_paragraph_1}}
          <!-- ex: Na Clínica do Dr. Paulo Henrique de Moura, nosso compromisso é com o seu bem-estar. Este relatório foi criado para fornecer uma visão clara e compreensível do seu tratamento e evolução, reforçando a importância de um acompanhamento contínuo e personalizado. -->
        </p>
        <p>{{commitment_paragraph_2}}
          <!-- ex: Seu histórico é único: analisamos cada detalhe do seu prontuário para oferecer um plano de tratamento individualizado. -->
        </p>
        <p>{{commitment_paragraph_3}}
          <!-- ex: Comunicação clara: transformamos dados complexos em informações acessíveis. Foco no bem-estar: nosso objetivo é sua qualidade de vida e longevidade. -->
        </p>
      </div>
    </div>

    <!-- ============================================================
         RESUMO MÉDICO (resumo)
         ============================================================ -->
    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 6H6V7h12v2zm0 4H6v-2h12v2zm-6 4H6v-2h6v2z"/>
        </svg>
        <h2>Resumo médico</h2>
      </div>

      <div class="editable-block">
        <div class="hint">Resumo médico</div>
        <p>{{medical_summary}}
          <!-- ex IA (genérica): Paciente em seguimento urológico por {{diagnosis_main}}, com histórico de {{key_events}}. Evoluiu com {{current_status}}. Plano atual: {{plan_short}}. -->
        </p>
      </div>
    </div>

    <!-- ============================================================
         DISCUSSÃO DA CONDUTA E PLANEJAMENTO TERAPÊUTICO
         Justificativa clínica + decisão compartilhada
         ============================================================ -->
    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 14h-2v-2h2v2zm0-4h-2V6h2v6z"/>
        </svg>
        <h2>Discussão da conduta e planejamento terapêutico</h2>
      </div>

      <div class="editable-block">
        <div class="hint">Justificativa clínica + decisão compartilhada</div>
        <p>{{therapeutic_discussion}}
          <!-- ex: Foram consideradas as opções {{options_considered}}. Optou-se por {{chosen_option}} devido a {{clinical_rationale}}. A decisão foi compartilhada com o paciente/família, contemplando preferências, riscos e benefícios. -->
        </p>
      </div>
    </div>

    <!-- ============================================================
         A CIRURGIA: O QUE FOI FEITO E COMO FOI FEITO
         ============================================================ -->
    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 7l-5-5-3 3 5 5 3-3zM3 17l-1 5 5-1 9-9-4-4-9 9z"/>
        </svg>
        <h2>A cirurgia: o que foi feito e como foi feito</h2>
      </div>

      <div class="editable-block">
        <div class="hint">Descrição cirúrgica (resumo para o paciente)</div>
        <p>{{surgery_description}}
          <!-- ex: Em {{surgery_date}}, foi realizado {{procedure_name}}. Técnica: {{technique}}. Achados relevantes: {{findings}}. Intercorrências: {{complications_or_none}}. -->
        </p>
      </div>

      <details class="mt-12">
        <summary>Detalhes técnicos (opcional)</summary>
        <div>
          <p class="muted">{{surgery_technical_details}}
            <!-- ex: Acesso, tempo cirúrgico, anatomia, margens, dispositivos, etc. (evitar termos excessivamente técnicos se o objetivo for leigo) -->
          </p>
        </div>
      </details>
    </div>

    <!-- ============================================================
         EVOLUÇÃO PÓS-TRATAMENTO E SITUAÇÃO ATUAL
         ============================================================ -->
    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s-7-4.35-7-10a4 4 0 017-2 4 4 0 017 2c0 5.65-7 10-7 10z"/>
        </svg>
        <h2>Evolução pós-tratamento e situação atual</h2>
      </div>

      <div class="editable-block">
        <div class="hint">Resumo objetivo da evolução</div>
        <p>{{post_treatment_evolution}}
          <!-- ex: Após o tratamento, o paciente apresentou {{symptoms_change}}. No momento, encontra-se {{current_condition}}. Sintomas urinários: {{urinary_symptoms}}. Função sexual: {{sexual_function}}. Dor/qualidade de vida: {{qol_notes}}. -->
        </p>
      </div>
    </div>

    <!-- ============================================================
         ACOMPANHAMENTO DO PSA E EXAMES COMPLEMENTARES
         "A JORNADA DO PSA"
         - Análise em texto + tabela
         ============================================================ -->
    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 3h18v2H3V3zm2 6h14v12H5V9zm2 2v8h10v-8H7z"/>
        </svg>
        <h2>Acompanhamento do PSA e exames complementares</h2>
      </div>

      <div class="editable-block">
        <div class="hint">A jornada do PSA — evolução e resposta aos tratamentos</div>
        <p>{{psa_narrative}}
          <!-- ex: Observa-se tendência de {{trend}} desde {{start_period}}. O menor valor (nadir) foi {{psa_nadir}} em {{psa_nadir_date}}. A variação após {{treatment_event}} sugere {{interpretation}}. -->
        </p>
      </div>

      <div class="psa-block mt-16">
        <div class="psa-summary">
          <div class="row">
            <span class="chip">PSA atual: {{psa_current_value}} ng/mL</span>
            <span class="chip muted">Data: {{psa_current_date}}</span>
            <span class="chip">Nadir: {{psa_nadir_value}} ng/mL</span>
            <span class="chip muted">Data: {{psa_nadir_date}}</span>
          </div>
          <div class="row">
            <span class="chip muted">Tratamento(s): {{psa_related_treatments}}</span>
            <span class="chip muted">Observação: {{psa_notes_short}}</span>
          </div>
        </div>

        <!-- “Mini gráfico” por barras (opcional, 100% HTML/CSS) -->
        <div class="barlist">
          <!-- DUPLIQUE este bloco para cada ponto do PSA (ex.: últimos 6-12 exames)
               width: calc({{value}} / {{psa_scale_max}} * 100%)
               psa_scale_max: ex 20, 50, 100 (depende do caso)
          -->
          <div class="baritem">
            <div class="barhead">
              <span>{{psa_points[0].date}} <!-- ex: 10/10/2024 --></span>
              <span>{{psa_points[0].value}} ng/mL</span>
            </div>
            <div class="barwrap">
              <div class="bar" style="width: calc({{psa_points[0].value}} / {{psa_scale_max}} * 100%);">
                {{psa_points[0].value}}
              </div>
            </div>
          </div>

          <div class="baritem">
            <div class="barhead">
              <span>{{psa_points[1].date}}</span>
              <span>{{psa_points[1].value}} ng/mL</span>
            </div>
            <div class="barwrap">
              <div class="bar" style="width: calc({{psa_points[1].value}} / {{psa_scale_max}} * 100%);">
                {{psa_points[1].value}}
              </div>
            </div>
          </div>

          <!-- ... -->
        </div>

        <!-- Tabela do PSA -->
        <details class="mt-12" open>
          <summary>Análise da evolução do PSA (tabela)</summary>
          <div>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>PSA (ng/mL)</th>
                  <th>Contexto / Evento</th>
                  <th>Interpretação (texto curto)</th>
                </tr>
              </thead>
              <tbody>
                <!-- DUPLIQUE linhas conforme necessário -->
                <tr>
                  <td>{{psa_table[0].date}}</td>
                  <td>{{psa_table[0].value}}</td>
                  <td>{{psa_table[0].context}}</td>
                  <td>{{psa_table[0].interpretation}}</td>
                </tr>
                <tr>
                  <td>{{psa_table[1].date}}</td>
                  <td>{{psa_table[1].value}}</td>
                  <td>{{psa_table[1].context}}</td>
                  <td>{{psa_table[1].interpretation}}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>

        <!-- Exames complementares -->
        <details class="mt-12">
          <summary>Exames complementares (imagem, biópsia, anatomopatológico, etc.)</summary>
          <div>
            <p class="muted">{{complementary_exams_summary}}
              <!-- ex: RM próstata (PI-RADS...), biópsia (Gleason/ISUP), cintilografia, PET-PSMA, USG, etc. -->
            </p>

            <table class="mt-12">
              <thead>
                <tr>
                  <th>Exame</th>
                  <th>Data</th>
                  <th>Resultado / Achado principal</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{{exams[0].type}}</td>
                  <td>{{exams[0].date}}</td>
                  <td>{{exams[0].main_result}}</td>
                  <td>{{exams[0].notes}}</td>
                </tr>
                <tr>
                  <td>{{exams[1].type}}</td>
                  <td>{{exams[1].date}}</td>
                  <td>{{exams[1].main_result}}</td>
                  <td>{{exams[1].notes}}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>

    <!-- ============================================================
         SAÚDE INTEGRAL: GERENCIAMENTO DE COMORBIDADES
         ============================================================ -->
    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s-7-4.35-7-10a4 4 0 017-2 4 4 0 017 2c0 5.65-7 10-7 10z"/>
        </svg>
        <h2>Saúde integral: gerenciamento de comorbidades</h2>
      </div>

      <div class="editable-block">
        <div class="hint">Comorbidades + condutas associadas</div>
        <p>{{comorbidities_management}}
          <!-- ex: Pressão arterial, diabetes, DPOC, obesidade, saúde mental, sono, atividade física, tabagismo, etc. -->
        </p>
      </div>

      <details class="mt-12">
        <summary>Lista de comorbidades e controle (opcional)</summary>
        <div>
          <table>
            <thead>
              <tr>
                <th>Condição</th>
                <th>Status</th>
                <th>Tratamento/medicação</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{{comorbidities[0].name}}</td>
                <td>{{comorbidities[0].status}}</td>
                <td>{{comorbidities[0].treatment}}</td>
                <td>{{comorbidities[0].notes}}</td>
              </tr>
              <tr>
                <td>{{comorbidities[1].name}}</td>
                <td>{{comorbidities[1].status}}</td>
                <td>{{comorbidities[1].treatment}}</td>
                <td>{{comorbidities[1].notes}}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>

    <!-- ============================================================
         ORIENTAÇÕES E EDUCAÇÃO AO PACIENTE (EDITÁVEL)
         ============================================================ -->
    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l10 6-10 6L2 8l10-6zm0 13l10-6v11H2V9l10 6z"/>
        </svg>
        <h2>Orientações e educação ao paciente</h2>
      </div>

      <div class="editable-block">
        <div class="hint">Médico pode escrever aqui (IA pode sugerir versão genérica)</div>
        <p>{{patient_education}}
          <!-- ex IA (genérica): Manter acompanhamento conforme calendário; sinais de alerta; cuidados com medicação; hábitos saudáveis; quando procurar atendimento; próximos exames e retornos. -->
        </p>
      </div>

      <details class="mt-12">
        <summary>Plano de acompanhamento (próximos passos)</summary>
        <div>
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>O que fazer</th>
                <th>Objetivo</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{{followup[0].when}}</td>
                <td>{{followup[0].what}}</td>
                <td>{{followup[0].goal}}</td>
                <td>{{followup[0].notes}}</td>
              </tr>
              <tr>
                <td>{{followup[1].when}}</td>
                <td>{{followup[1].what}}</td>
                <td>{{followup[1].goal}}</td>
                <td>{{followup[1].notes}}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>

    <!-- ============================================================
         IPSS (OPCIONAL) — se existir no caso, abre automaticamente
         ============================================================ -->
    <div class="card">
      <div class="section-header">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 3h18v18H3V3zm4 4h10v2H7V7zm0 4h10v2H7v-2zm0 4h6v2H7v-2z"/>
        </svg>
        <h2>Escalas e questionários (opcional)</h2>
      </div>

      <details data-auto-open="ipss" open>
        <summary>IPSS — Escala Internacional de Sintomas Prostáticos</summary>
        <div>
          <p class="muted">{{ipss_intro}}
            <!-- ex: Questionário aplicado para avaliar sintomas urinários do trato inferior. -->
          </p>

          <table>
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
                <td>{{ipss.items[0].score}}</td>
                <td>{{ipss.items[0].desc}}</td>
              </tr>
              <tr>
                <td>2. Intervalo menor que duas horas</td>
                <td>{{ipss.items[1].score}}</td>
                <td>{{ipss.items[1].desc}}</td>
              </tr>
              <tr>
                <td>3. Jato intercortado</td>
                <td>{{ipss.items[2].score}}</td>
                <td>{{ipss.items[2].desc}}</td>
              </tr>
              <tr>
                <td>4. Urgência miccional</td>
                <td>{{ipss.items[3].score}}</td>
                <td>{{ipss.items[3].desc}}</td>
              </tr>
              <tr>
                <td>5. Jato fraco</td>
                <td>{{ipss.items[4].score}}</td>
                <td>{{ipss.items[4].desc}}</td>
              </tr>
              <tr>
                <td>6. Hesitação inicial (força p/ iniciar)</td>
                <td>{{ipss.items[5].score}}</td>
                <td>{{ipss.items[5].desc}}</td>
              </tr>
              <tr>
                <td>7. Nictúria</td>
                <td>{{ipss.items[6].score}}</td>
                <td>{{ipss.items[6].desc}}</td>
              </tr>
            </tbody>
          </table>

          <div class="mt-16">
            <p><strong>Score Total IPSS:</strong> <span style="font-weight:900;color:{{ipss.severity_color}}">{{ipss.total}}</span> ({{ipss.severity_label}})</p>
            <div class="score-bar-container">
              <div class="score-bar {{ipss.bar_class}}" style="width: calc({{ipss.total}} / 35 * 100%);">
                {{ipss.total}}/35
              </div>
            </div>
            <div class="score-label">0-7 Leve | 8-19 Moderado | 20-35 Severo</div>

            <p class="mt-12"><strong>Qualidade de Vida:</strong> <span style="font-weight:900;color:{{ipss.qol_color}}">{{ipss.qol}}</span> ({{ipss.qol_label}})</p>
            <div class="score-bar-container">
              <div class="score-bar" style="width: calc({{ipss.qol}} / 6 * 100%);">
                {{ipss.qol}}/6
              </div>
            </div>
            <div class="score-label">0-Ótimo | 1-Bem | 2-Satisfeito | 3-+/- | 4-Insatisfeito | 5-Infeliz | 6-Péssimo</div>
          </div>
        </div>
      </details>
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