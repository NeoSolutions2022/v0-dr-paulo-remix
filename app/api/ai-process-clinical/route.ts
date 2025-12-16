import { type NextRequest, NextResponse } from "next/server"
import { generateTextLocally, checkGPT4AllHealth } from "@/lib/gpt4all-client"

export async function POST(request: NextRequest) {
  try {
    const { clinicalText, patientName } = await request.json()

    if (!clinicalText) {
      return Response.json({ error: "Texto clínico é obrigatório" }, { status: 400 })
    }

    console.log("[v0] Processando arquivo clínico com GPT4All...")

    const gpt4allAvailable = await checkGPT4AllHealth()
    if (!gpt4allAvailable) {
      return NextResponse.json(
        {
          error: "GPT4All não está rodando. Inicie com: docker-compose -f docker-compose.gpt4all.yml up",
        },
        { status: 503 },
      )
    }

    const prompt = `Você é um especialista médico em análise de prontuários clínicos. Analise o seguinte documento clínico e extraia TODOS os campos estruturados em JSON.

DOCUMENTO CLÍNICO:
${clinicalText}

Por favor, extraia os dados e retorne um JSON com os seguintes campos (use null se o valor não estiver disponível):

{
  "nome_paciente": "string",
  "datanascimento": "string (DD/MM/YYYY)",
  "telefone": "string",
  "nome_medico": "string",
  "endereco_clinica": "string",
  "crm_medico": "string",
  "resumo_medico_caso": "string - resumo executivo do caso",
  "diagnostico_principal": "string",
  "psa_ultimo_registro": "string - valor numérico e data",
  "gleason_ultimo_registro": "string",
  "cirurgia_realizada": "sim/não/não definido",
  "terapia_hormonal": "sim/não/não definido",
  "margens_cirurgicas": "string",
  "cirurgia_descricao": "string - descrição do procedimento",
  "complicacoes_pos_operatorias": "string",
  "observacoes_cirurgia": "string",
  "psa_analise_texto": "string - análise interpretativa",
  "psa_explicacao_sucesso": "string - explicação de resposta",
  "recorrencia_motivo": "string - descrição do status",
  "recorrencia_ton_tranquilizador": "string - tom educativo",
  "terapia_hormonal_descricao": "string",
  "terapia_hormonal_enfase": "string - ênfase de eficácia",
  "comorbidade_hipertensao": "string",
  "comorbidade_diabetes": "string",
  "comorbidade_outras_cirurgias": "string",
  "historico_familiar": "string",
  "ipss_pontuacao": "string",
  "ipss_texto_acompanhamento": "string",
  "orientacoes_educacao": "string",
  "plano_futuro_detalhado": "string"
}

Retorne APENAS o JSON válido, sem explicações adicionais.`

    const response = await generateTextLocally({
      prompt,
      temperature: 0.3,
      system: "Você é especialista em extração de dados clínicos. Retorne APENAS JSON válido sem markdown.",
    })

    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Falha ao extrair JSON da resposta da IA")
    }

    const extractedData = JSON.parse(jsonMatch[0])

    return Response.json({
      success: true,
      data: extractedData,
      message: "Dados extraídos com sucesso pelo GPT4All",
      aiProvider: "GPT4All Local",
    })
  } catch (error) {
    console.error("[v0] AI process clinical error:", error)
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro ao processar arquivo clínico" },
      { status: 500 },
    )
  }
}
