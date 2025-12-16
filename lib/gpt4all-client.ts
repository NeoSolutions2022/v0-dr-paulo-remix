import axios from "axios"

const GPT4ALL_URL = process.env.GPT4ALL_URL || "http://localhost:5000"

interface GPT4AllRequest {
  prompt: string
  model?: string
  temperature?: number
  max_tokens?: number
}

interface GPT4AllResponse {
  model: string
  response: string
  done: boolean
}

/**
 * Conecta ao servidor GPT4All local para processar prompts
 * Mantém compatibilidade com interface do AI SDK
 */
export async function generateTextLocally(config: {
  prompt: string
  temperature?: number
  system?: string
}) {
  try {
    const systemPrompt = config.system ? `${config.system}\n\n` : ""
    const fullPrompt = `${systemPrompt}${config.prompt}`

    const response = await axios.post(
      `${GPT4ALL_URL}/api/prompt`,
      {
        prompt: fullPrompt,
        temperature: config.temperature || 0.3,
        max_tokens: 2000,
      } as GPT4AllRequest,
      {
        timeout: 60000, // 60 segundos timeout
      },
    )

    return {
      text: response.data.response || "",
      finishReason: response.data.done ? "stop" : "length",
    }
  } catch (error) {
    console.error("[v0] Erro ao chamar GPT4All local:", error)
    throw new Error(`GPT4All request failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Verifica se o servidor GPT4All está online
 */
export async function checkGPT4AllHealth(): Promise<boolean> {
  try {
    await axios.get(`${GPT4ALL_URL}/health`, { timeout: 5000 })
    return true
  } catch {
    return false
  }
}
