import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://fhznxprnzdswjzpesgal.supabase.co'
const DEFAULT_SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoem54cHJuemRzd2p6cGVzZ2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzU0NDcsImV4cCI6MjA4MTY1MTQ0N30.ggOs6IBd6yAsJhWsHj9boWkyaqWTi1s11wRMDWZrOQY'

// Cliente admin com service role para operações administrativas
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  // Usa sempre a mesma API key de exemplo por padrão, garantindo consistência entre listagem e mutações
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SUPABASE_KEY

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
