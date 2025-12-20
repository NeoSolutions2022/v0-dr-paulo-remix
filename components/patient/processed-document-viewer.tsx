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

  const requestPdfFromServer = async () => {
    if (!textSource) {
      setError('Documento sem texto processado para gerar PDF.')
      return
    }

    try {
      setIsGenerating(true)
      setError(null)

      const response = await fetch('/api/patient/documents/preview', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cleanText: textSource,
          fileName,
          documentId,
        }),
      })

      if (!response.ok) {
        const { error: serverError } = await response.json().catch(() => ({ error: null }))
        throw new Error(serverError || 'Não foi possível gerar o PDF do relatório.')
      }

      const blob = await response.blob()

      if (blob.type !== 'application/pdf') {
        throw new Error('O arquivo retornado não é um PDF válido.')
      }

      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      onPdfReady?.(url)
    } catch (err: any) {
      console.error('Erro ao gerar PDF', err)
      setError(err.message || 'Não foi possível gerar o PDF do relatório.')
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    if (!textSource) return

    if (shouldGenerate || triggerKey > 0) {
      requestPdfFromServer()
    }
  }, [shouldGenerate, triggerKey, textSource])

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
            PDF
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
