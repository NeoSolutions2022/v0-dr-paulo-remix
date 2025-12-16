import { PatientSidebar } from "@/components/patient/patient-sidebar";
import PatientHeader from "@/components/patient/patient-header";

export default function PacienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <PatientSidebar />
      
      <main className="flex-1 flex flex-col">
        <PatientHeader />
        <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">{children}</div>
      </main>
    </div>
  );
}
