import { NextRequest, NextResponse } from "next/server"

interface CleanResult {
  cleanText: string
  logs: string[]
}

function log(logs: string[], msg: string): void {
  logs.push(msg)
}

function decodeRtfHex(text: string, logs: string[]): string {
  log(logs, "RTF hex decodificado")

  const cp1252Map: Record<number, string> = {
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
    0x91: "'",
    0x92: "'",
    0x93: '"',
    0x94: '"',
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
    0xa0: " ",
    0xa1: "¡",
    0xa2: "¢",
    0xa3: "£",
    0xa4: "¤",
    0xa5: "¥",
    0xa6: "¦",
    0xa7: "§",
    0xa8: "¨",
    0xa9: "©",
    0xaa: "ª",
    0xab: "«",
    0xac: "¬",
    0xad: "­",
    0xae: "®",
    0xaf: "¯",
    0xb0: "°",
    0xb1: "±",
    0xb2: "²",
    0xb3: "³",
    0xb4: "´",
    0xb5: "µ",
    0xb6: "¶",
    0xb7: "·",
    0xb8: "¸",
    0xb9: "¹",
    0xba: "º",
    0xbb: "»",
    0xbc: "¼",
    0xbd: "½",
    0xbe: "¾",
    0xbf: "¿",
    0xc0: "À",
    0xc1: "Á",
    0xc2: "Â",
    0xc3: "Ã",
    0xc4: "Ä",
    0xc5: "Å",
    0xc6: "Æ",
    0xc7: "Ç",
    0xc8: "È",
    0xc9: "É",
    0xca: "Ê",
    0xcb: "Ë",
    0xcc: "Ì",
    0xcd: "Í",
    0xce: "Î",
    0xcf: "Ï",
    0xd0: "Ð",
    0xd1: "Ñ",
    0xd2: "Ò",
    0xd3: "Ó",
    0xd4: "Ô",
    0xd5: "Õ",
    0xd6: "Ö",
    0xd7: "×",
    0xd8: "Ø",
    0xd9: "Ù",
    0xda: "Ú",
    0xdb: "Û",
    0xdc: "Ü",
    0xdd: "Ý",
    0xde: "Þ",
    0xdf: "ß",
    0xe0: "à",
    0xe1: "á",
    0xe2: "â",
    0xe3: "ã",
    0xe4: "ä",
    0xe5: "å",
    0xe6: "æ",
    0xe7: "ç",
    0xe8: "è",
    0xe9: "é",
    0xea: "ê",
    0xeb: "ë",
    0xec: "ì",
    0xed: "í",
    0xee: "î",
    0xef: "ï",
    0xf0: "ð",
    0xf1: "ñ",
    0xf2: "ò",
    0xf3: "ó",
    0xf4: "ô",
    0xf5: "õ",
    0xf6: "ö",
    0xf7: "÷",
    0xf8: "ø",
    0xf9: "ù",
    0xfa: "ú",
    0xfb: "û",
    0xfc: "ü",
    0xfd: "ý",
    0xfe: "þ",
    0xff: "ÿ",
  }

  return text.replace(/\\['"]([0-9A-Fa-f]{2})/g, (_match, hex) => {
    const charCode = parseInt(hex, 16)
    return cp1252Map[charCode] || String.fromCharCode(charCode)
  })
}

function removeRtfGarbage(text: string, logs: string[]): string {
  log(logs, "RTF lixo removido")

  text = text.replace(/\{\\fonttbl[\s\S]*?\}/g, "")
  text = text.replace(/\{\\colortbl[\s\S]*?\}/g, "")
  text = text.replace(/\{\\stylesheet[\s\S]*?\}/g, "")
  text = text.replace(/\{\\info[\s\S]*?\}/g, "")
  text = text.replace(/\{\\\\?\*?\\[a-z]+[\s\S]*?\}/g, "")

  text = text.replace(/\\loch\\af\d+\\dbch\\af\d+\\hich\\f\d+/gi, "")
  text = text.replace(/\\rtlch\\af\d+\\afs\d+\\alang\d+\\ab?\\ltrch\\f\d+\\fs\d+\\lang\d+\\langnp\d+\\langfe\d+\\langfenp\d+\\b?/gi, "")
  text = text.replace(/\\loch\\f\d+\\hich\\f\d+/gi, "")
  text = text.replace(/\\plain\\f\d+\\fs\d+\\b?/gi, "")
  text = text.replace(/\\[a-z]+\\[a-z]+\d+/gi, "")
  text = text.replace(/\\[a-z]+\d*/gi, "")

  text = text.replace(/\{\\rtf1[^}]*\}/g, "")
  text = text.replace(/[{}]/g, "")

  text = text.replace(/ARIAL;\s*Wingdings;\s*Symbol;/gi, "")
  text = text.replace(/Wingdings;\s*Symbol;/gi, "")
  text = text.replace(/\b(ARIAL|Wingdings|Symbol|Times New Roman)\b\s*;?\s*/gi, "")

  text = text.replace(/[ \t]+/g, " ")

  return text
}

function normalizeLineBreaks(text: string, logs: string[]): string {
  log(logs, "Quebras de linha normalizadas")

  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  text = text.replace(/\n{3,}/g, "\n\n")

  const lines = text.split("\n").map((line) => line.trim())
  const cleanedLines = lines.filter((line) => line.length > 0)

  return cleanedLines.join("\n")
}

function normalizeUnicodeChars(text: string, logs: string[]): string {
  log(logs, "Caracteres Unicode normalizados")

  text = text.normalize("NFKC")

  return text
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0)
      const isControl = code < 0x20 || (code >= 0x7f && code < 0xa0)
      return !isControl || ["\n", "\r", "\t"].includes(ch)
    })
    .join("")
}

function preserveClinicalStructure(text: string, logs: string[]): string {
  log(logs, "Estrutura clínica preservada")

  const normalizedText = text.replace(
    /\s+(Código|Nome|Data de Nascimento|Telefone):/gi,
    "\n$1:",
  )
  const lines = normalizedText.split("\n")
  const sections: {
    ficha: string[]
    psa: string[]
    biopsia: string[]
    exames: string[]
    evolucoes: { [key: string]: string[] }
    outros: string[]
  } = {
    ficha: [],
    psa: [],
    biopsia: [],
    exames: [],
    evolucoes: {},
    outros: [],
  }

  let currentSection = "outros"
  let currentDate = ""

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.match(/^(Código|Nome|Data de Nascimento|Telefone):/i)) {
      sections.ficha.push(trimmed)
      continue
    }

    if (trimmed.match(/PSA|Antígeno Prostático/i)) {
      currentSection = "psa"
      sections.psa.push(trimmed)
      continue
    }

    if (trimmed.match(/Biópsia|Biopsy|Gleason/i)) {
      currentSection = "biopsia"
      sections.biopsia.push(trimmed)
      continue
    }

    if (trimmed.match(/Ressonância|Ultrassom|Tomografia|PET|RM de Próstata/i)) {
      currentSection = "exames"
      sections.exames.push(trimmed)
      continue
    }

    const evolutionMatch = trimmed.match(/^---\s*Evolução em (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/i)
    if (evolutionMatch) {
      currentSection = "evolucoes"
      currentDate = evolutionMatch[1]
      if (!sections.evolucoes[currentDate]) {
        sections.evolucoes[currentDate] = []
        sections.evolucoes[currentDate].push(trimmed)
      }
      continue
    }

    if (currentSection === "evolucoes" && currentDate) {
      sections.evolucoes[currentDate].push(trimmed)
    } else if (currentSection === "psa") {
      sections.psa.push(trimmed)
    } else if (currentSection === "biopsia") {
      sections.biopsia.push(trimmed)
    } else if (currentSection === "exames") {
      sections.exames.push(trimmed)
    } else {
      sections.outros.push(trimmed)
    }
  }

  const result: string[] = []

  if (sections.ficha.length > 0) {
    result.push("==================================================")
    result.push("FICHA DO PACIENTE")
    result.push("==================================================")
    result.push(...sections.ficha)
    result.push("==================================================")
    result.push("")
  }

  if (sections.psa.length > 0) {
    result.push("==================================================")
    result.push("HISTÓRICO DE PSA")
    result.push("==================================================")
    result.push(...sections.psa)
    result.push("")
  }

  if (sections.biopsia.length > 0) {
    result.push("==================================================")
    result.push("RESULTADOS DE BIÓPSIA")
    result.push("==================================================")
    result.push(...sections.biopsia)
    result.push("")
  }

  if (sections.exames.length > 0) {
    result.push("==================================================")
    result.push("EXAMES DE IMAGEM")
    result.push("==================================================")
    result.push(...sections.exames)
    result.push("")
  }

  const evolutionDates = Object.keys(sections.evolucoes).sort()
  if (evolutionDates.length > 0) {
    result.push("==================================================")
    result.push("EVOLUÇÃO CLÍNICA")
    result.push("==================================================")
    for (const date of evolutionDates) {
      result.push(...sections.evolucoes[date])
      result.push("")
    }
  }

  if (sections.outros.length > 0) {
    const meaningfulOthers = sections.outros.filter((line) => {
      return line.length > 10 && !line.match(/^[=\-\s]+$/)
    })

    if (meaningfulOthers.length > 0) {
      result.push("==================================================")
      result.push("INFORMAÇÕES ADICIONAIS")
      result.push("==================================================")
      result.push(...meaningfulOthers)
    }
  }

  return result.join("\n")
}

export function cleanMedicalText(raw: string): CleanResult {
  const logs: string[] = []

  if (!raw || !raw.trim()) {
    return { cleanText: "", logs }
  }

  let text = raw

  text = text.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "\n").replace(/\\t/g, "\t")

  text = removeRtfGarbage(text, logs)
  text = decodeRtfHex(text, logs)
  text = normalizeLineBreaks(text, logs)
  text = normalizeUnicodeChars(text, logs)
  text = preserveClinicalStructure(text, logs)
  text = normalizeLineBreaks(text, logs)

  log(logs, "Processamento concluído com sucesso")

  return { cleanText: text, logs }
}

export function validateCleanRequest(request: NextRequest) {
  return request.json() as Promise<{ rawText: string }>
}

export function invalidRawTextResponse() {
  return NextResponse.json({ error: "rawText é obrigatório e deve ser uma string" }, { status: 400 })
}
