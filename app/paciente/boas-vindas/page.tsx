import Link from "next/link";
import { redirect } from 'next/navigation';
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Shield, TrendingUp, FileCheck } from 'lucide-react';

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("name, first_access")
    .eq("id", user.id)
    .single();

  if (!patient) {
    redirect("/paciente/documentos");
  }

  if (!patient.first_access) {
    redirect("/paciente/documentos");
  }

  const firstName = (patient.name || "Paciente").split(" ")[0];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <div className="max-w-3xl w-full">
        <Card className="shadow-2xl">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Bem-vindo(a), {firstName}!
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950/30 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-bold text-lg mb-3 text-blue-900 dark:text-blue-100">
                NOSSO COMPROMISSO COM VOCÊ
              </h3>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Na Clínica de Urologia de Excelência, nosso compromisso é com o seu
                bem-estar. Este relatório foi criado para fornecer uma visão clara e
                compreensível do seu tratamento e evolução, reforçando a importância
                de um acompanhamento contínuo e personalizado.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <div className="flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Seu histórico é único</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Analisamos cada detalhe do seu prontuário para oferecer um plano de tratamento individualizado.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <div className="flex-shrink-0">
                  <FileCheck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Comunicação clara</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Transformamos dados complexos em informações acessíveis.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <div className="flex-shrink-0">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Segurança e privacidade</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Seus registros são protegidos com assinatura digital e criptografia.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <div className="flex-shrink-0">
                  <Heart className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Foco no bem-estar</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Nosso objetivo é sua qualidade de vida e longevidade.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Link href="/paciente/primeiro-acesso" className="flex-1">
                <Button className="w-full" size="lg">
                  Continuar
                </Button>
              </Link>

              <Link href="/paciente/documentos" className="flex-1">
                <Button variant="outline" className="w-full" size="lg">
                  Ir para o meu portal
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
