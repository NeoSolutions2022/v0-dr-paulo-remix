"use client"

import { useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, Printer } from "lucide-react"
import { sanitizeHtml } from "@/lib/html-sanitizer"

async function loadHtml2Pdf(): Promise<any> {
  if (typeof window === "undefined") return null
  if ((window as any).html2pdf) return (window as any).html2pdf

  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src =
      "https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js"
    script.async = true
    script.onload = () => resolve((window as any).html2pdf)
    script.onerror = () => reject(new Error("Não foi possível carregar html2pdf"))
    document.body.appendChild(script)
  })
}

function sanitizeHtmlForCanvas(html: string) {
  const FALLBACK = "#0f172a"

  return html
    .replace(/lab\s*\([^)]*\)/gis, FALLBACK)
    .replace(/lch\s*\([^)]*\)/gis, FALLBACK)
    .replace(/oklab\s*\([^)]*\)/gis, FALLBACK)
    .replace(/oklch\s*\([^)]*\)/gis, FALLBACK)
    .replace(/color-mix\s*\([^)]*\)/gis, FALLBACK)
    .replace(/color\s*\([^)]*\)/gis, FALLBACK)
    .replace(/linear-gradient\s*\([^)]*\)/gis, FALLBACK)
    .replace(/radial-gradient\s*\([^)]*\)/gis, FALLBACK)
    .replace(/color:\s*([^;>{}]*)/gis, (_, value) =>
      /lab|lch|oklab|oklch|color-mix|color\s*\(/i.test(value) ? `color: ${FALLBACK}` : `color: ${value}`,
    )
    .replace(/background:\s*([^;>{}]*)/gis, (_, value) =>
      /lab|lch|oklab|oklch|color-mix|color\s*\(|gradient/i.test(value)
        ? `background: ${FALLBACK}`
        : `background: ${value}`,
    )
}

interface HtmlDocumentViewerProps {
  html?: string | null
  fileName: string
}

export function HtmlDocumentViewer({ html, fileName }: HtmlDocumentViewerProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      const html2pdf = await loadHtml2Pdf()
      if (!html2pdf) {
        throw new Error("Ferramenta de PDF indisponível no navegador")
      }

      const container = document.createElement("div")
      container.innerHTML = sanitizeHtmlForCanvas(sanitizedHtml)
      container.style.position = "absolute"
      container.style.left = "-9999px"
      container.style.top = "-9999px"
      document.body.appendChild(container)

      try {
        const worker = html2pdf()
          .from(container)
          .set({
            margin: [10, 10, 10, 10],
            filename: `${baseName}.pdf`,
            image: { type: "jpeg", quality: 0.95 },
            html2canvas: { scale: 1.2, useCORS: true },
            jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
          })
          .toPdf()

        const pdf = await worker.get("pdf")
        const blob = pdf.output("blob") as Blob
        const url = URL.createObjectURL(blob)

        const iframe = document.createElement("iframe")
        iframe.style.position = "fixed"
        iframe.style.right = "0"
        iframe.style.bottom = "0"
        iframe.style.width = "0"
        iframe.style.height = "0"
        iframe.src = url
        document.body.appendChild(iframe)

        iframe.onload = () => {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
          setTimeout(() => {
            iframe.remove()
            URL.revokeObjectURL(url)
          }, 500)
        }
      } finally {
        container.remove()
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
