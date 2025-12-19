import { createServerClient as createServerClientSSR } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fhznxprnzdswjzpesgal.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoem54cHJuemRzd2p6cGVzZ2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzU0NDcsImV4cCI6MjA4MTY1MTQ0N30.ggOs6IBd6yAsJhWsHj9boWkyaqWTi1s11wRMDWZrOQY'

  return createServerClientSSR(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

export const createServerClient = createClient;
