import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Criar paciente de teste no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: '12345678900@patients.local',
      password: 'Teste@123',
      email_confirm: true,
      user_metadata: {
        cpf: '12345678900',
        full_name: 'Paciente Teste',
      }
    })

    if (authError) {
      console.error('[v0] Erro ao criar usuário auth:', authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Criar registro do paciente na tabela patients
    if (authData.user) {
      const { error: patientError } = await supabase.from('patients').insert({
        id: authData.user.id,
        cpf: '12345678900',
        full_name: 'Paciente Teste',
        birth_date: '1990-01-01',
        phone: '(11) 98765-4321',
        email: 'paciente@teste.com',
        first_access: false,
      }).select()

      if (patientError) {
        console.error('[v0] Erro ao criar paciente:', patientError)
        return NextResponse.json({ error: patientError.message }, { status: 500 })
      }
    }

    // Criar clínica
    const { data: clinicData, error: clinicError } = await supabase.from('clinics').insert({
      name: 'Clínica Teste',
      cnpj: '12345678000190',
      address: 'Rua Teste, 123',
      phone: '(11) 3456-7890',
      email: 'contato@clinicateste.com',
    }).select().single()

    if (clinicError && clinicError.code !== '23505') {
      console.error('[v0] Erro ao criar clínica:', clinicError)
    }

    // Buscar clínica existente se já foi criada
    const { data: existingClinic } = await supabase
      .from('clinics')
      .select('*')
      .eq('cnpj', '12345678000190')
      .single()

    const clinicId = clinicData?.id || existingClinic?.id

    if (clinicId) {
      // Criar usuário da clínica
      const { error: clinicUserError } = await supabase.from('clinic_users').insert({
        clinic_id: clinicId,
        name: 'Admin Teste',
        email: 'admin@clinica.com',
        password_hash: '$2a$10$YourHashedPasswordHere',
        role: 'admin',
      }).select()

      if (clinicUserError && clinicUserError.code !== '23505') {
        console.error('[v0] Erro ao criar usuário da clínica:', clinicUserError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Dados de teste criados com sucesso!',
      credentials: {
        patient: {
          cpf: '12345678900',
          password: 'Teste@123',
          url: '/auth/login'
        },
        clinic: {
          email: 'admin@clinica.com',
          password: 'Admin@123',
          url: '/clinica/login'
        }
      }
    })
  } catch (error) {
    console.error('[v0] Erro geral:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }, { status: 500 })
  }
}
