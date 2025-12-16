import { ClinicSidebar } from '@/components/clinic/clinic-sidebar'
import { ClinicHeader } from '@/components/clinic/clinic-header'

export default function ClinicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <ClinicSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ClinicHeader />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
