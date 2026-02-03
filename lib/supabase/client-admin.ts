import { createClient } from "@supabase/supabase-js"

const DEFAULT_SUPABASE_URL = "https://fhznxprnzdswjzpesgal.supabase.co"
const DEFAULT_SERVICE_ROLE_KEY = "sb_secret_42Y_GaLCMAj6glqzVN8rOQ_RfHvzNg5"

let adminClient: ReturnType<typeof createClient> | null = null

export function createAdminBrowserClient() {
  if (adminClient) {
    return adminClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_ROLE_KEY

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: fetch.bind(globalThis),
    },
  })

  return adminClient
}
