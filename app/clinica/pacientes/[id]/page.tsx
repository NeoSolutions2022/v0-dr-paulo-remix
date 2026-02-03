import { PatientDetailClient } from "./patient-detail-client"

export function generateStaticParams() {
  return []
}

export const dynamicParams = false

export default function PatientDetailPage() {
  return <PatientDetailClient />
}
