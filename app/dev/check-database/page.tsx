'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function CheckDatabasePage() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)

  const checkDatabase = async () => {
    setLoading(true)
    setStatus(null)

    try {
      const supabase = createClient()

      // Verificar tabelas
      const checks = {
        patients: false,
        documents: false,
        notifications: false,
        testPatient: false,
      }

      // Tentar query em patients
      const { error: patientsError } = await supabase.from('patients').select('count').limit(1)
      checks.patients = !patientsError

      // Tentar query em documents
      const { error: documentsError } = await supabase.from('documents').select('count').limit(1)
      checks.documents = !documentsError

      // Tentar query em notifications
      const { error: notificationsError } = await supabase
        .from('notifications')
        .select('count')
        .limit(1)
      checks.notifications = !notificationsError

      // Verificar se paciente de teste existe
      const { data: testPatient } = await supabase
        .from('patients')
        .select('*')
        .eq('cpf', '12345678900')
        .single()

      checks.testPatient = !!testPatient

      setStatus({
        checks,
        testPatient,
        errors: {
          patients: patientsError?.message,
          documents: documentsError?.message,
          notifications: notificationsError?.message,
        },
      })
    } catch (error) {
      setStatus({ error: 'Erro ao verificar banco de dados' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkDatabase()
  }, [])

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Verificar Banco de Dados</h1>
          <p className="text-muted-foreground mt-2">
            Status das tabelas e do paciente de teste
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Status do Banco de Dados</CardTitle>
            <CardDescription>Verificação automática das tabelas necessárias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={checkDatabase} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Novamente'
              )}
            </Button>

            {status?.checks && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {status.checks.patients ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span>Tabela patients</span>
                </div>
                <div className="flex items-center gap-2">
                  {status.checks.documents ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span>Tabela documents</span>
                </div>
                <div className="flex items-center gap-2">
                  {status.checks.notifications ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span>Tabela notifications</span>
                </div>
                <div className="flex items-center gap-2">
                  {status.checks.testPatient ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span>Paciente de teste (CPF: 12345678900)</span>
                </div>
              </div>
            )}

            {status?.testPatient && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">Paciente de teste encontrado!</p>
                    <div className="text-sm space-y-1">
                      <p>Nome: {status.testPatient.full_name}</p>
                      <p>CPF: {status.testPatient.cpf}</p>
                      <p>Email: {status.testPatient.email}</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {status?.errors && Object.values(status.errors).some(Boolean) && (
              <Alert variant="destructive">
                <AlertDescription>
                  <p className="font-semibold mb-2">Erros encontrados:</p>
                  <div className="text-sm space-y-1">
                    {status.errors.patients && <p>Patients: {status.errors.patients}</p>}
                    {status.errors.documents && <p>Documents: {status.errors.documents}</p>}
                    {status.errors.notifications && (
                      <p>Notifications: {status.errors.notifications}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="bg-muted rounded-lg p-6 space-y-4">
          <h3 className="font-semibold">Próximos passos:</h3>
          <ol className="text-sm space-y-2 list-decimal list-inside">
            <li>Se as tabelas não existem, execute o script SQL no Supabase Dashboard</li>
            <li>
              Se o paciente de teste não existe, vá para{' '}
              <a href="/dev/create-test-patient" className="text-blue-600 underline">
                /dev/create-test-patient
              </a>
            </li>
            <li>
              Depois de criar, faça login com CPF: <strong>12345678900</strong> e senha:{' '}
              <strong>Teste@123</strong>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
