import { PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

function sanitizeText(text: string): string {
  if (!text) return ''
  return text.replace(/\u0000/g, '').replace(/\r\n/g, '\n')
}

async function buildPlainPdf(text: string, title: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const page = pdfDoc.addPage([595, 842])
  const margin = 50
  const lineHeight = 14
  const maxWidth = 595 - margin * 2

  const lines = text.split('\n')
  let y = 842 - margin

  page.drawText(title || 'Documento', {
    x: margin,
    y,
    size: 16,
    font,
    color: rgb(0.1, 0.3, 0.6),
  })

  y -= 24

  const wrapAndDraw = (line: string) => {
    const words = line.split(' ')
    let current = ''

    const flush = () => {
      page.drawText(current.trim(), {
        x: margin,
        y,
        size: 11,
        font,
        color: rgb(0, 0, 0),
      })
      y -= lineHeight
    }

    for (const word of words) {
      const candidate = `${current}${word} `
      const width = font.widthOfTextAtSize(candidate, 11)
      if (width > maxWidth && current.trim() !== '') {
        flush()
        current = `${word} `
      } else {
        current = candidate
      }
    }

    if (current.trim()) {
      flush()
    }
  }

  for (const line of lines) {
    wrapAndDraw(line)
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

async function buildRichPdf(
  text: string,
  documentId: string,
  fileName: string,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595
  const pageHeight = 842
  const margin = 50
  const maxWidth = pageWidth - margin * 2
  const lineHeight = 14

  const addHeader = (page: PDFPage, pageIndex: number) => {
    page.drawText('DOCUMENTO MÉDICO', {
      x: margin,
      y: pageHeight - margin,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.3, 0.6),
    })

    page.drawText(fileName, {
      x: margin,
      y: pageHeight - margin - 25,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })

    page.drawText(`Página ${pageIndex}`, {
      x: pageWidth - margin - 80,
      y: pageHeight - margin - 25,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  const pages: { page: PDFPage; y: number }[] = []

  const startPage = () => {
    const page = pdfDoc.addPage([pageWidth, pageHeight])
    addHeader(page, pages.length + 1)
    pages.push({ page, y: pageHeight - margin - 60 })
  }

  startPage()

  const lines = text.split('\n')

  for (const line of lines) {
    const words = line.split(' ')
    let currentLine = ''

    const drawCurrentLine = () => {
      const { page, y } = pages[pages.length - 1]
      page.drawText(currentLine.trim(), {
        x: margin,
        y,
        size: 11,
        font,
        color: rgb(0, 0, 0),
      })
      pages[pages.length - 1].y -= lineHeight
    }

    for (const word of words) {
      const testLine = `${currentLine}${word} `
      const textWidth = font.widthOfTextAtSize(testLine, 11)

      if (textWidth > maxWidth && currentLine !== '') {
        drawCurrentLine()

        if (pages[pages.length - 1].y < margin + 120) {
          startPage()
        }

        currentLine = `${word} `
      } else {
        currentLine = testLine
      }
    }

    if (currentLine.trim() !== '') {
      if (pages[pages.length - 1].y < margin + 120) {
        startPage()
      }

      drawCurrentLine()
    }

    pages[pages.length - 1].y -= lineHeight / 2
  }

  const validationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/validar/${documentId}`

  try {
    const qrDataUrl = await QRCode.toDataURL(validationUrl, {
      width: 150,
      margin: 1,
    })

    const qrBase64 = qrDataUrl.split(',')[1]
    const qrImageBytes = Buffer.from(qrBase64, 'base64')
    const qrImage = await pdfDoc.embedPng(qrImageBytes)
    const qrDims = qrImage.scale(0.6)

    const firstPage = pages[0].page

    firstPage.drawImage(qrImage, {
      x: margin,
      y: margin,
      width: qrDims.width,
      height: qrDims.height,
    })

    firstPage.drawText('Validação do Documento', {
      x: margin + qrDims.width + 15,
      y: margin + 50,
      size: 9,
      font: boldFont,
      color: rgb(0, 0, 0),
    })

    firstPage.drawText('Escaneie o QR Code para', {
      x: margin + qrDims.width + 15,
      y: margin + 35,
      size: 8,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })

    firstPage.drawText('validar a autenticidade', {
      x: margin + qrDims.width + 15,
      y: margin + 22,
      size: 8,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })

    firstPage.drawText('deste documento.', {
      x: margin + qrDims.width + 15,
      y: margin + 9,
      size: 8,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })
  } catch (error) {
    console.error('Falha ao inserir QR Code no PDF', error)
    // Mesmo que o QR falhe, o PDF ainda será entregue ao paciente.
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

export async function generatePdfFromText(
  text: string,
  documentId: string,
  fileName: string,
): Promise<Buffer> {
  const safeText = sanitizeText(text)

  if (!safeText.trim()) {
    throw new Error('Documento inválido')
  }

  try {
    return await buildRichPdf(safeText, documentId, fileName)
  } catch (error) {
    console.error('Erro no pipeline principal de PDF, aplicando fallback simples', error)
    return await buildPlainPdf(safeText, fileName)
  }
}
