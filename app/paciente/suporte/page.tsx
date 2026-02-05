"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function PacienteSuporte() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/paciente/documentos")
  }, [router])

  return null
}
