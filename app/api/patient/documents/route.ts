import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

interface PatientDocument {
  id: string
  patient_id: string
  file_name: string
  created_at: string
  pdf_url: string | null
  clean_text: string | null
  hash_sha256: string | null
}

async function generatePdfFromCleanText(
  cleanText: string,
  patientName: string,
  request: NextRequest,
) {
  const response = await fetch(`${request.nextUrl.origin}/api/generate-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cleanText, patientName }),
    cache: "no-store",
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.error || "Falha ao gerar PDF do relatório")
  }

  const data = (await response.json()) as { html?: string }

  if (!data.html) {
    throw new Error("Resposta inválida ao gerar PDF do relatório")
  }

  return data.html
}

async function persistPdfUrl(
  admin: ReturnType<typeof createAdminClient>,
  document: PatientDocument,
  pdfContent: string,
  selectFields: string,
  expectedPatientId: string,
): Promise<PatientDocument> {
  const dataUrl = `data:text/html;base64,${Buffer.from(pdfContent, "utf-8").toString("base64")}`

  const { data, error } = await admin
    .from("documents")
    .update({ pdf_url: dataUrl })
    .eq("id", document.id)
    .eq("patient_id", expectedPatientId)
    .select(selectFields)
    .maybeSingle()

  if (error || !data) {
    throw error || new Error("Documento não encontrado para atualizar PDF")
  }

  return data as PatientDocument
}

async function ensureDocumentHasPdf(
  document: PatientDocument,
  admin: ReturnType<typeof createAdminClient>,
  request: NextRequest,
  selectFields: string,
  expectedPatientId: string,
): Promise<PatientDocument> {
  if (document.pdf_url || !document.clean_text) {
    return document
  }

  try {
    const pdfHtml = await generatePdfFromCleanText(
      document.clean_text,
      document.file_name.replace(/\.[^/.]+$/, "") || "Paciente",
      request,
    )

    return await persistPdfUrl(admin, document, pdfHtml, selectFields, expectedPatientId)
  } catch (error) {
    console.error(
      "Erro ao gerar ou salvar PDF do documento",
      { documentId: document.id, patientId: document.patient_id },
      error,
    )
    return document
  }
}

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const searchParams = request.nextUrl.searchParams
  const documentId = searchParams.get("id")

  const baseSelect =
    "id, patient_id, file_name, created_at, pdf_url, clean_text, hash_sha256"

  // Quando um ID específico é informado, buscamos primeiro o documento e
  // validamos se pertence ao usuário autenticado. Assim evitamos `null`
  // silencioso e retornamos 404 quando não é do paciente.
  if (documentId) {
    if (documentId === "undefined") {
      return NextResponse.json(
        { error: "Documento inválido" },
        { status: 400 },
      )
    }

    const { data: document, error } = await admin
      .from("documents")
      .select(baseSelect)
      .eq("id", documentId)
      .maybeSingle()

    if (error) {
      console.error("Erro ao buscar documento do paciente", error)
      return NextResponse.json(
        { error: "Não foi possível carregar documentos" },
        { status: 500 },
      )
    }

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    if (document.patient_id !== user.id) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    const documentWithPdf = await ensureDocumentHasPdf(
      document as PatientDocument,
      admin,
      request,
      baseSelect,
      user.id,
    )

    return NextResponse.json({ documents: documentWithPdf })
  }

  const { data, error } = await admin
    .from("documents")
    .select(baseSelect)
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Erro ao buscar documentos do paciente", error)
    return NextResponse.json(
      { error: "Não foi possível carregar documentos" },
      { status: 500 },
    )
  }

  const documentsWithPdf = await Promise.all(
    (data as PatientDocument[]).map((doc) =>
      ensureDocumentHasPdf(doc, admin, request, baseSelect, user.id),
    ),
  )

  return NextResponse.json({ documents: documentsWithPdf })
}
