export async function POST(request: Request) {
  try {
    const { customFields, format = "clean" } = await request.json()

    if (!customFields) {
      return Response.json({ error: "Campos customizados são obrigatórios" }, { status: 400 })
    }

    const formatData = (label: string, value: any) => {
      const cleanValue = value || "Não informado"
      if (format === "commented") {
        return `${label}:\n${cleanValue}\n`
      } else {
        return `${label}: ${cleanValue}`
      }
    }

    let txtContent = ""

    if (format === "commented") {
      txtContent = `
================================================================================
                    RELATÓRIO CLÍNICO - VERSÃO COMENTADA
                         Com explicações e observações
================================================================================

VERSÃO COMENTADA: Este documento contém explicações sobre cada campo e 
interpretações clínicas para facilitar a compreensão do diagnóstico e tratamento.

================================================================================
DADOS DO PACIENTE
================================================================================

${formatData("Nome do Paciente", customFields.nome_paciente)}
Data de Nascimento: ${customFields.datanascimento} (Usado para cálculo de idade e análise de risco)
Telefone: ${customFields.telefone} (Para contato e agendamento)

================================================================================
INFORMAÇÕES DO MÉDICO E CLÍNICA
================================================================================

${formatData("Nome do Médico", customFields.nome_medico)}
CRM: ${customFields.crm_medico} (Registro profissional no conselho)
Endereço da Clínica: ${customFields.endereco_clinica}

================================================================================
RESUMO DO CASO CLÍNICO
================================================================================

${formatData("Resumo Executivo", customFields.resumo_medico_caso)}

DIAGNÓSTICO PRINCIPAL: ${customFields.diagnostico_principal}
(Esta é a condição clínica primária que requer tratamento e acompanhamento)

================================================================================
HISTÓRICO DE PROCEDIMENTOS E TRATAMENTOS
================================================================================

Cirurgia Realizada: ${customFields.cirurgia_realizada}
(Indica se houve intervenção cirúrgica)

Descrição da Cirurgia: ${customFields.cirurgia_descricao}
(Detalhes técnicos do procedimento realizado)

Margens Cirúrgicas: ${customFields.margens_cirurgicas}
(Indicador importante de adequação da ressecção)

Complicações Pós-operatórias: ${customFields.complicacoes_pos_operatorias}
(Eventos adversos após a cirurgia)

Observações Cirúrgicas: ${customFields.observacoes_cirurgia}

================================================================================
ANÁLISE DE PSA (Antígeno Prostático Específico)
================================================================================

Último Registro PSA: ${customFields.psa_ultimo_registro}
(Valor importante para monitoramento de recorrência)

Análise: ${customFields.psa_analise_texto}

Explicação de Sucesso: ${customFields.psa_explicacao_sucesso}
(Interpretação da resposta ao tratamento)

Gleason: ${customFields.gleason_ultimo_registro}
(Score que indica agressividade histológica da doença)

================================================================================
RECORRÊNCIA BIOQUÍMICA
================================================================================

Status: ${customFields.recorrencia_motivo}
(Detecção de elevação do PSA após tratamento)

Comentários Tranquilizadores: ${customFields.recorrencia_ton_tranquilizador}
(Orientações educativas e tranquilizadoras ao paciente)

================================================================================
TERAPIA HORMONAL
================================================================================

Terapia Realizada: ${customFields.terapia_hormonal}
(Deprivação hormonal: sim/não/pendente)

Descrição: ${customFields.terapia_hormonal_descricao}
(Tipo de medicação e resposta observada)

Eficácia: ${customFields.terapia_hormonal_enfase}
(Resultados obtidos com o tratamento)

================================================================================
COMORBIDADES E SAÚDE GLOBAL
================================================================================

Hipertensão: ${customFields.comorbidade_hipertensao}
(Monitoramento de pressão arterial)

Diabetes: ${customFields.comorbidade_diabetes}
(Controle glicêmico e complicações relacionadas)

Outras Cirurgias Prévias: ${customFields.comorbidade_outras_cirurgias}
(Histórico cirúrgico relevante)

Histórico Familiar: ${customFields.historico_familiar}
(Predisposição genética para doenças)

================================================================================
SINTOMAS URINÁRIOS - ESCALA IPSS
================================================================================

Pontuação IPSS: ${customFields.ipss_pontuacao}
(Escore de sintomas do trato urinário inferior: 0-35)

Interpretação: ${customFields.ipss_texto_acompanhamento}
(Avaliação da qualidade de vida relacionada aos sintomas)

================================================================================
ORIENTAÇÕES AO PACIENTE
================================================================================

${formatData("Recomendações", customFields.orientacoes_educacao)}

================================================================================
PLANO DE ACOMPANHAMENTO FUTURO
================================================================================

${formatData("Próximos Passos", customFields.plano_futuro_detalhado)}

================================================================================
FIM DO RELATÓRIO
================================================================================
Documento gerado pelo sistema de gestão clínica
Data: ${new Date().toLocaleString("pt-BR")}
Versão: COMENTADA (Com explicações)
================================================================================
`
    } else {
      txtContent = `
================================================================================
                    RELATÓRIO CLÍNICO - VERSÃO LIMPA
================================================================================

DADOS DO PACIENTE
================================================================================
Nome: ${customFields.nome_paciente}
Data de Nascimento: ${customFields.datanascimento}
Telefone: ${customFields.telefone}

INFORMAÇÕES DO MÉDICO
================================================================================
Médico: ${customFields.nome_medico}
CRM: ${customFields.crm_medico}
Clínica: ${customFields.endereco_clinica}

RESUMO CLÍNICO
================================================================================
${customFields.resumo_medico_caso}

DIAGNÓSTICO PRINCIPAL
================================================================================
${customFields.diagnostico_principal}

HISTÓRICO CIRÚRGICO
================================================================================
Cirurgia Realizada: ${customFields.cirurgia_realizada}
Descrição: ${customFields.cirurgia_descricao}
Margens: ${customFields.margens_cirurgicas}
Complicações: ${customFields.complicacoes_pos_operatorias}
Observações: ${customFields.observacoes_cirurgia}

PSA E GLEASON
================================================================================
PSA: ${customFields.psa_ultimo_registro}
Gleason: ${customFields.gleason_ultimo_registro}
Análise: ${customFields.psa_analise_texto}
Explicação: ${customFields.psa_explicacao_sucesso}

RECORRÊNCIA
================================================================================
Status: ${customFields.recorrencia_motivo}
Comentários: ${customFields.recorrencia_ton_tranquilizador}

TERAPIA HORMONAL
================================================================================
Realizada: ${customFields.terapia_hormonal}
Descrição: ${customFields.terapia_hormonal_descricao}
Eficácia: ${customFields.terapia_hormonal_enfase}

COMORBIDADES
================================================================================
Hipertensão: ${customFields.comorbidade_hipertensao}
Diabetes: ${customFields.comorbidade_diabetes}
Outras Cirurgias: ${customFields.comorbidade_outras_cirurgias}
Histórico Familiar: ${customFields.historico_familiar}

SINTOMAS URINÁRIOS
================================================================================
IPSS: ${customFields.ipss_pontuacao}
Interpretação: ${customFields.ipss_texto_acompanhamento}

ORIENTAÇÕES
================================================================================
${customFields.orientacoes_educacao}

PLANO FUTURO
================================================================================
${customFields.plano_futuro_detalhado}

================================================================================
Data: ${new Date().toLocaleString("pt-BR")}
Versão: ${format === "commented" ? "COMENTADA" : "LIMPA"}
================================================================================
`
    }

    return Response.json({
      success: true,
      content: txtContent,
      format,
      filename: `relatorio_${customFields.nome_paciente || "paciente"}_${format}.txt`,
    })
  } catch (error) {
    console.error("[v0] Generate TXT error:", error)
    return Response.json({ error: error instanceof Error ? error.message : "Erro ao gerar TXT" }, { status: 500 })
  }
}
