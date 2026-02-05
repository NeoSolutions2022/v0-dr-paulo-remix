import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"

const DEFAULT_SUPABASE_URL = "https://fhznxprnzdswjzpesgal.supabase.co"
const DEFAULT_SUPABASE_KEY = "sb_secret_42Y_GaLCMAj6glqzVN8rOQ_RfHvzNg5"
const DEFAULT_SUPABASE_SERVICE_KEY = DEFAULT_SUPABASE_KEY

export const DEFAULT_SUPABASE = {
  url: DEFAULT_SUPABASE_URL,
  serviceKey: DEFAULT_SUPABASE_SERVICE_KEY,
}

export function createDataSupabaseClient() {
  return createSupabaseClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function slugifyName(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "")

  // Supabase Auth local-part length limit safeguard (<=64 chars)
  return slug.slice(0, 60)
}

export async function getOrCreateAuthUser(
  supabase: ReturnType<typeof createAdminClient>,
  email: string,
  password: string,
) {
  // Supabase-js v2 não expõe getUserByEmail; listamos e filtramos manualmente.
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (listError) {
    throw listError
  }

  const existingUser = usersData?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase())
  if (existingUser) {
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
    })

    if (updateError) {
      throw updateError
    }

    return updatedUser?.user || existingUser
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (!createError && created?.user) return created.user

  throw createError || new Error("Falha ao criar usuário")
}
