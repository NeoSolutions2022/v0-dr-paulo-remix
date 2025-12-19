'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, Building2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'

const slugifyName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[^a-zA-Z\\s]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\\s+/g, '.')

type LoginMode = 'paciente' | 'clinica'

export default function UnifiedLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<LoginMode>('paciente')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEmail = (input: string) => input.includes('@')

  const parseBirthDateFromPassword = (pwd: string) => {
    const onlyDigits = pwd.replace(/\D/g, '')
    if (onlyDigits.length !== 8) return null

    const year = onlyDigits.slice(0, 4)
    const month = onlyDigits.slice(4, 6)
    const day = onlyDigits.slice(6, 8)

    if (Number(month) < 1 || Number(month) > 12) return null
    if (Number(day) < 1 || Number(day) > 31) return null

    return `${year}-${month}-${day}`
  }

  const ensurePatientExists = async (payload: {
    userId: string
    email: string
    fullName: string
    birthDate: string | null
  }) => {
    const response = await fetch('/api/patients/ensure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Falha ao sincronizar cadastro do paciente: ${errorText}`)
    }

    return response.json()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      let emailToUse: string

      if (mode === 'paciente') {
        // Login de paciente com Nome Completo como identificador
        if (isEmail(identifier)) {
          emailToUse = identifier.trim()
        } else {
          const nameSlug = slugifyName(identifier)
          if (!nameSlug) {
            throw new Error('Informe o nome completo')
          }
          emailToUse = `${nameSlug}@patients.local`
        }

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        })

        if (signInError) throw signInError

        const userId = data.user.id
        const { data: patient } = await supabase
          .from('patients')
          .select('*')
          .eq('id', userId)
          .maybeSingle()

        if (!patient) {
          const fullNameFromInput = isEmail(identifier) ? identifier.trim() : identifier.trim().toLowerCase()
          const birthDate = parseBirthDateFromPassword(password)

          const syncedPatient = await ensurePatientExists({
            userId,
            email: emailToUse,
            fullName: fullNameFromInput || emailToUse,
            birthDate,
          })

          if (!syncedPatient) {
            await supabase.auth.signOut()
            throw new Error('Não encontramos seu cadastro de paciente')
          }
        }

        router.push('/paciente/dashboard')
      } else {
        // Login de clínica
        emailToUse = identifier.trim()

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        })

        if (signInError) throw signInError

        // Verificar se é usuário da clínica
        const { data: clinicUser, error: clinicError } = await supabase
          .from('clinic_users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (clinicError || !clinicUser) {
          await supabase.auth.signOut()
          throw new Error('Este usuário não tem acesso ao painel da clínica')
        }

        router.push('/clinica/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'paciente' ? 'clinica' : 'paciente')
    setIdentifier('')
    setPassword('')
    setError('')
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl blur-lg opacity-50"></div>
              <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                {mode === 'paciente' ? (
                  <FileText className="w-8 h-8 text-white" />
                ) : (
                  <Building2 className="w-8 h-8 text-white" />
                )}
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {mode === 'paciente' ? 'Acesso do Paciente' : 'Portal da Clínica'}
              </CardTitle>
              <CardDescription>
                {mode === 'paciente'
                  ? 'Use seu nome completo (ou o email gerado) e a data de nascimento sem separadores (AAAAMMDD).'
                  : 'Acesse o sistema de gestão médica'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="identifier">
                      {mode === 'paciente' ? 'Nome completo ou Email' : 'Email'}
                    </Label>
                    <Input
                      id="identifier"
                      type="text"
                      placeholder={
                        mode === 'paciente'
                          ? 'Nome completo ou email@patients.local'
                          : 'seu@email.com'
                      }
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>

                  {/* Toggle Button */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={toggleMode}
                    disabled={loading}
                  >
                    {mode === 'paciente' ? (
                      <>
                        <Building2 className="mr-2 h-4 w-4" />
                        Acessar como Clínica
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Acessar como Paciente
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  {mode === 'paciente'
                    ? 'Seu acesso foi criado pela clínica'
                    : 'Sistema de gestão médica profissional'}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
