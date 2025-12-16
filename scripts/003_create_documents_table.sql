-- Tabela de documentos médicos
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  file_name text not null,
  file_type text,
  raw_text text,
  clean_text text,
  pdf_url text,
  txt_url text,
  zip_url text,
  created_at timestamp with time zone default now(),
  status text default 'completed'
);

-- Habilitar RLS
alter table documents enable row level security;

-- Política: Paciente vê apenas seus documentos
create policy "Paciente vê apenas seus documentos"
on documents
for select
using (auth.uid() = patient_id);

-- Política: Clínica pode inserir documentos
create policy "Clínica pode inserir documentos"
on documents
for insert
with check (true);
