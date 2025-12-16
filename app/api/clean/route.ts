import { NextRequest, NextResponse } from 'next/server';

interface CleanPayload {
  rawText: string;
}

function log(logs: string[], msg: string): void {
  logs.push(msg);
}

function decodeRtfHex(text: string, logs: string[]): string {
  log(logs, "RTF hex decodificado");
  
  // CP1252 complete mapping
  const cp1252Map: Record<number, string> = {
    0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…',
    0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8A: 'Š', 0x8B: '‹',
    0x8C: 'Œ', 0x8E: 'Ž', 0x91: "'", 0x92: "'", 0x93: '"', 0x94: '"', 
    0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9A: 'š', 
    0x9B: '›', 0x9C: 'œ', 0x9E: 'ž', 0x9F: 'Ÿ', 0xA0: ' ', 0xA1: '¡', 
    0xA2: '¢', 0xA3: '£', 0xA4: '¤', 0xA5: '¥', 0xA6: '¦', 0xA7: '§', 
    0xA8: '¨', 0xA9: '©', 0xAA: 'ª', 0xAB: '«', 0xAC: '¬', 0xAD: '­', 
    0xAE: '®', 0xAF: '¯', 0xB0: '°', 0xB1: '±', 0xB2: '²', 0xB3: '³', 
    0xB4: '´', 0xB5: 'µ', 0xB6: '¶', 0xB7: '·', 0xB8: '¸', 0xB9: '¹', 
    0xBA: 'º', 0xBB: '»', 0xBC: '¼', 0xBD: '½', 0xBE: '¾', 0xBF: '¿', 
    0xC0: 'À', 0xC1: 'Á', 0xC2: 'Â', 0xC3: 'Ã', 0xC4: 'Ä', 0xC5: 'Å', 
    0xC6: 'Æ', 0xC7: 'Ç', 0xC8: 'È', 0xC9: 'É', 0xCA: 'Ê', 0xCB: 'Ë', 
    0xCC: 'Ì', 0xCD: 'Í', 0xCE: 'Î', 0xCF: 'Ï', 0xD0: 'Ð', 0xD1: 'Ñ', 
    0xD2: 'Ò', 0xD3: 'Ó', 0xD4: 'Ô', 0xD5: 'Õ', 0xD6: 'Ö', 0xD7: '×', 
    0xD8: 'Ø', 0xD9: 'Ù', 0xDA: 'Ú', 0xDB: 'Û', 0xDC: 'Ü', 0xDD: 'Ý', 
    0xDE: 'Þ', 0xDF: 'ß', 0xE0: 'à', 0xE1: 'á', 0xE2: 'â', 0xE3: 'ã', 
    0xE4: 'ä', 0xE5: 'å', 0xE6: 'æ', 0xE7: 'ç', 0xE8: 'è', 0xE9: 'é', 
    0xEA: 'ê', 0xEB: 'ë', 0xEC: 'ì', 0xED: 'í', 0xEE: 'î', 0xEF: 'ï', 
    0xF0: 'ð', 0xF1: 'ñ', 0xF2: 'ò', 0xF3: 'ó', 0xF4: 'ô', 0xF5: 'õ', 
    0xF6: 'ö', 0xF7: '÷', 0xF8: 'ø', 0xF9: 'ù', 0xFA: 'ú', 0xFB: 'û', 
    0xFC: 'ü', 0xFD: 'ý', 0xFE: 'þ', 0xFF: 'ÿ'
  };
  
  // Match \'XX patterns and convert to proper characters
  text = text.replace(/\\['"]([0-9A-Fa-f]{2})/g, (match, hex) => {
    const charCode = parseInt(hex, 16);
    return cp1252Map[charCode] || String.fromCharCode(charCode);
  });
  
  return text;
}

function removeRtfGarbage(text: string, logs: string[]): string {
  log(logs, "RTF lixo removido");
  
  text = text.replace(/\{\\fonttbl[\s\S]*?\}/g, '');
  text = text.replace(/\{\\colortbl[\s\S]*?\}/g, '');
  text = text.replace(/\{\\stylesheet[\s\S]*?\}/g, '');
  text = text.replace(/\{\\info[\s\S]*?\}/g, '');
  text = text.replace(/\{\\\\?\*?\\[a-z]+[\s\S]*?\}/g, '');
  
  text = text.replace(/\\loch\\af\d+\\dbch\\af\d+\\hich\\f\d+/gi, '');
  text = text.replace(/\\rtlch\\af\d+\\afs\d+\\alang\d+\\ab?\\ltrch\\f\d+\\fs\d+\\lang\d+\\langnp\d+\\langfe\d+\\langfenp\d+\\b?/gi, '');
  text = text.replace(/\\loch\\f\d+\\hich\\f\d+/gi, '');
  text = text.replace(/\\plain\\f\d+\\fs\d+\\b?/gi, '');
  text = text.replace(/\\[a-z]+\\[a-z]+\d+/gi, '');
  text = text.replace(/\\[a-z]+\d*/gi, '');
  
  text = text.replace(/\{\\rtf1[^}]*\}/g, '');
  text = text.replace(/[{}]/g, '');
  
  text = text.replace(/ARIAL;\s*Wingdings;\s*Symbol;/gi, '');
  text = text.replace(/Wingdings;\s*Symbol;/gi, '');
  text = text.replace(/\b(ARIAL|Wingdings|Symbol|Times New Roman)\b\s*;?\s*/gi, '');
  
  text = text.replace(/\s+/g, ' ');
  
  return text;
}

function normalizeLineBreaks(text: string, logs: string[]): string {
  log(logs, "Quebras de linha normalizadas");
  
  // Normalize all line breaks to \n
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Remove excessive blank lines (more than 2)
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Trim each line
  const lines = text.split('\n').map(line => line.trim());
  
  // Remove empty lines
  const cleanedLines = lines.filter(line => line.length > 0);
  
  return cleanedLines.join('\n');
}

function normalizeUnicodeChars(text: string, logs: string[]): string {
  log(logs, "Caracteres Unicode normalizados");
  
  // Normalize to NFKC form
  text = text.normalize('NFKC');
  
  // Remove invisible control characters but keep newlines, tabs
  text = text.split('').filter(ch => {
    const category = getUnicodeCategory(ch);
    return category[0] !== 'C' || ['\n', '\r', '\t'].includes(ch);
  }).join('');
  
  return text;
}

function getUnicodeCategory(char: string): string {
  const code = char.charCodeAt(0);
  if (code < 0x20 || (code >= 0x7F && code < 0xA0)) return 'Cc'; // Control
  return 'Lo'; // Other (simplified)
}

function preserveClinicalStructure(text: string, logs: string[]): string {
  log(logs, "Estrutura clínica preservada");
  
  const lines = text.split('\n');
  const sections: { 
    ficha: string[];
    psa: string[];
    biopsia: string[];
    exames: string[];
    evolucoes: { [key: string]: string[] };
    outros: string[]
  } = {
    ficha: [],
    psa: [],
    biopsia: [],
    exames: [],
    evolucoes: {},
    outros: []
  };
  
  let currentSection = 'outros';
  let currentDate = '';
  
  // Process all lines
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.match(/^(Código|Nome|Data de Nascimento|Telefone):/i)) {
      sections.ficha.push(trimmed);
      continue;
    }
    
    if (trimmed.match(/PSA|Antígeno Prostático/i)) {
      currentSection = 'psa';
      sections.psa.push(trimmed);
      continue;
    }
    
    if (trimmed.match(/Biópsia|Biopsy|Gleason/i)) {
      currentSection = 'biopsia';
      sections.biopsia.push(trimmed);
      continue;
    }
    
    if (trimmed.match(/Ressonância|Ultrassom|Tomografia|PET|RM de Próstata/i)) {
      currentSection = 'exames';
      sections.exames.push(trimmed);
      continue;
    }
    
    // Detect evolution entries and extract date
    const evolutionMatch = trimmed.match(/^---\s*Evolução em (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/i);
    if (evolutionMatch) {
      currentSection = 'evolucoes';
      currentDate = evolutionMatch[1];
      if (!sections.evolucoes[currentDate]) {
        sections.evolucoes[currentDate] = [];
        sections.evolucoes[currentDate].push(trimmed);
      }
      continue;
    }
    
    // Add to current section
    if (currentSection === 'evolucoes' && currentDate) {
      sections.evolucoes[currentDate].push(trimmed);
    } else if (currentSection === 'psa') {
      sections.psa.push(trimmed);
    } else if (currentSection === 'biopsia') {
      sections.biopsia.push(trimmed);
    } else if (currentSection === 'exames') {
      sections.exames.push(trimmed);
    } else {
      sections.outros.push(trimmed);
    }
  }
  
  const result: string[] = [];
  
  // Patient info header
  if (sections.ficha.length > 0) {
    result.push('==================================================');
    result.push('FICHA DO PACIENTE');
    result.push('==================================================');
    result.push(...sections.ficha);
    result.push('==================================================');
    result.push('');
  }
  
  if (sections.psa.length > 0) {
    result.push('==================================================');
    result.push('HISTÓRICO DE PSA');
    result.push('==================================================');
    result.push(...sections.psa);
    result.push('');
  }
  
  if (sections.biopsia.length > 0) {
    result.push('==================================================');
    result.push('RESULTADOS DE BIÓPSIA');
    result.push('==================================================');
    result.push(...sections.biopsia);
    result.push('');
  }
  
  if (sections.exames.length > 0) {
    result.push('==================================================');
    result.push('EXAMES DE IMAGEM');
    result.push('==================================================');
    result.push(...sections.exames);
    result.push('');
  }
  
  const evolutionDates = Object.keys(sections.evolucoes).sort();
  if (evolutionDates.length > 0) {
    result.push('==================================================');
    result.push('EVOLUÇÃO CLÍNICA');
    result.push('==================================================');
    for (const date of evolutionDates) {
      result.push(...sections.evolucoes[date]);
      result.push('');
    }
  }
  
  if (sections.outros.length > 0) {
    // Filter out common garbage patterns
    const meaningfulOthers = sections.outros.filter(line => {
      return line.length > 10 && !line.match(/^[=\-\s]+$/);
    });
    
    if (meaningfulOthers.length > 0) {
      result.push('==================================================');
      result.push('INFORMAÇÕES ADICIONAIS');
      result.push('==================================================');
      result.push(...meaningfulOthers);
    }
  }
  
  return result.join('\n');
}

function cleanMedicalText(raw: string): { cleanText: string; logs: string[] } {
  const logs: string[] = [];
  
  if (!raw || !raw.trim()) {
    return { cleanText: '', logs };
  }

  let text = raw;

  text = removeRtfGarbage(text, logs);
  text = decodeRtfHex(text, logs);
  text = normalizeLineBreaks(text, logs);
  text = normalizeUnicodeChars(text, logs);
  text = preserveClinicalStructure(text, logs);
  text = normalizeLineBreaks(text, logs);
  
  log(logs, "Processamento concluído com sucesso");

  return { cleanText: text, logs };
}

export async function POST(request: NextRequest) {
  try {
    let body: CleanPayload;
    
    try {
      body = await request.json();
    } catch (e) {
      console.error('[v0] JSON parse error:', e);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { rawText } = body;

    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json(
        { error: 'rawText é obrigatório e deve ser uma string' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { cleanText, logs } = cleanMedicalText(rawText);

    return NextResponse.json(
      {
        success: true,
        cleanText,
        logs,
      },
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
  } catch (error) {
    console.error('[v0] Erro ao limpar texto:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Falha ao limpar texto',
      },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
  }
}
