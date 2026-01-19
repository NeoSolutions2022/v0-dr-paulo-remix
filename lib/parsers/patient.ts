export interface ParsedPatient {
  birthDate?: string
  fullName?: string
  missing: string[]
  debug?: PatientParseDebug
}

interface PatientParseDebug {
  headerSection: string
  fichaMatch?: string
  candidates: string[]
  birthDateLines: BirthDateLineDebug[]
}

interface BirthDateLineDebug {
  line: string
  match?: string
  normalized?: string
}

const dateSeparator = "[\\/\\-\\.\\s\\u2010-\\u2015\\u2212]"
const dateRegex = new RegExp(
  `(\\d{4}${dateSeparator}\\d{1,2}${dateSeparator}\\d{1,2}|\\d{1,2}${dateSeparator}\\d{1,2}${dateSeparator}\\d{4}|\\d{8})`,
  "g",
)
const dateRegexSingle = new RegExp(
  `(\\d{4}${dateSeparator}\\d{1,2}${dateSeparator}\\d{1,2}|\\d{1,2}${dateSeparator}\\d{1,2}${dateSeparator}\\d{4}|\\d{8})`,
)
const fichaDateRegex = new RegExp(
  `Data\\s*de\\s*Nascimento[^0-9]*(\\d{4}${dateSeparator}\\d{1,2}${dateSeparator}\\d{1,2}|\\d{1,2}${dateSeparator}\\d{1,2}${dateSeparator}\\d{4}|\\d{8})`,
  "i",
)
const fichaNameRegex = /Nome[:\s-]+([^\n]+)/i

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
  const debug = options?.debug ? createDebugState(text) : undefined
  const birthDate = findFirstBirthDate(text, debug)
  const fullName = extractName(text)

  if (!birthDate) missing.push("birthDate")
  if (!fullName) missing.push("fullName")

  return {
    birthDate,
    fullName,
    missing,
    debug: missing.length > 0 ? debug : undefined,
  }
}

function createDebugState(text: string): PatientParseDebug {
  const headerSection = extractHeaderSection(text)
  const fichaMatch = headerSection.match(fichaDateRegex)?.[1]
  const candidates = Array.from(text.matchAll(dateRegex))
    .map((m) => m[1] ?? m[0])
    .slice(0, 5)

  return {
    headerSection,
    fichaMatch,
    candidates,
    birthDateLines: [],
  }
}

function findFirstBirthDate(text: string, debug?: PatientParseDebug): string | undefined {
  const headerSection = debug?.headerSection ?? extractHeaderSection(text)
  const headerDate = findBirthDateInLines(headerSection, debug)
  if (headerDate) return headerDate

  const fichaValue = debug?.fichaMatch ?? headerSection.match(fichaDateRegex)?.[1]
  if (fichaValue) {
    const normalized = normalizeBirthDate(fichaValue)
    if (normalized) return normalized
  }

  const fallbackMatch = headerSection.match(/Data de Nascimento:\s*([0-9./\-\s]+)/i)
  if (fallbackMatch?.[1]) {
    const normalized = normalizeBirthDate(fallbackMatch[1])
    if (normalized) return normalized
  }

  const allCandidates = debug?.candidates ?? Array.from(text.matchAll(dateRegex)).map((m) => m[1] ?? m[0])
  for (const candidate of allCandidates) {
    const normalized = normalizeBirthDate(candidate)
    if (normalized) return normalized
  }
  return undefined
}

function extractHeaderSection(text: string) {
  const evolutionIndex = text.search(/---\s*Evolu[cç][aã]o/i)
  if (evolutionIndex !== -1) {
    return text.slice(0, evolutionIndex)
  }
  return text
}

function findBirthDateInLines(block: string, debug?: PatientParseDebug): string | undefined {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean)

  // Prioritize lines explicitly mentioning birth date
  for (const line of lines) {
    if (!/nasc/i.test(line)) continue

    const match = line.match(dateRegexSingle)
    const normalized = match?.[1] ? normalizeBirthDate(match[1]) : undefined
    if (debug) {
      debug.birthDateLines.push({
        line,
        match: match?.[1],
        normalized,
      })
    }
    if (normalized) return normalized
  }

  // Fallback: first valid date in header block
  for (const line of lines) {
    const match = line.match(dateRegexSingle)
    if (match?.[1]) {
      const normalized = normalizeBirthDate(match[1])
      if (normalized) return normalized
    }
  }

  return undefined
}

function extractName(text: string): string | undefined {
  const header = extractHeaderSection(text)

  const fichaMatch = header.match(fichaNameRegex)
  if (fichaMatch?.[1]) {
    const cleaned = cleanupName(fichaMatch[1])
    if (cleaned) return cleaned
  }

  const candidateLine = header
    .split("\n")
    .map((l) => l.trim())
    .find((l) => /nome[:\s-]/i.test(l) || (l.length > 5 && !/^=+$/.test(l)))

  if (!candidateLine) return undefined

  const cleaned = cleanupName(candidateLine.replace(/^[Nn]ome[:\s-]+/, ""))
  return cleaned || undefined
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
