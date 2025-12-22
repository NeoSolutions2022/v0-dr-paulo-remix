import { NextRequest, NextResponse } from 'next/server'

import { ADMIN_SESSION_COOKIE, hasValidAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value

  if (!hasValidAdminSession(cookieValue)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { full_name, email, birth_date } = await request.json()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('patients')
    .update({ full_name, email, birth_date })
    .eq('id', params.id)
    .select('id, full_name, email, birth_date, created_at, updated_at')
    .single()

  if (error) {
    console.error('[admin] Erro ao atualizar paciente', error)
    return NextResponse.json({ error: 'Falha ao atualizar paciente' }, { status: 500 })
  }

  return NextResponse.json({ patient: data })
}
