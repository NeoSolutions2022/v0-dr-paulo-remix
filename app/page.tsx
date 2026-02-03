"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  FileText,
  Loader2,
  LogOut,
  PenSquare,
  Printer,
  RefreshCw,
  Search,
  Upload,
  UserPlus,
  Users,
  ListChecks,
  X,
} from "lucide-react"
import { sanitizeHtml } from "@/lib/html-sanitizer"

interface PatientDocument {
  id: string
  patient_id: string
  file_name: string
  created_at: string
  clean_text: string | null
  pdf_url?: string | null
  html?: string | null
}

interface Patient {
  id: string
  full_name: string
  email: string | null
  birth_date: string | null
  cpf?: string | null
  phone?: string | null
  created_at?: string
  updated_at?: string
  documents?: PatientDocument[]
}

interface UploadResult {
  cleanText: string
  credentials?: {
    loginName?: string
    password?: string
    existing?: boolean
  }
  message?: string
  patient?: Patient
  document?: PatientDocument
}

export default function AdminHomePage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(200)
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [savingPatient, setSavingPatient] = useState(false)
  const [savingDocument, setSavingDocument] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFileName, setUploadFileName] = useState("")
  const [uploadText, setUploadText] = useState("")
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null)
  const [htmlLoading, setHtmlLoading] = useState(false)
  const [htmlError, setHtmlError] = useState("")
  const [previewPatientId, setPreviewPatientId] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState("")
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null)
  const [previewMedicalSummary, setPreviewMedicalSummary] = useState("")
  const [savingMedicalSummary, setSavingMedicalSummary] = useState(false)
  const [medicalSummaryError, setMedicalSummaryError] = useState("")
  const uploadSectionId = "admin-upload-section"
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null)
  const remoteSearchRef = useRef("")
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? patients[0],
    [patients, selectedPatientId],
  )

  const selectedDocument = useMemo(
    () => selectedPatient?.documents?.find((doc) => doc.id === selectedDocumentId) ?? selectedPatient?.documents?.[0],
    [selectedDocumentId, selectedPatient],
  )

  const sanitizedHtml = useMemo(() => (htmlPreview ? sanitizeHtml(htmlPreview) : ""), [htmlPreview])
  const previewPatient = useMemo(
    () => patients.find((patient) => patient.id === previewPatientId) ?? null,
    [patients, previewPatientId],
  )
  const sanitizedPreviewHtml = useMemo(
    () => (previewHtml ? sanitizeHtml(previewHtml) : ""),
    [previewHtml],
  )

  const extractMedicalSummary = (html: string) => {
    if (!html) return ""
    const document = new DOMParser().parseFromString(html, "text/html")
    const heading = Array.from(document.querySelectorAll("h2")).find(
      (node) => node.textContent?.trim().toLowerCase() === "resumo médico",
    )
    const summaryParagraph =
      heading?.closest(".card")?.querySelector(".editable-block p") ??
      document.querySelector(".editable-block .hint + p")
    return summaryParagraph?.textContent?.trim() ?? ""
  }

  const updateMedicalSummaryHtml = (html: string, summary: string) => {
    if (!html) return html
    const document = new DOMParser().parseFromString(html, "text/html")
    const heading = Array.from(document.querySelectorAll("h2")).find(
      (node) => node.textContent?.trim().toLowerCase() === "resumo médico",
    )
    const summaryParagraph =
      heading?.closest(".card")?.querySelector(".editable-block p") ??
      document.querySelector(".editable-block .hint + p")
    if (!summaryParagraph) {
      return html
    }
    summaryParagraph.textContent = summary.trim()
    const doctype = html.match(/<!doctype[^>]*>/i)?.[0]
    const serialized = document.documentElement.outerHTML
    return doctype ? `${doctype}\n${serialized}` : serialized
  }

  const isValidUuid = (value: string | null | undefined) =>
    !!value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

  useEffect(() => {
    const verifySession = async () => {
      const response = await fetch("/api/admin/session")
      if (!response.ok) {
        router.push("/admin/login")
        return
      }

      setCheckingAuth(false)
    }

    verifySession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scrollToUpload = () => {
    const section = document.getElementById(uploadSectionId)
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const handleUploadShortcut = () => {
    scrollToUpload()
    window.setTimeout(() => {
      uploadFileInputRef.current?.click()
    }, 150)
  }

  const loadPatients = useCallback(async (options?: { search?: string; limit?: number }) => {
    setLoadingPatients(true)
    setError("")

    try {
      const params = new URLSearchParams()
      const nextLimit = options?.limit ?? pageSize
      if (Number.isFinite(nextLimit)) {
        params.set("limit", String(nextLimit))
      }
      if (options?.search) {
        params.set("search", options.search)
      }
      const query = params.toString()
      const response = await fetch(`/api/admin/patients${query ? `?${query}` : ""}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível carregar os pacientes")
      }
      setPatients(data.patients || [])
      setSelectedPatientId(data.patients?.[0]?.id ?? null)
      setSelectedDocumentId(data.patients?.[0]?.documents?.[0]?.id ?? null)
    } catch (err: any) {
      setError(err.message || "Erro ao buscar pacientes")
    } finally {
      setLoadingPatients(false)
    }
  }, [pageSize])

  const handlePatientUpdate = async (formData: Partial<Patient>) => {
    if (!selectedPatient) return
    setSavingPatient(true)
    setSuccessMessage("")
    setError("")

    try {
      const response = await fetch(`/api/admin/patients/${selectedPatient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.full_name ?? selectedPatient.full_name,
          email: formData.email ?? selectedPatient.email,
          birth_date: formData.birth_date ?? selectedPatient.birth_date,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Falha ao atualizar paciente")
      }
      setPatients((prev) =>
        prev.map((patient) => (patient.id === selectedPatient.id ? { ...patient, ...data.patient } : patient)),
      )
      setSuccessMessage("Dados do paciente atualizados com sucesso")
    } catch (err: any) {
      setError(err.message || "Erro ao salvar paciente")
    } finally {
      setSavingPatient(false)
    }
  }

  const fetchDocumentHtml = async (force = false) => {
    if (!selectedDocument) return
    setHtmlLoading(true)
    setHtmlError("")

    try {
      const response = await fetch(
        `/api/documents/${selectedDocument.id}/generate-html${force ? "?force=true" : ""}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Falha ao gerar HTML")
      }

      const nextHtml = typeof data.html === "string" ? data.html : ""
      setHtmlPreview(nextHtml || null)
      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient?.id
            ? {
                ...patient,
                documents: patient.documents?.map((doc) =>
                  doc.id === selectedDocument.id ? { ...doc, html: nextHtml } : doc,
                ),
              }
            : patient,
        ),
      )
    } catch (err: any) {
      setHtmlError(err.message || "Erro ao carregar HTML")
    } finally {
      setHtmlLoading(false)
    }
  }

  const loadPreviewHtml = async (patientId: string) => {
    setPreviewLoading(true)
    const patient = patients.find((entry) => entry.id === patientId)
    const document =
      patient?.documents?.find(
        (doc) => doc.patient_id === patientId && isValidUuid(doc.id),
      ) ?? null

    setPreviewHtml(document?.html?.trim() ? document.html : null)
    setPreviewDocumentId(isValidUuid(document?.id) ? document?.id ?? null : null)
    setPreviewError("")

    if (!document || !isValidUuid(document.id)) {
      setPreviewError("Nenhum relatório disponível para este paciente.")
      setPreviewLoading(false)
      return
    }

    if (document.html?.trim()) {
      setPreviewLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/documents/${document.id}/generate-html`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Falha ao carregar HTML")
      }
      const nextHtml = typeof data.html === "string" ? data.html : ""
      setPreviewHtml(nextHtml || null)
      setPatients((prev) =>
        prev.map((entry) =>
          entry.id === patientId
            ? {
                ...entry,
                documents: entry.documents?.map((doc) =>
                  doc.id === document.id ? { ...doc, html: nextHtml } : doc,
                ),
              }
            : entry,
        ),
      )
    } catch (err: any) {
      setPreviewError(err.message || "Erro ao carregar HTML")
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleOpenPreview = async (patientId: string) => {
    setPreviewPatientId(patientId)
    setPreviewHtml(null)
    setPreviewDocumentId(null)
    setMedicalSummaryError("")
    await loadPreviewHtml(patientId)
  }

  const handlePrintPreview = () => {
    if (!previewHtml) return
    const printWindow = window.open("", "_blank")
    if (!printWindow) return
    printWindow.document.write(previewHtml)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  useEffect(() => {
    if (!selectedDocument) {
      setHtmlPreview(null)
      return
    }

    const cachedHtml = selectedDocument.html?.trim() ? selectedDocument.html : null
    setHtmlPreview(cachedHtml)

    if (!cachedHtml) {
      fetchDocumentHtml(false)
    }
  }, [selectedDocument])

  useEffect(() => {
    if (!previewHtml) {
      setPreviewMedicalSummary("")
      return
    }
    setPreviewMedicalSummary(extractMedicalSummary(previewHtml))
  }, [previewHtml])

  useEffect(() => {
    if (checkingAuth) return
    const trimmedSearch = search.trim()
    if (trimmedSearch) return
    loadPatients({ limit: pageSize })
  }, [checkingAuth, loadPatients, pageSize, search])

  useEffect(() => {
    const trimmedSearch = search.trim()
    if (!trimmedSearch) {
      remoteSearchRef.current = ""
      return
    }

    const normalizedSearch = trimmedSearch.toLowerCase()
    const localMatch = patients.some((patient) =>
      patient.full_name.toLowerCase().includes(normalizedSearch),
    )

    if (localMatch || remoteSearchRef.current === trimmedSearch) return

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      remoteSearchRef.current = trimmedSearch
      loadPatients({ search: trimmedSearch, limit: pageSize })
    }, 350)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [loadPatients, pageSize, patients, search])

  const handleSaveMedicalSummary = async () => {
    if (!previewPatient || !previewHtml) return
    const document = previewDocumentId
      ? previewPatient.documents?.find(
          (doc) => doc.id === previewDocumentId && doc.patient_id === previewPatient.id,
        )
      : null
    if (!document?.id || !isValidUuid(document.id)) {
      setMedicalSummaryError("Nenhum relatório disponível para este paciente.")
      return
    }

    setSavingMedicalSummary(true)
    setMedicalSummaryError("")
    setError("")
    setSuccessMessage("")

    const updatedHtml = updateMedicalSummaryHtml(previewHtml, previewMedicalSummary)

    try {
      const response = await fetch(`/api/admin/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: updatedHtml,
          file_name: document.file_name,
          clean_text: document.clean_text,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Falha ao atualizar resumo médico")
      }

      setPreviewHtml(data.document?.html ?? updatedHtml)
      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === previewPatient.id
            ? {
                ...patient,
                documents: patient.documents?.map((doc) =>
                  doc.id === document.id ? data.document : doc,
                ),
              }
            : patient,
        ),
      )
      setSuccessMessage("Resumo médico atualizado com sucesso")
    } catch (err: any) {
      setMedicalSummaryError(err.message || "Erro ao atualizar resumo médico")
    } finally {
      setSavingMedicalSummary(false)
    }
  }

  const handleDocumentUpdate = async (changes: Partial<PatientDocument>) => {
    if (!selectedDocument || !isValidUuid(selectedDocument.id)) {
      setError("Relatório inválido")
      return
    }
    setSavingDocument(true)
    setSuccessMessage("")
    setError("")

    try {
      console.info("[admin] Salvando documento", { documentId: selectedDocument.id })
      const response = await fetch(`/api/admin/documents/${selectedDocument.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: changes.file_name ?? selectedDocument.file_name,
          clean_text: changes.clean_text ?? selectedDocument.clean_text,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Falha ao atualizar documento")
      }
      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient?.id
            ? {
                ...patient,
                documents: patient.documents?.map((doc) => (doc.id === selectedDocument.id ? data.document : doc)),
              }
            : patient,
        ),
      )
      setSuccessMessage("Relatório atualizado com sucesso")
    } catch (err: any) {
      setError(err.message || "Erro ao salvar documento")
    } finally {
      setSavingDocument(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    setUploadFileName(file.name)
    setUploadText(text)
    setUploadResult(null)
  }

  const handleProcessUpload = async () => {
    if (!uploadText.trim()) {
      setError("Envie um arquivo .txt com o relatório do paciente")
      return
    }

    setUploading(true)
    setError("")
    setSuccessMessage("")

    try {
      const response = await fetch("/api/process-and-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: uploadText, sourceName: uploadFileName || "relatorio.txt" }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Falha ao processar relatório")
      }

      setUploadResult(data)
      setSuccessMessage("Relatório processado e login criado com sucesso")
      await loadPatients()
    } catch (err: any) {
      setError(err.message || "Erro ao processar arquivo")
    } finally {
      setUploading(false)
    }
  }

  const filteredPatients = useMemo(() => {
    if (!search.trim()) return patients
    return patients.filter((patient) =>
      patient.full_name.toLowerCase().includes(search.trim().toLowerCase()),
    )
  }, [patients, search])

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Painel administrativo</p>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6 text-blue-600" /> Doutor Paulo
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleUploadShortcut}>
                <Upload className="mr-2 h-4 w-4" /> Upload de relatório
              </Button>
              <Button variant="outline" onClick={loadPatients} disabled={loadingPatients}>
                {loadingPatients ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Atualizando
                  </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" /> Atualizar lista
                </>
              )}
            </Button>
            <Button variant="secondary" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>

        {(error || successMessage) && (
          <Alert variant={error ? "destructive" : "default"}>
            {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            <AlertDescription>{error || successMessage}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <Card className="shadow-sm">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Pacientes</CardTitle>
                <Badge variant="secondary">{patients.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar paciente"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Label htmlFor="page-size" className="text-xs">
                  Itens por página
                </Label>
                <select
                  id="page-size"
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                >
                  {[50, 100, 200, 500].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[540px]">
                <div className="divide-y">
                  {loadingPatients && (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Carregando pacientes...
                    </div>
                  )}

                  {!loadingPatients && filteredPatients.length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground">Nenhum paciente encontrado</div>
                  )}

                  {filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className={`w-full p-4 transition hover:bg-slate-50 ${
                        patient.id === selectedPatient?.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          className="text-left flex-1"
                          onClick={() => {
                            setSelectedPatientId(patient.id)
                            setSelectedDocumentId(patient.documents?.[0]?.id ?? null)
                          }}
                        >
                          <p className="font-semibold text-slate-900">{patient.full_name}</p>
                          <p className="text-xs text-muted-foreground">{patient.email || "Sem email"}</p>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="h-4 w-4" /> {patient.documents?.length || 0} relatórios
                          </div>
                        </button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPreview(patient.id)}
                        >
                          Visualizar/Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <PenSquare className="h-5 w-5 text-blue-600" /> Dados do paciente
                </CardTitle>
                <CardDescription>Edite informações básicas e salve em tempo real</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome completo</Label>
                    <Input
                      id="full_name"
                      value={selectedPatient?.full_name || ""}
                      onChange={(event) =>
                        setPatients((prev) =>
                          prev.map((patient) =>
                            patient.id === selectedPatient?.id
                              ? { ...patient, full_name: event.target.value }
                              : patient,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={selectedPatient?.email || ""}
                      onChange={(event) =>
                        setPatients((prev) =>
                          prev.map((patient) =>
                            patient.id === selectedPatient?.id
                              ? { ...patient, email: event.target.value }
                              : patient,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Data de nascimento</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={selectedPatient?.birth_date || ""}
                      onChange={(event) =>
                        setPatients((prev) =>
                          prev.map((patient) =>
                            patient.id === selectedPatient?.id
                              ? { ...patient, birth_date: event.target.value }
                              : patient,
                          ),
                        )
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Criado: {selectedPatient?.created_at?.slice(0, 10) || "-"}</Badge>
                  <Badge variant="outline">Atualizado: {selectedPatient?.updated_at?.slice(0, 10) || "-"}</Badge>
                </div>

                <Button
                  className="w-full md:w-auto"
                  onClick={() => handlePatientUpdate(selectedPatient || {})}
                  disabled={savingPatient || !selectedPatient}
                >
                  {savingPatient ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Salvar alterações
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-5 w-5 text-blue-600" /> Relatórios do paciente
                </CardTitle>
                <CardDescription>Visualize e ajuste o texto limpo enviado ao paciente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {selectedPatient?.documents?.map((doc) => (
                    <Badge
                      key={doc.id}
                      variant={doc.id === selectedDocument?.id ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => setSelectedDocumentId(doc.id)}
                    >
                      {doc.file_name}
                    </Badge>
                  ))}
                </div>

                {selectedDocument ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Título do arquivo</Label>
                      <Input
                        value={selectedDocument.file_name}
                        onChange={(event) =>
                          setPatients((prev) =>
                            prev.map((patient) =>
                              patient.id === selectedPatient?.id
                                ? {
                                    ...patient,
                                    documents: patient.documents?.map((doc) =>
                                      doc.id === selectedDocument.id
                                        ? { ...doc, file_name: event.target.value }
                                        : doc,
                                    ),
                                  }
                                : patient,
                            ),
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Texto limpo</Label>
                      <Textarea
                        className="h-64"
                        value={selectedDocument.clean_text || ""}
                        onChange={(event) =>
                          setPatients((prev) =>
                            prev.map((patient) =>
                              patient.id === selectedPatient?.id
                                ? {
                                    ...patient,
                                    documents: patient.documents?.map((doc) =>
                                      doc.id === selectedDocument.id
                                        ? { ...doc, clean_text: event.target.value }
                                        : doc,
                                    ),
                                  }
                                : patient,
                            ),
                          )
                        }
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Criado em {selectedDocument.created_at.slice(0, 10)}</Badge>
                      <Badge variant="outline">PDF {selectedDocument.pdf_url ? "gerado" : "pendente"}</Badge>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleDocumentUpdate(selectedDocument)}
                        disabled={savingDocument}
                        className="w-full md:w-auto"
                      >
                        {savingDocument ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Salvar texto
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (selectedDocument.clean_text) {
                            navigator.clipboard.writeText(selectedDocument.clean_text)
                            setSuccessMessage("Relatório copiado para a área de transferência")
                          }
                        }}
                        className="w-full md:w-auto"
                      >
                        <Clipboard className="mr-2 h-4 w-4" /> Copiar texto
                      </Button>
                    </div>

                    <div className="space-y-2 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label>Relatório HTML estilizado</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fetchDocumentHtml(true)}
                          disabled={htmlLoading}
                        >
                          {htmlLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" /> Regenerar HTML
                            </>
                          )}
                        </Button>
                      </div>

                      {htmlError && (
                        <Alert variant="destructive">
                          <AlertDescription>{htmlError}</AlertDescription>
                        </Alert>
                      )}

                      {!htmlError && htmlLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando relatório estilizado...
                        </div>
                      )}

                      {!htmlLoading && !htmlError && !htmlPreview && (
                        <p className="text-sm text-muted-foreground">
                          Relatório HTML ainda não foi gerado.
                        </p>
                      )}

                      {!htmlLoading && htmlPreview && (
                        <div className="border rounded-lg overflow-hidden">
                          <iframe
                            title="Relatório médico HTML"
                            className="w-full min-h-[640px]"
                            sandbox=""
                            referrerPolicy="no-referrer"
                            srcDoc={sanitizedHtml}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Selecione um relatório para visualizar</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm" id={uploadSectionId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Upload className="h-5 w-5 text-blue-600" /> Novo paciente por relatório .txt
                </CardTitle>
                <CardDescription>
                  Faça upload do TXT para extrair nome e data de nascimento e gerar o login (senha = data de
                  nascimento)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[1fr,180px]">
                  <div className="space-y-2">
                    <Label htmlFor="txt">Cole ou revise o relatório</Label>
                    <Textarea
                      id="txt"
                      className="h-48"
                      value={uploadText}
                      onChange={(event) => setUploadText(event.target.value)}
                      placeholder="Cole aqui o conteúdo do relatório..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="file">Ou envie um arquivo .txt</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".txt"
                      onChange={handleFileUpload}
                      ref={uploadFileInputRef}
                    />
                    {uploadFileName && (
                      <p className="text-xs text-muted-foreground">Arquivo selecionado: {uploadFileName}</p>
                    )}
                  </div>
                </div>

                <Button onClick={handleProcessUpload} disabled={uploading} className="w-full md:w-auto">
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" /> Processar e criar login
                    </>
                  )}
                </Button>

                {uploadResult?.cleanText && (
                  <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <CheckCircle2 className="h-4 w-4 text-green-600" /> Limpeza e cadastro concluídos
                    </div>
                    {uploadResult.credentials && (
                      <div className="rounded-md bg-white p-3 text-sm shadow-sm">
                        <p className="font-semibold">Credenciais do paciente</p>
                        <p>Login: {uploadResult.credentials.loginName}</p>
                        <p>Senha: {uploadResult.credentials.password}</p>
                        {uploadResult.credentials.existing && (
                          <p className="text-xs text-muted-foreground">
                            Paciente já existia, credenciais confirmadas
                          </p>
                        )}
                      </div>
                    )}
                    {uploadResult.message && (
                      <p className="text-sm text-muted-foreground">{uploadResult.message}</p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <ListChecks className="h-4 w-4 text-blue-600" /> Texto limpo
                      </div>
                      <Textarea value={uploadResult.cleanText} className="h-40" readOnly />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {previewPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-5xl max-h-[90vh] bg-white rounded-xl shadow-2xl border overflow-hidden flex flex-col">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3 bg-slate-50">
                <div className="min-w-0">
                  <p className="text-sm text-slate-500 truncate">Paciente</p>
                  <h2 className="text-lg font-semibold text-slate-900 truncate">
                    {previewPatient.full_name}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePrintPreview}
                    disabled={!previewHtml}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir/Salvar PDF
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Fechar visualização"
                    onClick={() => setPreviewPatientId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 p-4 overflow-y-auto md:grid-cols-[320px,1fr]">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome completo</Label>
                    <Input
                      value={previewPatient.full_name || ""}
                      onChange={(event) =>
                        setPatients((prev) =>
                          prev.map((patient) =>
                            patient.id === previewPatient.id
                              ? { ...patient, full_name: event.target.value }
                              : patient,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={previewPatient.email || ""}
                      onChange={(event) =>
                        setPatients((prev) =>
                          prev.map((patient) =>
                            patient.id === previewPatient.id
                              ? { ...patient, email: event.target.value }
                              : patient,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de nascimento</Label>
                    <Input
                      type="date"
                      value={previewPatient.birth_date || ""}
                      onChange={(event) =>
                        setPatients((prev) =>
                          prev.map((patient) =>
                            patient.id === previewPatient.id
                              ? { ...patient, birth_date: event.target.value }
                              : patient,
                          ),
                        )
                      }
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => handlePatientUpdate(previewPatient)}
                  >
                    Salvar dados do paciente
                  </Button>

                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-sm font-semibold">Credenciais de acesso</p>
                    <p className="text-xs text-slate-500">
                      Acesso pelo /login com nome completo e senha.
                    </p>
                    <div className="text-sm">
                      <p>
                        <span className="text-slate-500">Login (nome completo):</span>{" "}
                        <span className="font-medium">{previewPatient.full_name || "Não informado"}</span>
                      </p>
                      <p>
                        <span className="text-slate-500">Senha (AAAAMMDD):</span>{" "}
                        <span className="font-medium">
                          {previewPatient.birth_date
                            ? previewPatient.birth_date.replace(/-/g, "")
                            : "Data de nascimento não informada"}
                        </span>
                      </p>
                      <p>
                        <span className="text-slate-500">URL:</span>{" "}
                        <span className="font-medium">/login</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">Relatório HTML</h3>
                  </div>

                  <div className="rounded-lg border p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-sm">Resumo médico</Label>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveMedicalSummary}
                        disabled={
                          savingMedicalSummary ||
                          !previewHtml ||
                          !previewDocumentId ||
                          !isValidUuid(previewDocumentId)
                        }
                      >
                        {savingMedicalSummary ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando
                          </>
                        ) : (
                          <>
                            <PenSquare className="mr-2 h-4 w-4" /> Salvar resumo
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={previewMedicalSummary}
                      onChange={(event) => setPreviewMedicalSummary(event.target.value)}
                      className="min-h-[120px]"
                      placeholder="Edite o resumo médico..."
                      disabled={!previewHtml}
                    />
                    <p className="text-xs text-muted-foreground">
                      Esta edição altera apenas o bloco “Resumo médico” no HTML armazenado.
                    </p>
                  </div>

                  {medicalSummaryError && (
                    <Alert variant="destructive">
                      <AlertDescription>{medicalSummaryError}</AlertDescription>
                    </Alert>
                  )}

                  {previewError && (
                    <Alert variant="destructive">
                      <AlertDescription>{previewError}</AlertDescription>
                    </Alert>
                  )}

                  {!previewError && previewLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando relatório...
                    </div>
                  )}

                  {!previewLoading && !previewError && !previewHtml && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum HTML disponível no banco para este paciente.
                    </p>
                  )}

                  {!previewLoading && previewHtml && (
                    <div className="border rounded-lg overflow-hidden">
                      <iframe
                        title="Relatório médico HTML"
                        className="w-full min-h-[640px]"
                        sandbox=""
                        referrerPolicy="no-referrer"
                        srcDoc={sanitizedPreviewHtml}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
