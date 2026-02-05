import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Stethoscope, ShieldCheck } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
        <header className="flex flex-col gap-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
            <FileText className="h-8 w-8" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-700/80 dark:text-blue-200">
            Plataforma Dr. Paulo
          </p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 sm:text-4xl md:text-5xl">
            Seja bem-vindo!
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-300 md:text-lg">
            Relatórios detalhados dos atendimentos do Dr. Paulo, organizados de forma clara para
            pacientes e para a equipe médica. Tenha acesso rápido ao histórico clínico e aos documentos
            assinados da sua consulta.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="border-0 bg-white/80 shadow-lg shadow-blue-100/40 backdrop-blur dark:bg-slate-900/80">
            <CardContent className="flex h-full flex-col gap-6 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Sou paciente</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Veja seus relatórios, documentos e histórico clínico.
                  </p>
                </div>
              </div>
              <Button asChild size="lg" className="h-14 text-base font-semibold">
                <Link href="/auth/login">Entrar como paciente</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/80 shadow-lg shadow-blue-100/40 backdrop-blur dark:bg-slate-900/80">
            <CardContent className="flex h-full flex-col gap-6 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Sou o Dr. Paulo</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Acesse o painel médico e gerencie seus pacientes.
                  </p>
                </div>
              </div>
              <Button asChild size="lg" variant="secondary" className="h-14 text-base font-semibold">
                <Link href="/admin/login">Entrar como doutor</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 rounded-2xl border border-blue-100 bg-white/70 p-6 text-center shadow-sm dark:border-blue-900/40 dark:bg-slate-900/70 md:text-left">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            O que você encontra aqui
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Relatórios claros</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Resumos e documentos organizados para facilitar o acompanhamento.
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Acesso seguro</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Portal privado para pacientes e painel administrativo para o médico.
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Histórico completo</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Tudo sobre seus atendimentos do Dr. Paulo em um só lugar.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
