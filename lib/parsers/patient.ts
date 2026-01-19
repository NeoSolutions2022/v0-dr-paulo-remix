export interface ParsedPatient {
  birthDate?: string
  fullName?: string
  missing: string[]
}

const dateSeparator = "[\\/\\-\\u2010-\\u2015\\u2212]"
const dateRegex = new RegExp(
  `(\\d{4}${dateSeparator}\\d{2}${dateSeparator}\\d{2}|\\d{2}${dateSeparator}\\d{2}${dateSeparator}\\d{4}|\\d{8})`,
  "g",
)
const dateRegexSingle = new RegExp(
  `(\\d{4}${dateSeparator}\\d{2}${dateSeparator}\\d{2}|\\d{2}${dateSeparator}\\d{2}${dateSeparator}\\d{4}|\\d{8})`,
)
const fichaDateRegex = new RegExp(
  `Data\\s*de\\s*Nascimento[^0-9]*(\\d{4}${dateSeparator}\\d{2}${dateSeparator}\\d{2}|\\d{2}${dateSeparator}\\d{2}${dateSeparator}\\d{4}|\\d{8})`,
  "i",
)
const fichaNameRegex = /Nome[:\s-]+([^\n]+)/i
const fichaNameBirthRegex =
  /Nome:\s*(.+?)\s*Data\s*de\s*Nascimento:\s*(\d{4}[\/\-\u2010-\u2015\u2212]\d{2}[\/\-\u2010-\u2015\u2212]\d{2}|\d{2}[\/\-\u2010-\u2015\u2212]\d{2}[\/\-\u2010-\u2015\u2212]\d{4}|\d{8})/i


export function normalizeBirthDate(raw?: string): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim().replace(/[\u2010-\u2015\u2212]/g, "-")

  // yyyy-mm-dd or yyyy/mm/dd
  const isoMatch = trimmed.match(/^(\d{4})[\/-](\d{2})[\/-](\d{2})$/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
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
  const match = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
  if (!match) return undefined

  const [, day, month, year] = match
  if (!isValidDate(year, month, day)) return undefined
  return `${year}-${month}-${day}`
}

function isValidDate(year: string, month: string, day: string) {
  const y = Number(year)
  const m = Number(month)
  const d = Number(day)

  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false
  if (m < 1 || m > 12) return false
  if (d < 1 || d > 31) return false

  // Valida usando UTC (não sofre com timezone)
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() + 1 === m &&
    date.getUTCDate() === d
  )
}


export function extractPatientData(text: string): ParsedPatient {
  const missing: string[] = []
  const combinedMatch = text.match(fichaNameBirthRegex)
  const fullName =
  combinedMatch?.[1] ? cleanupName(combinedMatch[1]) : extractName(text)

  let birthDate =
    combinedMatch?.[2] ? normalizeBirthDate(combinedMatch[2]) : undefined

  if (!birthDate) {
  birthDate = findFirstBirthDate(text)
  }

  if (!birthDate) missing.push("birthDate")
  if (!fullName) missing.push("fullName")

  return {
    birthDate,
    fullName,
    missing,
  }
}

function findFirstBirthDate(text: string): string | undefined {
  const headerSection = extractHeaderSection(text)

  console.log("[parser] headerSection (primeiros 200):", headerSection.slice(0, 200))
  console.log("[parser] headerSection contém 'Nascimento'?", /nasc/i.test(headerSection))

  const headerDate = findBirthDateInLines(headerSection)
  console.log("[parser] headerDate (findBirthDateInLines):", headerDate)
  if (headerDate) return headerDate

  const fichaMatch = headerSection.match(fichaDateRegex)
  console.log("[parser] fichaDateRegex match:", fichaMatch?.[1])

  if (fichaMatch?.[1]) {
    const normalized = normalizeBirthDate(fichaMatch[1])
    console.log("[parser] fichaDateRegex normalized:", normalized)
    if (normalized) return normalized
  }

  const single = headerSection.match(dateRegexSingle)
  console.log("[parser] dateRegexSingle match:", single?.[1])
  if (single?.[1]) {
    const normalized = normalizeBirthDate(single[1])
    console.log("[parser] dateRegexSingle normalized:", normalized)
    if (normalized) return normalized
  }

  const allCandidates = Array.from(text.matchAll(dateRegex)).map((m) => m[1] ?? m[0])
  console.log("[parser] allCandidates (primeiros 10):", allCandidates.slice(0, 10))

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

function findBirthDateInLines(block: string): string | undefined {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean)

  // Prioritize lines explicitly mentioning birth date
  for (const line of lines) {
    if (!/nasc/i.test(line)) continue

    const match = line.match(dateRegexSingle)
    if (match?.[1]) {
      const normalized = normalizeBirthDate(match[1])
      if (normalized) return normalized
    }
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
