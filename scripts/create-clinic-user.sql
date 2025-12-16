-- Criar usuário da clínica
-- Email: admin@clinica.com
-- Senha: Admin@123

-- Inserir na tabela clinic_users
INSERT INTO clinic_users (email, name, created_at)
VALUES (
  'admin@clinica.com',
  'Administrador',
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Nota: O usuário no auth.users precisa ser criado via Supabase Auth API
-- Use a rota: POST /api/dev/create-clinic-user para criar o usuário de autenticação
