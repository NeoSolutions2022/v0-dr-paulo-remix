"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Mail, Calendar, Shield, Key } from 'lucide-react'

interface PatientProfile {
  id: string
  full_name: string | null
  cpf: string | null
  birth_date: string | null
  created_at?: string | null
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [emailConfirmedAt, setEmailConfirmedAt] = useState<string | null>(null)
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null)
  const [patient, setPatient] = useState<PatientProfile | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/auth/login")
        return
      }

      setUserEmail(user.email ?? null)
      setUserId(user.id)
      setEmailConfirmedAt(user.email_confirmed_at ?? null)
      setUserCreatedAt(user.created_at ?? null)

      const { data: patientData } = await supabase
        .from("patients")
        .select("id, full_name, cpf, birth_date, created_at")
        .eq("id", user.id)
        .single()

      setPatient(patientData || null)
    }

    loadProfile()
  }, [router])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Configurações
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Gerencie suas informações pessoais e preferências
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Seus dados cadastrados no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome Completo
                </Label>
                <Input
                  id="name"
                  defaultValue={patient?.full_name ?? ""}
                  readOnly
                  className="bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={userEmail ?? ""}
                  readOnly
                  className="bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cpf" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  CPF
                </Label>
                <Input
                  id="cpf"
                  defaultValue={patient?.cpf || "Não informado"}
                  readOnly
                  className="bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="birth_date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data de Nascimento
                </Label>
                <Input
                  id="birth_date"
                  defaultValue={
                    patient?.birth_date
                      ? new Date(patient.birth_date).toLocaleDateString("pt-BR")
                      : "Não informado"
                  }
                  readOnly
                  className="bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Para alterar suas informações, entre em contato com a clínica.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>
                Gerencie a segurança da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      Senha
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      ••••••••
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Alterar Senha
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      Email Verificado
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                  {emailConfirmedAt
                        ? "Seu email está verificado"
                        : "Aguardando verificação"}
                    </p>
                  </div>
                </div>
                {emailConfirmedAt && (
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Avatar Card */}
          <Card>
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {patient?.full_name?.charAt(0).toUpperCase() || "P"}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {patient?.full_name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {userEmail}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Membro desde
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {new Date(patient?.created_at || userCreatedAt || Date.now()).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    ID do Paciente
                  </p>
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                    {userId ? `${userId.substring(0, 16)}...` : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
