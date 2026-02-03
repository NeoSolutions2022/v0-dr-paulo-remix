'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, FileText, Upload, User } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Patient {
  id: string
  full_name: string
  cpf: string
  email: string | null
  birth_date: string | null
  created_at: string
  observations: string | null
}

interface Document {
  id: string
  title: string
  category: string
  created_at: string
  status: string
  views_count: number
}

export function PatientDetailClient() {
  const params = useParams()
  const router = useRouter()
  const patientId = params.id as string

  const [patient, setPatient] = useState<Patient | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPatient() {
      try {
        const supabase = createBrowserClient()

        // Carregar dados do paciente
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .single()

        if (patientError) throw patientError
        setPatient(patientData)

        // Carregar documentos do paciente
        const { data: docsData, error: docsError } = await supabase
          .from('documents')
          .select('id, title, category, created_at, status, views_count')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })

        if (docsError) throw docsError
        setDocuments(docsData || [])

      } catch (error) {
        console.error('[v0] Error loading patient:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPatient()
  }, [patientId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Paciente não encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/clinica/pacientes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Pacientes
        </Button>
        <Button onClick={() => router.push(`/clinica/upload?patient=${patientId}`)}>
          <Upload className="mr-2 h-4 w-4" />
          Enviar Documento
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Nome</p>
              <p className="font-medium">{patient.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">CPF</p>
              <p className="font-medium">{patient.cpf}</p>
            </div>
            {patient.email && (
              <div>
                <p className="text-sm text-gray-500">E-mail</p>
                <p className="font-medium">{patient.email}</p>
              </div>
            )}
            {patient.birth_date && (
              <div>
                <p className="text-sm text-gray-500">Data de Nascimento</p>
                <p className="font-medium">
                  {new Date(patient.birth_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Cadastrado em</p>
              <p className="font-medium">
                {new Date(patient.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Prontuário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="documentos">
              <TabsList>
                <TabsTrigger value="documentos">Documentos ({documents.length})</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="documentos" className="space-y-3">
                {documents.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    Nenhum documento enviado ainda
                  </p>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/clinica/documentos/${doc.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{doc.title}</h4>
                          <p className="text-sm text-gray-600">{doc.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-gray-400">
                            {doc.views_count} visualizações
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="timeline">
                <p className="text-center text-gray-500 py-8">
                  Timeline em desenvolvimento
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
