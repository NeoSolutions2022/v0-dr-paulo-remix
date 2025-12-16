import { redirect, notFound } from 'next/navigation'
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, File, Shield } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PdfViewer } from "@/components/pdf-viewer"

export default async function DocumentoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: document } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("patient_id", user.id)
    .single()

  if (!document) {
    notFound()
  }

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
          {document.pdf_url ? (
            <PdfViewer 
              pdfUrl={document.pdf_url}
              documentId={id}
              fileName={document.file_name}
              txtUrl={document.txt_url}
              zipUrl={document.zip_url}
            />
          ) : (
            <div className="w-full h-[720px] border rounded-lg flex flex-col items-center justify-center text-slate-500 bg-slate-50 dark:bg-slate-900">
              <File className="h-16 w-16 opacity-40 mb-4" />
              <p className="text-lg font-medium">Nenhum PDF disponível</p>
              <p className="text-sm mt-2">O documento está disponível apenas em formato texto</p>
              
              {document.clean_text && (
                <div className="mt-8 w-full max-w-3xl px-6">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Conteúdo do Documento:
                    </p>
                    <pre className="whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100 font-mono leading-relaxed max-h-96 overflow-y-auto">
                      {document.clean_text}
                    </pre>
                  </div>
                </div>
              )}
            </div>
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
