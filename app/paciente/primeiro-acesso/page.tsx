"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Lock, ArrowRight } from 'lucide-react';

export default function FirstAccessPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);
    })();
  }, [router, supabase.auth]);

  const handleSavePassword = async () => {
    setError(null);

    if (!newPassword || newPassword.length < 6) {
      setError("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { error: authErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (authErr) throw authErr;

      const { error: dbErr } = await supabase
        .from("patients")
        .update({ first_access: false })
        .eq("id", userId);

      if (dbErr) throw dbErr;

      router.push("/paciente/documentos");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao atualizar senha.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("patients")
        .update({ first_access: false })
        .eq("id", user.id);

      if (error) throw error;

      router.push("/paciente/documentos");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao pular etapa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <div className="max-w-xl w-full">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Recomendamos que você personalize sua senha
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Para proteger seus exames e manter seu acesso seguro, você pode criar uma nova senha agora mesmo.
              Isso é opcional, mas recomendado.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <strong>Você pode:</strong>
                <br />
                • Criar uma nova senha personalizada (recomendado)
                <br />
                • Ou continuar com a senha atual e trocar mais tarde
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite sua nova senha (mínimo 6 caracteres)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme a nova senha"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleSavePassword}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? "Salvando..." : "Salvar nova senha"}
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={loading}
                  className="w-full"
                >
                  Agora não, continuar para meu portal
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
