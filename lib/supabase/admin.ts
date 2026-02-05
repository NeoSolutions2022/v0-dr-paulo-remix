import { createClient } from '@supabase/supabase-js'

// Cliente admin com service role para operações administrativas
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY é obrigatório para operações administrativas')
  }
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL é obrigatório para operações administrativas')
  }

  try {
    const payload = JSON.parse(Buffer.from(supabaseServiceKey.split('.')[1], 'base64url').toString('utf8'))
    if (payload.role !== 'service_role') {
      console.warn('[admin] A chave Supabase configurada não é service_role; operações administrativas podem falhar')
    }
  } catch {
    console.warn('[admin] Não foi possível validar o payload da chave Supabase configurada')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
