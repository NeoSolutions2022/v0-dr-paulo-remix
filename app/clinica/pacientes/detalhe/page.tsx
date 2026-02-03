import { Suspense } from "react"
import { PatientDetailClient } from "../[id]/patient-detail-client"

export default function PatientDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950" />}>
      <PatientDetailClient />
    </Suspense>
  )
}
