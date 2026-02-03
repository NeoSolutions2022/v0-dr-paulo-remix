'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, LogIn, Loader2 } from 'lucide-react'

function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const response = await fetch('/api/admin/session')
      if (response.ok) {
        router.push(searchParams.get('redirectTo') || '/')
      }
    }

    checkSession()
  }, [router, searchParams])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Falha ao autenticar')
      }

      router.push(searchParams.get('redirectTo') || '/')
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-100 p-6 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-900">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Painel do Doutor</CardTitle>
          <CardDescription>Entre com as credenciais administrativas</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="paulo@doutor"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Drpaulov0"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" /> Acessar painel
                </>
              )}
            </Button>

            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-semibold text-blue-900">
              É paciente?{' '}
              <Link href="/login" className="underline underline-offset-4">
                Clique aqui para acessar painel do paciente
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminLoginPageWithSuspense() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <AdminLoginPage />
    </Suspense>
  )
}
