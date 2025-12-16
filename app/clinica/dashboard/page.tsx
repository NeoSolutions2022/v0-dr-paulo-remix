'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, TrendingUp, Activity } from 'lucide-react'

interface Stats {
  totalPatients: number
  activePatients: number
  totalDocuments: number
  documentsThisMonth: number
  newPatientsThisMonth: number
  documentViews: number
}

export default function ClinicDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    activePatients: 0,
    totalDocuments: 0,
    documentsThisMonth: 0,
    newPatientsThisMonth: 0,
    documentViews: 0,
  })
  const [loading, setLoading] = useState(true)
  const [clinicId, setClinicId] = useState<string | null>(null)

  useEffect(() => {
    async function loadStats() {
      try {
        const supabase = createBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        // Buscar clinic_id do usuário
        const { data: clinicUser } = await supabase
          .from('clinic_users')
          .select('clinic_id')
          .eq('id', user.id)
          .single()

        if (!clinicUser) return

        setClinicId(clinicUser.clinic_id)

        // Total de pacientes
        const { count: totalPatients } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', clinicUser.clinic_id)

        // Total de documentos
        const { count: totalDocuments } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', clinicUser.clinic_id)

        // Documentos deste mês
        const firstDayOfMonth = new Date()
        firstDayOfMonth.setDate(1)
        firstDayOfMonth.setHours(0, 0, 0, 0)

        const { count: documentsThisMonth } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', clinicUser.clinic_id)
          .gte('created_at', firstDayOfMonth.toISOString())

        // Novos pacientes deste mês
        const { count: newPatientsThisMonth } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', clinicUser.clinic_id)
          .gte('created_at', firstDayOfMonth.toISOString())

        // Visualizações totais
        const { data: documents } = await supabase
          .from('documents')
          .select('views_count')
          .eq('clinic_id', clinicUser.clinic_id)

        const documentViews = documents?.reduce((sum, doc) => sum + (doc.views_count || 0), 0) || 0

        setStats({
          totalPatients: totalPatients || 0,
          activePatients: totalPatients || 0,
          totalDocuments: totalDocuments || 0,
          documentsThisMonth: documentsThisMonth || 0,
          newPatientsThisMonth: newPatientsThisMonth || 0,
          documentViews,
        })
      } catch (error) {
        console.error('[v0] Error loading stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const cards = [
    {
      title: 'Pacientes Ativos',
      value: stats.activePatients,
      icon: Users,
      subtitle: `${stats.newPatientsThisMonth} novos este mês`,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Documentos Enviados',
      value: stats.totalDocuments,
      icon: FileText,
      subtitle: `${stats.documentsThisMonth} este mês`,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Visualizações Totais',
      value: stats.documentViews,
      icon: TrendingUp,
      subtitle: 'Total de acessos',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Taxa de Acesso',
      value: stats.totalDocuments > 0 
        ? `${Math.round((stats.documentViews / stats.totalDocuments) * 100)}%`
        : '0%',
      icon: Activity,
      subtitle: 'Média por documento',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Visão geral do sistema</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Últimos Pacientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Lista de pacientes será exibida aqui
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Lista de documentos será exibida aqui
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
