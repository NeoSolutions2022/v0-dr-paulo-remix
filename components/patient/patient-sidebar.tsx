"use client";

import Link from "next/link";
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, FolderOpen, User, LogOut, Calendar, MessageSquare } from 'lucide-react';
import { cn } from "@/lib/utils";

export function PatientSidebar() {
  const pathname = usePathname();

  const menu = [
    {
      label: "Dashboard",
      href: "/paciente/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Documentos",
      href: "/paciente/documentos",
      icon: FileText,
    },
    {
      label: "Linha do Tempo",
      href: "/paciente/timeline",
      icon: Calendar,
    },
    {
      label: "Arquivos",
      href: "/paciente/arquivos",
      icon: FolderOpen,
    },
    {
      label: "Perfil",
      href: "/paciente/perfil",
      icon: User,
    },
    {
      label: "Suporte",
      href: "/paciente/suporte",
      icon: MessageSquare,
    },
  ];

  return (
    <aside className="w-64 border-r bg-white dark:bg-slate-900 h-screen flex flex-col p-4">
      <div className="px-2 mb-8">
        <h1 className="text-xl font-bold text-blue-600">
          Portal do Paciente
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Acesso seguro aos seus documentos médicos
        </p>
      </div>

      <nav className="space-y-1 flex-1">
        {menu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all",
              pathname === item.href
                ? "bg-blue-600 text-white"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto">
        <Link
          href="/auth/logout"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </Link>
      </div>
    </aside>
  );
}
