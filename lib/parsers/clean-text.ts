export interface PatientInfo {
  codigo?: string
  nome?: string
  data_nascimento?: string
  telefone?: string
}

export interface IppsItem {
  n: string
  pergunta: string
  score: string
}

export interface EvolutionStructured {
  timestamp: string
  ipss: {
    items: IppsItem[]
    qualidade_vida_texto?: string
  }
  texto_completo: string
}

export interface StructuredData {
  patient: PatientInfo
  evolutions: EvolutionStructured[]
}

const normalizeWhitespace = (text: string) =>
  text.replace(/'a8/g, "").replace(/\s{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim()

const extractBetween = (text: string, start: RegExp, end: RegExp) => {
  const startMatch = text.match(start)
  if (!startMatch) return undefined
  const startIndex = startMatch.index ?? 0
  const afterStart = text.slice(startIndex + startMatch[0].length)
  const endMatch = afterStart.match(end)
  const chunk = endMatch ? afterStart.slice(0, endMatch.index).trim() : afterStart.trim()
  return chunk
}

const extractPatientInfo = (markdown: string): PatientInfo => {
  const codigoMatch = markdown.match(/Código[^0-9]*([0-9]+)/i)
  const nomeChunk = extractBetween(markdown, /Nome:/i, /Data de Nascimento:/i)
  const dataMatch = markdown.match(/Data de Nascimento:\s*(\d{4}-\d{2}-\d{2})/i)
  const telefoneMatch = markdown.match(/Telefone:\s*([0-9]+)/i)

  return {
    codigo: codigoMatch?.[1],
    nome: nomeChunk ? normalizeWhitespace(nomeChunk) : undefined,
    data_nascimento: dataMatch?.[1],
    telefone: telefoneMatch?.[1],
  }
}

const extractEvolutions = (markdown: string) => {
  const matches = Array.from(markdown.matchAll(/###\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/g))
  const evolutions = matches.map((match, index) => {
    const timestamp = match[1]
    const startIndex = (match.index ?? 0) + match[0].length
    const endIndex = matches[index + 1]?.index ?? markdown.length
    const rawBody = markdown.slice(startIndex, endIndex).trim()
    const normalizedBody = normalizeWhitespace(rawBody)
    return { timestamp, rawBody, normalizedBody }
  })

  const deduped = new Map<string, { timestamp: string; texto_completo: string }>()
  evolutions.forEach((evolution) => {
    const key = `${evolution.timestamp}__${evolution.normalizedBody}`
    if (!deduped.has(key)) {
      deduped.set(key, { timestamp: evolution.timestamp, texto_completo: evolution.normalizedBody })
    }
  })

  return Array.from(deduped.values())
}

const parseIpps = (body: string) => {
  const blockMatch = body.match(/\*\*IPSS\*\*([\s\S]*?)(\n\*\*|$)/i)
  if (!blockMatch) {
    return { items: [], qualidade_vida_texto: undefined }
  }
  const block = blockMatch[1]
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean)

  const items: IppsItem[] = []
  let qualidadeVida: string | undefined

  lines.forEach((line) => {
    const qualityMatch = line.match(/QUALIDADE DE VIDA[^>]*>?(.+)?/i)
    if (qualityMatch) {
      qualidadeVida = line.replace(/\s{2,}/g, " ").trim()
      return
    }

    const itemMatch = line.match(/(\d+)-\s*([^>]+?)\s*>\s*([0-9]+)/)
    if (itemMatch) {
      items.push({
        n: itemMatch[1],
        pergunta: itemMatch[2].trim(),
        score: itemMatch[3].trim(),
      })
    }
  })

  return { items, qualidade_vida_texto: qualidadeVida }
}

export const parseMarkdownToStructured = (markdown: string): StructuredData => {
  const patient = extractPatientInfo(markdown)
  const evolutionsRaw = extractEvolutions(markdown)
  const evolutions = evolutionsRaw.map((evolution) => ({
    timestamp: evolution.timestamp,
    ipss: parseIpps(evolution.texto_completo),
    texto_completo: evolution.texto_completo,
  }))

  return {
    patient,
    evolutions,
  }
}
