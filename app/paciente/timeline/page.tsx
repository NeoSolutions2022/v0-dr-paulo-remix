import { redirect } from 'next/navigation';
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Eye } from 'lucide-react';
import Link from "next/link";

export default async function TimelinePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false });

  // Group by year
  const documentsByYear = documents?.reduce((acc: any, doc) => {
    const year = new Date(doc.created_at).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(doc);
    return acc;
  }, {});

  const years = Object.keys(documentsByYear || {}).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Linha do Tempo da Saúde
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Histórico completo dos seus documentos médicos organizados por data
        </p>
      </div>

      {years.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              Nenhum documento encontrado
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {years.map((year) => (
            <Card key={year}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {year}
                </CardTitle>
                <CardDescription>
                  {documentsByYear[year].length} documento(s) neste ano
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documentsByYear[year].map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {doc.file_name}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                              {new Date(doc.created_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                            {doc.category && (
                              <Badge variant="secondary" className="mt-2">
                                {doc.category}
                              </Badge>
                            )}
                          </div>
                          
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/paciente/documentos/${doc.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
