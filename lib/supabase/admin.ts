import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://fhznxprnzdswjzpesgal.supabase.co'
const DEFAULT_SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  'sb_secret_42Y_GaLCMAj6glqzVN8rOQ_RfHvzNg5'

// Cliente admin com service role para operações administrativas
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
    DEFAULT_SUPABASE_KEY

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY é obrigatório para operações administrativas')
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
