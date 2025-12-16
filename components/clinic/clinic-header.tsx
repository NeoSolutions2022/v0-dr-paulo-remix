'use client'

import { Bell, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function ClinicHeader() {
  const router = useRouter()
  const [userName, setUserName] = useState('Usuário')

  useEffect(() => {
    async function loadUser() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: clinicUser } = await supabase
          .from('clinic_users')
          .select('name, role')
          .eq('id', user.id)
          .single()

        if (clinicUser) {
          setUserName(clinicUser.name)
        }
      }
    }
    loadUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold">Bem-vindo, {userName}</h2>
        <p className="text-sm text-gray-500">Sistema de Gestão Médica</p>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/clinica/perfil')}>
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/clinica/configuracoes')}>
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
