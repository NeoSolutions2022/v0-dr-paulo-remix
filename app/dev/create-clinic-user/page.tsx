'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Check, Copy } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function CreateClinicUserPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/dev/create-clinic-user', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar usuário')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar Usuário Admin da Clínica</CardTitle>
          <CardDescription>
            Para desenvolvimento e testes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result && (
            <Button 
              onClick={handleCreate} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Criando...' : 'Criar Usuário Admin'}
            </Button>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-4">
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  {result.message}
                </AlertDescription>
              </Alert>

              <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold">Credenciais:</h3>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm">
                      <strong>Email:</strong> {result.credentials.email}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(result.credentials.email)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm">
                      <strong>Senha:</strong> {result.credentials.password}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(result.credentials.password)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => window.location.href = '/login'}
                className="w-full"
              >
                Ir para Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
