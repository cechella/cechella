import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const users = [
    { email: 'medico@hormone.com', password: 'Medico@2024!', name: 'Dr. Silva', role: 'doctor' },
    { email: 'paciente@hormone.com', password: 'Paciente@2024!', name: 'Maria Santos', role: 'patient' },
    { email: 'consultor@hormone.com', password: 'Consultor@2024!', name: 'Carlos Vendas', role: 'sales' },
  ]

  const results = []

  for (const u of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name, role: u.role },
    })

    if (error) {
      results.push({ email: u.email, status: 'error', message: error.message })
      continue
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email: u.email,
      name: u.name,
      role: u.role,
    })

    results.push({
      email: u.email,
      status: profileError ? 'user created, profile error: ' + profileError.message : 'ok',
      role: u.role,
    })
  }

  return NextResponse.json({ results })
}
