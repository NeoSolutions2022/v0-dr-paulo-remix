export interface ParsedPatient {
  birthDate?: string
  fullName?: string
  missing: string[]
  debug?: PatientParseDebug
}

interface PatientParseDebug {
  steps: string[]
  headerLines: string[]
  matches: PatientLabelMatch[]
}

interface PatientLabelMatch {
  label: "fullName" | "birthDate"
  line: string
  rawValue?: string
  normalized?: string
}

const nameLineRegex = /Nome\s*[:\-]\s*(.+)/i
const birthDateLineRegex = /Data\s*de\s*Nascimento\s*[:\-]\s*(.+)/i

export function normalizeBirthDate(raw?: string): string | undefined {
  if (!raw) return undefined
  const trimmed = raw
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[./]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")

  // yyyy-mm-dd or yyyy/mm/dd
  const isoMatch = trimmed.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/)
  if (isoMatch) {
    const [, year, monthRaw, dayRaw] = isoMatch
    const month = monthRaw.padStart(2, "0")
    const day = dayRaw.padStart(2, "0")
    if (isValidDate(year, month, day)) return `${year}-${month}-${day}`
    return undefined
  }

  // ddmmyyyy (numbers only)
  if (/^\d{8}$/.test(trimmed)) {
    const year = trimmed.slice(4, 8)
    const month = trimmed.slice(2, 4)
    const day = trimmed.slice(0, 2)
    if (isValidDate(year, month, day)) return `${year}-${month}-${day}`
    return undefined
  }

  // dd/mm/yyyy or dd-mm-yyyy
  const match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (!match) return undefined

  const [, dayRaw, monthRaw, year] = match
  const day = dayRaw.padStart(2, "0")
  const month = monthRaw.padStart(2, "0")
  if (!isValidDate(year, month, day)) return undefined
  return `${year}-${month}-${day}`
}

function isValidDate(year: string, month: string, day: string) {
  const date = new Date(`${year}-${month}-${day}`)
  return (
    date.getFullYear() === Number(year) &&
    date.getMonth() + 1 === Number(month) &&
    date.getDate() === Number(day)
  )
}

export function extractPatientData(text: string, options?: { debug?: boolean }): ParsedPatient {
  const missing: string[] = []
  const debug = options?.debug ? createDebugState() : undefined
  const lines = splitLines(text)
  if (debug) debug.steps.push(`Linhas normalizadas: ${lines.length}`)
  const headerLines = extractHeaderLines(lines, debug)
  const fullName = extractFullName(headerLines, debug) ?? extractFullName(lines, debug)
  const birthDate = extractBirthDate(headerLines, debug) ?? extractBirthDate(lines, debug)

  if (!birthDate) missing.push("birthDate")
  if (!fullName) missing.push("fullName")

  return {
    birthDate,
    fullName,
    missing,
    debug: missing.length > 0 ? debug : undefined,
  }
}

function createDebugState(): PatientParseDebug {
  return { steps: [], headerLines: [], matches: [] }
}

function splitLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^=+$/.test(line))
}

function extractHeaderLines(lines: string[], debug?: PatientParseDebug) {
  const stopIndex = lines.findIndex(
    (line) => /INFORMAÇÕES ADICIONAIS/i.test(line) || /---\s*Evolu[cç][aã]o/i.test(line),
  )
  const headerLines = stopIndex === -1 ? lines : lines.slice(0, stopIndex)
  if (debug) {
    debug.headerLines = headerLines
    debug.steps.push(`Header lines identificadas: ${headerLines.length}`)
  }
  return headerLines
}

function extractFullName(lines: string[], debug?: PatientParseDebug): string | undefined {
  for (const line of lines) {
    const match = line.match(nameLineRegex)
    if (!match?.[1]) continue
    const cleaned = cleanupName(match[1])
    if (debug) {
      debug.matches.push({ label: "fullName", line, rawValue: match[1], normalized: cleaned })
    }
    if (cleaned) return cleaned
  }
  if (debug) debug.steps.push("Nenhuma linha com Nome encontrada.")
  return undefined
}

function extractBirthDate(lines: string[], debug?: PatientParseDebug): string | undefined {
  for (const line of lines) {
    const match = line.match(birthDateLineRegex)
    if (!match?.[1]) continue
    const normalized = normalizeBirthDate(match[1])
    if (debug) {
      debug.matches.push({ label: "birthDate", line, rawValue: match[1], normalized })
    }
    if (normalized) return normalized
    if (debug) {
      debug.steps.push(`Data de Nascimento inválida após normalização: "${match[1]}"`)
    }
  }
  if (debug) debug.steps.push("Nenhuma linha com Data de Nascimento encontrada.")
  return undefined
}

function cleanupName(raw: string): string {
  return raw
    .replace(/Data\s+de\s+Nascimento.*$/i, "")
    .replace(/Dt\.?\s*Nasc.*$/i, "")
    .replace(/Telefone.*$/i, "")
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
