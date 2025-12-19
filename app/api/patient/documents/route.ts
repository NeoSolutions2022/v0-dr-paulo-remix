import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

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

  const query = admin
    .from("documents")
    .select("id, patient_id, file_name, created_at, pdf_url, clean_text, hash_sha256")
    .eq("patient_id", user.id)

  const { data, error } = documentId
    ? await query.eq("id", documentId).maybeSingle()
    : await query.order("created_at", { ascending: false })

  if (error) {
    console.error("Erro ao buscar documentos do paciente", error)
    return NextResponse.json(
      { error: "Não foi possível carregar documentos" },
      { status: 500 },
    )
  }

  return NextResponse.json({ documents: data })
}
