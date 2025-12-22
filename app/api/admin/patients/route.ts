import { NextRequest, NextResponse } from 'next/server'

import { hasValidAdminSession, ADMIN_SESSION_COOKIE } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value

  if (!hasValidAdminSession(cookieValue)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select('id, full_name, email, birth_date, created_at')
    .order('created_at', { ascending: false })

  if (patientsError) {
    console.error('[admin] Erro ao carregar pacientes', patientsError)
    return NextResponse.json(
      { error: 'Falha ao carregar pacientes', details: patientsError.message },
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

  return NextResponse.json({ patients: patientsWithDocuments })
}
