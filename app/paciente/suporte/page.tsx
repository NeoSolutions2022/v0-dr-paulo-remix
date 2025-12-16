"use client"

import { useState } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Phone, Mail, MapPin } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function SuportePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Simulate sending
    setTimeout(() => {
      toast({
        title: "Mensagem enviada",
        description: "Entraremos em contato em breve.",
      });
      setFormData({ subject: '', message: '' });
      setLoading(false);
    }, 1000);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Suporte ao Paciente
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Entre em contato conosco para dúvidas ou suporte técnico
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <Phone className="h-8 w-8 mx-auto text-blue-600 dark:text-blue-400 mb-3" />
            <p className="font-semibold">Telefone</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              (00) 0000-0000
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Mail className="h-8 w-8 mx-auto text-blue-600 dark:text-blue-400 mb-3" />
            <p className="font-semibold">Email</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              suporte@clinica.com.br
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <MapPin className="h-8 w-8 mx-auto text-blue-600 dark:text-blue-400 mb-3" />
            <p className="font-semibold">Endereço</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Rua Exemplo, 123
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Enviar Mensagem
          </CardTitle>
          <CardDescription>
            Preencha o formulário abaixo e entraremos em contato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Qual o motivo do contato?"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Descreva sua dúvida ou problema..."
                rows={6}
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Enviando..." : "Enviar Mensagem"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horário de Atendimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Segunda a Sexta</span>
            <span className="font-semibold">8h às 18h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Sábado</span>
            <span className="font-semibold">8h às 12h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Domingo e Feriados</span>
            <span className="font-semibold">Fechado</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
