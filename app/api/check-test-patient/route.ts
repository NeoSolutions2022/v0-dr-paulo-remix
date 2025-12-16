import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ 
        error: 'Variáveis de ambiente não configuradas'
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const cpf = '12345678900'
    const email = `${cpf}@patients.local`

    console.log('[v0] Verificando paciente com email:', email)
    
    // Verificar no Auth
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const authUser = authUsers?.users.find((u) => u.email === email)
    
    console.log('[v0] Usuário encontrado no Auth:', !!authUser)
    
    if (!authUser) {
      return NextResponse.json({
        exists: false,
        message: 'Paciente não encontrado no Auth'
      })
    }

    // Verificar na tabela patients
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', authUser.id)
      .single()
    
    console.log('[v0] Paciente na tabela:', patient)
    console.log('[v0] Erro ao buscar paciente:', patientError)

    // Contar documentos
    const { count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', authUser.id)

    return NextResponse.json({
      exists: true,
      authEmail: email,
      authId: authUser.id,
      patientInDb: !!patient,
      documentCount: count,
      patient: patient
    })
  } catch (error) {
    console.error('[v0] Erro na verificação:', error)
    return NextResponse.json({ 
      error: 'Erro ao verificar paciente',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
