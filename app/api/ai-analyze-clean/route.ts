import { type NextRequest, NextResponse } from "next/server"
import { generateTextLocally, checkGPT4AllHealth } from "@/lib/gpt4all-client"

interface AnalyzePayload {
  cleanText: string
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzePayload = await request.json()
    const { cleanText } = body

    if (!cleanText || typeof cleanText !== "string") {
      return NextResponse.json({ error: "cleanText é obrigatório e deve ser uma string" }, { status: 400 })
    }

    console.log("[v0] Iniciando análise IA do texto limpo...")

    const gpt4allAvailable = await checkGPT4AllHealth()
    if (!gpt4allAvailable) {
      return NextResponse.json(
        {
          error: "GPT4All não está rodando. Inicie com: docker-compose -f docker-compose.gpt4all.yml up",
        },
        { status: 503 },
      )
    }

    const { text: commentedText } = await generateTextLocally({
      prompt: `Você é um assistente médico especializado em urologia. Recebeu um texto clínico LIMPO e organizado. 

TAREFA: Analise este texto clínico e crie uma versão COMENTADA onde você:
1. Mantém 100% dos dados originais
2. Adiciona explicações educacionais entre as seções
3. Contextualiza os resultados (ex: "PSA 5.2 [comentário: este valor está levemente elevado]")
4. Explica siglas e termos (ex: "GLEASON 6 [comentário: score baixo, prognóstico favorável]")
5. Destaca valores críticos ou anormais
6. Adiciona interpretações do estado ATUAL do paciente (não histórico)
7. Preserva estrutura e hierarquia do original

FORMATO DA SAÍDA:
- Use a mesma estrutura do original (seções, quebras de linha)
- Coloque comentários entre colchetes [assim] após dados relevantes
- Não altere números ou datas
- Se houver evolução temporal, destaque o estado MAIS RECENTE

TEXTO PARA ANÁLISE:
${cleanText}

Gere a versão COMENTADA mantendo a estrutura original. Inicie direto com o conteúdo comentado, sem cabeçalho ou introdução.`,
      temperature: 0.4,
      system:
        "Você é especialista em análise clínica. Crie versão comentada educacional mantendo 100% dos dados originais.",
    })

    console.log("[v0] Análise IA concluída com sucesso")

    return NextResponse.json(
      {
        success: true,
        commentedText,
        aiProvider: "GPT4All Local",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Erro na análise IA:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha na análise IA",
      },
      { status: 500 },
    )
  }
}
