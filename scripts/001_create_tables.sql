-- Create patients table (profiles)
create table if not exists public.patients (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  cpf text,
  birth_date date,
  phone text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.patients enable row level security;

-- RLS Policies for patients
create policy "Users can view their own profile"
  on public.patients for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.patients for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.patients for update
  using (auth.uid() = id);

-- Create documents table
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  file_name text not null,
  file_type text not null default 'txt',
  raw_text text,
  clean_text text not null,
  pdf_html text,
  status text not null default 'completed',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS for documents
alter table public.documents enable row level security;

-- RLS Policies for documents
create policy "Users can view their own documents"
  on public.documents for select
  using (auth.uid() = patient_id);

create policy "Users can insert their own documents"
  on public.documents for insert
  with check (auth.uid() = patient_id);

create policy "Users can update their own documents"
  on public.documents for update
  using (auth.uid() = patient_id);

create policy "Users can delete their own documents"
  on public.documents for delete
  using (auth.uid() = patient_id);

-- Create index for better query performance
create index if not exists documents_patient_id_idx on public.documents(patient_id);
create index if not exists documents_created_at_idx on public.documents(created_at desc);
