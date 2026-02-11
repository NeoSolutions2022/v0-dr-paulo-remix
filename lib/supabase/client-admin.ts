import { createClient } from "@supabase/supabase-js"

let adminClient: ReturnType<typeof createClient> | null = null

export function createAdminBrowserClient() {
  if (adminClient) {
    return adminClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseKey = serviceRoleKey || anonKey || "missing-public-key"
  const resolvedSupabaseUrl = supabaseUrl || "https://missing-supabase-url.local"

  if ((!supabaseUrl || !serviceRoleKey) && typeof window !== "undefined") {
    console.warn(
      "[admin-client] Missing Supabase env(s): using fallback values to prevent client crash. Verify NEXT_PUBLIC_SUPABASE_URL and public keys in runtime env.",
    )
  }

  adminClient = createClient(resolvedSupabaseUrl, supabaseKey, {
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
