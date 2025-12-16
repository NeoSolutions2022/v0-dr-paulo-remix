import { redirect } from 'next/navigation';
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Bell, Eye, QrCode } from 'lucide-react';
import Link from "next/link";

export default async function PacienteDashboard() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: patient } = await supabase
    .from("patients")
    .select("name")
    .eq("id", user.id)
    .single();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("patient_id", user.id)
    .eq("seen", false)
    .order("created_at", { ascending: false })
    .limit(3);

  const totalDocuments = documents?.length || 0;
  const lastDocument = documents?.[0];

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Olá, {patient?.name?.split(" ")[0] || "Paciente"}
        </h1>

        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Aqui está um resumo da sua saúde digital.
        </p>
      </div>

      {/* ATALHOS */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total de Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalDocuments}</div>
            <p className="text-xs text-muted-foreground">Gerados pela sua clínica</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notificações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{notifications?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Novas atualizações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Último Documento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold line-clamp-1">
              {lastDocument ? lastDocument.file_name : "Nenhum documento"}
            </div>
            {lastDocument && (
              <Link href={`/paciente/documentos/${lastDocument.id}`}>
                <Button className="mt-3" size="sm">
                  Abrir
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DOCUMENTOS RECENTES */}
      <Card>
        <CardHeader>
          <CardTitle>Exames Recentes</CardTitle>
          <CardDescription>Suas últimas análises e documentos médicos</CardDescription>
        </CardHeader>

        <CardContent>
          {documents?.length === 0 && (
            <div className="py-10 text-center text-slate-500">
              Nenhum documento encontrado.
            </div>
          )}

          {documents && documents.length > 0 && (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{doc.file_name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <Link href={`/paciente/documentos/${doc.id}`}>
                    <Button variant="outline" size="sm">
                      Ver
                    </Button>
                  </Link>
                </div>
              ))}

              <Button variant="outline" asChild className="w-full mt-4">
                <Link href="/paciente/documentos">
                  Ver todos os documentos
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* NOTIFICAÇÕES */}
      {notifications && notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Notificações Recentes</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DOWNLOAD COMPLETO */}
      <Card>
        <CardHeader>
          <CardTitle>Baixar Histórico Completo</CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Você pode baixar todo o seu histórico em um único arquivo ZIP.
          </p>

          <Button className="mt-4" disabled={totalDocuments === 0}>
            <Download className="h-4 w-4 mr-2" />
            Baixar ZIP Completo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
