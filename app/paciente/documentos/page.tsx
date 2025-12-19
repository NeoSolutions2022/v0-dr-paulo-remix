import { redirect } from 'next/navigation';
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, Eye, Calendar, Filter } from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic"

export default async function DocumentListPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("id, file_name, created_at, category")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })

  if (documentsError) {
    console.error("Erro ao buscar documentos do paciente", documentsError)
  }

  // Group by category
  const categories = ['Todos', 'Exame', 'Laudo', 'Atestado', 'Receita', 'Relatório'];
  
  const getDocumentsByCategory = (category: string) => {
    if (category === 'Todos') return documents || [];
    return documents?.filter(doc => doc.category === category) || [];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Meus Documentos
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Todos os seus documentos médicos organizados por categoria
        </p>
      </div>

      <Tabs defaultValue="Todos" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="text-xs">
              {cat}
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {getDocumentsByCategory(cat).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  {category === 'Todos' ? 'Todos os Documentos' : category + 's'}
                </CardTitle>
              </CardHeader>

              <CardContent>
                {getDocumentsByCategory(category).length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      Nenhum documento encontrado nesta categoria.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getDocumentsByCategory(category).map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {doc.file_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                              </p>
                              {doc.category && (
                                <Badge variant="outline" className="text-xs">
                                  {doc.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/paciente/documentos/${doc.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
