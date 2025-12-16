-- Add storage URLs and hash fields to documents table
alter table public.documents 
  add column if not exists pdf_url text,
  add column if not exists txt_url text,
  add column if not exists zip_url text,
  add column if not exists hash_sha256 text;

-- Create notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  title text not null,
  message text not null,
  seen boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS for notifications
alter table public.notifications enable row level security;

-- RLS Policies for notifications
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = patient_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = patient_id);

-- Create index for better performance
create index if not exists notifications_patient_id_idx on public.notifications(patient_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

-- Create function to auto-notify on new document
create or replace function notify_new_document()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.notifications (patient_id, title, message)
  values (
    new.patient_id,
    'Novo documento disponível',
    'A clínica enviou um novo arquivo clínico para você.'
  );
  return new;
end;
$$;

-- Create trigger for auto-notifications
drop trigger if exists trigger_notify_document on public.documents;
create trigger trigger_notify_document
  after insert on public.documents
  for each row
  execute function notify_new_document();
