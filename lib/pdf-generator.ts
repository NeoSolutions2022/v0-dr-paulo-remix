import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

function sanitizeText(text: string): string {
  if (!text) return ''
  return text.replace(/\u0000/g, '').replace(/\r\n/g, '\n')
}

function createNewPage(
  pdfDoc: PDFDocument,
  font: any,
  boldFont: any,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  title: string,
  pageIndex: number,
) {
  const page = pdfDoc.addPage([pageWidth, pageHeight])

  page.drawText(title || 'Documento', {
    x: margin,
    y: pageHeight - margin,
    size: 16,
    font: boldFont,
    color: rgb(0.1, 0.3, 0.6),
  })

  page.drawText(`Página ${pageIndex}`, {
    x: pageWidth - margin - 80,
    y: pageHeight - margin - 20,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  })

  return { page, y: pageHeight - margin - 40 }
}

async function buildTextPdf(text: string, title: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595
  const pageHeight = 842
  const margin = 50
  const maxWidth = pageWidth - margin * 2
  const lineHeight = 14

  const pages: { page: any; y: number }[] = []

  const startPage = () => {
    const nextPage = createNewPage(
      pdfDoc,
      font,
      boldFont,
      pageWidth,
      pageHeight,
      margin,
      title,
      pages.length + 1,
    )
    pages.push(nextPage)
  }

  startPage()

  const drawLine = (content: string) => {
    const current = pages[pages.length - 1]

    if (current.y < margin + lineHeight * 2) {
      startPage()
    }

    const target = pages[pages.length - 1]
    target.page.drawText(content, {
      x: margin,
      y: target.y,
      size: 11,
      font,
      color: rgb(0, 0, 0),
    })
    target.y -= lineHeight
  }

  const wordsPerLine = (line: string) => {
    const words = line.split(' ')
    let buffer = ''

    const flush = () => {
      if (buffer.trim()) {
        drawLine(buffer.trim())
      }
      buffer = ''
    }

    for (const word of words) {
      const candidate = `${buffer}${word} `
      const width = font.widthOfTextAtSize(candidate, 11)
      if (width > maxWidth && buffer.trim() !== '') {
        flush()
        buffer = `${word} `
      } else {
        buffer = candidate
      }
    }

    if (buffer.trim()) {
      flush()
    }
  }

  for (const line of text.split('\n')) {
    if (!line.trim()) {
      // blank line spacing
      const current = pages[pages.length - 1]
      if (current.y < margin + lineHeight * 2) {
        startPage()
      }
      pages[pages.length - 1].y -= lineHeight
      continue
    }
    wordsPerLine(line)
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

export async function generatePdfFromText(
  text: string,
  _documentId: string,
  fileName: string,
): Promise<Buffer> {
  const safeText = sanitizeText(text)

  if (!safeText.trim()) {
    throw new Error('Documento inválido')
  }

  return buildTextPdf(safeText, fileName.replace(/\.[^/.]+$/, '') || 'Documento')
}
