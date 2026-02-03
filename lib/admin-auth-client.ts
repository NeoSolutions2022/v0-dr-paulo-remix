const DEFAULT_ADMIN_EMAIL = "paulo@doutor"
const DEFAULT_ADMIN_PASSWORD = "Drpaulov0"
const DEFAULT_SESSION_TOKEN = "doctor-admin-session"

export const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL
export const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD
export const ADMIN_SESSION_TOKEN = process.env.NEXT_PUBLIC_ADMIN_SESSION_TOKEN || DEFAULT_SESSION_TOKEN
export const ADMIN_SESSION_STORAGE_KEY = "admin-session"

export function isValidAdminCredentials(email: string, password: string) {
  return email === ADMIN_EMAIL && password === ADMIN_PASSWORD
}

export function hasValidAdminSession(token: string | null) {
  return token === ADMIN_SESSION_TOKEN
}

export function persistAdminSession() {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, ADMIN_SESSION_TOKEN)
}

export function clearAdminSession() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY)
}

export function readAdminSession() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)
}
