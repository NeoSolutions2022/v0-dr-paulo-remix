const A4_HEIGHT_PX = 1122 // 96dpi
const PRINT_MARGIN_PX = 45
const SAFE_PAGE_BODY_HEIGHT = A4_HEIGHT_PX - PRINT_MARGIN_PX * 2 - 220

export function parsePatientHeader(cleanText) {
  const safe = (cleanText || '').split(/\n/)
  const header = safe.slice(0, 6).join('\n')

  const code = header.match(/codigo[:\-\s]*([\w-]+)/i)?.[1] || 'N/D'
  const name = header.match(/nome[:\-\s]*([^\n]+)/i)?.[1]?.trim() || 'Paciente'
  const birthDateISO = header.match(/nasc[:\-\s]*([0-9/]+)/i)?.[1]
  const phone = header.match(/(\(\d{2}\)\s?\d{4,5}[- ]?\d{4})/)?.[1]

  return { code, name, birthDateISO: birthDateISO || '', phone: phone || '' }
}

export function rtfToTextSafe(rtf) {
  if (!rtf) return ''
  try {
    return rtf
      .replace(/\{\\[^}]+\}/g, ' ')
      .replace(/\n/g, '\n')
      .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/[{}\\]/g, '')
  } catch (err) {
    console.warn('Falha ao limpar RTF', err)
    return String(rtf)
  }
}

export function parseEvolutions(cleanText) {
  const normalized = (cleanText || '').replace(/\r/g, '\n')
  const chunks = normalized.split(/\n{2,}/).map((c) => c.trim()).filter(Boolean)
  const dedup = Array.from(new Set(chunks))
  return dedup.map((text, idx) => ({ id: idx + 1, text }))
}

export function semanticSplit(evoText) {
  const blocks = []
  const sections = evoText.split(/\n(?=\w{3,}:)/)
  for (const raw of sections) {
    const [title, ...rest] = raw.split(/:\s*/) // e.g. EXAMES: ...
    const content = rest.join(': ').trim()
    if (!content) continue

    const key = title?.toLowerCase()
    let type = 'raw'
    if (/sumario|resumo|impressao/.test(key)) type = 'summary'
    else if (/exame|laboratorio/.test(key)) type = 'exams'
    else if (/ipss/.test(key)) type = 'ipss'
    else if (/fisico|physical/.test(key)) type = 'physical'

    blocks.push({ type, title: title?.trim() || 'Bloco', content })
  }

  if (blocks.length === 0) {
    blocks.push({ type: 'raw', title: 'Evolução', content: evoText })
  }

  return blocks
}

function buildCard(block) {
  const card = document.createElement('section')
  card.className = 'card'
  const h2 = document.createElement('h2')
  h2.textContent = block.title || 'Bloco'
  card.appendChild(h2)

  const meta = document.createElement('div')
  meta.className = 'meta'
  const badge = document.createElement('span')
  badge.className = 'badge'
  badge.textContent = block.type
  meta.appendChild(badge)
  card.appendChild(meta)

  const paragraph = document.createElement('p')
  paragraph.className = 'note'
  paragraph.textContent = block.content
  card.appendChild(paragraph)

  return card
}

export function buildDomReport({ header, evolutions }) {
  const fragment = document.createDocumentFragment()

  const headerEl = document.createElement('div')
  headerEl.className = 'header'
  const left = document.createElement('div')
  const right = document.createElement('div')
  const title = document.createElement('h1')
  title.textContent = `Relatório de ${header?.name || 'Paciente'}`
  left.appendChild(title)
  const code = document.createElement('p')
  code.className = 'meta'
  code.textContent = `Código: ${header?.code || 'N/D'}`
  left.appendChild(code)

  const badge = document.createElement('span')
  badge.className = 'badge'
  badge.textContent = header?.birthDateISO ? `Nascimento: ${header.birthDateISO}` : 'Sem data'
  right.appendChild(badge)

  headerEl.appendChild(left)
  headerEl.appendChild(right)
  fragment.appendChild(headerEl)

  const grid = document.createElement('div')
  grid.className = 'card-grid'

  for (const evo of evolutions) {
    const blocks = semanticSplit(evo.text)
    for (const block of blocks) {
      grid.appendChild(buildCard(block))
    }
  }

  fragment.appendChild(grid)

  return fragment
}

function extractParagraphStrings(nodes) {
  const text = nodes.map((n) => n.textContent || '').join('\n')
  return text
    .replace(/\r/g, '')
    .split(/\n\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

function splitStringToFit(cardEl, text, maxHeightPx) {
  let lo = 1,
    hi = text.length,
    best = 1
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    const head = text.slice(0, mid)

    const probe = document.createElement('p')
    probe.className = 'note'
    probe.textContent = head
    cardEl.appendChild(probe)
    const h = cardEl.getBoundingClientRect().height
    cardEl.removeChild(probe)

    if (h <= maxHeightPx) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return [text.slice(0, best).trim(), text.slice(best).trim()]
}

function splitCardByParagraphs(cardEl, maxHeightPx) {
  const title = cardEl.querySelector('h2')?.outerHTML || ''
  const contentNodes = Array.from(cardEl.childNodes).filter(
    (n) => !(n.nodeType === 1 && n.tagName === 'H2'),
  )

  const paragraphs = extractParagraphStrings(contentNodes)
  if (paragraphs.length === 0) return

  const parent = cardEl.parentElement
  const anchor = document.createComment('split-anchor')
  parent.insertBefore(anchor, cardEl)
  cardEl.remove()

  let idx = 0
  while (idx < paragraphs.length) {
    const newCard = document.createElement('section')
    newCard.className = 'card'
    newCard.innerHTML = title.replace(/<\/h2>/, `${idx > 0 ? ' (continuação)' : ''}</h2>`)
    parent.insertBefore(newCard, anchor)

    let addedAny = false
    while (idx < paragraphs.length) {
      const p = document.createElement('p')
      p.className = 'note'
      p.textContent = paragraphs[idx]
      newCard.appendChild(p)

      const h = newCard.getBoundingClientRect().height
      if (h > maxHeightPx && addedAny) {
        newCard.removeChild(p)
        break
      }

      if (h > maxHeightPx && !addedAny) {
        newCard.removeChild(p)
        const [head, tail] = splitStringToFit(newCard, paragraphs[idx], maxHeightPx)
        const p1 = document.createElement('p')
        p1.className = 'note'
        p1.textContent = head
        newCard.appendChild(p1)
        paragraphs[idx] = tail
        addedAny = true
        break
      }

      addedAny = true
      idx++
    }
  }

  anchor.remove()
}

function nextFrame() {
  return new Promise((r) => requestAnimationFrame(() => r()))
}

export async function prepareForPrint(reportRoot) {
  await nextFrame()
  await nextFrame()

  const cards = Array.from(reportRoot.querySelectorAll('.card'))
  for (const card of cards) {
    const h = card.getBoundingClientRect().height
    if (h > SAFE_PAGE_BODY_HEIGHT) {
      splitCardByParagraphs(card, SAFE_PAGE_BODY_HEIGHT)
    }
  }
}

export async function renderReportFromCleanText(cleanText, root) {
  const header = parsePatientHeader(cleanText)
  const evolutions = parseEvolutions(cleanText)
  root.innerHTML = ''
  root.appendChild(buildDomReport({ header, evolutions }))
}
