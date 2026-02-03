"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { createAdminBrowserClient } from "@/lib/supabase/client-admin"
import QRCode from "qrcode"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { QrCode, Download, ArrowLeft, Shield } from 'lucide-react'

export function generateStaticParams() {
  return []
}

type DocumentInfo = {
  id: string
  patient_id: string
  file_name: string
  created_at: string
}

export default function QRDocumentPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [doc, setDoc] = useState<DocumentInfo | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const validationUrl = useMemo(() => {
    if (!params?.id) return ""
    return `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/validar/${params.id}`
  }, [params?.id])

  useEffect(() => {
    const loadDocument = async () => {
      const supabase = createBrowserClient()
      const admin = createAdminBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/auth/login")
        return
      }

      if (!params?.id) return

      const { data } = await admin
        .from("documents")
        .select("id, patient_id, file_name, created_at")
        .eq("id", params.id)
        .eq("patient_id", user.id)
        .maybeSingle()

      setDoc(data || null)
    }

    loadDocument()
  }, [params, router])

  useEffect(() => {
    const generateQr = async () => {
      if (!validationUrl) return
      const dataUrl = await QRCode.toDataURL(validationUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#ffffff',
        },
      })
      setQrCode(dataUrl)
    }

    generateQr()
  }, [validationUrl])

  if (!doc) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600 text-center">Documento não encontrado.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          QR Code de Validação
        </h1>
        <Button asChild variant="outline">
          <Link href={`/paciente/documentos/${params?.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {doc.file_name}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* QR Code Display */}
          <div className="flex justify-center p-8 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <img
                src={qrCode || "/placeholder.svg"}
                alt="QR Code de Validação"
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Como funciona a validação?
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                  Este QR Code permite que qualquer pessoa valide a autenticidade
                  do documento escaneando com a câmera do celular. O sistema
                  confirmará se o documento é genuíno e foi emitido pela clínica.
                </p>
              </div>
            </div>
          </div>

          {/* URL Display */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Link de validação:
            </p>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border">
              <code className="text-xs text-slate-900 dark:text-slate-100 break-all">
                {validationUrl}
              </code>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button asChild className="flex-1">
              <a href={qrCode ?? undefined} download={`qrcode-${doc.file_name}.png`}>
                <Download className="h-4 w-4 mr-2" />
                Baixar QR Code
              </a>
            </Button>

            <Button asChild variant="outline" className="flex-1">
              <Link href={validationUrl} target="_blank">
                <Shield className="h-4 w-4 mr-2" />
                Testar Validação
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
