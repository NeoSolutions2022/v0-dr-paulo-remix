"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { FileText, Eye, Calendar, AlertCircle, Loader2 } from 'lucide-react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type PatientDocument = {
  id: string
  file_name: string
  created_at: string
  pdf_url: string | null
  clean_text?: string | null
}

export default function DocumentListPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [documents, setDocuments] = useState<PatientDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDocuments = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.replace('/auth/login')
        return
      }

      const { data, error: documentsError } = await supabase
        .from('documents')
        .select('id, file_name, created_at, pdf_url, clean_text')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })

      if (documentsError) {
        console.error('Erro ao buscar documentos do paciente', documentsError)
        setError('Não foi possível carregar seus documentos. Tente novamente.')
      } else {
        setDocuments(data || [])
      }

      setIsLoading(false)
    }

    fetchDocuments()
  }, [router, supabase])

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

                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/paciente/documentos/${doc.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
