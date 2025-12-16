import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const supabase = createAdminClient()

    const email = 'admin@clinica.com'
    const password = 'Admin@123'
    const clinicId = '00000000-0000-0000-0000-000000000001'

    // Criar usuário no Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) throw authError

    // Criar registro de clinic_user
    const { error: clinicUserError } = await supabase
      .from('clinic_users')
      .insert({
        id: authData.user.id,
        clinic_id: clinicId,
        name: 'Administrador',
        email: email,
        role: 'admin',
      })

    if (clinicUserError) throw clinicUserError

    return NextResponse.json({
      success: true,
      credentials: {
        email,
        password,
      },
      message: 'Usuário da clínica criado com sucesso!',
    })

  } catch (error: any) {
    console.error('[v0] Error creating clinic user:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar usuário da clínica' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return POST();
}
