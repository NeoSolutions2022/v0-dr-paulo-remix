"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import CleanTextViewer from "@/components/patient/clean-text-viewer"
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Eye,
  FileText,
  Loader2,
  LogOut,
  PenSquare,
  RefreshCw,
  Search,
  Upload,
  X,
  UserPlus,
  Users,
  ListChecks,
} from "lucide-react"

interface PatientDocument {
  id: string
  patient_id: string
  file_name: string
  created_at: string
  clean_text: string | null
  pdf_url?: string | null
}

interface Patient {
  id: string
  full_name: string
  email: string | null
  birth_date: string | null
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
  const [quickViewPatientId, setQuickViewPatientId] = useState<string | null>(null)
  const [quickViewDocumentId, setQuickViewDocumentId] = useState<string | null>(null)
  const uploadSectionId = "admin-upload-section"

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? patients[0],
    [patients, selectedPatientId],
  )

  const selectedDocument = useMemo(
    () => selectedPatient?.documents?.find((doc) => doc.id === selectedDocumentId) ?? selectedPatient?.documents?.[0],
    [selectedDocumentId, selectedPatient],
  )

  const quickViewPatient = useMemo(
    () => patients.find((patient) => patient.id === quickViewPatientId) ?? null,
    [patients, quickViewPatientId],
  )

  const quickViewDocument = useMemo(
    () =>
      quickViewPatient?.documents?.find((doc) => doc.id === quickViewDocumentId) ??
      quickViewPatient?.documents?.[0] ??
      null,
    [quickViewDocumentId, quickViewPatient],
  )

  useEffect(() => {
    const verifySession = async () => {
      const response = await fetch("/api/admin/session")
      if (!response.ok) {
        router.push("/admin/login")
        return
      }

      setCheckingAuth(false)
      await loadPatients()
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

  const loadPatients = async () => {
    setLoadingPatients(true)
    setError("")

    try {
      const response = await fetch("/api/admin/patients")
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
  }

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

  const handleDocumentUpdate = async (changes: Partial<PatientDocument>) => {
    if (!selectedDocument) return
    setSavingDocument(true)
    setSuccessMessage("")
    setError("")

    try {
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

  const handleOpenQuickView = (patientId: string, documentId?: string | null) => {
    setQuickViewPatientId(patientId)
    setQuickViewDocumentId(documentId ?? null)
  }

  const handleCloseQuickView = () => {
    setQuickViewPatientId(null)
    setQuickViewDocumentId(null)
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
              <Button variant="secondary" onClick={scrollToUpload}>
                <Upload className="mr-2 h-4 w-4" /> Novo relatório
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
                      className={`flex items-start gap-3 p-4 transition hover:bg-slate-50 ${
                        patient.id === selectedPatient?.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <button
                        className="flex-1 text-left"
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
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleOpenQuickView(patient.id, patient.documents?.[0]?.id ?? null)}
                        aria-label={`Ver relatório de ${patient.full_name}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
                      <Label>Visualização do texto limpo</Label>
                      {loadingPatients ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Carregando relatório...
                        </div>
                      ) : (
                        <CleanTextViewer cleanText={selectedDocument.clean_text || ""} />
                      )}
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
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Salvar alterações
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
                  Faça upload de um texto clínico para limpar, registrar e criar as credenciais do paciente
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
                    <Input id="file" type="file" accept=".txt" onChange={handleFileUpload} />
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
      </div>

      {quickViewPatient && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={handleCloseQuickView}
            aria-label="Fechar visualização rápida"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative h-full w-full max-w-3xl overflow-y-auto bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Relatório do paciente</p>
                <h2 className="text-xl font-semibold text-slate-900">{quickViewPatient.full_name}</h2>
                <p className="text-xs text-muted-foreground">{quickViewPatient.email || "Sem email"}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={handleCloseQuickView}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div className="flex flex-wrap gap-2">
                {quickViewPatient.documents?.map((doc) => (
                  <Badge
                    key={doc.id}
                    variant={doc.id === quickViewDocument?.id ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => setQuickViewDocumentId(doc.id)}
                  >
                    {doc.file_name}
                  </Badge>
                ))}
              </div>
              {quickViewDocument ? (
                <CleanTextViewer cleanText={quickViewDocument.clean_text || ""} />
              ) : (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle>Sem relatórios</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Este paciente ainda não possui relatórios cadastrados.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
