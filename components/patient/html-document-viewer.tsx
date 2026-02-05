"use client"

import { useMemo, useRef, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, Printer } from "lucide-react"
import { sanitizeHtml } from "@/lib/html-sanitizer"

interface HtmlDocumentViewerProps {
  html?: string | null
  fileName: string
}

export function HtmlDocumentViewer({ html, fileName }: HtmlDocumentViewerProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const sanitizedHtml = useMemo(() => (html ? sanitizeHtml(html) : ""), [html])
  const baseName = useMemo(
    () => fileName.replace(/\.[^/.]+$/, "") || "documento",
    [fileName],
  )

  const handlePrint = async () => {
    if (!sanitizedHtml) {
      setError("Relatório HTML indisponível para impressão.")
      return
    }

    try {
      setIsPrinting(true)
      setError(null)

      const iframeWindow = iframeRef.current?.contentWindow
      if (iframeWindow) {
        iframeWindow.focus()
        iframeWindow.print()
      } else {
        const printWindow = window.open("", "_blank")
        if (!printWindow) {
          throw new Error("Não foi possível abrir a janela de impressão")
        }

        printWindow.document.write(sanitizedHtml)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
      }
    } catch (err: any) {
      console.error("Erro ao gerar PDF", err)
      setError(err.message || "Não foi possível gerar o PDF do relatório.")
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2 justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium">Relatório HTML</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={isPrinting || !sanitizedHtml}
          >
            {isPrinting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando PDF
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir PDF
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="w-full border rounded-lg overflow-hidden bg-white dark:bg-slate-900" style={{ height: "720px" }}>
        {sanitizedHtml ? (
          <iframe
            title={`Relatório ${baseName}`}
            className="w-full h-full"
            sandbox=""
            referrerPolicy="no-referrer"
            ref={iframeRef}
            srcDoc={sanitizedHtml}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500 text-center px-6">
            <div className="space-y-2">
              <p className="font-medium">Relatório HTML indisponível.</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Quando o documento for processado, o relatório aparecerá aqui.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
