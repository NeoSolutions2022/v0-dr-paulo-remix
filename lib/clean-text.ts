export function cleanText(rawText: string): string {
  let cleaned = rawText

  // Windows-1252 to UTF-8 character mapping
  const charMap: Record<string, string> = {
    '\u2018': "'", // left single quote
    '\u2019': "'", // right single quote
    '\u201C': '"', // left double quote
    '\u201D': '"', // right double quote
    '\u2013': '-', // en dash
    '\u2014': '--', // em dash
    '\u2026': '...', // ellipsis
  }

  for (const [oldChar, newChar] of Object.entries(charMap)) {
    cleaned = cleaned.replace(new RegExp(oldChar, 'g'), newChar)
  }

  // Remove extra whitespace
  cleaned = cleaned.replace(/\r\n/g, '\n')
  cleaned = cleaned.replace(/\r/g, '\n')
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  cleaned = cleaned.trim()

  return cleaned
}
