import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.hormoneecosystem.com'

function normalizePhone(telefone: string) {
  const digits = String(telefone).replace(/\D/g, '')
  return digits.startsWith('55') ? digits : `55${digits}`
}

// GET: verificar progresso dos referidos via contatos_referidos (salvo por /api/indicar)
// Aceita ?token= (lookup via leads) ou ?telefone= (lookup direto)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const telParam = req.nextUrl.searchParams.get('telefone')

  let phone: string | null = null

  if (token) {
    // Resolve phone from leads table via token
    const { data: lead } = await supabase.from('leads').select('telefone').eq('token_indicacao', token).maybeSingle()
    phone = lead?.telefone ? String(lead.telefone).replace(/\D/g, '') : null
  } else if (telParam) {
    phone = String(telParam).replace(/\D/g, '')
  }

  if (!phone) return NextResponse.json({ completo: false, semDados: 20, missaoCompleta: false, total: 0 })

  const { data } = await supabase
    .from('contatos_referidos')
    .select('id, profissao, hobby, status')
    .or(`indicado_por_telefone.eq.${phone},indicado_por_telefone.eq.55${phone},indicado_por_telefone.eq.${phone.replace(/^55/, '')}`)

  if (!data || data.length === 0) {
    return NextResponse.json({ completo: false, semDados: 20, missaoCompleta: false, total: 0 })
  }

  const ativos = data.filter((r: any) => r.status !== 'recusou')
  const semDados = ativos.filter((r: any) => !r.profissao || !r.hobby).length
  const completo = ativos.length >= 20
  const missaoCompleta = completo && semDados === 0

  return NextResponse.json({ completo, semDados, missaoCompleta, total: ativos.length })
}

// POST: iniciar coleta — gera/recupera token e retorna link
export async function POST(req: NextRequest) {
  try {
    const { telefone, callSid } = await req.json()
    if (!telefone) return NextResponse.json({ error: 'telefone obrigatório' }, { status: 400 })

    const digits = String(telefone).replace(/\D/g, '')

    const { data: lead } = await supabase
      .from('leads')
      .select('id, status_pagamento, token_indicacao, nome')
      .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)
      .maybeSingle()

    // No simulator: allow even if not paid (for testing flow)
    let token = lead?.token_indicacao as string | null

    if (!token) {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
      token = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

      if (lead?.id) {
        await supabase.from('leads').update({ token_indicacao: token }).eq('id', lead.id)
      } else {
        // Lead not in DB — store token in call memories
        if (callSid) {
          const { data: call } = await supabase.from('ana_calls').select('memories').eq('call_sid', callSid).single()
          const memories = { ...((call?.memories as Record<string, unknown>) ?? {}), token_indicacao: token }
          await supabase.from('ana_calls').update({ memories }).eq('call_sid', callSid)
        }
      }
    }

    const link = `${APP_URL}/indicar/${token}`

    // Save token to call memories
    if (callSid) {
      const { data: call } = await supabase.from('ana_calls').select('memories').eq('call_sid', callSid).single()
      const memories = { ...((call?.memories as Record<string, unknown>) ?? {}), token_indicacao: token }
      await supabase.from('ana_calls').update({ memories }).eq('call_sid', callSid)
    }

    return NextResponse.json({ link, token })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
