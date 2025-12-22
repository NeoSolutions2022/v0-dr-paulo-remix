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
  const { data, error } = await supabase
    .from('patients')
    .select(
      'id, full_name, email, birth_date, created_at, updated_at, documents(id, file_name, clean_text, created_at)',
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin] Erro ao carregar pacientes', error)
    return NextResponse.json({ error: 'Falha ao carregar pacientes' }, { status: 500 })
  }

  return NextResponse.json({ patients: data })
}
