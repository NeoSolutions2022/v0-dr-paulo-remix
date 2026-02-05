"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { NotificationBell } from "@/components/notification-bell"

export default function PatientHeader() {
  const [patientName, setPatientName] = useState("Paciente")
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadPatient = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setPatientName("Paciente")
        setUserId(null)
        return
      }

      setUserId(user.id)

      const { data: patient } = await supabase
        .from("patients")
        .select("full_name")
        .eq("id", user.id)
        .single()

      if (patient?.full_name) {
        setPatientName(patient.full_name.split(" ")[0])
      } else {
        setPatientName(user.email?.split("@")[0] || "Paciente")
      }
    }

    loadPatient()
  }, [supabase])

  return (
    <header className="w-full h-16 border-b bg-white dark:bg-slate-900 px-6 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Bem-vindo(a), {patientName}
      </h2>

      <div className="flex items-center gap-3">
        {userId && <NotificationBell userId={userId} />}

        <div className="flex items-center gap-2 pl-3 border-l">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            {patientName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  )
}
