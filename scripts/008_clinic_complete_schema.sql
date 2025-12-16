-- ============================================
-- SCHEMA COMPLETO DO SISTEMA DE CLÍNICAS
-- ============================================

-- 1. Criar tabela de clínicas
create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text unique,
  email text,
  phone text,
  address text,
  logo_url text,
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Criar tabela de usuários da clínica
create table if not exists public.clinic_users (
  id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'medico', 'recepcao')),
  crm text,
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Atualizar tabela patients para incluir clinic_id e created_by
alter table public.patients 
  add column if not exists clinic_id uuid references public.clinics(id),
  add column if not exists created_by uuid references public.clinic_users(id),
  add column if not exists observations text;

-- 4. Atualizar tabela documents para incluir clinic_id e uploaded_by
alter table public.documents 
  add column if not exists clinic_id uuid references public.clinics(id),
  add column if not exists uploaded_by uuid references public.clinic_users(id),
  add column if not exists pdf_url text,
  add column if not exists txt_url text,
  add column if not exists zip_url text,
  add column if not exists qr_code_url text,
  add column if not exists views_count integer default 0,
  add column if not exists last_viewed_at timestamp with time zone;

-- 5. Criar tabela de logs de auditoria
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id),
  user_id uuid references public.clinic_users(id),
  patient_id uuid references public.patients(id),
  document_id uuid references public.documents(id),
  action text not null,
  details jsonb,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.clinics enable row level security;
alter table public.clinic_users enable row level security;
alter table public.audit_logs enable row level security;

-- RLS Policies para clinics
create policy "Clinic users can view their clinic"
  on public.clinics for select
  using (id in (select clinic_id from public.clinic_users where id = auth.uid()));

create policy "Service role can manage clinics"
  on public.clinics for all
  using (true);

-- RLS Policies para clinic_users
create policy "Users can view their own profile"
  on public.clinic_users for select
  using (auth.uid() = id);

create policy "Users can view colleagues"
  on public.clinic_users for select
  using (clinic_id in (select clinic_id from public.clinic_users where id = auth.uid()));

create policy "Service role can manage clinic users"
  on public.clinic_users for all
  using (true);

-- RLS Policies atualizadas para patients (clínica pode ver seus pacientes)
drop policy if exists "Users can view their own profile" on public.patients;
create policy "Patients can view their own profile"
  on public.patients for select
  using (auth.uid() = id);

create policy "Clinic users can view their patients"
  on public.patients for select
  using (clinic_id in (select clinic_id from public.clinic_users where id = auth.uid()));

create policy "Clinic users can insert patients"
  on public.patients for insert
  with check (clinic_id in (select clinic_id from public.clinic_users where id = auth.uid()));

create policy "Clinic users can update their patients"
  on public.patients for update
  using (clinic_id in (select clinic_id from public.clinic_users where id = auth.uid()));

-- RLS Policies atualizadas para documents (clínica pode gerenciar)
drop policy if exists "Users can view their own documents" on public.documents;
create policy "Patients can view their own documents"
  on public.documents for select
  using (auth.uid() = patient_id);

create policy "Clinic users can view their documents"
  on public.documents for select
  using (clinic_id in (select clinic_id from public.clinic_users where id = auth.uid()));

create policy "Clinic users can insert documents"
  on public.documents for insert
  with check (clinic_id in (select clinic_id from public.clinic_users where id = auth.uid()));

create policy "Clinic users can update documents"
  on public.documents for update
  using (clinic_id in (select clinic_id from public.clinic_users where id = auth.uid()));

-- RLS Policies para audit_logs
create policy "Clinic users can view their logs"
  on public.audit_logs for select
  using (clinic_id in (select clinic_id from public.clinic_users where id = auth.uid()));

create policy "Service role can insert logs"
  on public.audit_logs for insert
  with check (true);

-- Índices para performance
create index if not exists clinic_users_clinic_id_idx on public.clinic_users(clinic_id);
create index if not exists patients_clinic_id_idx on public.patients(clinic_id);
create index if not exists documents_clinic_id_idx on public.documents(clinic_id);
create index if not exists audit_logs_clinic_id_idx on public.audit_logs(clinic_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

-- Triggers para updated_at
drop trigger if exists set_updated_at on public.clinics;
create trigger set_updated_at
  before update on public.clinics
  for each row
  execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.clinic_users;
create trigger set_updated_at
  before update on public.clinic_users
  for each row
  execute function public.handle_updated_at();

-- Função para registrar log de auditoria
create or replace function public.log_audit(
  p_clinic_id uuid,
  p_user_id uuid,
  p_patient_id uuid,
  p_document_id uuid,
  p_action text,
  p_details jsonb
)
returns void as $$
begin
  insert into public.audit_logs (clinic_id, user_id, patient_id, document_id, action, details)
  values (p_clinic_id, p_user_id, p_patient_id, p_document_id, p_action, p_details);
end;
$$ language plpgsql security definer;

-- ============================================
-- SEED: Criar clínica de teste
-- ============================================

-- Inserir clínica de teste
insert into public.clinics (id, name, cnpj, email, phone)
values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Clínica Saúde Premium',
  '12.345.678/0001-90',
  'contato@saudepremium.com.br',
  '(11) 98765-4321'
)
on conflict (id) do nothing;

-- Nota: O usuário admin da clínica será criado via API
