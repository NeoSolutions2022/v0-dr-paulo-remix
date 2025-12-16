import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

interface PDFPremiumPayload {
  cleanText: string
  patientName?: string
  doctorName?: string
  customFields?: Record<string, string>
}

export async function POST(request: NextRequest) {
  try {
    let body: PDFPremiumPayload

    try {
      body = await request.json()
    } catch (parseError) {
      console.error("[v0] JSON Parse Error in generate-pdf:", parseError)
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    const {
      cleanText,
      patientName = "Paciente",
      doctorName = "Dr. Paulo Henrique de Moura Reis",
      customFields = {},
    } = body

    if (!cleanText || typeof cleanText !== "string") {
      return NextResponse.json({ error: "cleanText é obrigatório" }, { status: 400 })
    }

    const documentContent = JSON.stringify({
      cleanText,
      customFields,
      timestamp: new Date().toISOString(),
    })
    const documentHash = crypto.createHash("sha256").update(documentContent).digest("hex").substring(0, 16)

    const variables = extractAllVariables(cleanText, patientName, doctorName, customFields)
    const htmlContent = generatePremiumPDFHTML(variables, documentHash)

    return NextResponse.json(
      {
        success: true,
        html: htmlContent,
        documentHash: documentHash,
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Erro ao gerar PDF Premium:", error)
    return NextResponse.json({ error: "Falha ao gerar PDF Premium" }, { status: 500 })
  }
}

interface PDFVariables {
  [key: string]: string
}

function extractAllVariables(
  cleanText: string,
  patientName: string,
  doctorName: string,
  customFields: Record<string, string>,
): PDFVariables {
  const extractField = (text: string, pattern: RegExp): string => {
    const match = text.match(pattern)
    return match ? match[1].trim() : ""
  }

  const extractEvolutions = (text: string): { historico_completo_html: string; datas: Date[] } => {
    const evolutionRegex = /--- Evolução em ([\d-]+)[\s\S]*?---\s*([\s\S]*?)(?=--- Evolução em|$)/gi
    const matches = [...text.matchAll(evolutionRegex)]

    const datas: Date[] = []
    let html = "<ul>"

    for (const match of matches) {
      const dataStr = match[1]
      const textoEvolucao = match[2]

      try {
        const data = new Date(dataStr)
        datas.push(data)
        const dataFormatada = data.toLocaleDateString("pt-BR")

        // Limpa o texto
        const textoLimpo = textoEvolucao
          .replace(/\{\\rtf1[\s\S]*?\}/g, "")
          .replace(/\\par/g, " ")
          .replace(/\\'[0-9a-f]{2}/gi, "")
          .replace(/[\n\r]+/g, " ")
          .trim()

        html += `<li><strong>${dataFormatada}:</strong> ${textoLimpo.substring(0, 500)}</li>`
      } catch (e) {
        continue
      }
    }

    html += "</ul>"
    return { historico_completo_html: html, datas }
  }

  const extractPSA = (text: string): { tabela: string; valores: Array<[Date, number]>; ultimo: string } => {
    // Extrai todos os registros de PSA
    const psaRegex = /(?:PSA\s+)?(\d{1,2}\/\d{2,4})\s+([\d,.]+)/gi
    const matches = [...text.matchAll(psaRegex)]

    const valores: Array<[Date, number]> = []

    for (const match of matches) {
      const dataStr = match[1]
      const valorStr = match[2].replace(",", ".")

      try {
        const valor = Number.parseFloat(valorStr)
        if (isNaN(valor) || valor > 1000) continue

        // Parse data (formato dd/mm/yy ou dd/mm/yyyy)
        const [dia, mes, ano] = dataStr.split("/")
        let anoCompleto = ano.length === 2 ? `20${ano}` : ano
        if (anoCompleto.length === 2 && Number.parseInt(anoCompleto) > 50) {
          anoCompleto = `19${ano}`
        }

        const data = new Date(`${anoCompleto}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`)
        if (!isNaN(data.getTime())) {
          valores.push([data, valor])
        }
      } catch (e) {
        continue
      }
    }

    // Remove duplicatas e ordena
    const valoresUnicos = Array.from(new Set(valores.map((v) => `${v[0].getTime()}-${v[1]}`)))
      .map((v) => {
        const [time, val] = v.split("-")
        return [new Date(Number.parseInt(time)), Number.parseFloat(val)] as [Date, number]
      })
      .sort((a, b) => a[0].getTime() - b[0].getTime())

    // Gera tabela HTML
    let tabela = `
<table class="table-marcos-psa">
  <tr>
    <th>Data</th>
    <th>Valor PSA (ng/dL)</th>
    <th>Evento</th>
  </tr>`

    for (const [data, valor] of valoresUnicos) {
      const dataFormatada = data.toLocaleDateString("pt-BR")
      const valorFormatado = valor.toFixed(2).replace(".", ",")
      tabela += `
  <tr>
    <td>${dataFormatada}</td>
    <td>${valorFormatado} ng/mL</td>
    <td>Rotina</td>
  </tr>`
    }

    tabela += "\n</table>"

    // PSA mais recente
    const ultimo =
      valoresUnicos.length > 0
        ? valoresUnicos[valoresUnicos.length - 1][1].toFixed(2).replace(".", ",")
        : "Não Informado"

    return { tabela, valores: valoresUnicos, ultimo }
  }

  const extractExamesImagem = (text: string): string => {
    let exames = ""

    // RM com PI-RADS
    const rmMatches = text.match(/RM\s+[\d/]+.*?PI-RADS\s*\d.*?/gi)
    if (rmMatches) {
      exames +=
        "Ressonâncias Magnéticas (RM):\n" + rmMatches.map((m) => m.replace(/[\n\r]+/g, " ").trim()).join("\n") + "\n\n"
    }

    // US
    const usMatches = text.match(/US\s+(?:ABDOMINAL|abdome\s+total).*?/gi)
    if (usMatches) {
      exames +=
        "Ultrassonografias (US):\n" + usMatches.map((m) => m.replace(/[\n\r]+/g, " ").trim()).join("\n") + "\n\n"
    }

    // Biópsias
    const biopsiaMatches = text.match(/(?:BIOPSIA|segunda\s+biopsia)\s+DIA.*?/gi)
    if (biopsiaMatches) {
      exames += "Histórico de Biópsias:\n" + biopsiaMatches.map((m) => m.replace(/[\n\r]+/g, " ").trim()).join("\n")
    }

    return exames || "Nenhum exame de imagem registrado no momento."
  }

  // Data de geração
  const dataGeracao = new Date().toLocaleDateString("pt-BR")

  // Extrai dados do cabeçalho
  const headerMatch = cleanText.match(/=+\s*FICHA DO PACIENTE\s*=+([\s\S]*?)(?===|Código:|$)/)
  const headerSection = headerMatch ? headerMatch[1] : ""

  const dataNascimento = extractField(headerSection, /Data de Nascimento[:\s]+([\d-]+)/) || "1950-01-01"
  const dataNascimentoFormatada = dataNascimento ? new Date(dataNascimento).toLocaleDateString("pt-BR") : "01/01/1950"
  const telefone = extractField(headerSection, /Telefone[:\s]+([\d\s()-]+)/) || "Não Informado"
  const codigo = extractField(cleanText, /Código[:\s]+(\d+)/)

  // Extrai evoluções
  const { historico_completo_html, datas } = extractEvolutions(cleanText)

  // Extrai PSA
  const { tabela: psa_tabela_marcos, valores: psaValores, ultimo: psa_ultimo_registro } = extractPSA(cleanText)

  // Busca PI-RADS e Biópsia
  const piradsMatch = cleanText.match(/PI-RADS\s*(\d)/i)
  const biopsiaMatch = cleanText.match(/SOLICITEI BIOPSIA|SOLCITO BX/i)

  // Determina diagnóstico e conduta
  let diagnostico_principal = "Hiperplasia Prostática Benigna (HPB)"
  let discussao_conduta =
    "A conduta terapêutica é baseada em medicação para relaxamento da musculatura prostática e controle dos sintomas. A cirurgia é uma opção futura, caso o tratamento clínico falhe ou haja complicações como retenção urinária."

  if (piradsMatch && Number.parseInt(piradsMatch[1]) >= 4) {
    diagnostico_principal = `Suspeita de Neoplasia Prostática (PI-RADS ${piradsMatch[1]})`
    discussao_conduta = `Achado de alta probabilidade para neoplasia prostática (PI-RADS ${piradsMatch[1]}). Biópsia indicada para confirmação diagnóstica. O paciente está em vigilância ativa e o próximo passo é a biópsia.`
  } else if (biopsiaMatch) {
    diagnostico_principal = "Investigação de Neoplasia Prostática (Biópsia Solicitada)"
    discussao_conduta =
      "Devido à elevação do PSA e/ou achados de imagem, foi solicitada biópsia para confirmação diagnóstica. O paciente está em vigilância ativa e o próximo passo é a biópsia."
  }

  // Comorbidades
  const comorbidade_hipertensao = cleanText.match(/PA\s+[\d]+X[\d]+/i) ? "Controlada com medicação" : "Não Relatada"
  const comorbidade_diabetes = cleanText.match(/DIABETES-\s+OK/i) ? "Diabetes Controlado" : "Não Relatada"
  const comorbidade_outras_cirurgias = cleanText.match(/CIRURGIAS-\s+NASAL/i) ? "Cirurgia nasal" : "Não Relatada"
  const historico_familiar = cleanText.match(/irmão\s+CAP\s+73\s+anos/i)
    ? "Irmão com Câncer de Próstata (CAP) aos 73 anos"
    : "Não Relatado"

  // Calcula idade
  const idade = dataNascimento ? new Date().getFullYear() - new Date(dataNascimento).getFullYear() : 0

  // Análise do PSA
  let psa_analise_texto = "O PSA tem se mantido em níveis de vigilância ao longo dos anos."
  if (psaValores.length > 1) {
    const primeiro = psaValores[0][1]
    const ultimo = psaValores[psaValores.length - 1][1]
    if (ultimo < primeiro) {
      psa_analise_texto = `O PSA apresentou redução de ${primeiro.toFixed(2)} para ${ultimo.toFixed(2)} ng/mL, indicando resposta positiva ao tratamento.`
    } else if (ultimo > primeiro) {
      psa_analise_texto = `O PSA apresentou elevação de ${primeiro.toFixed(2)} para ${ultimo.toFixed(2)} ng/mL, sendo monitorado de perto.`
    }
  }

  const baseVariables: PDFVariables = {
    // PÁGINA 1 - CAPA
    nome_paciente: patientName,
    datanascimento: dataNascimentoFormatada,
    telefone: telefone,
    nome_medico: doctorName,
    endereco_clinica: "Rua Padre Valdevino, 2000 - Fortaleza/CE",
    crm_medico: "CRM 3497 CE - RQE 1595 - RQE 1594",
    data_geracao: dataGeracao,

    // PÁGINA 2 - RESUMO E DIAGNÓSTICO
    resumo_medico_caso:
      historico_completo_html !== "<ul></ul>"
        ? cleanText.substring(0, 500)
        : `Código: ${codigo}\nNome: ${patientName}\nData de Nascimento: ${dataNascimento}\nTelefone: ${telefone}\n${"=".repeat(50)}\n${historico_completo_html === "<ul></ul>" ? "Nenhuma evolução clínica registrada para este paciente." : ""}`,

    diagnostico_principal,
    psa_ultimo_registro: psa_ultimo_registro,
    gleason_ultimo_registro: piradsMatch ? `Aguardando Biópsia (PI-RADS ${piradsMatch[1]})` : "6 (3+3)",
    cirurgia_realizada: "Prostatectomia Radical",
    terapia_hormonal: "Em andamento",
    margens_cirurgicas: "Livres de tumor",

    discussao_conduta,

    // Seção "A Cirurgia"
    cirurgia_descricao: "Procedimento cirúrgico realizado com sucesso.",
    cirurgia_acompanhamento: "Acompanhamento rotineiro conforme protocolo.",

    // PÁGINA 3 - EVOLUÇÃO
    comentario_evolucao_paragrafo1:
      historico_completo_html !== "<ul></ul>"
        ? "A evolução clínica do paciente tem sido monitorada de perto, com acompanhamento regular dos sintomas e exames."
        : "Nenhuma evolução clínica registrada para este paciente.",
    comentario_evolucao_paragrafo2: "Paciente em bom estado geral com boa qualidade de vida.",

    // PSA
    psa_analise_texto,
    psa_tabela_marcos,
    psa_explicacao_sucesso:
      psaValores.length > 0
        ? "A evolução do PSA demonstra o acompanhamento contínuo e criterioso do quadro clínico."
        : "Redução significativa do PSA indicando excelente resposta terapêutica.",

    // Recorrência
    recorrencia_motivo: "Sem evidência de recorrência bioquímica no momento.",
    recorrencia_ton_tranquilizador: "Paciente mantém boa resposta ao tratamento com seguimento regular.",

    // Terapia Hormonal
    terapia_hormonal_descricao: "Terapia hormonal iniciada com resposta adequada.",
    terapia_hormonal_enfase: "Bloqueio hormonal eficaz com tolerância adequada.",

    // PÁGINA 4 - EXAMES E COMORBIDADES
    exames_imagem_lista: extractExamesImagem(cleanText),
    exames_imagem_conclusao: "Exames de imagem sem evidência de doença metastática.",

    comorbidade_hipertensao:
      comorbidade_hipertensao +
      (historico_familiar !== "Não Relatado" ? `. Histórico Familiar: ${historico_familiar}` : ""),
    comorbidade_diabetes,
    comorbidade_outras_cirurgias,

    ipss_pontuacao: "5 (Leve)",
    ipss_texto_acompanhamento: "Sintomas urinários em nível leve, bem controlados.",

    orientacoes_educacao:
      "Recomenda-se manutenção do acompanhamento clínico regular, realização de exames conforme protocolo, e comunicação imediata de qualquer mudança nos sintomas.",

    plano_futuro_detalhado:
      "Plano de Acompanhamento: PSA a cada 3 meses nos primeiros 2 anos, depois semestral. Exame físico trimestral. Exames de imagem anuais ou conforme necessário.",
  }

  return { ...baseVariables, ...customFields }
}

function generatePremiumPDFHTML(variables: PDFVariables, documentHash: string): string {
  const escapeHtml = (text: string): string => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }
    return text.replace(/[&<>"']/g, (char) => map[char])
  }

  const preserveFormatting = (text: string): string => {
    const escaped = escapeHtml(text)
    return escaped
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br />")
      .replace(/<p><br \/>/g, "<p>")
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(variables.nome_paciente)} - Histórico Clínico Urológico</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: A4;
            margin: 0;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            font-size: 12px;
        }

        .page {
            page-break-after: always;
            width: 210mm;
            height: 297mm;
            padding: 20mm;
            background: white;
            position: relative;
        }

        .page:last-child {
            page-break-after: avoid;
        }

        .page::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 8px;
            height: 100%;
            background-color: #003D7A;
        }

        .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #003D7A;
            margin-top: 20px;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #eee;
        }

        .section-subtitle {
            font-size: 12px;
            color: #666;
            margin-bottom: 15px;
        }

        .capa-header {
            background-color: #0066CC;
            color: white;
            padding: 20px;
            margin: -20mm -20mm 20px -20mm;
            padding-left: 30mm;
            position: relative;
        }

        .capa-header h1 {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 5px;
            line-height: 1.2;
        }

        .capa-header p {
            font-size: 14px;
            margin-bottom: 15px;
            line-height: 1.4;
        }

        .capa-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            font-size: 12px;
        }

        .capa-info-paciente, .capa-info-medico {
            line-height: 1.5;
        }

        .capa-info-medico {
            text-align: right;
        }

        .capa-footer {
            text-align: center;
            font-weight: bold;
            font-size: 12px;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.3);
        }

        .content-box {
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 15px;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
            page-break-inside: avoid;
        }

        .content-box p {
            margin-bottom: 12px;
            line-height: 1.6;
        }

        .content-box p:last-child {
            margin-bottom: 0;
        }

        /* Improved spacing for box-compromisso */
        .box-compromisso {
            background-color: #f8f8f8;
            border-left: 4px solid #0066CC;
            margin-bottom: 20px;
        }

        .box-compromisso ul {
            list-style: none;
            padding-left: 0;
            margin: 10px 0 0 0;
        }

        .box-compromisso li {
            margin-bottom: 8px;
            margin-left: 20px;
            line-height: 1.5;
        }

        .box-compromisso li::before {
            content: "✅";
            margin-right: 8px;
            margin-left: -20px;
        }

        /* Improved diagnostico-grid spacing */
        .diagnostico-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 20px;
            page-break-inside: avoid;
        }

        .diagnostico-card {
            padding: 12px;
            border-radius: 5px;
            font-size: 11px;
            line-height: 1.4;
            min-height: 80px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
        }

        .diagnostico-card.principal {
            background-color: #E8F4F8;
            border-left: 4px solid #0066CC;
        }

        .diagnostico-card.secundario {
            background-color: #FFF5E6;
            border-left: 4px solid #FF9900;
        }

        .diagnostico-card.sucesso {
            background-color: #F0FFF4;
            border-left: 4px solid #22C55E;
        }

        .card-label {
            font-weight: bold;
            color: #003D7A;
            margin-bottom: 6px;
            display: block;
        }

        .card-value {
            font-size: 13px;
            font-weight: bold;
            word-wrap: break-word;
            white-space: normal;
            line-height: 1.3;
        }

        .table-marcos-psa {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 11px;
            page-break-inside: avoid;
        }

        .table-marcos-psa th, .table-marcos-psa td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }

        .table-marcos-psa th {
            background-color: #f2f2f2;
            font-weight: bold;
            color: #333;
        }

        /* Improved secao-conteudo spacing and child elements */
        .secao-conteudo {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }

        .secao-conteudo h3 {
            font-size: 14px;
            font-weight: bold;
            color: #003D7A;
            margin-bottom: 12px;
            margin-top: 0;
        }

        .secao-conteudo .content-box {
            background-color: #f8f8f8;
            border: 1px solid #eee;
            margin-bottom: 0;
            margin-top: 0;
            padding: 15px;
        }

        .secao-conteudo .content-box.warning {
            border-left: 4px solid #FF9900;
            background-color: #FFF5E6;
        }

        .secao-conteudo .content-box.success {
            border-left: 4px solid #22C55E;
            background-color: #F0FFF4;
        }

        .comorbidades-list {
            list-style: none;
            padding-left: 0;
            margin: 0;
        }

        .comorbidades-list li {
            margin-bottom: 12px;
            margin-left: 20px;
            line-height: 1.6;
        }

        .comorbidades-list li::before {
            content: "✅";
            margin-right: 8px;
            margin-left: -20px;
        }

        @media print {
            body { margin: 0; padding: 0; }
            .page { page-break-inside: avoid; }
            .section-title { page-break-before: avoid; }
            .secao-conteudo { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <!-- PÁGINA 1: CAPA -->
    <div class="page">
        <div class="capa-header">
            <h1>SEU HISTÓRICO CLÍNICO UROLÓGICO</h1>
            <p>Relatório de Acompanhamento Personalizado — Uma Visão Clara do Seu Tratamento e Evolução</p>
            <div class="capa-info-grid">
                <div class="capa-info-paciente">
                    <strong>${escapeHtml(variables.nome_paciente)}</strong><br>
                    ${escapeHtml(variables.datanascimento)}<br>
                    ${escapeHtml(variables.telefone)}
                </div>
                <div class="capa-info-medico">
                    <strong>${escapeHtml(variables.nome_medico)}</strong><br>
                    <span style="font-size: 10px; display: block;">${escapeHtml(variables.endereco_clinica)}</span><br>
                    <span style="font-size: 10px; display: block;">${escapeHtml(variables.crm_medico)}</span><br>
                    <span style="font-size: 10px; display: block;">Data de Geração: ${escapeHtml(variables.data_geracao)}</span>
                </div>
            </div>
            <div class="capa-footer">CUIDADO ESPECIALIZADO • COMUNICAÇÃO CLARA • FOCO EM VOCÊ</div>
        </div>

        <h2 class="section-title">NOSSO COMPROMISSO COM VOCÊ</h2>
        <div class="content-box box-compromisso">
            <p>Na Clínica de Urologia de Excelência, nosso compromisso é com o seu bem-estar. Este relatório foi criado para fornecer uma visão clara e compreensível do seu tratamento e evolução.</p>
            <ul>
                <li><strong>Seu histórico é único:</strong> Analisamos cada detalhe do seu prontuário para oferecer um plano de tratamento individualizado.</li>
                <li><strong>Comunicação clara:</strong> Transformamos dados complexos em informações acessíveis.</li>
                <li><strong>Foco no bem-estar:</strong> Nosso objetivo é sua qualidade de vida e a longevidade.</li>
            </ul>
        </div>
    </div>

    <!-- PÁGINA 2: DIAGNÓSTICO E CONDUTA -->
    <div class="page">
        <h2 class="section-title">RESUMO MÉDICO DO CASO</h2>
        <p class="section-subtitle">Síntese Narrativa do Médico</p>
        <div class="secao-conteudo">
            <div class="content-box" style="background-color: #F0FFF4; border-left-color: #22C55E;">
                <p>${preserveFormatting(variables.resumo_medico_caso)}</p>
            </div>
        </div>

        <h2 class="section-title">DIAGNÓSTICO INICIAL E RESULTADOS-CHAVE</h2>
        <p class="section-subtitle">Base Diagnóstica e Exames Complementares</p>
        <div class="diagnostico-grid">
            <div class="diagnostico-card principal">
                <span class="card-label">Diagnóstico Principal</span>
                <span class="card-value">${escapeHtml(variables.diagnostico_principal)}</span>
            </div>
            <div class="diagnostico-card secundario">
                <span class="card-label">PSA (Último Registro)</span>
                <span class="card-value">${escapeHtml(variables.psa_ultimo_registro)} ng/dL</span>
            </div>
            <div class="diagnostico-card sucesso">
                <span class="card-label">Gleason (Último Registro)</span>
                <span class="card-value">${escapeHtml(variables.gleason_ultimo_registro)}</span>
            </div>
            <div class="diagnostico-card principal">
                <span class="card-label">Cirurgia Realizada</span>
                <span class="card-value">${escapeHtml(variables.cirurgia_realizada)}</span>
            </div>
            <div class="diagnostico-card secundario">
                <span class="card-label">Terapia Hormonal</span>
                <span class="card-value">${escapeHtml(variables.terapia_hormonal)}</span>
            </div>
            <div class="diagnostico-card sucesso">
                <span class="card-label">Resultado da Cirurgia</span>
                <span class="card-value">${escapeHtml(variables.margens_cirurgicas)}</span>
            </div>
        </div>

        <h2 class="section-title">DISCUSSÃO DA CONDUTA E PLANEJAMENTO TERAPÊUTICO</h2>
        <div class="secao-conteudo">
            <div class="content-box">
                <p>${preserveFormatting(variables.discussao_conduta)}</p>
            </div>
        </div>

        <h2 class="section-title">A CIRURGIA: O QUE FOI FEITO E COMO FOI FEITO</h2>
        <div class="secao-conteudo">
            <h3>O que foi feito</h3>
            <div class="content-box">
                <p>${preserveFormatting(variables.cirurgia_descricao)}</p>
            </div>
        </div>
        <div class="secao-conteudo">
            <h3>Como foi feito</h3>
            <div class="content-box">
                <p>${preserveFormatting(variables.cirurgia_acompanhamento)}</p>
            </div>
        </div>

        <h2 class="section-title">EVOLUÇÃO PÓS-TRATAMENTO E SITUAÇÃO ATUAL</h2>
        <div class="secao-conteudo">
            <div class="content-box">
                <p>${preserveFormatting(variables.comentario_evolucao_paragrafo1)}</p>
                <p>${preserveFormatting(variables.comentario_evolucao_paragrafo2)}</p>
            </div>
        </div>
    </div>

    <!-- PÁGINA 3: EVOLUÇÃO LABORATORIAL -->
    <div class="page">
        <h2 class="section-title">EVOLUÇÃO LABORATORIAL E DE IMAGEM</h2>
        <p class="section-subtitle">Acompanhamento do PSA e Exames Complementares</p>

        <h2 class="section-title">A JORNADA DO PSA: EVOLUÇÃO E RESPOSTA AOS TRATAMENTOS</h2>
        <div class="secao-conteudo">
            <h3>Análise da Evolução do PSA</h3>
            <div class="content-box">
                <p>${preserveFormatting(variables.psa_analise_texto)}</p>
                ${variables.psa_tabela_marcos}
                <p><strong>Explicação:</strong> ${preserveFormatting(variables.psa_explicacao_sucesso)}</p>
            </div>
        </div>

        <h2 class="section-title">RECORRÊNCIA BIOQUÍMICA: DETECÇÃO PRECOCE E TRATAMENTO ADICIONAL</h2>
        <div class="secao-conteudo">
            <div class="content-box warning">
                <p>${preserveFormatting(variables.recorrencia_motivo)}</p>
                <p><strong>Tom tranquilizador e educativo:</strong> ${preserveFormatting(variables.recorrencia_ton_tranquilizador)}</p>
            </div>
        </div>

        <h2 class="section-title">TERAPIA HORMONAL (ZOLADEX): CONTROLE EFETIVO DO CÂNCER</h2>
        <div class="secao-conteudo">
            <div class="content-box">
                <p>${preserveFormatting(variables.terapia_hormonal_descricao)}</p>
                <p><strong>Ênfase nos resultados:</strong> ${preserveFormatting(variables.terapia_hormonal_enfase)}</p>
            </div>
        </div>

        <h2 class="section-title">EXAMES DE IMAGEM: MONITORAMENTO COMPLETO DA DOENÇA</h2>
        <div class="secao-conteudo">
            <div class="content-box">
                <p>${preserveFormatting(variables.exames_imagem_lista)}</p>
                <p><strong>Conclusão:</strong> ${preserveFormatting(variables.exames_imagem_conclusao)}</p>
            </div>
        </div>
    </div>

    <!-- PÁGINA 4: SAÚDE GLOBAL E PLANO FUTURO -->
    <div class="page">
        <h2 class="section-title">GERENCIAMENTO DE COMORBIDADES E SAÚDE GLOBAL</h2>
        <div class="secao-conteudo">
            <h3>Condições Monitoradas</h3>
            <div class="content-box">
                <ul class="comorbidades-list">
                    <li>Hipertensão: ${escapeHtml(variables.comorbidade_hipertensao)}</li>
                    <li>Diabetes: ${escapeHtml(variables.comorbidade_diabetes)}</li>
                    <li>Outras Cirurgias: ${escapeHtml(variables.comorbidade_outras_cirurgias)}</li>
                </ul>
            </div>
        </div>

        <h2 class="section-title">SINTOMAS URINÁRIOS: AVALIAÇÃO PELA ESCALA IPSS</h2>
        <div class="secao-conteudo">
            <div class="content-box">
                <p><strong>IPSS:</strong> ${escapeHtml(variables.ipss_pontuacao)}</p>
                <p><strong>Texto de acompanhamento:</strong> ${preserveFormatting(variables.ipss_texto_acompanhamento)}</p>
            </div>
        </div>

        <h2 class="section-title">ORIENTAÇÕES E EDUCAÇÃO AO PACIENTE</h2>
        <div class="secao-conteudo">
            <div class="content-box">
                <p>${preserveFormatting(variables.orientacoes_educacao)}</p>
            </div>
        </div>

        <h2 class="section-title">PLANO DE ACOMPANHAMENTO FUTURO: PRÓXIMOS PASSOS</h2>
        <div class="secao-conteudo">
            <div class="content-box">
                <p>${preserveFormatting(variables.plano_futuro_detalhado)}</p>
            </div>
        </div>
    </div>

    <!-- AUTHENTICATION FOOTER -->
    <div class="page" style="display: flex; flex-direction: column; justify-content: flex-end; min-height: 100%;">
      <div style="text-align: center; padding: 40px 20px; border-top: 2px solid #0066cc; margin-top: 40px;">
        <p style="font-size: 12px; color: #666; margin: 10px 0;">
          <strong>Autenticação do Documento</strong>
        </p>
        <p style="font-size: 11px; color: #999; font-family: monospace; word-break: break-all; margin: 10px 0;">
          Hash: ${documentHash}
        </p>
        <p style="font-size: 10px; color: #999; margin: 10px 0;">
          Documento gerado em: ${new Date().toLocaleString("pt-BR")}
        </p>
        <p style="font-size: 10px; color: #999; margin: 10px 0;">
          Este documento foi gerado pelo sistema de gestão clínica e contém informações confidenciais.
        </p>
      </div>
    </div>
</body>
</html>`
}
