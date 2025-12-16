-- Criar paciente de teste
-- CPF: 12345678900
-- Senha: Teste@123

-- 1. Primeiro, vamos criar o usuário no auth (isso precisa ser feito via código ou manualmente no Supabase)
-- Instruções: No Supabase Dashboard -> Authentication -> Users -> Add User
-- Email: 12345678900@patients.local
-- Password: Teste@123
-- Depois rode este script

-- 2. Inserir o paciente (substitua 'AUTH_USER_ID' pelo ID do usuário criado no passo 1)
-- Para desenvolvimento, vamos criar direto:

DO $$
DECLARE
  test_user_id uuid;
  doc1_id uuid;
  doc2_id uuid;
  doc3_id uuid;
  doc4_id uuid;
BEGIN
  -- Gerar um UUID fixo para testes (em produção, use o ID real do auth.users)
  test_user_id := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;

  -- Inserir paciente
  INSERT INTO patients (id, cpf, full_name, birth_date, phone, email, first_access, created_at, updated_at)
  VALUES (
    test_user_id,
    '12345678900',
    'Maria Silva Santos',
    '1985-03-15',
    '(11) 98765-4321',
    'maria.silva@email.com',
    false, -- já completou primeiro acesso
    NOW() - INTERVAL '3 months',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    birth_date = EXCLUDED.birth_date,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email;

  -- Inserir documentos de exemplo
  
  -- Documento 1: Exame de Sangue (Recente)
  doc1_id := gen_random_uuid();
  INSERT INTO documents (
    id, patient_id, title, category, file_url, file_hash, uploaded_at, status
  ) VALUES (
    doc1_id,
    test_user_id,
    'Hemograma Completo',
    'Exame',
    'https://example.com/hemograma.pdf',
    'abc123def456' || doc1_id::text,
    NOW() - INTERVAL '2 days',
    'available'
  );

  -- Documento 2: Resultado de Ultrassom
  doc2_id := gen_random_uuid();
  INSERT INTO documents (
    id, patient_id, title, category, file_url, file_hash, uploaded_at, status
  ) VALUES (
    doc2_id,
    test_user_id,
    'Ultrassom Abdominal',
    'Imagem',
    'https://example.com/ultrassom.pdf',
    'xyz789ghi012' || doc2_id::text,
    NOW() - INTERVAL '1 week',
    'available'
  );

  -- Documento 3: Prescrição Médica
  doc3_id := gen_random_uuid();
  INSERT INTO documents (
    id, patient_id, title, category, file_url, file_hash, uploaded_at, status
  ) VALUES (
    doc3_id,
    test_user_id,
    'Prescrição Médica - Dr. João Silva',
    'Receita',
    'https://example.com/prescricao.pdf',
    'pre456med789' || doc3_id::text,
    NOW() - INTERVAL '2 weeks',
    'available'
  );

  -- Documento 4: Relatório de Consulta
  doc4_id := gen_random_uuid();
  INSERT INTO documents (
    id, patient_id, title, category, file_url, file_hash, uploaded_at, status
  ) VALUES (
    doc4_id,
    test_user_id,
    'Relatório de Consulta Cardiológica',
    'Laudo',
    'https://example.com/consulta.pdf',
    'rel123car456' || doc4_id::text,
    NOW() - INTERVAL '1 month',
    'available'
  );

  -- Inserir notificações
  INSERT INTO notifications (patient_id, type, title, message, read, created_at)
  VALUES 
    (test_user_id, 'new_document', 'Novo Exame Disponível', 'Seu hemograma completo já está disponível para visualização.', false, NOW() - INTERVAL '2 days'),
    (test_user_id, 'system', 'Bem-vindo ao Portal', 'Seja bem-vindo ao seu portal de saúde. Aqui você pode acessar todos os seus documentos médicos.', true, NOW() - INTERVAL '3 months'),
    (test_user_id, 'new_document', 'Ultrassom Disponível', 'O resultado do seu ultrassom abdominal foi liberado.', true, NOW() - INTERVAL '1 week');

  RAISE NOTICE 'Paciente de teste criado com sucesso!';
  RAISE NOTICE 'CPF: 12345678900';
  RAISE NOTICE 'Email (para login): 12345678900@patients.local';
  RAISE NOTICE 'Senha: Teste@123';
  RAISE NOTICE 'Documentos criados: %', 4;
  
END $$;
