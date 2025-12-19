"use client";

import { Bell, Menu } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";

interface Patient {
  name: string;
  email: string;
}

export function PatientHeader() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchPatient = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("patients")
          .select("name")
          .eq("id", user.id)
          .single();
        
        setPatient({
          name: data?.name || user.email?.split("@")[0] || "Paciente",
          email: user.email || "",
        });
      }
    };

    fetchPatient();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Bem-vindo, {patient?.name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gerencie seus documentos e histórico médico
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:opacity-90"
            >
              {patient?.name?.charAt(0).toUpperCase() || "P"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{patient?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {patient?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/paciente/perfil")}>
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
