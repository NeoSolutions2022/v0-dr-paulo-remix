"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { FileText, Eye, Calendar, AlertCircle, Loader2, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HtmlDocumentViewer } from "@/components/patient/html-document-viewer"
import { createBrowserClient } from "@/lib/supabase/client"

type PatientDocument = {
  id: string
  file_name: string
  created_at: string
  pdf_url: string | null
  clean_text?: string | null
  html?: string | null
}

export default function DocumentListPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<PatientDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewerDocument, setViewerDocument] = useState<PatientDocument | null>(null)

  const viewerTitle = useMemo(() => {
    if (!viewerDocument) return ''
    return viewerDocument.file_name
  }, [viewerDocument])

  useEffect(() => {
    const fetchDocuments = async () => {
      const supabase = createBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/auth/login")
        return
      }

      const { data, error: documentsError } = await supabase
        .from("documents")
        .select("id, file_name, created_at, pdf_url, clean_text, html")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false })

      if (documentsError) {
        setError("Não foi possível carregar seus documentos. Tente novamente.")
        setIsLoading(false)
        return
      }

      setDocuments(data || [])
      setIsLoading(false)
    }

    fetchDocuments()
  }, [router])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Meus Documentos
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Todos os seus documentos médicos organizados por categoria
        </p>
      </div>

      <Tabs defaultValue="todos" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <TabsTrigger value="todos" className="text-xs">
            Todos
            <Badge variant="secondary" className="ml-1.5 text-xs">
              {documents?.length || 0}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Todos os Documentos</CardTitle>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando seus documentos...
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              ) : (documents?.length ?? 0) === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Nenhum documento encontrado.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents?.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {doc.file_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                            </p>
                            {(doc.pdf_url || doc.clean_text) && (
                              <Badge variant="outline" className="text-xs">
                                {doc.pdf_url ? 'PDF' : 'Processado'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setViewerDocument(doc)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Visualizar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {viewerDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-6xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3 bg-slate-50 dark:bg-slate-800">
              <div className="min-w-0">
                <p className="text-sm text-slate-500 dark:text-slate-300 truncate">Documento</p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">{viewerTitle}</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Fechar visualização"
                  onClick={() => setViewerDocument(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden p-4">
              <HtmlDocumentViewer html={viewerDocument.html} fileName={viewerDocument.file_name} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
