"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from 'next/navigation';
import { useState } from "react";
import { FileText } from 'lucide-react';
import { redirect } from 'next/navigation'

export default function Page() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const isEmail = (input: string) => {
    return input.includes("@");
  };

  const formatCpf = (cpfRaw: string) => cpfRaw.replace(/\D/g, "");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      let emailToUse: string;
      
      if (isEmail(identifier)) {
        // User entered email directly
        emailToUse = identifier.trim();
        console.log("[v0] Login com email:", emailToUse);
      } else {
        // User entered CPF, convert to email format
        const cpfOnly = formatCpf(identifier);
        
        if (cpfOnly.length !== 11) {
          throw new Error("CPF deve conter 11 dígitos");
        }
        
        emailToUse = `${cpfOnly}@patients.local`;
        console.log("[v0] CPF convertido para email:", emailToUse);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) throw error;

      console.log("[v0] Login bem-sucedido, redirecionando...");
      router.push("/paciente/dashboard");
    } catch (error: unknown) {
      console.error("[v0] Erro no login:", error);
      setError(error instanceof Error ? error.message : "Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex justify-center mb-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl blur-lg opacity-50"></div>
              <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Acesso do Paciente</CardTitle>
              <CardDescription>
                Entre com seu CPF ou email e senha para acessar seus documentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="identifier">CPF ou Email</Label>
                    <Input
                      id="identifier"
                      type="text"
                      placeholder="000.000.000-00 ou email@exemplo.com"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
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
                    />
                  </div>
                  {error && (
                    <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Ou
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/auth/sign-up')}
                  >
                    Criar Nova Conta
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  Seu acesso foi criado pela clínica
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function PatientLoginPage() {
  redirect('/login')
}
