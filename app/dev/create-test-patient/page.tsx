'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Loader2, Copy } from 'lucide-react'

export default function CreateTestPatientPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<any>(null)

  const createTestPatient = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/create-test-patient', {
        method: 'POST',
      })

      const data = await response.json()
      console.log('[v0] Resposta da API:', data)
      setResult(data)
    } catch (error) {
      console.error('[v0] Erro:', error)
      setResult({ error: 'Erro ao criar paciente de teste' })
    } finally {
      setLoading(false)
    }
  }

  const checkPatient = async () => {
    setChecking(true)
    setCheckResult(null)

    try {
      const response = await fetch('/api/check-test-patient')
      const data = await response.json()
      console.log('[v0] Verificação do paciente:', data)
      setCheckResult(data)
    } catch (error) {
      console.error('[v0] Erro na verificação:', error)
      setCheckResult({ error: 'Erro ao verificar paciente' })
    } finally {
      setChecking(false)
    }
  }

  const copyCredentials = () => {
    if (result?.credentials) {
      const text = `CPF: ${result.credentials.cpf}\nSenha: ${result.credentials.password}`
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Criar Paciente de Teste</h1>
          <p className="text-muted-foreground mt-2">
            Crie um paciente de teste com documentos e notificações para testar o sistema
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Paciente de Teste</CardTitle>
            <CardDescription>
              Clique no botão abaixo para criar um paciente de teste completo com documentos e
              notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={checkPatient} disabled={checking} variant="outline" className="flex-1">
                {checking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar se Existe'
                )}
              </Button>
              <Button onClick={createTestPatient} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Paciente'
                )}
              </Button>
            </div>

            {checkResult && (
              <Alert className={checkResult.exists ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"}>
                <AlertDescription>
                  {checkResult.exists ? (
                    <div className="space-y-2">
                      <p className="font-semibold text-blue-800 dark:text-blue-200">✓ Paciente já existe no banco!</p>
                      <div className="bg-background rounded p-2 text-sm space-y-1">
                        <p><strong>CPF:</strong> 12345678900</p>
                        <p><strong>Senha:</strong> Teste@123</p>
                        <p><strong>Email Auth:</strong> {checkResult.authEmail}</p>
                      </div>
                      {checkResult.documentCount !== undefined && (
                        <p className="text-sm">Documentos: {checkResult.documentCount}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-yellow-800 dark:text-yellow-200">Paciente ainda não foi criado. Clique em "Criar Paciente".</p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {result?.success && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <div className="space-y-3">
                    <p className="font-semibold">{result.message}</p>
                    <div className="bg-background rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">CPF (para login)</p>
                          <p className="text-lg font-mono">{result.credentials.cpf}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Senha</p>
                        <p className="text-lg font-mono">{result.credentials.password}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyCredentials}
                        className="w-full"
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar Credenciais
                          </>
                        )}
                      </Button>
                    </div>
                    {result.note && (
                      <p className="text-sm italic">{result.note}</p>
                    )}
                    <div className="text-sm space-y-1">
                      <p>✓ 4 documentos criados</p>
                      <p>✓ 2 notificações criadas</p>
                      <p>✓ Perfil completo configurado</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {result?.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">{result.error}</p>
                    {result.details && (
                      <pre className="text-xs bg-background p-2 rounded overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="bg-muted rounded-lg p-6 space-y-4">
          <h3 className="font-semibold">Informações do Paciente de Teste</h3>
          <div className="grid gap-3 text-sm">
            <div>
              <span className="font-medium">Nome:</span> Maria Silva Santos
            </div>
            <div>
              <span className="font-medium">Data de Nascimento:</span> 15/03/1985
            </div>
            <div>
              <span className="font-medium">Telefone:</span> (11) 98765-4321
            </div>
            <div>
              <span className="font-medium">Email:</span> maria.silva@email.com
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Documentos que serão criados:</h4>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Hemograma Completo (Exame)</li>
              <li>Ultrassom Abdominal (Imagem)</li>
              <li>Prescrição Médica - Dr. João Silva (Receita)</li>
              <li>Relatório de Consulta Cardiológica (Laudo)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
