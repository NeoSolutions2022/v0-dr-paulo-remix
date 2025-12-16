-- Script para criar usuários de teste
-- Execute este script para ter acesso ao sistema

-- 1. Criar clínica de teste (se não existir)
INSERT INTO public.clinics (id, name, cnpj, email, phone, active)
VALUES (
  gen_random_uuid(),
  'Clínica Teste',
  '12345678000100',
  'contato@clinicateste.com',
  '(11) 3333-4444',
  true
)
ON CONFLICT DO NOTHING;

-- 2. Criar usuário da clínica (admin@clinica.com / Admin@123)
-- Nota: O hash bcrypt abaixo é para a senha "Admin@123"
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@clinica.com',
  '$2a$10$rBV2KDXBNlHBvZvZdG.qkeJOqKkN1p3fPPQvDxEBvHJmCQF.p2.4W',
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated'
)
ON CONFLICT (email) DO NOTHING;

-- 3. Adicionar  usuário da clínica na tabela clinic_users
INSERT INTO public.clinic_users (id, clinic_id, name, email, crm, role, active)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'admin@clinica.com'),
  (SELECT id FROM public.clinics WHERE email = 'contato@clinicateste.com' LIMIT 1),
  'Administrador Teste',
  'admin@clinica.com',
  'CRM-12345-SP',
  'admin',
  true
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@clinica.com')
ON CONFLICT DO NOTHING;

-- 4. Criar paciente de teste (CPF: 12345678900 / Senha: Teste@123)
-- O email do paciente será: 12345678900@patients.local
-- Nota: O hash bcrypt abaixo é para a senha "Teste@123"
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  '12345678900@patients.local',
  '$2a$10$xGCVvD8qPNH3rW4j3bK0qeP8JRLqB1QBWw6OHqXKRKj5F0d5nXHxy',
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"cpf":"12345678900","full_name":"João Silva Teste"}',
  'authenticated',
  'authenticated'
)
ON CONFLICT (email) DO NOTHING;

-- 5. Adicionar paciente na tabela patients
INSERT INTO public.patients (
  id,
  cpf,
  full_name,
  birth_date,
  phone,
  email,
  clinic_id,
  created_by,
  first_access,
  lgpd_accepted,
  lgpd_accepted_at
)
SELECT 
  (SELECT id FROM auth.users WHERE email = '12345678900@patients.local'),
  '12345678900',
  'João Silva Teste',
  '1990-01-15',
  '(11) 98765-4321',
  'joao.teste@email.com',
  (SELECT id FROM public.clinics WHERE email = 'contato@clinicateste.com' LIMIT 1),
  (SELECT id FROM auth.users WHERE email = 'admin@clinica.com'),
  false,
  true,
  NOW()
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = '12345678900@patients.local')
ON CONFLICT DO NOTHING;

-- Sucesso! Agora você pode fazer login com:
-- PACIENTE: CPF 12345678900 / Senha: Teste@123
-- CLÍNICA: admin@clinica.com / Senha: Admin@123
