-- ============================================
-- SCHEMA COMPLETO DO PORTAL DO PACIENTE
-- ============================================

-- 1. Criar tabela de pacientes
create table if not exists public.patients (
  id uuid primary key references auth.users(id) on delete cascade,
  cpf text unique not null,
  full_name text not null,
  birth_date date,
  phone text,
  email text,
  first_access boolean default true,
  lgpd_accepted boolean default false,
  lgpd_accepted_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS para patients
alter table public.patients enable row level security;

-- RLS Policies para patients
create policy "Users can view their own profile"
  on public.patients for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.patients for update
  using (auth.uid() = id);

-- Service role pode criar pacientes
create policy "Service role can insert patients"
  on public.patients for insert
  with check (true);

-- 2. Criar tabela de documentos
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  title text not null,
  category text not null default 'Exame',
  file_name text,
  file_type text default 'pdf',
  file_url text,
  file_hash text,
  raw_text text,
  clean_text text,
  pdf_html text,
  status text not null default 'available',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS para documents
alter table public.documents enable row level security;

-- RLS Policies para documents
create policy "Users can view their own documents"
  on public.documents for select
  using (auth.uid() = patient_id);

create policy "Service role can insert documents"
  on public.documents for insert
  with check (true);

create policy "Users can update their own documents"
  on public.documents for update
  using (auth.uid() = patient_id);

-- Validação pública (sem auth)
create policy "Public can view documents for validation"
  on public.documents for select
  using (true);

-- 3. Criar tabela de notificações
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  type text not null default 'system',
  title text not null,
  message text not null,
  read boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS para notifications
alter table public.notifications enable row level security;

-- RLS Policies para notifications
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = patient_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = patient_id);

create policy "Service role can insert notifications"
  on public.notifications for insert
  with check (true);

-- 4. Criar índices para performance
create index if not exists documents_patient_id_idx on public.documents(patient_id);
create index if not exists documents_created_at_idx on public.documents(created_at desc);
create index if not exists documents_category_idx on public.documents(category);
create index if not exists notifications_patient_id_idx on public.notifications(patient_id);
create index if not exists notifications_read_idx on public.notifications(read);
create index if not exists patients_cpf_idx on public.patients(cpf);

-- 5. Criar função para atualizar updated_at automaticamente
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 6. Criar triggers para updated_at
drop trigger if exists set_updated_at on public.patients;
create trigger set_updated_at
  before update on public.patients
  for each row
  execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.documents;
create trigger set_updated_at
  before update on public.documents
  for each row
  execute function public.handle_updated_at();

-- ============================================
-- INSTRUÇÕES DE USO:
-- ============================================
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Acesse /dev/create-test-patient no app
-- 3. Clique em "Criar Paciente de Teste"
-- 4. Use as credenciais exibidas para fazer login
-- ============================================
