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

const EVOLUTION_HEADER = /---\s*Evolução\s*em\s*([0-9-]{10}\s+[0-9:]{8})\s*---/gi
const IPSS_ITEM_REGEX = /(\d+)\s*[-–]\s*([^>]+?)\s*>\s*([0-9]+(?:\s*-\s*[0-9]+)?)/g
const QUALIDADE_VIDA_REGEX = /QUALIDADE DE VIDA\s*-\s*(.*)$/i

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

const safeSlice = (value: string | undefined, maxLength: number) => {
  if (!value) return "-"
  const trimmed = value.trim()
  if (!trimmed) return "-"
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed
}

const createHash = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return hash.toString(36)
}

export const normalizeCleanText = (cleanText: string) => {
  const normalized = normalizeLineBreaks(cleanText)
  const processed = normalized.includes("{\\rtf1") ? stripRtfCommands(normalized) : normalized
  return cleanWhitespace(processed)
}

export const parseCleanTextToStructured = (plainText: string): CleanTextStructured => {
  const codigo = safeSlice(plainText.match(/Código:\s*([0-9]+)/i)?.[1], 20)
  const nome = safeSlice(plainText.match(/Nome:\s*(.*?)\s*Data de Nascimento:/i)?.[1], 120)
  const dataNascimento = safeSlice(
    plainText.match(/Data de Nascimento:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i)?.[1],
    20,
  )
  const telefone = safeSlice(plainText.match(/Telefone:\s*([0-9]+)/i)?.[1], 30)

  const patient = {
    codigo,
    nome,
    data_nascimento: dataNascimento,
    telefone,
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
    const key = `${evolution.timestamp}__${createHash(evolution.body)}`
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
    const upper = evolution.texto_completo.toUpperCase()
    const ipssIndex = upper.indexOf("ESCALA INTERNACIONAL") !== -1 ? upper.indexOf("ESCALA INTERNACIONAL") : upper.indexOf("IPSS")
    const ipssText = ipssIndex === -1 ? "" : evolution.texto_completo.slice(ipssIndex)
    const items: Array<{ n: string; pergunta: string; score: string }> = []
    let match: RegExpExecArray | null
    while ((match = IPSS_ITEM_REGEX.exec(ipssText)) !== null) {
      items.push({
        n: match[1],
        pergunta: match[2].trim(),
        score: match[3].replace(/\s+/g, ""),
      })
    }

    const qualidadeMatch = ipssText.match(QUALIDADE_VIDA_REGEX)
    const qualidadeVida = qualidadeMatch?.[1]?.trim()

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
