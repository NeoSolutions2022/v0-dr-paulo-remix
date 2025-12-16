'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, Copy, Check, ArrowLeft } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function NovoPatientePage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [customPassword, setCustomPassword] = useState('')
  const [autoPassword, setAutoPassword] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [credentials, setCredentials] = useState<{ cpf: string; password: string } | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/clinica/pacientes/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          cpf,
          email,
          phone,
          birthDate,
          password: autoPassword ? null : customPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar paciente')
      }

      setCredentials(data.credentials)
      setSuccess(true)
    } catch (err: any) {
      console.error('[v0] Error:', err)
      setError(err.message || 'Erro ao criar paciente')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyPassword = () => {
    if (credentials) {
      navigator.clipboard.writeText(credentials.password)
      setCopiedPassword(true)
      setTimeout(() => setCopiedPassword(false), 2000)
    }
  }

  if (success && credentials) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/clinica/pacientes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Pacientes
        </Button>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-center text-2xl">
              Paciente criado com sucesso!
            </CardTitle>
            <CardDescription className="text-center">
              Envie as credenciais abaixo ao paciente por um canal seguro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>CPF (Login):</strong> {credentials.cpf}</p>
                  <div className="flex items-center gap-2">
                    <p className="flex-1">
                      <strong>Senha:</strong>{' '}
                      <code className="bg-gray-100 px-2 py-1 rounded">
                        {credentials.password}
                      </code>
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyPassword}
                    >
                      {copiedPassword ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <p className="text-sm text-gray-600">
              O paciente deverá trocar a senha no primeiro acesso ao portal.
            </p>

            <div className="flex gap-2">
              <Button onClick={() => router.push('/clinica/pacientes')}>
                Ver todos os pacientes
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSuccess(false)
                  setCredentials(null)
                  setName('')
                  setCpf('')
                  setEmail('')
                  setPhone('')
                  setBirthDate('')
                  setCustomPassword('')
                }}
              >
                Criar outro paciente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push('/clinica/pacientes')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Pacientes
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-center text-2xl">
            Criar Novo Paciente
          </CardTitle>
          <CardDescription className="text-center">
            Preencha os dados do paciente para criar seu acesso ao portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do paciente"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF * (usado para login)</Label>
                <Input
                  id="cpf"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  required
                  maxLength={14}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (opcional)</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento (opcional)</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="autoPassword"
                  checked={autoPassword}
                  onChange={(e) => setAutoPassword(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="autoPassword" className="cursor-pointer">
                  Gerar senha automaticamente (recomendado)
                </Label>
              </div>

              {!autoPassword && (
                <div className="space-y-2">
                  <Label htmlFor="customPassword">Senha personalizada</Label>
                  <Input
                    id="customPassword"
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Criando paciente...' : 'Criar Paciente'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
