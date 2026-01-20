import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { hasValidAdminSession, ADMIN_SESSION_COOKIE } from '@/lib/admin-auth'

const DEFAULT_SUPABASE_URL = 'https://fhznxprnzdswjzpesgal.supabase.co'
const DEFAULT_SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_secret_42Y_GaLCMAj6glqzVN8rOQ_RfHvzNg5'
const DEFAULT_SUPABASE_SERVICE_KEY = DEFAULT_SUPABASE_KEY

export const dynamic = 'force-dynamic'

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  if (!hasValidAdminSession(cookieValue)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search')?.trim() || ''

  // Mantém seu modelo de "limit", mas com batch pra não dar Bad Request
  const limitParam = Number(searchParams.get('limit') || '200')
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 1000) : 200

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SUPABASE_SERVICE_KEY

  const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1) Pacientes
  let patientsQuery = supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (search) {
    patientsQuery = patientsQuery.ilike('full_name', `%${search}%`)
  }

  const { data: patients, error: patientsError } = await patientsQuery

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

  const patientIds = (patients ?? []).map((p) => p.id)

  // 2) Documentos (em batches pra não estourar o filtro)
  type DocRow = {
    id: string
    patient_id: string
    file_name: string
    clean_text: string | null
    created_at: string
    pdf_url?: string | null
    html?: string | null
  }

  let documents: DocRow[] = []

  if (patientIds.length > 0) {
    const BATCH_SIZE = 200 // seguro
    const batches = chunkArray(patientIds, BATCH_SIZE)

    for (const ids of batches) {
      const { data: docs, error: documentsError } = await supabase
        .from('documents')
        .select('id, patient_id, file_name, clean_text, created_at, pdf_url, html')
        .in('patient_id', ids)
        .order('created_at', { ascending: false })

      if (documentsError) {
        console.error('[admin] Erro ao carregar documentos dos pacientes', documentsError)
        return NextResponse.json(
          {
            error: 'Falha ao carregar documentos dos pacientes',
            details: documentsError.message,
          },
          { status: 500 },
        )
      }

      if (docs?.length) documents.push(...(docs as DocRow[]))
    }
  }

  // 3) Merge pacientes + documentos
  const patientsWithDocuments = (patients ?? []).map((patient) => ({
    ...patient,
    documents: documents.filter((doc) => doc.patient_id === patient.id),
  }))

  return NextResponse.json({
    patients: patientsWithDocuments,
    supabaseUrl,
    meta: { limit, search, patientsCount: patientsWithDocuments.length, documentsCount: documents.length },
  })
}
