import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { hasValidAdminSession, ADMIN_SESSION_COOKIE } from '@/lib/admin-auth'

const DEFAULT_SUPABASE_URL = 'https://fhznxprnzdswjzpesgal.supabase.co'
const DEFAULT_SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoem54cHJuemRzd2p6cGVzZ2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzU0NDcsImV4cCI6MjA4MTY1MTQ0N30.ggOs6IBd6yAsJhWsHj9boWkyaqWTi1s11wRMDWZrOQY'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value

  if (!hasValidAdminSession(cookieValue)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const supabaseKey = DEFAULT_SUPABASE_KEY

  const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })

  if (patientsError) {
    console.error('[admin] Erro ao carregar pacientes', patientsError)
    return NextResponse.json(
      {
        error: 'Falha ao carregar pacientes',
        details: patientsError.message,
        supabaseUrl,
      },
      { status: 500 },
    )
  }

  const patientIds = (patients ?? []).map((patient) => patient.id)

  let documents: Array<{
    id: string
    patient_id: string
    file_name: string
    clean_text: string | null
    created_at: string
    pdf_url?: string | null
  }> = []

  if (patientIds.length > 0) {
    const { data: docs, error: documentsError } = await supabase
      .from('documents')
      .select('id, patient_id, file_name, clean_text, created_at, pdf_url')
      .in('patient_id', patientIds)
      .order('created_at', { ascending: false })

    if (documentsError) {
      console.error('[admin] Erro ao carregar documentos dos pacientes', documentsError)
    } else if (docs) {
      documents = docs
    }
  }

  const patientsWithDocuments = (patients ?? []).map((patient) => ({
    ...patient,
    documents: documents.filter((doc) => doc.patient_id === patient.id),
  }))

  return NextResponse.json({ patients: patientsWithDocuments, supabaseUrl })
}
