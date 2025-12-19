import { redirect, notFound } from 'next/navigation'
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Shield } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PdfViewer } from "@/components/pdf-viewer"
import { PatientCpfGate } from "@/components/patient-cpf-gate"
import { ProcessedDocumentViewer } from "@/components/patient/processed-document-viewer"

export const dynamic = "force-dynamic"

export default async function DocumentoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: document, error: documentError } = await admin
    .from("documents")
    .select("id, patient_id, file_name, created_at, pdf_url, txt_url, zip_url, clean_text, hash_sha256")
    .eq("id", id)
    .eq("patient_id", user.id)
    .maybeSingle()

  if (documentError) {
    console.error("Erro ao buscar documento do paciente", documentError)
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("cpf, full_name")
    .eq("id", user.id)
    .single()

  if (!document) {
    notFound()
  }

  const hasCpf = !!patient?.cpf

  return (
    <div className="space-y-6">
      {/* Header */}
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
        <Button asChild variant="outline">
          <Link href="/paciente/documentos">Voltar</Link>
        </Button>
      </div>

      {/* PDF Viewer */}
      <Card>
        <CardHeader>
          <CardTitle>Visualização do Documento</CardTitle>
        </CardHeader>

        <CardContent>
          {!hasCpf ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Para baixar ou visualizar o relatório em PDF, informe seu CPF.
              </p>
              <PatientCpfGate patientId={user.id} />
            </div>
          ) : document.pdf_url ? (
            <PdfViewer
              pdfUrl={document.pdf_url}
              documentId={id}
              fileName={document.file_name}
              txtUrl={document.txt_url}
              zipUrl={document.zip_url}
            />
          ) : (
            <ProcessedDocumentViewer
              cleanText={document.clean_text}
              fileName={document.file_name}
              documentId={id}
              txtUrl={document.txt_url}
              patientName={patient?.full_name}
            />
          )}

          {/* Validation Button */}
          {document.hash_sha256 && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
                      Documento Assinado Digitalmente
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      Valide a autenticidade através do QR Code ou link público
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/validar/${id}`} target="_blank">
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
