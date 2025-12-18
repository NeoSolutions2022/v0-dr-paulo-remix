export interface ParsedPatient {
  birthDate?: string
  fullName?: string
  missing: string[]
}

const dateRegex = /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}-\d{2}-\d{2}|\d{8})\b/
const fichaDateRegex =
  /Data\s+de\s+Nascimento[:\s-]+(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}-\d{2}-\d{2}|\d{8})/i
const fichaNameRegex = /Nome[:\s-]+([^\n]+)/i

export function normalizeBirthDate(raw?: string): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()

  if (/^\d{8}$/.test(trimmed)) {
    const year = trimmed.slice(4, 8)
    const month = trimmed.slice(2, 4)
    const day = trimmed.slice(0, 2)
    if (isValidDate(year, month, day)) return `${year}-${month}-${day}`
    return undefined
  }

  const match = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
  if (!match) return undefined

  const [, day, month, year] = match
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

export function extractPatientData(text: string): ParsedPatient {
  const missing: string[] = []
  const birthMatch = text.match(fichaDateRegex) ?? text.match(dateRegex)

  const birthDate = normalizeBirthDate(birthMatch?.[1])
  const fullName = extractName(text)

  if (!birthDate) missing.push("birthDate")
  if (!fullName) missing.push("fullName")

  return {
    birthDate,
    fullName,
    missing,
  }
}

function extractName(text: string): string | undefined {
  const fichaMatch = text.match(fichaNameRegex)
  if (fichaMatch?.[1]) {
    return fichaMatch[1].trim()
  }

  const candidateLine = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 5 && !l.startsWith("Código"))

  if (!candidateLine) return undefined

  const words = candidateLine
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, " ")
    .split(" ")
    .filter((w) => w.length > 2)

  if (words.length < 2) return undefined
  return words.join(" ")
}
