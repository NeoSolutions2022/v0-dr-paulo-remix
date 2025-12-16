-- Add email and first_access fields to patients table
alter table public.patients
  add column if not exists email text,
  add column if not exists first_access boolean default true;

-- Make CPF unique and not null for login purposes
alter table public.patients
  alter column cpf set not null,
  add constraint patients_cpf_unique unique (cpf);

-- Update RLS policies to ensure patients can update their first_access
drop policy if exists "Users can update their own profile" on public.patients;
create policy "Users can update their own profile"
  on public.patients for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
