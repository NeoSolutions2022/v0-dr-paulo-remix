"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Calendar, AlertCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { HtmlDocumentViewer } from "@/components/patient/html-document-viewer"
import { createClient } from "@/lib/supabase/client"

type PatientDocument = {
  id: string
  patient_id: string
  file_name: string
  created_at: string
  pdf_url: string | null
  clean_text?: string | null
  hash_sha256?: string | null
  html?: string | null
}

export function DocumentoClient({ id }: { id: string }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [document, setDocument] = useState<PatientDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

        const { data: documentData, error: documentError } = await supabase
          .from("documents")
          .select("id, patient_id, file_name, created_at, pdf_url, clean_text, hash_sha256, html")
          .eq("id", id)
          .eq("patient_id", user.id)
          .maybeSingle()

        if (documentError) {
          throw documentError
        }

        if (!documentData) {
          setError("Documento não encontrado ou não pertence a você")
          setIsLoading(false)
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
          <HtmlDocumentViewer html={document.html} fileName={document.file_name} />
        </CardContent>
      </Card>
    </div>
  )
}
