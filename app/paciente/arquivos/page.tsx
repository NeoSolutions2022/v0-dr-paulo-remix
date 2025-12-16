import { redirect } from 'next/navigation'
import { createClient } from "@/lib/supabase/server"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { FileText, Folder, File, Calendar, Eye, Download } from 'lucide-react'
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function ArquivosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Arquivos Clínicos
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Todos os arquivos gerados e enviados pela clínica
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Todos os Arquivos
          </CardTitle>
        </CardHeader>

        <CardContent>
          {!documents || documents.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Nenhum arquivo encontrado
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Os documentos enviados pela clínica aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <File className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>

                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {doc.file_name}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                        </p>
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                          {doc.file_type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {doc.pdf_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={doc.pdf_url} target="_blank">
                          <Download className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/paciente/documentos/${doc.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Abrir
                      </Link>
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
