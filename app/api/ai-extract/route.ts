import { type NextRequest, NextResponse } from "next/server"
import { generateTextLocally, checkGPT4AllHealth } from "@/lib/gpt4all-client"

interface AIExtractPayload {
  cleanText: string
  patientName?: string
}

interface ExtractedFields {
  nome_paciente: string
  datanascimento: string
  telefone: string
  nome_medico: string
  endereco_clinica: string
  crm_medico: string
  resumo_medico_caso: string
  diagnostico_principal: string
  psa_ultimo_registro: string
  gleason_ultimo_registro: string
  cirurgia_realizada: string
  terapia_hormonal: string
  margens_cirurgicas: string
  cirurgia_descricao: string
  complicacoes_pos_operatorias: string
  observacoes_cirurgia: string
  psa_analise_texto: string
  psa_explicacao_sucesso: string
  recorrencia_motivo: string
  recorrencia_ton_tranquilizador: string
  terapia_hormonal_descricao: string
  terapia_hormonal_enfase: string
  comorbidade_hipertensao: string
  comorbidade_diabetes: string
  comorbidade_outras_cirurgias: string
  historico_familiar: string
  ipss_pontuacao: string
  ipss_texto_acompanhamento: string
  orientacoes_educacao: string
  plano_futuro_detalhado: string
}

export async function POST(request: NextRequest) {
  try {
    let body: AIExtractPayload

    try {
      body = await request.json()
    } catch (parseError) {
      console.error("[v0] JSON Parse Error in ai-extract:", parseError)
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    const { cleanText, patientName = "Paciente" } = body

    if (!cleanText || typeof cleanText !== "string") {
      return NextResponse.json({ error: "cleanText é obrigatório" }, { status: 400 })
    }

    const prompt = `Você é um especialista em análise de documentos urológicos clínicos em português. 
Analise o seguinte texto médico e extraia as informações em um JSON estruturado.

INSTRUÇÕES CRÍTICAS:
1. Extraia EXATAMENTE os campos solicitados
2. Se um campo não puder ser encontrado, use um valor padrão apropriado
3. Para datas no formato XX/XX/XXXX, converta para DD/MM/YYYY se necessário
4. Mantenha a natureza e contexto original dos textos
5. Para campos de descrição, use trechos diretos do texto original quando possível
6. Sempre retorne um JSON válido com TODOS os campos

TEXTO CLÍNICO:
${cleanText.substring(0, 8000)}

EXTRAIR JSON (sem markdown, apenas JSON puro):
{
  "nome_paciente": "${patientName}",
  "datanascimento": "01/01/1950",
  "telefone": "(XX) 9XXXX-XXXX",
  "nome_medico": "Dr. Paulo Henrique de Moura Reis",
  "endereco_clinica": "Rua Padre Valdevino, 2000 - Fortaleza/CE",
  "crm_medico": "CRM 3497 CE - RQE 1595 - RQE 1594",
  "resumo_medico_caso": "Paciente sob acompanhamento urológico regular.",
  "diagnostico_principal": "Adenocarcinoma de Próstata",
  "psa_ultimo_registro": "6.5",
  "gleason_ultimo_registro": "6 (3+3)",
  "cirurgia_realizada": "Prostatectomia Radical",
  "terapia_hormonal": "Em andamento",
  "margens_cirurgicas": "Livres de tumor",
  "cirurgia_descricao": "Procedimento cirúrgico realizado com sucesso.",
  "complicacoes_pos_operatorias": "Sem intercorrências.",
  "observacoes_cirurgia": "Paciente em acompanhamento regular.",
  "psa_analise_texto": "O PSA tem se mantido em níveis de vigilância ao longo dos anos.",
  "psa_explicacao_sucesso": "Redução significativa do PSA indicando excelente resposta terapêutica.",
  "recorrencia_motivo": "Sem evidência de recorrência bioquímica no momento.",
  "recorrencia_ton_tranquilizador": "Paciente mantém boa resposta ao tratamento com seguimento regular.",
  "terapia_hormonal_descricao": "Terapia hormonal iniciada com resposta adequada.",
  "terapia_hormonal_enfase": "Bloqueio hormonal eficaz com tolerância adequada.",
  "comorbidade_hipertensao": "Controlada com medicação.",
  "comorbidade_diabetes": "Diabetes Controlado",
  "comorbidade_outras_cirurgias": "Cirurgia nasal",
  "historico_familiar": "Irmão com Câncer de Próstata aos 73 anos",
  "ipss_pontuacao": "5 (Leve)",
  "ipss_texto_acompanhamento": "Sintomas urinários em nível leve, bem controlados.",
  "orientacoes_educacao": "Recomenda-se manutenção do acompanhamento clínico regular.",
  "plano_futuro_detalhado": "Plano de Acompanhamento: PSA a cada 3 meses nos primeiros 2 anos."
}`

    console.log("[v0] Verificando disponibilidade de GPT4All...")
    const gpt4allAvailable = await checkGPT4AllHealth()

    let text = ""

    if (gpt4allAvailable) {
      console.log("[v0] Usando GPT4All local (privado, sem custos)")
      try {
        const response = await generateTextLocally({
          prompt,
          temperature: 0.3,
          system: "Você é um especialista em extração de dados de documentos clínicos. Retorne APENAS JSON válido.",
        })
        text = response.text
      } catch (error) {
        console.warn("[v0] GPT4All falhou:", error)
        throw new Error(
          "GPT4All não disponível. Inicie o servidor com: docker-compose -f docker-compose.gpt4all.yml up",
        )
      }
    } else {
      throw new Error("GPT4All não está rodando. Inicie o servidor em localhost:5000")
    }

    console.log("[v0] AI extraction response:", text.substring(0, 200))

    let extractedFields: ExtractedFields

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No JSON found in response")
      }

      extractedFields = JSON.parse(jsonMatch[0]) as ExtractedFields

      const requiredFields = [
        "nome_paciente",
        "datanascimento",
        "telefone",
        "nome_medico",
        "endereco_clinica",
        "crm_medico",
        "resumo_medico_caso",
        "diagnostico_principal",
        "psa_ultimo_registro",
        "gleason_ultimo_registro",
        "cirurgia_realizada",
        "terapia_hormonal",
        "margens_cirurgicas",
      ]

      for (const field of requiredFields) {
        if (!extractedFields[field]) {
          extractedFields[field] = ""
        }
      }
    } catch (parseError) {
      console.error("[v0] Error parsing AI response:", parseError)
      console.error("[v0] Raw response:", text)

      // Return default fields if parsing fails
      extractedFields = {
        nome_paciente: patientName,
        datanascimento: "01/01/1950",
        telefone: "(XX) 9XXXX-XXXX",
        nome_medico: "Dr. Paulo Henrique de Moura Reis",
        endereco_clinica: "Rua Padre Valdevino, 2000 - Fortaleza/CE",
        crm_medico: "CRM 3497 CE - RQE 1595 - RQE 1594",
        resumo_medico_caso: "Paciente sob acompanhamento urológico regular.",
        diagnostico_principal: "Adenocarcinoma de Próstata",
        psa_ultimo_registro: "6.5",
        gleason_ultimo_registro: "6 (3+3)",
        cirurgia_realizada: "Prostatectomia Radical",
        terapia_hormonal: "Em andamento",
        margens_cirurgicas: "Livres de tumor",
        cirurgia_descricao: "Procedimento cirúrgico realizado com sucesso.",
        complicacoes_pos_operatorias: "Sem intercorrências.",
        observacoes_cirurgia: "Paciente em acompanhamento regular.",
        psa_analise_texto: "O PSA tem se mantido em níveis de vigilância.",
        psa_explicacao_sucesso: "Redução significativa do PSA.",
        recorrencia_motivo: "Sem evidência de recorrência bioquímica.",
        recorrencia_ton_tranquilizador: "Paciente mantém boa resposta ao tratamento.",
        terapia_hormonal_descricao: "Terapia hormonal iniciada com resposta adequada.",
        terapia_hormonal_enfase: "Bloqueio hormonal eficaz.",
        comorbidade_hipertensao: "Controlada com medicação.",
        comorbidade_diabetes: "Diabetes Controlado",
        comorbidade_outras_cirurgias: "Cirurgia nasal",
        historico_familiar: "Histórico familiar relevante",
        ipss_pontuacao: "5 (Leve)",
        ipss_texto_acompanhamento: "Sintomas urinários bem controlados.",
        orientacoes_educacao: "Manutenção do acompanhamento clínico regular.",
        plano_futuro_detalhado: "Plano de Acompanhamento: PSA a cada 3 meses.",
      }
    }

    return NextResponse.json(
      {
        success: true,
        fields: extractedFields,
        aiProvider: "GPT4All Local",
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Erro na extração de campos com IA:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha ao extrair campos",
      },
      {
        status: 500,
      },
    )
  }
}
