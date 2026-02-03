"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ShieldCheck, FileText, Fingerprint, AlertTriangle } from 'lucide-react'
import Link from "next/link"
import { Button } from "@/components/ui/button"

type SignatureDocument = {
  id: string
  file_name: string
  created_at: string
  hash_sha256: string | null
}

export function SignatureClient() {
  const params = useParams<{ id: string }>()
  const [doc, setDoc] = useState<SignatureDocument | null>(null)

  useEffect(() => {
    const loadDoc = async () => {
      if (!params?.id) return
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from("documents")
        .select("id, file_name, created_at, hash_sha256")
        .eq("id", params.id)
        .single()
      setDoc(data || null)
    }

    loadDoc()
  }, [params])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="max-w-2xl w-full shadow-xl">
        <CardHeader className="text-center border-b">
          <CardTitle className="text-2xl font-bold">
            Assinatura Digital e Verificação
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Certificado de autenticidade do documento
          </p>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {!doc ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-16 w-16 mx-auto text-red-500 mb-4" />
              <p className="text-xl font-semibold text-red-600">
                Documento não encontrado
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                  <ShieldCheck className="h-16 w-16 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold text-green-600 mb-2">
                    Documento Autenticado com Sucesso
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Este documento possui assinatura digital válida
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Arquivo
                    </p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {doc.file_name}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Emitido em
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {new Date(doc.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {doc.hash_sha256 ? (
                  <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3 mb-3">
                      <Fingerprint className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                          Hash Criptográfico SHA-256
                        </p>
                        <p className="font-mono text-xs text-slate-900 dark:text-slate-100 break-all bg-white dark:bg-slate-800 p-3 rounded border">
                          {doc.hash_sha256}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Este hash criptográfico garante que o documento{" "}
                      <strong>não foi alterado</strong> desde sua emissão. 
                      Qualquer modificação no arquivo resultaria em um hash diferente.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Este documento não possui hash SHA-256 registrado.
                    </p>
                  </div>
                )}

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Assinado digitalmente por
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {process.env.NEXT_PUBLIC_CLINIC_NAME || "Sistema de Documentos Médicos"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    ID do Documento: <span className="font-mono">{doc.id}</span>
                  </p>
                </div>
              </div>

              <Button asChild className="w-full" variant="outline">
                <Link href={`/validar/${params?.id}`}>
                  Voltar para Validação
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
