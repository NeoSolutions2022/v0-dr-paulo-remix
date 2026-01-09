export interface PatientInfo {
  codigo?: string
  nome?: string
  data_nascimento?: string
  telefone?: string
}

export interface EvolutionStructured {
  timestamp: string
  texto_completo: string
  ipss: {
    items: Array<{
      n: string
      pergunta: string
      score: string
    }>
    qualidade_vida_texto?: string
  }
}

export interface CleanTextStructured {
  patient: PatientInfo
  evolutions: EvolutionStructured[]
}

const EVOLUTION_HEADER = /---\s*Evolução em\s*([\d-]+\s[\d:]+)\s*---/gi

const decodeHex = (hex: string) => {
  const value = parseInt(hex, 16)
  if (Number.isNaN(value)) return ""
  return String.fromCharCode(value)
}

const normalizeLineBreaks = (text: string) => text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

const stripRtfCommands = (text: string) =>
  text
    .replace(/\\par[d]?/gi, "\n")
    .replace(/\\tab/gi, "\t")
    .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => decodeHex(hex))
    .replace(/\\[a-zA-Z]+\d* ?/g, "")
    .replace(/[{}]/g, "")

const cleanWhitespace = (text: string) =>
  text.replace(/'a8/g, "").replace(/\s{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim()

export const normalizeCleanText = (cleanText: string) => {
  const normalized = normalizeLineBreaks(cleanText)
  const processed = normalized.includes("{\\rtf1") ? stripRtfCommands(normalized) : normalized
  return cleanWhitespace(processed)
}

export const parseCleanTextToStructured = (plainText: string): CleanTextStructured => {
  const patient = {
    codigo: plainText.match(/Código:\s*([^\n]+)/i)?.[1]?.trim(),
    nome: plainText.match(/Nome:\s*([^\n]+)/i)?.[1]?.trim(),
    data_nascimento: plainText.match(/Data de Nascimento:\s*([^\n]+)/i)?.[1]?.trim(),
    telefone: plainText.match(/Telefone:\s*([^\n]+)/i)?.[1]?.trim(),
  }

  const matches = Array.from(plainText.matchAll(EVOLUTION_HEADER))
  const evolutionsRaw = matches.map((match, index) => {
    const timestamp = match[1]?.trim() || "Sem data"
    const startIndex = (match.index ?? 0) + match[0].length
    const endIndex = matches[index + 1]?.index ?? plainText.length
    const body = cleanWhitespace(plainText.slice(startIndex, endIndex))
    return { timestamp, body }
  })

  const deduped = new Map<string, EvolutionStructured>()
  evolutionsRaw.forEach((evolution) => {
    const key = `${evolution.timestamp}__${evolution.body}`
    if (!deduped.has(key)) {
      deduped.set(key, {
        timestamp: evolution.timestamp,
        texto_completo: evolution.body,
        ipss: {
          items: [],
          qualidade_vida_texto: undefined,
        },
      })
    }
  })

  const evolutions = Array.from(deduped.values()).map((evolution) => {
    const ipssBlockIndex = evolution.texto_completo.toUpperCase().indexOf("ESCALA INTERNACIONAL DE SINTOMAS PROSTATICOS")
    const ipssText = ipssBlockIndex === -1 ? "" : evolution.texto_completo.slice(ipssBlockIndex)
    const lines = ipssText.split("\n").map((line) => line.trim())
    const items = lines
      .map((line) => line.match(/^(\d+)\s*-\s*(.+?)\s*>\s*([0-9-]+)/))
      .filter(Boolean)
      .map((match) => ({
        n: match?.[1] ?? "",
        pergunta: match?.[2]?.trim() ?? "",
        score: match?.[3] ?? "",
      }))
      .filter((item) => item.n && item.pergunta && item.score)

    const qualidadeVida = lines.find((line) => /QUALIDADE DE VIDA/i.test(line))

    return {
      ...evolution,
      ipss: {
        items,
        qualidade_vida_texto: qualidadeVida ? cleanWhitespace(qualidadeVida) : undefined,
      },
    }
  })

  return {
    patient,
    evolutions,
  }
}
