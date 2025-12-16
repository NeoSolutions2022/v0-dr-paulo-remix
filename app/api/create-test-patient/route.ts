import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    console.log('[v0] Iniciando criação do paciente de teste')
    
    // Usar o service role key para criar usuários
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('[v0] Supabase URL:', supabaseUrl)
    console.log('[v0] Service Role Key exists:', !!serviceRoleKey)
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ 
        error: 'Variáveis de ambiente não configuradas',
        details: {
          url: !!supabaseUrl,
          key: !!serviceRoleKey
        }
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const cpf = '12345678900'
    const password = 'Teste@123'
    const email = `${cpf}@patients.local`

    console.log('[v0] Verificando se usuário já existe:', email)
    
    // Verificar se já existe
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const userExists = existingUsers?.users.find((u) => u.email === email)
    
    if (userExists) {
      console.log('[v0] Usuário já existe, retornando credenciais')
      return NextResponse.json({
        success: true,
        message: 'Paciente de teste já existe!',
        credentials: { cpf, password, email },
        note: 'O usuário já estava criado. Use as credenciais acima.',
      })
    }

    console.log('[v0] Criando usuário no Auth')
    
    // 1. Criar usuário no Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        cpf,
        full_name: 'Maria Silva Santos',
      }
    })

    if (authError) {
      console.error('[v0] Erro ao criar usuário:', authError)
      return NextResponse.json({ 
        error: authError.message,
        details: authError 
      }, { status: 400 })
    }

    console.log('[v0] Usuário criado com ID:', authData.user.id)
    const userId = authData.user.id

    console.log('[v0] Criando registro do paciente')
    
    // 2. Criar registro do paciente
    const { error: patientError } = await supabase.from('patients').insert({
      id: userId,
      cpf,
      full_name: 'Maria Silva Santos',
      birth_date: '1985-03-15',
      phone: '(11) 98765-4321',
      email: 'maria.silva@email.com',
      first_access: false,
    })

    if (patientError) {
      console.error('[v0] Erro ao criar paciente:', patientError)
      return NextResponse.json({ 
        error: patientError.message,
        details: patientError 
      }, { status: 400 })
    }

    console.log('[v0] Criando documentos')
    
    // 3. Criar documentos de exemplo
    const documents = [
      {
        patient_id: userId,
        title: 'Hemograma Completo',
        category: 'Exame',
        file_url: '/placeholder-documents/hemograma.pdf',
        file_hash: 'abc123def456',
        status: 'available',
      },
      {
        patient_id: userId,
        title: 'Ultrassom Abdominal',
        category: 'Imagem',
        file_url: '/placeholder-documents/ultrassom.pdf',
        file_hash: 'xyz789ghi012',
        status: 'available',
      },
      {
        patient_id: userId,
        title: 'Prescrição Médica - Dr. João Silva',
        category: 'Receita',
        file_url: '/placeholder-documents/prescricao.pdf',
        file_hash: 'pre456med789',
        status: 'available',
      },
      {
        patient_id: userId,
        title: 'Relatório de Consulta Cardiológica',
        category: 'Laudo',
        file_url: '/placeholder-documents/consulta.pdf',
        file_hash: 'rel123car456',
        status: 'available',
      },
    ]

    const { error: docsError } = await supabase.from('documents').insert(documents)

    if (docsError) {
      console.error('[v0] Erro ao criar documentos:', docsError)
      return NextResponse.json({ 
        error: docsError.message,
        details: docsError,
        note: 'Paciente criado mas documentos falharam'
      }, { status: 400 })
    }

    console.log('[v0] Criando notificações')
    
    // 4. Criar notificações
    const notifications = [
      {
        patient_id: userId,
        type: 'new_document',
        title: 'Novo Exame Disponível',
        message: 'Seu hemograma completo já está disponível para visualização.',
        read: false,
      },
      {
        patient_id: userId,
        type: 'system',
        title: 'Bem-vindo ao Portal',
        message: 'Seja bem-vindo ao seu portal de saúde. Aqui você pode acessar todos os seus documentos médicos.',
        read: true,
      },
    ]

    const { error: notifsError } = await supabase.from('notifications').insert(notifications)

    if (notifsError) {
      console.log('[v0] Aviso: Erro ao criar notificações (não crítico):', notifsError)
    }

    console.log('[v0] Paciente de teste criado com sucesso!')

    return NextResponse.json({
      success: true,
      message: 'Paciente de teste criado com sucesso!',
      credentials: {
        cpf,
        password,
        email,
      },
    })
  } catch (error) {
    console.error('[v0] Erro geral:', error)
    return NextResponse.json({ 
      error: 'Erro ao criar paciente de teste',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function GET() {
  return POST();
}
