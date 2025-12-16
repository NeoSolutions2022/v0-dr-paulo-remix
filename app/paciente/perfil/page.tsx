"use client"

import { useState, useEffect } from 'react';
import { createClient } from "@/lib/supabase/client";
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Mail, Phone, Calendar, Shield, Save, Lock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function PerfilPage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    lgpd_consent: false,
    notification_email: true,
  });

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/auth/login');
        return;
      }

      setUser(authUser);

      const { data: patientData } = await supabase
        .from("patients")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (patientData) {
        setPatient(patientData);
        setFormData({
          name: patientData.name || '',
          phone: patientData.phone || '',
          email: patientData.email || authUser.email || '',
          lgpd_consent: patientData.lgpd_consent || false,
          notification_email: patientData.notification_preferences?.email ?? true,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("patients")
        .update({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          lgpd_consent: formData.lgpd_consent,
          lgpd_consent_date: formData.lgpd_consent ? new Date().toISOString() : null,
          notification_preferences: {
            email: formData.notification_email,
          },
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });

      loadProfile();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (passwordData.new !== passwordData.confirm) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.new.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter no mínimo 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new,
      });

      if (error) throw error;

      toast({
        title: "Senha alterada",
        description: "Sua senha foi atualizada com sucesso.",
      });

      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Meu Perfil
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Gerencie suas informações pessoais e preferências
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* INFORMAÇÕES PESSOAIS */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Atualize seus dados de contato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={patient?.cpf || "Não informado"}
                  readOnly
                  disabled
                />
              </div>

              <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </CardContent>
          </Card>

          {/* ALTERAR SENHA */}
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Atualize sua senha de acesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                />
              </div>

              <Button onClick={handleChangePassword} variant="outline" className="w-full">
                <Lock className="h-4 w-4 mr-2" />
                Alterar Senha
              </Button>
            </CardContent>
          </Card>

          {/* LGPD E PRIVACIDADE */}
          <Card>
            <CardHeader>
              <CardTitle>Privacidade e Consentimento</CardTitle>
              <CardDescription>
                Configurações de acordo com a LGPD
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="lgpd"
                  checked={formData.lgpd_consent}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, lgpd_consent: checked as boolean })
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="lgpd"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Consentimento de uso de dados
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Autorizo o uso dos meus dados pessoais e médicos conforme a
                    Lei Geral de Proteção de Dados (LGPD).
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="notifications"
                  checked={formData.notification_email}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, notification_email: checked as boolean })
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="notifications"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Receber notificações por email
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Receba avisos quando novos documentos estiverem disponíveis.
                  </p>
                </div>
              </div>

              {patient?.lgpd_consent_date && (
                <p className="text-xs text-slate-500 mt-2">
                  Consentimento dado em:{" "}
                  {new Date(patient.lgpd_consent_date).toLocaleDateString("pt-BR")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Avatar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                  {patient?.name?.charAt(0).toUpperCase() || "P"}
                </div>
                <p className="text-sm text-center text-slate-600 dark:text-slate-400">
                  {patient?.name}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-xs text-slate-500">
                    {user?.email || "Não informado"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium">Membro desde</p>
                  <p className="text-xs text-slate-500">
                    {patient?.created_at ? new Date(patient.created_at).toLocaleDateString("pt-BR") : "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium">LGPD</p>
                  <p className="text-xs text-slate-500">
                    {formData.lgpd_consent ? "Consentimento dado" : "Pendente"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
