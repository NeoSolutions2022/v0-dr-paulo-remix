"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { DocumentoClient } from "../documento-client"

function DocumentoDetalheContent() {
  const searchParams = useSearchParams()
  const documentId = searchParams.get("id") ?? ""

  return <DocumentoClient id={documentId} />
}

export default function DocumentoDetalhePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950" />}>
      <DocumentoDetalheContent />
    </Suspense>
  )
}
