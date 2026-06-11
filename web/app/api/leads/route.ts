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

async function sendWelcomeEmail(nome: string, email: string, magicLink: string) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Hormone Ecosystem <onboarding@resend.dev>',
      to: email,
      subject: '⚡ Seu acesso à plataforma Hormone Ecosystem está pronto!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0B; color: #fff; padding: 40px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #7B3FE4, #3B82F6); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;">H</div>
            <h1 style="color: #fff; font-size: 24px; margin-top: 16px;">Hormone Ecosystem</h1>
          </div>

          <h2 style="color: #fff; font-size: 20px;">Olá, ${nome}! 🎉</h2>
          <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6;">
            Sua conta foi criada com sucesso! Clique no botão abaixo para acessar a plataforma exclusiva de implantes hormonais.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${magicLink}" style="background: linear-gradient(135deg, #7B3FE4, #3B82F6); color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
              ⚡ Acessar minha plataforma
            </a>
          </div>

          <p style="color: #71717A; font-size: 14px; text-align: center;">
            Este link expira em 24 horas. Se não solicitou este acesso, ignore este email.
          </p>

          <hr style="border: none; border-top: 1px solid #1C1C1E; margin: 32px 0;">
          <p style="color: #52525B; font-size: 12px; text-align: center;">
            Hormone Ecosystem — A maior plataforma digital de implantes hormonais
          </p>
        </div>
      `,
    }),
  })
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
      if (authError.message.includes('already been registered') || authError.status === 422) {
        await supabaseAdmin.from('leads').upsert(
          { email: emailLower, nome, telefone, origem: 'landing_page', updated_at: new Date().toISOString() },
          { onConflict: 'email' }
        )
        // Gerar novo magic link para usuário existente
        const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: emailLower,
          options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cechella.vercel.app'}/patient/dashboard` },
        })
        if (linkData?.properties?.action_link) {
          await sendWelcomeEmail(nome, emailLower, linkData.properties.action_link)
        }
        return NextResponse.json({ success: true, existing: true })
      }
      throw authError
    }

    const userId = authData.user.id

    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      full_name: nome,
      email: emailLower,
      phone: telefone,
      role: 'patient',
    })

    await supabaseAdmin.from('leads').upsert(
      { email: emailLower, nome, telefone, origem: 'landing_page', user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: 'email' }
    )

    // Gerar magic link e enviar via Resend
    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: emailLower,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cechella.vercel.app'}/patient/dashboard` },
    })

    if (linkData?.properties?.action_link) {
      await sendWelcomeEmail(nome, emailLower, linkData.properties.action_link)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Lead capture error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
