"use client"

import { useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Download, Loader2, Printer, RefreshCw, FileText } from 'lucide-react'

interface ProcessedDocumentViewerProps {
  cleanText?: string | null
  fileName: string
  documentId: string
  txtUrl?: string | null
  patientName?: string | null
}

export function ProcessedDocumentViewer({
  cleanText,
  fileName,
  documentId,
  txtUrl,
  patientName,
}: ProcessedDocumentViewerProps) {
  const [textSource, setTextSource] = useState(cleanText?.trim() || '')
  const [isFetchingText, setIsFetchingText] = useState(!cleanText && !!txtUrl)
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const baseName = useMemo(
    () => fileName.replace(/\.[^/.]+$/, '') || 'documento',
    [fileName],
  )

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

  const generatePdfFromText = async () => {
    if (!textSource) return

    try {
      setIsGenerating(true)
      setError(null)
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleanText: textSource,
          patientName: patientName || baseName,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.html) {
        throw new Error(data.error || 'Falha ao gerar PDF do relatório')
      }

      setHtml(data.html as string)
    } catch (err: any) {
      console.error('Erro ao gerar PDF', err)
      setError(err.message || 'Não foi possível gerar o PDF do relatório.')
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    if (textSource) {
      generatePdfFromText()
    }
  }, [textSource])

  const handleDownloadPdf = () => {
    if (!html) return

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${baseName}.pdf`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    if (!html) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 150)
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
          <Button variant="outline" size="sm" onClick={generatePdfFromText} disabled={isGenerating || isFetchingText}>
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
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={!html}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!html}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="w-full border rounded-lg overflow-hidden bg-white dark:bg-slate-900" style={{ height: '720px' }}>
        {html ? (
          <iframe srcDoc={html} className="w-full h-full" title={`Documento ${documentId}`} />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Preparando visualização...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
