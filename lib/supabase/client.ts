import { createBrowserClient as createBrowserClientSSR } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClientSSR> | null = null;

export function createClient() {
  if (client) {
    return client;
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }
  
  client = createBrowserClientSSR(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      },
      global: {
        fetch: fetch.bind(globalThis)
      }
    }
  );
  
  return client;
}

export const createBrowserClient = createClient;
