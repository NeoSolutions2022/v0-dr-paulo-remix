import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

export async function generatePdfFromText(
  text: string,
  documentId: string,
  fileName: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4 size
  const { width, height } = page.getSize()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Header
  page.drawText('DOCUMENTO MÉDICO', {
    x: 50,
    y: height - 50,
    size: 16,
    font: boldFont,
    color: rgb(0.1, 0.3, 0.6),
  })

  page.drawText(fileName, {
    x: 50,
    y: height - 75,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  })

  // Content - split into lines
  const lines = text.split('\n')
  const maxWidth = width - 100
  const lineHeight = 14
  let yPosition = height - 110

  for (const line of lines) {
    if (yPosition < 150) break // Leave space for footer
    
    // Wrap long lines
    const words = line.split(' ')
    let currentLine = ''
    
    for (const word of words) {
      const testLine = currentLine + word + ' '
      const textWidth = font.widthOfTextAtSize(testLine, 11)
      
      if (textWidth > maxWidth && currentLine !== '') {
        page.drawText(currentLine.trim(), {
          x: 50,
          y: yPosition,
          size: 11,
          font,
          color: rgb(0, 0, 0),
        })
        currentLine = word + ' '
        yPosition -= lineHeight
      } else {
        currentLine = testLine
      }
    }
    
    if (currentLine.trim() !== '') {
      page.drawText(currentLine.trim(), {
        x: 50,
        y: yPosition,
        size: 11,
        font,
        color: rgb(0, 0, 0),
      })
      yPosition -= lineHeight
    }
  }

  // QR Code for validation
  const validationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/validar/${documentId}`
  const qrDataUrl = await QRCode.toDataURL(validationUrl, {
    width: 150,
    margin: 1,
  })

  const qrImageBytes = await fetch(qrDataUrl).then(res => res.arrayBuffer())
  const qrImage = await pdfDoc.embedPng(qrImageBytes)
  const qrDims = qrImage.scale(0.6)

  page.drawImage(qrImage, {
    x: 50,
    y: 50,
    width: qrDims.width,
    height: qrDims.height,
  })

  // Footer text
  page.drawText('Validação do Documento', {
    x: 50 + qrDims.width + 15,
    y: 100,
    size: 9,
    font: boldFont,
    color: rgb(0, 0, 0),
  })

  page.drawText('Escaneie o QR Code para', {
    x: 50 + qrDims.width + 15,
    y: 85,
    size: 8,
    font,
    color: rgb(0.3, 0.3, 0.3),
  })

  page.drawText('validar a autenticidade', {
    x: 50 + qrDims.width + 15,
    y: 72,
    size: 8,
    font,
    color: rgb(0.3, 0.3, 0.3),
  })

  page.drawText('deste documento.', {
    x: 50 + qrDims.width + 15,
    y: 59,
    size: 8,
    font,
    color: rgb(0.3, 0.3, 0.3),
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
