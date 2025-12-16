import { createAdminClient } from './supabase/admin'

export async function createPatientAuth(cpf: string, password: string) {
  const supabase = createAdminClient()

  // Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: `${cpf}@patients.local`,
    password: password,
    email_confirm: true,
  })

  if (authError) throw authError

  return authData.user
}

export async function createClinicUserAuth(email: string, password: string) {
  const supabase = createAdminClient()

  // Criar usuário da clínica no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
  })

  if (authError) throw authError

  return authData.user
}

export function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}
