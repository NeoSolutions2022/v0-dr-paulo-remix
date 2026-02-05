import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Stethoscope, ShieldCheck } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#EEF2FF,_#F8FAFC_60%)] dark:bg-gradient-to-br dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-16 pt-24">
        <section className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <header className="flex flex-col gap-4 text-left">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600/90 dark:bg-blue-500/20 dark:text-blue-200">
              <FileText className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700/80 dark:text-blue-200">
              Plataforma Dr. Paulo
            </p>
            <h1 className="font-[var(--font-display)] text-[52px] font-semibold leading-[1.05] text-[#0F172A] dark:text-slate-100">
              Seja bem-vindo!
            </h1>
            <p className="max-w-[560px] text-base leading-relaxed text-slate-600 dark:text-slate-300 md:text-lg">
              Relatórios detalhados dos atendimentos do Dr. Paulo, organizados de forma clara para
              pacientes e para a equipe médica. Tenha acesso rápido ao histórico clínico e aos documentos
              assinados da sua consulta.
            </p>
          </header>

          <div className="flex flex-col gap-8">
            <Card
              className="group fade-up rounded-2xl border border-[#C7D2FE] bg-[linear-gradient(180deg,_#EEF2FF_0%,_#FFFFFF_100%)] shadow-[0_20px_40px_rgba(59,130,246,0.12)] backdrop-blur transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(79,70,229,0.3)] dark:border-indigo-500/30 dark:bg-slate-900/80"
              style={{ animationDelay: '0ms' }}
            >
              <CardContent className="flex h-full flex-col gap-6 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600/90 dark:bg-indigo-500/20 dark:text-indigo-200">
                    <Stethoscope className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-[var(--font-display)] text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Sou o Dr. Paulo
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      Acesse o painel médico e gerencie seus pacientes.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                    Área médica
                  </span>
                  <Button
                    asChild
                    size="lg"
                    className="h-14 bg-[linear-gradient(135deg,_#2563EB,_#4F46E5)] text-base font-semibold text-white shadow-[0_10px_25px_rgba(79,70,229,0.35)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(79,70,229,0.45)]"
                  >
                    <Link href="/admin/login">Entrar como doutor</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card
              className="group fade-up rounded-2xl border border-[#E5E7EB] bg-white/70 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900/80"
              style={{ animationDelay: '80ms' }}
            >
              <CardContent className="flex h-full flex-col gap-6 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600/90 dark:bg-blue-500/20 dark:text-blue-200">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-[var(--font-display)] text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Sou paciente
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      Veja seus relatórios, documentos e histórico clínico.
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 border-slate-300 text-base font-semibold text-slate-700 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <Link href="/auth/login">Entrar como paciente</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          🔒 Ambiente seguro e confidencial para pacientes e equipe médica
        </p>

        <section className="grid gap-4 rounded-2xl border border-[#E5E7EB] bg-slate-100 p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/70 md:text-left">
          <h3 className="font-[var(--font-display)] text-lg font-semibold text-slate-900 dark:text-slate-100">
            O que você encontra aqui
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Relatórios claros</p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Resumos e documentos organizados para facilitar o acompanhamento.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Acesso seguro</p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Portal privado para pacientes e painel administrativo para o médico.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Histórico completo</p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Tudo sobre seus atendimentos do Dr. Paulo em um só lugar.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
