"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Eye } from "lucide-react"

interface PatientDocument {
  id: string
  file_name: string
  pdf_url: string | null
  created_at: string
}

export default function PatientReportsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<PatientDocument[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadReports = async () => {
      const supabase = createBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login")
        return
      }

      const { data, error } = await supabase
        .from("documents")
        .select("id, file_name, pdf_url, created_at")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false })

      if (!error) {
        setDocuments(data || [])
      }
      setLoading(false)
    }

    loadReports()
  }, [router])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Relatórios do Paciente</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Visualize e baixe apenas os documentos vinculados à sua conta.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meus Relatórios</CardTitle>
          <CardDescription>Somente documentos associados ao seu CPF</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-500 py-8 text-center">
              Carregando relatórios...
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center">
              Nenhum relatório encontrado. Quando sua clínica enviar PDFs, eles aparecerão aqui.
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{doc.file_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/paciente/documentos/detalhe?id=${doc.id}`}>
                        <Eye className="h-4 w-4 mr-1" /> Ver
                      </Link>
                    </Button>

                    <Button variant="secondary" size="sm" asChild disabled={!doc.pdf_url}>
                      <a href={doc.pdf_url ?? "#"} download>
                        <Download className="h-4 w-4 mr-1" /> Download PDF
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
