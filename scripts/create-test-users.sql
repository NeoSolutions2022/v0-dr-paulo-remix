-- Criar paciente de teste
-- Este script cria um paciente com CPF 12345678900
-- Email: 12345678900@patients.local
-- Senha: Teste@123

-- Inserir na tabela de pacientes
INSERT INTO patients (cpf, name, email, phone, birth_date, created_at)
VALUES (
  '12345678900',
  'Paciente Teste',
  '12345678900@patients.local',
  '11999999999',
  '1990-01-01',
  NOW()
)
ON CONFLICT (cpf) DO NOTHING;

-- Nota: O usuário no auth.users precisa ser criado via Supabase Auth API
-- Use a rota: POST /api/create-test-patient para criar o usuário de autenticação
