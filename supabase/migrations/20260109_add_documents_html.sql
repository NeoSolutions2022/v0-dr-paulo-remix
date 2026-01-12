alter table documents
  add column if not exists html text,
  add column if not exists html_generated_at timestamptz;
