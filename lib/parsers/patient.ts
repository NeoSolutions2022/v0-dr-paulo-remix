export interface ParsedPatient {
  cpf?: string
  birthDate?: string
  fullName?: string
  missing: string[]
}

const cpfRegex = /\b(\d{3}[\.\s-]?\d{3}[\.\s-]?\d{3}[\s-]?\d{2})\b/
const dateRegex = /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{8})\b/

export function normalizeCpf(input?: string): string | undefined {
  if (!input) return undefined
  const digits = input.replace(/\D/g, "")
  if (digits.length !== 11) return undefined
  return validateCpfChecksum(digits) ? digits : undefined
}

function validateCpfChecksum(digits: string): boolean {
  if (digits.split("").every((d) => d === digits[0])) return false

  const calcDigit = (slice: number) => {
    const sum = digits
      .slice(0, slice)
      .split("")
      .reduce((acc, num, idx) => acc + parseInt(num, 10) * (slice + 1 - idx), 0)
    const mod = (sum * 10) % 11
    return mod === 10 ? 0 : mod
  }

  const digit1 = calcDigit(9)
  const digit2 = calcDigit(10)
  return digit1 === parseInt(digits[9]!, 10) && digit2 === parseInt(digits[10]!, 10)
}

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

export function extractPatientData(text: string, cpfOverride?: string): ParsedPatient {
  const missing: string[] = []
  const cpfMatch = text.match(cpfRegex)
  const birthMatch = text.match(dateRegex)

  const cpf = normalizeCpf(cpfOverride) || normalizeCpf(cpfMatch?.[1])
  const birthDate = normalizeBirthDate(birthMatch?.[1])
  const fullName = extractName(text)

  if (!cpf) missing.push("cpf")
  if (!birthDate) missing.push("birthDate")
  if (!fullName) missing.push("fullName")

  return {
    cpf,
    birthDate,
    fullName,
    missing,
  }
}

function extractName(text: string): string | undefined {
  const lineMatch = text.match(/(?:^|\n)Nome[:\s-]+([^\n]+)/i)
  if (lineMatch?.[1]) {
    return lineMatch[1].trim()
  }

  const firstLine = text.split("\n").map((l) => l.trim()).find((l) => l.length > 5)
  if (!firstLine) return undefined

  const words = firstLine.split(" ").filter((w) => w.length > 2)
  if (words.length < 2) return undefined
  return words.join(" ")
}
