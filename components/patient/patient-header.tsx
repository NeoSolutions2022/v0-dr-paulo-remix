import { createClient } from "@/lib/supabase/server"
import { User } from 'lucide-react'
import { NotificationBell } from "@/components/notification-bell"

export default async function PatientHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let patientName = "Paciente"

  if (user) {
    const { data: patient } = await supabase
      .from("patients")
      .select("name")
      .eq("id", user.id)
      .single()

    if (patient?.name) {
      patientName = patient.name.split(" ")[0]
    }
  }

  return (
    <header className="w-full h-16 border-b bg-white dark:bg-slate-900 px-6 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Bem-vindo(a), {patientName}
      </h2>

      <div className="flex items-center gap-3">
        {user && <NotificationBell userId={user.id} />}

        <div className="flex items-center gap-2 pl-3 border-l">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            {patientName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  )
}
