export interface PatientField {
  key: string
  value: string
}

export interface EvolutionEntry {
  id: string
  timestamp: string
  date: Date | null
  text: string
  rtfOriginal?: string
  duplicateCount: number
}

const EVOLUTION_HEADER = /---\s*Evolução em ([\d-]+\s[\d:]+)\s*---/g

const normalizeText = (text: string) =>
  text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim()

const parseTimestamp = (timestamp: string) => {
  const parsed = new Date(timestamp.replace(" ", "T"))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const decodeHexChar = (match: string, hex: string) =>
  String.fromCharCode(parseInt(hex, 16))

const stripRtf = (rtf: string) => {
  let text = rtf
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\par[d]?/gi, "\n")
    .replace(/\\tab/gi, "\t")
    .replace(/\\'([0-9a-fA-F]{2})/g, decodeHexChar)

  text = text
    .replace(/\\[a-zA-Z]+\d* ?/g, "")
    .replace(/\\[{}\\]/g, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/ {2,}/g, " ")
    .trim()

  return text
}

const cleanEvolutionText = (raw: string) => {
  const trimmed = raw.trim()
  if (trimmed.startsWith("{\\rtf")) {
    const cleaned = stripRtf(trimmed)
    return {
      text: cleaned || trimmed,
      rtfOriginal: trimmed,
    }
  }

  return {
    text: trimmed,
    rtfOriginal: undefined,
  }
}

const extractPatientFields = (text: string): PatientField[] => {
  const lines = normalizeText(text).split("\n")
  const fields: PatientField[] = []
  let inSection = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!inSection && trimmed.includes("FICHA DO PACIENTE")) {
      inSection = true
      continue
    }

    if (!inSection) continue

    if (trimmed.startsWith("--- Evolução")) break

    if (!trimmed || /^=+$/.test(trimmed)) {
      continue
    }

    const separatorIndex = trimmed.indexOf(":")
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    if (key && value) {
      fields.push({ key, value })
    }
  }

  return fields
}

const extractEvolutions = (text: string) => {
  const normalized = normalizeText(text)
  const matches = Array.from(normalized.matchAll(EVOLUTION_HEADER))
  const evolutions: Omit<EvolutionEntry, "duplicateCount">[] = []

  matches.forEach((match, index) => {
    const timestamp = match[1]?.trim() || "Sem data"
    const startIndex = (match.index ?? 0) + match[0].length
    const endIndex = matches[index + 1]?.index ?? normalized.length
    const rawBody = normalized.slice(startIndex, endIndex).trim()
    const { text: cleanedText, rtfOriginal } = cleanEvolutionText(rawBody)

    evolutions.push({
      id: `${timestamp}-${index}`,
      timestamp,
      date: parseTimestamp(timestamp),
      text: cleanedText,
      rtfOriginal,
    })
  })

  evolutions.sort((a, b) => {
    const aTime = a.date?.getTime() ?? 0
    const bTime = b.date?.getTime() ?? 0
    if (aTime !== bTime) return aTime - bTime
    return a.timestamp.localeCompare(b.timestamp)
  })

  const deduped = new Map<string, EvolutionEntry>()

  evolutions.forEach((entry) => {
    const key = `${entry.timestamp}__${entry.text}`
    const existing = deduped.get(key)
    if (existing) {
      existing.duplicateCount += 1
      if (!existing.rtfOriginal && entry.rtfOriginal) {
        existing.rtfOriginal = entry.rtfOriginal
      }
      return
    }

    deduped.set(key, { ...entry, duplicateCount: 0 })
  })

  return Array.from(deduped.values())
}

export const parseCleanText = (cleanText: string) => {
  const normalized = normalizeText(cleanText)
  return {
    patientFields: extractPatientFields(normalized),
    evolutions: extractEvolutions(normalized),
  }
}
