-- Add LGPD consent and category fields
alter table public.patients 
  add column if not exists lgpd_consent boolean default false,
  add column if not exists lgpd_consent_date timestamp with time zone,
  add column if not exists notification_preferences jsonb default '{"email": true, "sms": false}'::jsonb;

alter table public.documents
  add column if not exists category text default 'Exame';

-- Create index for category
create index if not exists documents_category_idx on public.documents(category);

-- Add comment
comment on column public.documents.category is 'Categoria do documento: Exame, Laudo, Atestado, Receita, Relatório, etc.';
