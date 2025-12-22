import { NextRequest, NextResponse } from 'next/server'

import { ADMIN_SESSION_COOKIE, hasValidAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value

  if (!hasValidAdminSession(cookieValue)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { clean_text, file_name } = await request.json()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('documents')
    .update({ clean_text, file_name })
    .eq('id', params.id)
    .select('id, patient_id, file_name, clean_text, created_at, pdf_url')
    .single()

  if (error) {
    console.error('[admin] Erro ao atualizar documento', error)
    return NextResponse.json({ error: 'Falha ao atualizar documento' }, { status: 500 })
  }

  return NextResponse.json({ document: data })
}
