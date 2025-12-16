import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createPatientAuth, generatePassword } from '@/lib/auth-helpers'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é usuário da clínica
    const { data: clinicUser, error: clinicUserError } = await supabase
      .from('clinic_users')
      .select('clinic_id, id')
      .eq('id', user.id)
      .single()

    if (clinicUserError || !clinicUser) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { name, cpf, email, phone, birthDate, password: customPassword } = body

    // Validar CPF
    const cpfClean = cpf.replace(/\D/g, '')
    if (cpfClean.length !== 11) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
    }

    // Verificar se CPF já existe
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id')
      .eq('cpf', cpfClean)
      .eq('clinic_id', clinicUser.clinic_id)
      .single()

    if (existingPatient) {
      return NextResponse.json({ error: 'CPF já cadastrado nesta clínica' }, { status: 400 })
    }

    // Gerar ou usar senha fornecida
    const password = customPassword || generatePassword()

    // Criar usuário no Auth
    const authUser = await createPatientAuth(cpfClean, password)

    // Criar registro do paciente
    const { error: patientError } = await supabase
      .from('patients')
      .insert({
        id: authUser.id,
        clinic_id: clinicUser.clinic_id,
        created_by: clinicUser.id,
        full_name: name,
        cpf: cpfClean,
        email: email || null,
        phone: phone || null,
        birth_date: birthDate || null,
        first_access: true,
      })

    if (patientError) throw patientError

    // Registrar log de auditoria
    await supabase.rpc('log_audit', {
      p_clinic_id: clinicUser.clinic_id,
      p_user_id: clinicUser.id,
      p_patient_id: authUser.id,
      p_document_id: null,
      p_action: 'patient_created',
      p_details: { name, cpf: cpfClean }
    })

    return NextResponse.json({
      success: true,
      patient: {
        id: authUser.id,
        name,
        cpf: cpfClean,
      },
      credentials: {
        cpf: cpfClean,
        password,
      }
    })

  } catch (error: any) {
    console.error('[v0] Error creating patient:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar paciente' },
      { status: 500 }
    )
  }
}
