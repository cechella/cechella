import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  try {
    const { nome, email, telefone } = await req.json()

    if (!nome || !email || !telefone) {
      return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 })
    }

    const emailLower = email.toLowerCase().trim()
    const senha = generatePassword()

    // Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailLower,
      password: senha,
      email_confirm: true,
      user_metadata: { full_name: nome, phone: telefone },
    })

    if (authError) {
      // Usuário já existe — apenas salva o lead e retorna sucesso
      if (authError.message.includes('already been registered') || authError.status === 422) {
        await supabaseAdmin.from('leads').upsert(
          { email: emailLower, nome, telefone, origem: 'landing_page', updated_at: new Date().toISOString() },
          { onConflict: 'email' }
        )
        return NextResponse.json({ success: true, existing: true })
      }
      throw authError
    }

    const userId = authData.user.id

    // Criar perfil com role patient
    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      full_name: nome,
      email: emailLower,
      phone: telefone,
      role: 'patient',
    })

    // Salvar lead
    await supabaseAdmin.from('leads').upsert(
      { email: emailLower, nome, telefone, origem: 'landing_page', user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: 'email' }
    )

    // Enviar email de boas-vindas via Supabase (reset password para o usuário criar a própria senha)
    await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: emailLower,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cechella.vercel.app'}/patient/dashboard` },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Lead capture error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
