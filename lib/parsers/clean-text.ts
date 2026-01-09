export interface PatientInfo {
  codigo?: string
  nome?: string
  data_nascimento?: string
  telefone?: string
}

export interface EvolutionSection {
  title: string
  content: string | string[]
}

export interface EvolutionStructured {
  id: string
  timestamp: string
  plain_text: string
  rtf_original?: string
  sections: EvolutionSection[]
  free_text: string
}

export interface CleanTextStructured {
  patient: PatientInfo
  evolutions: EvolutionStructured[]
}

const EVOLUTION_HEADER = /---\s*Evolução em ([\d-]+\s[\d:]+)\s*---/g

const CP1252_MAP: Record<number, string> = {
  0x80: "€",
  0x82: "‚",
  0x83: "ƒ",
  0x84: "„",
  0x85: "…",
  0x86: "†",
  0x87: "‡",
  0x88: "ˆ",
  0x89: "‰",
  0x8a: "Š",
  0x8b: "‹",
  0x8c: "Œ",
  0x8e: "Ž",
  0x91: "‘",
  0x92: "’",
  0x93: "“",
  0x94: "”",
  0x95: "•",
  0x96: "–",
  0x97: "—",
  0x98: "˜",
  0x99: "™",
  0x9a: "š",
  0x9b: "›",
  0x9c: "œ",
  0x9e: "ž",
  0x9f: "Ÿ",
}

const normalizeLineBreaks = (text: string) => text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

export const normalizeCleanText = (cleanText: string) => {
  let normalized = normalizeLineBreaks(cleanText)
  normalized = normalized.replace(/(=+)/g, "\n$1")
  normalized = normalized.replace(/---\s*Evolução em/g, "\n--- Evolução em")
  normalized = normalized.replace(/[^\x09\x0A\x20-\x7E\xA0-\uFFFF]/g, "")
  normalized = normalized
    .split(/\n/)
    .map((line) => line.trim())
    .join("\n")
  normalized = normalized.replace(/ {3,}/g, " ")
  normalized = normalized.replace(/\n{3,}/g, "\n\n").trim()
  return normalized
}

export const splitSections = (normalizedText: string) => {
  const matches = Array.from(normalizedText.matchAll(EVOLUTION_HEADER))
  const firstEvolutionIndex = matches[0]?.index ?? normalizedText.length
  const patientHeaderBlock = normalizedText.slice(0, firstEvolutionIndex).trim()
  const evolutionsRaw = matches.map((match, index) => {
    const timestamp = match[1]?.trim() || "Sem data"
    const startIndex = (match.index ?? 0) + match[0].length
    const endIndex = matches[index + 1]?.index ?? normalizedText.length
    const raw = normalizedText.slice(startIndex, endIndex).trim()
    return { timestamp, raw }
  })

  return { patientHeaderBlock, evolutionsRaw }
}

export const parsePatientHeader = (patientHeaderBlock: string): PatientInfo => {
  const extract = (regex: RegExp) => patientHeaderBlock.match(regex)?.[1]?.trim()
  return {
    codigo: extract(/Código:\s*([^\n]+)/i),
    nome: extract(/Nome:\s*([^\n]+)/i),
    data_nascimento: extract(/Data de Nascimento:\s*([^\n]+)/i),
    telefone: extract(/Telefone:\s*([^\n]+)/i),
  }
}

const decodeHex = (hex: string) => {
  const value = parseInt(hex, 16)
  if (Number.isNaN(value)) return ""
  if (value >= 0x80 && value <= 0x9f) {
    return CP1252_MAP[value] ?? ""
  }
  return String.fromCharCode(value)
}

const stripRtfBlocks = (text: string) =>
  text
    .replace(/\{\\\*?\\fonttbl[\s\S]*?\}/gi, "")
    .replace(/\{\\\*?\\colortbl[\s\S]*?\}/gi, "")
    .replace(/\{\\\*?\\stylesheet[\s\S]*?\}/gi, "")
    .replace(/\{\\\*?\\generator[\s\S]*?\}/gi, "")

export const rtfToPlainText = (raw: string) => {
  let text = normalizeLineBreaks(raw)
  const hasRtf = text.includes("{\\rtf")
  if (hasRtf) {
    text = stripRtfBlocks(text)
    text = text.replace(/\\par[d]?/gi, "\n").replace(/\\tab/gi, "\t")
    text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => decodeHex(hex))
    text = text.replace(/\\[a-zA-Z]+\d* ?/g, "")
    text = text.replace(/[{}]/g, "")
  }

  text = text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .trim()

  return text
}

const extractKeyValueSections = (plainText: string) => {
  const lines = plainText.split("\n")
  const matches: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (/^[A-ZÇÃÕÉÍÓÚÂÊÔÁÀÜ][A-ZÇÃÕÉÍÓÚÂÊÔÁÀÜ\s/]*-\s*/.test(trimmed)) {
      matches.push(trimmed)
    }
  }

  return matches
}

const extractPSA = (plainText: string) => {
  const psaLines = plainText.split("\n").filter((line) => /psa/i.test(line))
  const entries: string[] = []
  psaLines.forEach((line) => {
    const normalized = line.replace(/psa/i, "PSA")
    const matches = normalized.match(/(\d{2}\/\d{2}\/\d{4})\s*([0-9.,]+)/g)
    if (matches) {
      matches.forEach((match) => entries.push(match.trim()))
    } else if (normalized.trim()) {
      entries.push(normalized.trim())
    }
  })
  return entries
}

const extractIPSS = (plainText: string) => {
  const ipssIndex = plainText.toUpperCase().indexOf("ESCALA INTERNACIONAL DE SINTOMAS PROSTATICOS")
  if (ipssIndex === -1) return []
  const ipssBlock = plainText.slice(ipssIndex)
  const questions = ipssBlock
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\-/.test(line) || /QUALIDADE DE VIDA/i.test(line))
  return questions
}

export const structureEvolution = (plainText: string) => {
  const sections: EvolutionSection[] = []
  const keyValueLines = extractKeyValueSections(plainText)
  if (keyValueLines.length) {
    sections.push({ title: "Resumo clínico", content: keyValueLines })
  }

  const psaEntries = extractPSA(plainText)
  if (psaEntries.length) {
    sections.push({ title: "PSA", content: psaEntries })
  }

  const ipssEntries = extractIPSS(plainText)
  if (ipssEntries.length) {
    sections.push({ title: "IPSS", content: ipssEntries })
  }

  return {
    sections,
    free_text: plainText,
  }
}

export const toMarkdown = (structured: CleanTextStructured) => {
  const lines: string[] = []
  lines.push("## Ficha do Paciente")
  lines.push("")
  lines.push("| Campo | Valor |")
  lines.push("| --- | --- |")
  lines.push(`| Código | ${structured.patient.codigo ?? "-"} |`)
  lines.push(`| Nome | ${structured.patient.nome ?? "-"} |`)
  lines.push(`| Data de Nascimento | ${structured.patient.data_nascimento ?? "-"} |`)
  lines.push(`| Telefone | ${structured.patient.telefone ?? "-"} |`)
  lines.push("")

  lines.push(`## Evoluções (${structured.evolutions.length})`)
  structured.evolutions.forEach((evolution) => {
    lines.push("")
    lines.push(`### ${evolution.timestamp}`)
    evolution.sections.forEach((section) => {
      lines.push("")
      lines.push(`**${section.title}**`)
      if (Array.isArray(section.content)) {
        section.content.forEach((item) => lines.push(`- ${item}`))
      } else {
        lines.push(section.content)
      }
    })
    lines.push("")
    lines.push("**Texto completo**")
    lines.push("")
    lines.push(evolution.free_text)
  })

  return lines.join("\n")
}

export const buildCleanTextPipeline = (cleanText: string) => {
  const normalized_text = normalizeCleanText(cleanText)
  const { patientHeaderBlock, evolutionsRaw } = splitSections(normalized_text)
  const patient = parsePatientHeader(patientHeaderBlock)
  const evolutions = evolutionsRaw.map((evolution, index) => {
    const plainText = rtfToPlainText(evolution.raw)
    const structured = structureEvolution(plainText)
    return {
      id: `${evolution.timestamp}-${index}`,
      timestamp: evolution.timestamp,
      plain_text: plainText,
      rtf_original: evolution.raw.includes("{\\rtf") ? evolution.raw : undefined,
      sections: structured.sections,
      free_text: structured.free_text,
    }
  })

  const structured_json: CleanTextStructured = {
    patient,
    evolutions,
  }

  const markdown = toMarkdown(structured_json)

  return {
    cleaned_text: normalized_text,
    structured_json,
    markdown,
  }
}
