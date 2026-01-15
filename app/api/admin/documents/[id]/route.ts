import { NextRequest, NextResponse } from 'next/server'

import { ADMIN_SESSION_COOKIE, hasValidAdminSession } from '@/lib/admin-auth'
import { sanitizeHtml } from '@/lib/html-sanitizer'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value

  if (!hasValidAdminSession(cookieValue)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const pathname = request.nextUrl?.pathname || ''
  const fallbackId = pathname.split('/').filter(Boolean).pop()
  const documentId = params.id || fallbackId
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentId)) {
    console.error('[admin] Documento inválido', {
      documentId,
      paramsId: params.id,
      fallbackId,
      pathname,
      length: documentId?.length ?? null,
    })
    return NextResponse.json(
      { error: 'Documento inválido', documentId, paramsId: params.id, pathname },
      { status: 400 },
    )
  }

  const { clean_text, file_name, html } = await request.json()
  const sanitizedHtml = typeof html === 'string' ? sanitizeHtml(html) : undefined

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('documents')
    .update({
      clean_text,
      file_name,
      ...(sanitizedHtml !== undefined ? { html: sanitizedHtml } : {}),
    })
    .eq('id', documentId)
    .select('id, patient_id, file_name, clean_text, created_at, pdf_url, html')
    .single()

  if (error) {
    console.error('[admin] Erro ao atualizar documento', error)
    return NextResponse.json({ error: 'Falha ao atualizar documento' }, { status: 500 })
  }

  return NextResponse.json({ document: data })
}
