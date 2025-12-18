import { createClient } from '@supabase/supabase-js'

// Cliente admin com service role para operações administrativas
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fhznxprnzdswjzpesgal.supabase.co'
  // Fallback para service role fornecida pelo usuário para testes
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_42Y_GaLCMAj6glqzVN8rOQ_RfHvzNg5'

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
