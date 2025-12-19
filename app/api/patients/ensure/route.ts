import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, email, fullName, birthDate } = body

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: existingPatient, error: fetchError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (existingPatient) {
      return NextResponse.json(existingPatient, { status: 200 })
    }

    const { data: insertedPatient, error: insertError } = await supabase
      .from('patients')
      .insert({
        id: userId,
        full_name: fullName || email || 'Paciente',
        email: email || null,
        birth_date: birthDate || null,
        first_access: true,
      })
      .select('*')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(insertedPatient, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
