"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  LogOut,
  PenSquare,
  Printer,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react"
import { sanitizeHtml } from "@/lib/html-sanitizer"
import { createAdminBrowserClient } from "@/lib/supabase/client-admin"
import {
  clearAdminSession,
  hasValidAdminSession,
  readAdminSession,
} from "@/lib/admin-auth-client"
import { callGemini } from "@/lib/gemini/medical-report"

interface PatientDocument {
  id: string
  patient_id: string
  file_name?: string
  created_at?: string
  clean_text?: string | null
  pdf_url?: string | null
  html?: string | null
}

interface Patient {
  id: string
  full_name: string
  email: string | null
  birth_date: string | null
  cpf?: string | null
  created_at?: string
  updated_at?: string
  documents?: PatientDocument[]
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
  const remoteSearchRef = useRef("")
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const adminClient = useMemo(() => createAdminBrowserClient(), [])

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

  const slugifyName = (name: string) => {
    const slug = name
      .normalize("NFD")
      .replace(/[^a-zA-Z\s]/g, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ".")
      .replace(/\.+/g, ".")
      .replace(/^\.|\.$/g, "")

    return slug.slice(0, 60)
  }

  const getOrCreateAuthUser = async (email: string, password: string) => {
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (listError) {
      throw listError
    }

    const existingUser = usersData?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (existingUser) {
      const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
        existingUser.id,
        {
          password,
          email_confirm: true,
        },
      )

      if (updateError) {
        throw updateError
      }

      return updatedUser?.user || existingUser
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (!createError && created?.user) return created.user

    throw createError || new Error("Falha ao criar usuário")
  }

  useEffect(() => {
    const verifySession = async () => {
      const token = readAdminSession()
      if (!hasValidAdminSession(token)) {
        router.push("/admin/login")
        return
      }

      setCheckingAuth(false)
    }

    verifySession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadPatients = useCallback(async (options?: { search?: string; limit?: number }) => {
    setLoadingPatients(true)
    setError("")

    try {
      const nextLimit = options?.limit ?? pageSize
      const searchTerm = options?.search?.trim()

      let query = adminClient
        .from("patients")
        .select("id, full_name, email, birth_date, cpf, created_at, updated_at, documents (id, patient_id)")
        .order("created_at", { ascending: false })
        .order("created_at", { foreignTable: "documents", ascending: false })

      if (Number.isFinite(nextLimit)) {
        query = query.limit(nextLimit)
      }

      if (searchTerm) {
        const like = `%${searchTerm}%`
        query = query.or(`full_name.ilike.${like},email.ilike.${like}`)
      }

      const { data, error } = await query
      if (error) {
        throw error
      }

      setPatients(data || [])
      setSelectedPatientId(data?.[0]?.id ?? null)
      setSelectedDocumentId(data?.[0]?.documents?.[0]?.id ?? null)
    } catch (err: any) {
      setError(err.message || "Erro ao buscar pacientes")
    } finally {
      setLoadingPatients(false)
    }
  }, [adminClient, pageSize])

  const handlePatientUpdate = async (formData: Partial<Patient>) => {
    if (!selectedPatient) return
    setSavingPatient(true)
    setSuccessMessage("")
    setError("")

    try {
      const payload = {
        full_name: formData.full_name ?? selectedPatient.full_name,
        email: formData.email ?? selectedPatient.email,
        birth_date: formData.birth_date ?? selectedPatient.birth_date,
      }

      const { data, error } = await adminClient
        .from("patients")
        .update(payload)
        .eq("id", selectedPatient.id)
        .select("id, full_name, email, birth_date, cpf, created_at, updated_at")
        .single()

      if (error) {
        throw error
      }

      setPatients((prev) =>
        prev.map((patient) => (patient.id === selectedPatient.id ? { ...patient, ...data } : patient)),
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
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error("Missing NEXT_PUBLIC_GEMINI_API_KEY")
      }
      const cleanText = selectedDocument.clean_text || ""
      if (!cleanText.trim()) {
        throw new Error("Relatório sem texto para processamento")
      }

      const geminiResponse = await callGemini(cleanText, apiKey)
      const nextHtml = sanitizeHtml(geminiResponse.rawText)

      const { error: updateError } = await adminClient
        .from("documents")
        .update({ html: nextHtml })
        .eq("id", selectedDocument.id)

      if (updateError) {
        throw updateError
      }

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

    try {
      const { data: document, error: documentError } = await adminClient
        .from("documents")
        .select("id, patient_id, file_name, created_at, clean_text, pdf_url, html")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (documentError) {
        throw documentError
      }

      setPreviewHtml(document?.html?.trim() ? document.html : null)
      setPreviewDocumentId(isValidUuid(document?.id) ? document?.id ?? null : null)
      setPreviewError("")

      if (!document || !isValidUuid(document.id)) {
        setPreviewError("Nenhum relatório disponível para este paciente.")
        return
      }

      if (document.html?.trim()) {
        return
      }

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error("Missing NEXT_PUBLIC_GEMINI_API_KEY")
      }
      const cleanText = document.clean_text || ""
      if (!cleanText.trim()) {
        throw new Error("Relatório sem texto para processamento")
      }

      const geminiResponse = await callGemini(cleanText, apiKey)
      const nextHtml = sanitizeHtml(geminiResponse.rawText)

      const { error: updateError } = await adminClient
        .from("documents")
        .update({ html: nextHtml })
        .eq("id", document.id)

      if (updateError) {
        throw updateError
      }
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

  const handleRegeneratePreviewHtml = async () => {
    if (!previewPatient) return
    setPreviewLoading(true)
    setPreviewError("")
    setError("")
    setSuccessMessage("")

    try {
      let documentQuery = adminClient
        .from("documents")
        .select("id, patient_id, file_name, created_at, clean_text, pdf_url, html")
        .eq("patient_id", previewPatient.id)
        .order("created_at", { ascending: false })
        .limit(1)

      if (previewDocumentId && isValidUuid(previewDocumentId)) {
        documentQuery = documentQuery.eq("id", previewDocumentId)
      }

      const { data: document, error: documentError } = await documentQuery.maybeSingle()

      if (documentError) {
        throw documentError
      }

      if (!document?.id || !isValidUuid(document.id)) {
        setPreviewError("Nenhum relatório disponível para este paciente.")
        return
      }

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error("Missing NEXT_PUBLIC_GEMINI_API_KEY")
      }
      const cleanText = document.clean_text || ""
      if (!cleanText.trim()) {
        throw new Error("Relatório sem texto para processamento")
      }

      const geminiResponse = await callGemini(cleanText, apiKey)
      const nextHtml = sanitizeHtml(geminiResponse.rawText)

      const { error: updateError } = await adminClient
        .from("documents")
        .update({ html: nextHtml })
        .eq("id", document.id)

      if (updateError) {
        throw updateError
      }

      setPreviewHtml(nextHtml || null)
      setPreviewDocumentId(document.id)
      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === previewPatient.id
            ? {
                ...patient,
                documents: patient.documents?.map((doc) =>
                  doc.id === document.id ? { ...doc, html: nextHtml } : doc,
                ),
              }
            : patient,
        ),
      )
      setSuccessMessage("Relatório atualizado com sucesso")
    } catch (err: any) {
      setPreviewError(err.message || "Erro ao gerar relatório")
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
      const { data, error } = await adminClient
        .from("documents")
        .update({
          html: updatedHtml,
          file_name: document.file_name,
          clean_text: document.clean_text,
        })
        .eq("id", document.id)
        .select("id, patient_id, file_name, created_at, clean_text, pdf_url, html")
        .single()

      if (error) {
        throw error
      }

      setPreviewHtml(data?.html ?? updatedHtml)
      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === previewPatient.id
            ? {
                ...patient,
                documents: patient.documents?.map((doc) =>
                  doc.id === document.id ? data : doc,
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
      const { data, error } = await adminClient
        .from("documents")
        .update({
          file_name: changes.file_name ?? selectedDocument.file_name,
          clean_text: changes.clean_text ?? selectedDocument.clean_text,
        })
        .eq("id", selectedDocument.id)
        .select("id, patient_id, file_name, created_at, clean_text, pdf_url, html")
        .single()

      if (error) {
        throw error
      }
      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient?.id
            ? { ...patient, documents: patient.documents?.map((doc) => (doc.id === selectedDocument.id ? data : doc)) }
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

  const filteredPatients = useMemo(() => {
    if (!search.trim()) return patients
    return patients.filter((patient) =>
      patient.full_name.toLowerCase().includes(search.trim().toLowerCase()),
    )
  }, [patients, search])

  const handleLogout = async () => {
    clearAdminSession()
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

          <div />
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
                    variant="secondary"
                    size="sm"
                    onClick={handleRegeneratePreviewHtml}
                    disabled={previewLoading}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Gerar relatório novamente
                  </Button>
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
