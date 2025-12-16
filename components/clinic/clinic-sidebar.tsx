'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, Upload, BarChart3, Settings, LogOut, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/clinica/dashboard', icon: LayoutDashboard },
  { name: 'Pacientes', href: '/clinica/pacientes', icon: Users },
  { name: 'Documentos', href: '/clinica/documentos', icon: FileText },
  { name: 'Upload', href: '/clinica/upload', icon: Upload },
  { name: 'Estatísticas', href: '/clinica/estatisticas', icon: BarChart3 },
  { name: 'Auditoria', href: '/clinica/auditoria', icon: Activity },
  { name: 'Configurações', href: '/clinica/configuracoes', icon: Settings },
]

export function ClinicSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r">
      <div className="flex h-16 items-center justify-center border-b px-6">
        <h1 className="text-xl font-bold text-blue-600">Clínica Saúde</h1>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-4">
        <Link
          href="/clinica/logout"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </Link>
      </div>
    </div>
  )
}
