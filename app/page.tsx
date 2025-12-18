"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Download, Upload, FileText, Trash2, Copy, CheckCircle2, AlertCircle, Loader2, Zap, Eye } from "lucide-react"
import { PdfPreviewModal } from "@/components/pdf-preview-modal"
import { PdfEditorModal } from "@/components/pdf-editor-modal"

interface FileItem {
  id: string
  name: string
  rawText: string
  cleanText: string
  status: "idle" | "processing" | "done" | "error"
  error?: string
  credentials?: {
    cpf?: string
    loginName?: string
    password?: string
    existing?: boolean
  }
  missing?: string[]
  message?: string
}

interface PdfData {
  cleanText: string
  patientName?: string
  doctorName?: string
  html?: string
}

export default function Page() {
  const [rawText, setRawText] = useState("")
  const [cleanText, setCleanText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [files, setFiles] = useState<FileItem[]>([])
  const [copied, setCopied] = useState(false)
  const [previewPdf, setPreviewPdf] = useState<PdfData | null>(null)
  const [editingPdf, setEditingPdf] = useState<PdfData | null>(null)
  const [analyzeLoadingId, setAnalyzeLoadingId] = useState<string | null>(null)
  const [patientCpf, setPatientCpf] = useState("")

  const handleClean = async () => {
    if (!rawText.trim()) {
      setError("Por favor, insira texto para limpar")
      return
    }

    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      const response = await fetch("/api/clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Falha ao limpar texto")
      }

      setCleanText(data.cleanText)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const normalizedCpf = patientCpf.replace(/\D/g, "")
    if (!normalizedCpf) {
      setError("Informe um CPF válido para cadastrar o paciente antes de enviar os arquivos.")
      setTimeout(() => setError(""), 3000)
      event.target.value = ""
      return
    }

    const uploadedFiles = event.target.files
    if (!uploadedFiles) return

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i]
      const text = await file.text()

      const fileItem: FileItem = {
        id: Date.now() + "-" + i,
        name: file.name,
        rawText: text,
        cleanText: "",
        status: "idle",
      }

      setFiles((prev) => [...prev, fileItem])
      processFile(fileItem.id, text, file.name, normalizedCpf)
    }
  }

  const processFile = async (fileId: string, rawText: string, sourceName: string, cpf: string) => {
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "processing" } : f)))

    try {
      const response = await fetch("/api/process-and-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, sourceName, cpf }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Falha ao processar e registrar paciente")
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                cleanText: data.cleanText,
                status: "done",
                credentials: data.credentials,
                message: data.message,
              }
            : f,
        ),
      )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Falha ao processar"
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "error", error: errorMsg } : f)))
    }
  }

  const downloadFile = (fileItem: FileItem) => {
    const element = document.createElement("a")
    const file = new Blob([fileItem.cleanText], { type: "text/plain;charset=utf-8" })
    element.href = URL.createObjectURL(file)
    element.download = fileItem.name.replace(/\.[^/.]+$/, "_limpo.txt")
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const downloadAllFiles = () => {
    files.forEach((file) => {
      if (file.cleanText) {
        setTimeout(() => downloadFile(file), 100)
      }
    })
  }

  const downloadAllAsPdf = async () => {
    const filesToDownload = files.filter((f) => f.cleanText)

    if (filesToDownload.length === 0) {
      setError("Nenhum arquivo processado para baixar")
      setTimeout(() => setError(""), 3000)
      return
    }

    for (let i = 0; i < filesToDownload.length; i++) {
      const file = filesToDownload[i]
      try {
        const response = await fetch("/api/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cleanText: file.cleanText,
            patientName: file.name.replace(/\.[^/.]+$/, ""),
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Erro ao gerar PDF")
        }

        // Download PDF
        const pdfBlob = await fetch(`data:text/html;charset=utf-8,${encodeURIComponent(data.html)}`)
        const element = document.createElement("a")
        element.href = URL.createObjectURL(new Blob([data.html], { type: "text/html" }))
        element.download = file.name.replace(/\.[^/.]+$/, "_limpo.pdf")
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)

        // Delay between downloads
        if (i < filesToDownload.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`Erro ao gerar PDF para ${file.name}:`, error)
      }
    }

    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  const downloadSingleClean = () => {
    if (cleanText) {
      const element = document.createElement("a")
      const file = new Blob([cleanText], { type: "text/plain;charset=utf-8" })
      element.href = URL.createObjectURL(file)
      element.download = "texto_limpo.txt"
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    }
  }

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const clearAll = () => {
    setFiles([])
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cleanText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadAsZip = async () => {
    const filesToDownload = files.filter((f) => f.cleanText)

    if (filesToDownload.length === 0) {
      setError("Nenhum arquivo processado para baixar")
      setTimeout(() => setError(""), 3000)
      return
    }

    try {
      filesToDownload.forEach((file, index) => {
        setTimeout(() => {
          downloadFile(file)
        }, index * 200)
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error("Erro ao baixar arquivos:", error)
      setError("Erro ao baixar arquivos. Tente novamente.")
      setTimeout(() => setError(""), 3000)
    }
  }

  const previewPdfModal = async (cleanText: string, fileName: string) => {
    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleanText,
          patientName: fileName.replace(/\.[^/.]+$/, ""),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao gerar PDF")
      }

      setPreviewPdf({
        cleanText,
        patientName: fileName.replace(/\.[^/.]+$/, ""),
        html: data.html,
      })
    } catch (error) {
      console.error("Erro ao gerar PDF:", error)
      setError(error instanceof Error ? error.message : "Erro ao gerar PDF")
      setTimeout(() => setError(""), 3000)
    }
  }

  const editPdfModal = async (cleanText: string, fileName: string) => {
    setEditingPdf({
      cleanText,
      patientName: fileName.replace(/\.[^/.]+$/, ""),
    })
  }

  const downloadCleanTxt = (fileItem: FileItem) => {
    const element = document.createElement("a")
    const file = new Blob([fileItem.cleanText], { type: "text/plain;charset=utf-8" })
    element.href = URL.createObjectURL(file)
    element.download = fileItem.name.replace(/\.[^/.]+$/, "_limpo.txt")
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const analyzeAndDownloadCommented = async (fileItem: FileItem) => {
    setAnalyzeLoadingId(fileItem.id)
    try {
      const response = await fetch("/api/ai-analyze-clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleanText: fileItem.cleanText }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Falha na análise IA")
      }

      const element = document.createElement("a")
      const file = new Blob([data.commentedText], { type: "text/plain;charset=utf-8" })
      element.href = URL.createObjectURL(file)
      element.download = fileItem.name.replace(/\.[^/.]+$/, "_comentado.txt")
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Falha na análise IA"
      alert(errorMsg)
    } finally {
      setAnalyzeLoadingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl blur-lg opacity-50"></div>
              <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600">
              Conversor Clínico
            </h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto font-medium">
            Transforme textos clínicos com artefatos RTF e dumps SQL em documentos limpos e estruturados
          </p>
          <div className="flex justify-center gap-4 mt-6">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Preserva 100% dos dados médicos
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Zap className="w-4 h-4 text-yellow-500" />
              Processamento instantâneo
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-white dark:bg-slate-900/50 backdrop-blur">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-slate-200 dark:border-slate-800">
              <CardTitle className="text-xl text-blue-900 dark:text-blue-100">Texto Original</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Cole seu texto clínico bruto com artefatos RTF e SQL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Textarea
                placeholder="Cole aqui o texto clínico bruto com artefatos RTF e dumps SQL..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="min-h-72 font-mono text-sm resize-none bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
              />
              <Button
                onClick={handleClean}
                disabled={loading || !rawText.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 h-auto shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Limpar Texto
                  </>
                )}
              </Button>
              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-300 flex items-start gap-3 border border-red-200 dark:border-red-900/30">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-white dark:bg-slate-900/50 backdrop-blur">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-b border-slate-200 dark:border-slate-800">
              <CardTitle className="text-xl text-green-900 dark:text-green-100">Texto Limpo</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Resultado processado e estruturado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Textarea
                value={cleanText}
                readOnly
                className="min-h-72 font-mono text-sm resize-none bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                placeholder="O texto limpo e estruturado aparecerá aqui..."
              />
              <div className="flex gap-2">
                <Button
                  onClick={copyToClipboard}
                  disabled={!cleanText}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold transition-all"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
                <Button
                  onClick={downloadSingleClean}
                  disabled={!cleanText}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold transition-all"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
              {success && (
                <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4 text-sm text-green-700 dark:text-green-300 flex items-center gap-3 border border-green-200 dark:border-green-900/30">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Texto limpo e estruturado com sucesso!</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-xl bg-white dark:bg-slate-900/50 backdrop-blur mb-8">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-b border-slate-200 dark:border-slate-800">
            <CardTitle className="text-xl text-purple-900 dark:text-purple-100">Processamento em Massa</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Carregue múltiplos arquivos para processamento automático
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-2 max-w-md">
              <Label htmlFor="patient-cpf" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                CPF do paciente (obrigatório)
              </Label>
              <Input
                id="patient-cpf"
                inputMode="numeric"
                maxLength={11}
                value={patientCpf}
                onChange={(e) => setPatientCpf(e.target.value.replace(/\D/g, ""))}
                placeholder="Apenas números"
                className="max-w-md"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Usamos este CPF apenas para registrar e validar o paciente. Nome e data de nascimento são extraídos do
                relatório.
              </p>
            </div>

            <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700 p-12 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 group">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Clique para carregar arquivos</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ou arraste e solte aqui</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Formatos: .txt, .rtf</p>
              </div>
              <input type="file" multiple accept=".txt,.rtf" onChange={handleFileUpload} className="hidden" />
            </label>

            {files.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="text-sm font-bold">
                    <span className="text-slate-900 dark:text-slate-100">{files.length} arquivo(s) carregado(s)</span>
                    <span className="ml-3 text-slate-500 dark:text-slate-400 font-normal">
                      {files.filter((f) => f.status === "done").length} concluído(s)
                    </span>
                  </div>
                  {files.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={downloadAsZip}
                        disabled={!files.some((f) => f.cleanText)}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-all"
                        size="sm"
                      >
                        <Download className="mr-2 h-3 w-3" />
                        Baixar Todos (TXT)
                      </Button>
                      <Button
                        onClick={downloadAllAsPdf}
                        disabled={!files.some((f) => f.cleanText)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all"
                        size="sm"
                      >
                        <Download className="mr-2 h-3 w-3" />
                        Baixar Todos (PDF)
                      </Button>
                      <Button
                        onClick={clearAll}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold transition-all"
                        size="sm"
                      >
                        <Trash2 className="mr-2 h-3 w-3" />
                        Limpar Lista
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {file.status === "processing" && (
                              <span className="flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Processando...
                              </span>
                            )}
                            {file.status === "done" && (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Concluído ({file.cleanText.length} caracteres)
                              </span>
                            )}
                            {file.status === "error" && (
                              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <AlertCircle className="h-3 w-3" />
                                {file.error}
                              </span>
                            )}
                            {file.status === "idle" && "Aguardando processamento..."}
                          </p>
                            {file.status === "done" && file.credentials && (
                            <div className="mt-2 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                              <div className="font-semibold">Credenciais geradas</div>
                              <div className="rounded-md bg-slate-100 dark:bg-slate-800/60 p-2 border border-slate-200 dark:border-slate-700">
                                {file.credentials.loginName && (
                                  <div>Login (nome completo): <span className="font-mono">{file.credentials.loginName}</span></div>
                                )}
                                <div>CPF (registro): <span className="font-mono">{file.credentials.cpf}</span></div>
                                <div>Senha inicial: <span className="font-mono">{file.credentials.password}</span></div>
                                <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                                  Solicite troca de senha no primeiro acesso.
                                </div>
                                {file.message && (
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                    {file.message}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2 flex-wrap">
                        {file.status === "done" && (
                          <>
                            <Button
                              onClick={() => previewPdfModal(file.cleanText, file.name)}
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white"
                              title="Visualizar PDF"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => editPdfModal(file.cleanText, file.name)}
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-white"
                              title="Editar PDF"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => downloadFile(file)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              title="Baixar arquivo TXT Limpo"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => analyzeAndDownloadCommented(file)}
                              size="sm"
                              className={`bg-teal-600 hover:bg-teal-700 text-white ${analyzeLoadingId === file.id ? "opacity-50 pointer-events-none" : ""}`}
                              title="Analisar com IA e Baixar TXT Comentado"
                            >
                              {analyzeLoadingId === file.id ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Analisando...
                                </>
                              ) : (
                                <>
                                  <Zap className="mr-2 h-4 w-4" />
                                  Analisar e Baixar TXT Comentado
                                </>
                              )}
                            </Button>
                          </>
                        )}
                        <Button
                          onClick={() => removeFile(file.id)}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Processamento Realizado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                  Decodifica escapes RTF (\'e7 → ç, \'c7 → Ç)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                  Remove comandos e estruturas RTF
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                  Elimina artefatos de dump SQL
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                  Normaliza espaçamento e quebras
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-green-900 dark:text-green-100">
                <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                Preservação de Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  Mantém 100% das informações clínicas
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  Estrutura dados por seção clínica
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  Remove apenas lixo RTF e SQL
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  Preserva datas, valores e anotações
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {previewPdf && (
        <PdfPreviewModal
          pdfData={previewPdf}
          onClose={() => setPreviewPdf(null)}
          onEdit={() => {
            setPreviewPdf(null)
            editPdfModal(previewPdf.cleanText, previewPdf.patientName || "Paciente")
          }}
        />
      )}

      {editingPdf && <PdfEditorModal pdfData={editingPdf} onClose={() => setEditingPdf(null)} />}
    </main>
  )
}
