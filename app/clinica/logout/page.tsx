'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'

export default function ClinicLogoutPage() {
  const router = useRouter()

  useEffect(() => {
    async function logout() {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
      router.push('/login')
    }
    logout()
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Saindo...</p>
    </div>
  )
}
