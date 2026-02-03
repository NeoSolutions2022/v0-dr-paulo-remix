"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileCheck, AlertTriangle, FileText, Calendar, Shield, Building2, CheckCircle2 } from 'lucide-react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type DocumentInfo = {
  id: string
  file_name: string
  created_at: string
  pdf_url: string | null
  hash_sha256: string | null
  category: string | null
}

export function ValidateClient() {
  const params = useParams<{ id: string }>()
  const [doc, setDoc] = useState<DocumentInfo | null>(null)

  useEffect(() => {
    const loadDocument = async () => {
      const supabase = createBrowserClient()
      if (!params?.id) return
      const { data } = await supabase
        .from("documents")
        .select("id, file_name, created_at, pdf_url, hash_sha256, category")
        .eq("id", params.id)
        .single()
      setDoc(data || null)
    }

    loadDocument()
  }, [params])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900">
      <Card className="max-w-2xl w-full shadow-2xl border-2">
        <CardHeader className="text-center border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <div className="mx-auto mb-4 p-3 rounded-full bg-white dark:bg-slate-800 w-fit">
            <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Validação de Documento Médico
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Sistema de verificação de autenticidade com blockchain
          </p>
        </CardHeader>

        <CardContent className="space-y-6 pt-8">
          {!doc ? (
            <div className="text-center space-y-4 py-12">
              <div className="inline-flex p-4 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-16 w-16 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 mb-2">
                  Documento Não Encontrado
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  Este documento não existe em nossa base de dados ou o link pode estar incorreto.
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-3">
                  Verifique se o QR Code é autêntico ou entre em contato com a clínica emissora.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Success Badge */}
              <div className="text-center space-y-4 py-6">
                <div className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/30 animate-pulse">
                  <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <Badge className="bg-green-600 text-white px-4 py-1.5 text-sm mb-3">
                    Autenticidade Verificada
                  </Badge>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    Documento Autêntico
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                    Este documento foi emitido oficialmente e possui assinatura digital válida
                  </p>
                </div>
              </div>

              {/* Document Information */}
              <div className="space-y-4 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800/50 dark:to-blue-900/20 rounded-xl p-6 border">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Informações do Documento
                </h3>

                <div className="grid gap-4">
                  <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                        Nome do Arquivo
                      </p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 break-words">
                        {doc.file_name}
                      </p>
                    </div>
                  </div>

                  {doc.category && (
                    <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                          Tipo de Documento
                        </p>
                        <Badge variant="secondary">{doc.category}</Badge>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                        Data de Emissão
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
                  </div>

                  {doc.hash_sha256 && (
                    <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
                      <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                          Assinatura Digital (SHA-256)
                        </p>
                        <p className="font-mono text-xs text-slate-900 dark:text-slate-100 break-all bg-slate-100 dark:bg-slate-900 p-2 rounded">
                          {doc.hash_sha256}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Sobre a Autenticidade
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
                      Este documento foi emitido e assinado digitalmente pelo sistema da clínica. 
                      O QR Code e o hash SHA-256 garantem sua autenticidade e integridade, 
                      comprovando que o documento não foi alterado desde sua emissão.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {doc.pdf_url && (
                  <Button asChild className="flex-1">
                    <Link href={doc.pdf_url} target="_blank">
                      <FileText className="h-4 w-4 mr-2" />
                      Visualizar PDF Original
                    </Link>
                  </Button>
                )}
                
                {doc.hash_sha256 && (
                  <Button asChild variant="outline" className="flex-1">
                    <Link href={`/validar/${params?.id}/assinatura`}>
                      <Shield className="h-4 w-4 mr-2" />
                      Detalhes da Assinatura
                    </Link>
                  </Button>
                )}
              </div>

              {/* Footer Info */}
              <div className="text-center pt-4 border-t">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sistema de Validação de Documentos Médicos
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Em caso de dúvidas, entre em contato com a clínica emissora
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
