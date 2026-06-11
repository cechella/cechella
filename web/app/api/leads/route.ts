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

async function sendWelcomeEmail(nome: string, email: string, senha: string, loginUrl: string) {
  const mailerKey = process.env.MAILERSEND_API_KEY
  if (!mailerKey) return

  await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mailerKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: { email: 'noreply@hormoneecosystem.com', name: 'Hormone Ecosystem' },
      to: [{ email, name: nome }],
      subject: '⚡ Seu acesso à plataforma Hormone Ecosystem está pronto!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0B; color: #fff; padding: 40px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #7B3FE4, #3B82F6); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;">H</div>
            <h1 style="color: #fff; font-size: 24px; margin-top: 16px;">Hormone Ecosystem</h1>
          </div>

          <h2 style="color: #fff; font-size: 20px;">Olá, ${nome}! 🎉</h2>
          <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6;">
            Sua conta foi criada com sucesso! Abaixo estão suas credenciais de acesso à plataforma exclusiva de implantes hormonais.
          </p>

          <div style="background: #111113; border: 1px solid #1C1C1E; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <p style="color: #71717A; font-size: 13px; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.1em;">Suas credenciais de acesso</p>
            <div style="margin-bottom: 12px;">
              <span style="color: #71717A; font-size: 13px;">E-mail:</span>
              <div style="margin-top: 6px; background: #1C1C1E; border: 1px solid #2C2C2E; border-radius: 8px; padding: 10px 14px; cursor: text;">
                <span style="color: #fff; font-size: 15px; font-weight: bold; user-select: all; -webkit-user-select: all;">${email}</span>
              </div>
            </div>
            <div>
              <span style="color: #71717A; font-size: 13px;">Senha: <span style="color: #52525B;">(clique para selecionar e copie com Ctrl+C)</span></span>
              <div style="margin-top: 6px; background: #1C1C1E; border: 1px solid #7B3FE4; border-radius: 8px; padding: 10px 14px; cursor: text;">
                <span style="color: #A78BFA; font-size: 20px; font-weight: bold; letter-spacing: 0.2em; font-family: monospace; user-select: all; -webkit-user-select: all;">${senha}</span>
              </div>
            </div>
          </div>

          <p style="color: #A1A1AA; font-size: 14px; line-height: 1.6;">
            Guarde esta senha em local seguro. Você pode alterá-la depois de fazer o primeiro acesso.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${loginUrl}" style="background: linear-gradient(135deg, #7B3FE4, #3B82F6); color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
              ⚡ Acessar minha plataforma
            </a>
          </div>

          <p style="color: #71717A; font-size: 13px; text-align: center;">
            Se não solicitou este acesso, ignore este email.
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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cechella.vercel.app'
    const loginUrl = `${siteUrl}/login`

    if (authError) {
      if (authError.message.includes('already been registered') || authError.status === 422) {
        await supabaseAdmin.from('leads').upsert(
          { email: emailLower, nome, telefone, origem: 'landing_page', updated_at: new Date().toISOString() },
          { onConflict: 'email' }
        )
        // Usuário já existe — gera nova senha e envia por email
        const novaSenha = generatePassword()
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
        const user = existingUser?.users?.find(u => u.email === emailLower)
        if (user) {
          await supabaseAdmin.auth.admin.updateUserById(user.id, { password: novaSenha })
        }
        await sendWelcomeEmail(nome, emailLower, novaSenha, loginUrl)
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

    await sendWelcomeEmail(nome, emailLower, senha, loginUrl)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Lead capture error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
