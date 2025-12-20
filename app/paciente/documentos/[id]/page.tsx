"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Calendar, Shield, AlertCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ProcessedDocumentViewer } from "@/components/patient/processed-document-viewer"
import { PatientCpfGate } from "@/components/patient-cpf-gate"
import { createClient } from "@/lib/supabase/client"

type PatientDocument = {
  id: string
  patient_id: string
  file_name: string
  created_at: string
  pdf_url: string | null
  clean_text?: string | null
  hash_sha256?: string | null
}

type PatientInfo = {
  cpf: string | null
  full_name: string | null
}

export default function DocumentoPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [document, setDocument] = useState<PatientDocument | null>(null)
  const [patient, setPatient] = useState<PatientInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!id || id === "undefined") {
        setError("Documento não encontrado")
        setIsLoading(false)
        return
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.replace("/auth/login")
          return
        }

        const [patientResp, documentResp] = await Promise.all([
          supabase
            .from("patients")
            .select("cpf, full_name")
            .eq("id", user.id)
            .maybeSingle(),
          fetch(`/api/patient/documents?id=${encodeURIComponent(id)}`, {
            credentials: "include",
            cache: "no-store",
          }),
        ])

        if (patientResp.error) {
          console.error("Erro ao carregar paciente", patientResp.error)
        }

        if (patientResp.data) {
          setPatient(patientResp.data)
        }

        if (documentResp.status === 401) {
          router.replace("/auth/login")
          return
        }

        if (documentResp.status === 404) {
          setError("Documento não encontrado ou não pertence a você")
          setIsLoading(false)
          return
        }

        if (!documentResp.ok) {
          throw new Error("Não foi possível carregar o documento")
        }

        const { documents } = (await documentResp.json()) as {
          documents: PatientDocument | PatientDocument[]
        }

        const documentData = Array.isArray(documents)
          ? documents[0]
          : documents

        if (!documentData) {
          setError("Documento não encontrado")
          return
        }

        setDocument(documentData)
      } catch (err: any) {
        console.error("Erro ao carregar documento do paciente", err)
        setError(err.message || "Falha ao carregar documento")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [id, router, supabase])

  const hasCpf = !!patient?.cpf

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando documento...
      </div>
    )
  }

  if (error || !document) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error || "Documento não encontrado"}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">
            {document.file_name}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-1">
            <Calendar className="h-4 w-4" />
            Enviado em {new Date(document.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {generatedPdfUrl && (
            <Button asChild variant="outline" size="sm">
              <Link href={generatedPdfUrl} download target="_blank">
                Download PDF
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/paciente/documentos">Voltar</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visualização do Documento</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {!hasCpf && (
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-lg border">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Para validar o relatório publicamente ou assinar com hash, informe seu CPF.
              </p>
              <PatientCpfGate patientId={document.patient_id} />
            </div>
          )}

          <ProcessedDocumentViewer
            cleanText={document.clean_text}
            fileName={document.file_name}
            documentId={document.id}
            patientName={patient?.full_name}
            onPdfReady={setGeneratedPdfUrl}
          />

          {document.hash_sha256 && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
                      Documento assinado digitalmente
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      Valide a autenticidade pelo QR Code ou link público
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/validar/${document.id}`} target="_blank">
                    Validar
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
