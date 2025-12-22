"use client"

import { useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Download, Loader2, Printer, RefreshCw, FileText } from 'lucide-react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

function sanitizeText(text: string) {
  return text
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
}

const REGULAR_FONT_SOURCES = [
  'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
]

const BOLD_FONT_SOURCES = [
  'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf',
]

let regularFontPromise: Promise<Uint8Array> | null = null
let boldFontPromise: Promise<Uint8Array> | null = null

async function loadFromSources(sources: string[]) {
  for (const source of sources) {
    try {
      const response = await fetch(source)
      if (!response.ok) {
        console.warn(`Não foi possível carregar a fonte em ${source}: ${response.status}`)
        continue
      }
      const buffer = await response.arrayBuffer()
      return new Uint8Array(buffer)
    } catch (error) {
      console.warn(`Erro ao baixar fonte de ${source}`, error)
      continue
    }
  }
  throw new Error('Nenhuma fonte disponível para o cliente')
}

async function getClientFonts(pdfDoc: PDFDocument) {
  try {
    pdfDoc.registerFontkit(fontkit)

    if (!regularFontPromise) {
      regularFontPromise = loadFromSources(REGULAR_FONT_SOURCES)
    }
    if (!boldFontPromise) {
      boldFontPromise = loadFromSources(BOLD_FONT_SOURCES)
    }

    const [regularBytes, boldBytes] = await Promise.all([
      regularFontPromise,
      boldFontPromise,
    ])

    const font = await pdfDoc.embedFont(regularBytes, { subset: true })
    const boldFont = await pdfDoc.embedFont(boldBytes ?? regularBytes, {
      subset: true,
    })

    return { font, boldFont }
  } catch (error) {
    console.warn('Falha ao carregar fontes Noto Sans no cliente, usando padrão', error)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    return { font, boldFont }
  }
}

async function buildPdfLocally(text: string, title: string): Promise<Blob> {
  const pdfDoc = await PDFDocument.create()
  const { font, boldFont } = await getClientFonts(pdfDoc)

  const pageWidth = 595
  const pageHeight = 842
  const margin = 50
  const maxWidth = pageWidth - margin * 2
  const lineHeight = 14

  const createPage = (pageIndex: number) => {
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

  const pages: { page: any; y: number }[] = [createPage(1)]

  const drawLine = (content: string) => {
    const current = pages[pages.length - 1]

    if (current.y < margin + lineHeight * 2) {
      pages.push(createPage(pages.length + 1))
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

  const normalized = sanitizeText(text) || 'Conteúdo indisponível.'

  for (const line of normalized.split('\n')) {
    if (!line.trim()) {
      const current = pages[pages.length - 1]
      if (current.y < margin + lineHeight * 2) {
        pages.push(createPage(pages.length + 1))
      }
      pages[pages.length - 1].y -= lineHeight
      continue
    }
    wordsPerLine(line)
  }

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}

async function loadHtml2Pdf(): Promise<any> {
  if (typeof window === 'undefined') return null
  if ((window as any).html2pdf) return (window as any).html2pdf

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src =
      'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js'
    script.async = true
    script.onload = () => resolve((window as any).html2pdf)
    script.onerror = () => reject(new Error('Não foi possível carregar html2pdf'))
    document.body.appendChild(script)
  })
}

async function buildStyledPdfFromHtml(html: string, fileName: string): Promise<Blob> {
  // html2canvas não suporta funções de cor CSS modernas (ex.: lab(), lch(), color-mix).
  // Normalizamos para um fallback seguro antes de inserir no DOM para evitar falhas de parsing.
  const sanitizedHtml = html
    .replace(/lab\([^)]*\)/gi, '#003d7a')
    .replace(/lch\([^)]*\)/gi, '#003d7a')
    .replace(/color-mix\([^)]*\)/gi, '#003d7a')

  const html2pdf = await loadHtml2Pdf()
  if (!html2pdf) throw new Error('Ferramenta de PDF indisponível no navegador')

  const container = document.createElement('div')
  container.innerHTML = sanitizedHtml
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '-9999px'
  document.body.appendChild(container)

  try {
    const worker = html2pdf()
      .from(container)
      .set({
        margin: [10, 10, 10, 10],
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 1.2, useCORS: true },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
      })
      .toPdf()

    const pdf = await worker.get('pdf')
    const blob = pdf.output('blob') as Blob
    return blob
  } finally {
    container.remove()
  }
}

function buildClientFallbackHtml(text: string, patientName: string) {
  const safeText = sanitizeText(text) || 'Relatório indisponível'
  const escaped = safeText
    .split('\n')
    .map((line) =>
      line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;'),
    )
    .join('<br />')

  return `<!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${patientName}</title>
        <style>
          body { font-family: 'Noto Sans', 'Helvetica', 'Arial', sans-serif; padding: 24px; line-height: 1.5; color: #0f172a; }
          h1 { font-size: 20px; margin-bottom: 12px; color: #0f172a; }
          .content { white-space: normal; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Relatório do paciente</h1>
        <div class="content">${escaped}</div>
      </body>
    </html>`
}

interface ProcessedDocumentViewerProps {
  cleanText?: string | null
  fileName: string
  documentId: string
  txtUrl?: string | null
  patientName?: string | null
  shouldGenerate?: boolean
  triggerKey?: number
  onPdfReady?: (pdfUrl: string) => void
}

export function ProcessedDocumentViewer({
  cleanText,
  fileName,
  documentId,
  txtUrl,
  patientName,
  shouldGenerate = false,
  triggerKey = 0,
  onPdfReady,
}: ProcessedDocumentViewerProps) {
  const [textSource, setTextSource] = useState(cleanText?.trim() || '')
  const [isFetchingText, setIsFetchingText] = useState(!cleanText && !!txtUrl)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isStyled, setIsStyled] = useState(false)

  const baseName = useMemo(
    () => fileName.replace(/\.[^/.]+$/, '') || 'documento',
    [fileName],
  )

  useEffect(() => {
    // Mantém o texto em sincronia com o documento selecionado
    setTextSource(cleanText?.trim() || '')
  }, [cleanText])

  useEffect(() => {
    const fetchTxt = async () => {
      if (!txtUrl || textSource) return
      try {
        setIsFetchingText(true)
        const response = await fetch(txtUrl)
        const body = await response.text()
        setTextSource(body.trim())
      } catch (err) {
        console.error('Erro ao buscar TXT do documento', err)
        setError('Não foi possível carregar o texto do relatório.')
      } finally {
        setIsFetchingText(false)
      }
    }

    fetchTxt()
  }, [textSource, txtUrl])

  const requestPdfFromServer = async () => {
    if (!textSource) {
      setError('Documento sem texto processado para gerar PDF.')
      return
    }

    try {
      setIsGenerating(true)
      setError(null)
      setIsStyled(false)

      // 1) Tenta gerar PDF estilizado direto do servidor (puppeteer)
      const styledPdfResponse = await fetch(`/api/patient/documents/${documentId}/pdf-styled`, {
        cache: 'no-store',
      })

      if (styledPdfResponse.ok && styledPdfResponse.headers.get('content-type')?.includes('application/pdf')) {
        const blob = await styledPdfResponse.blob()
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
        setIsStyled(true)
        onPdfReady?.(url)
        return
      }

      // 2) Se o servidor falhar, tenta obter o HTML estilizado dedicado do documento
      const response = await fetch(`/api/patient/documents/${documentId}/styled-html`, {
        cache: 'no-store',
      })

      let html: string | null = null

      if (response.ok) {
        const payload = (await response.json()) as { html?: string }
        html = payload?.html || null
      } else {
        console.warn('Endpoint styled-html retornou status não OK, usando fallback local', response.status)
      }

      if (!html) {
        html = buildClientFallbackHtml(textSource, patientName || baseName)
      }

      const blob = await buildStyledPdfFromHtml(html, baseName)
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      setIsStyled(true)
      onPdfReady?.(url)
    } catch (styledError: any) {
      console.warn('Falha na geração estilizada, aplicando fallback textual', styledError)
      try {
        // 3) Tenta usar a mesma pipeline da Home (/api/generate-pdf) para obter HTML estilizado
        const premiumResponse = await fetch('/api/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cleanText: textSource, patientName: patientName || baseName }),
        })

        if (premiumResponse.ok) {
          const { html } = (await premiumResponse.json()) as { html?: string }
          if (html) {
            const blob = await buildStyledPdfFromHtml(html, baseName)
            const url = URL.createObjectURL(blob)
            setPdfUrl(url)
            setIsStyled(true)
            onPdfReady?.(url)
            return
          }
        }

        // 4) Último recurso: PDF textual simples
        const blob = await buildPdfLocally(textSource, baseName)
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
        onPdfReady?.(url)
      } catch (err: any) {
        console.error('Erro ao gerar PDF', err)
        setError(err.message || 'Não foi possível gerar o PDF do relatório.')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    if (!textSource || isFetchingText) return

    if (shouldGenerate || triggerKey > 0) {
      requestPdfFromServer()
    }
  }, [shouldGenerate, triggerKey, textSource, isFetchingText])

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [pdfUrl])

  const handleDownloadPdf = () => {
    if (!pdfUrl) return

    const anchor = document.createElement('a')
    anchor.href = pdfUrl
    anchor.download = `${baseName}.pdf`
    anchor.click()
  }

  const handlePrint = () => {
    if (!pdfUrl) return

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.src = pdfUrl
    document.body.appendChild(iframe)

    iframe.onload = () => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        iframe.remove()
      }, 500)
    }
  }

  const handleDownloadTxt = () => {
    const anchor = document.createElement('a')
    const blob = new Blob([textSource], { type: 'text/plain;charset=utf-8' })
    anchor.href = URL.createObjectURL(blob)
    anchor.download = `${baseName}.txt`
    anchor.click()
  }

  if (!cleanText && !txtUrl) {
    return (
      <div className="w-full h-[720px] border rounded-lg flex flex-col items-center justify-center text-slate-500 bg-slate-50 dark:bg-slate-900">
        <FileText className="h-16 w-16 opacity-40 mb-4" />
        <p className="text-lg font-medium">Nenhum conteúdo processado disponível</p>
        <p className="text-sm mt-2 text-center max-w-lg">
          Este documento ainda não possui texto processado para gerar o PDF.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2 justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium">Relatório processado</span>
          {isFetchingText && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={requestPdfFromServer}
            disabled={isGenerating || isFetchingText}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando PDF
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reprocessar PDF
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadTxt} disabled={!textSource}>
            <Download className="mr-2 h-4 w-4" />
            TXT
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={!pdfUrl}>
            <Download className="mr-2 h-4 w-4" />
            PDF {isStyled ? '(estilizado)' : ''}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!pdfUrl}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="w-full border rounded-lg overflow-hidden bg-white dark:bg-slate-900" style={{ height: '720px' }}>
        {pdfUrl ? (
          <iframe src={pdfUrl} className="w-full h-full" title={`Documento ${documentId}`} />
        ) : isGenerating ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Gerando PDF...</span>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500 text-center px-6">
            <div className="space-y-2">
              <FileText className="h-10 w-10 opacity-40 mx-auto" />
              <p className="font-medium">Clique em “Visualizar” para gerar o PDF.</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Usaremos o texto processado (clean_text) para montar um PDF pronto para visualização e download.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
