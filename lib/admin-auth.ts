export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'paulo@doutor'
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Drpaulov0'
export const ADMIN_SESSION_COOKIE = 'admin-session'
export const ADMIN_SESSION_TOKEN = process.env.ADMIN_SESSION_TOKEN || 'doctor-admin-session'

export function isValidAdminCredentials(email: string, password: string) {
  return email === ADMIN_EMAIL && password === ADMIN_PASSWORD
}

export function hasValidAdminSession(cookieValue?: string) {
  return cookieValue === ADMIN_SESSION_TOKEN
}
