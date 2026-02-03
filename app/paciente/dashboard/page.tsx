"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function PacienteDashboard() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/paciente/documentos")
  }, [router])

  return null
}
