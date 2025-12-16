'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Patient {
  id: string
  full_name: string
  cpf: string
  phone: string | null
  created_at: string
}

export default function ClinicPatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadPatients() {
      try {
        const supabase = createBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        const { data: clinicUser } = await supabase
          .from('clinic_users')
          .select('clinic_id')
          .eq('id', user.id)
          .single()

        if (!clinicUser) return

        const { data, error } = await supabase
          .from('patients')
          .select('id, full_name, cpf, phone, created_at')
          .eq('clinic_id', clinicUser.clinic_id)
          .order('created_at', { ascending: false })

        if (error) throw error

        setPatients(data || [])
      } catch (error) {
        console.error('[v0] Error loading patients:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPatients()
  }, [])

  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(search.toLowerCase()) ||
    patient.cpf.includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pacientes</h1>
          <p className="text-gray-600">Gerenciar pacientes da clínica</p>
        </div>
        <Button onClick={() => router.push('/clinica/pacientes/novo')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Paciente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500">Carregando...</p>
          ) : filteredPatients.length === 0 ? (
            <p className="text-center text-gray-500">Nenhum paciente encontrado</p>
          ) : (
            <div className="space-y-2">
              {filteredPatients.map((patient) => (
                <Link
                  key={patient.id}
                  href={`/clinica/pacientes/${patient.id}`}
                  className="block p-4 rounded-lg border hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{patient.full_name}</h3>
                      <p className="text-sm text-gray-600">CPF: {patient.cpf}</p>
                      {patient.phone && (
                        <p className="text-sm text-gray-600">Tel: {patient.phone}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(patient.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
