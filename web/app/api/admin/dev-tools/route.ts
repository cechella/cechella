import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: (url: RequestInfo | URL, opts: RequestInit = {}) => fetch(url, { ...opts, cache: 'no-store' }) },
    }
  )
}

export async function POST(req: NextRequest) {
  const { action, telefone, telefones } = await req.json()
  const supabase = makeClient()

  try {
    if (action === 'listar_leads') {
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, telefone, etapa_agente, status_pagamento, metodo_pagamento, tentativas_pagamento, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return NextResponse.json({ data })
    }

    if (action === 'listar_todos_leads') {
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, telefone, etapa_agente, status_pagamento, metodo_pagamento, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error

      // count referidos per lead
      const leadsComReferidos = await Promise.all((data || []).map(async (lead) => {
        const { count } = await supabase
          .from('contatos_referidos')
          .select('*', { count: 'exact', head: true })
          .like('indicado_por_telefone', `%${lead.telefone.slice(-8)}%`)
        return { ...lead, referidos_count: count ?? 0 }
      }))

      return NextResponse.json({ data: leadsComReferidos })
    }

    if (action === 'deletar_leads_selecionados') {
      if (!telefones || !Array.isArray(telefones) || telefones.length === 0) {
        return NextResponse.json({ error: 'telefones[] obrigatório' }, { status: 400 })
      }
      let totalRows = 0
      for (const tel of telefones) {
        const suffix = String(tel).replace(/\D/g, '').slice(-8)
        const { data } = await supabase.from('leads').delete().like('telefone', `%${suffix}%`).select('id')
        totalRows += data?.length ?? 0
        await supabase.from('mensagens_whatsapp').delete().like('phone', `%${suffix}%`)
        await supabase.from('leads_m4_flag').delete().like('telefone', `%${suffix}%`)
        await supabase.from('contatos_referidos').delete().like('indicado_por_telefone', `%${suffix}%`)
        await supabase.from('historico_voz').delete().like('telefone', `%${suffix}%`)
        await supabase.from('sessao_wpp').delete().like('phone', `%${suffix}%`)
      }
      return NextResponse.json({ rows: totalRows, apagados: telefones.length })
    }

    if (action === 'resetar_lead') {
      if (!telefone) return NextResponse.json({ error: 'Telefone obrigatório' }, { status: 400 })
      const suffix = telefone.replace(/\D/g, '').slice(-8)
      const { data, error } = await supabase
        .from('leads')
        .update({
          historico: [],
          etapa_agente: 1,
          nome: null,
          dor_principal: null,
          status_pagamento: null,
          metodo_pagamento: null,
          tentativas_pagamento: 0,
          atendimento_humano: false,
          token_indicacao: null,
          total_referidos: 0,
        })
        .like('telefone', `%${suffix}%`)
        .select('id, nome, telefone, etapa_agente, status_pagamento, metodo_pagamento')
      if (error) throw error
      // limpa M4, referidos e sessao_wpp
      await supabase.from('leads_m4_flag').delete().like('telefone', `%${suffix}%`)
      await supabase.from('contatos_referidos').delete().like('indicado_por_telefone', `%${suffix}%`)
      await supabase.from('sessao_wpp').delete().like('phone', `%${suffix}%`)
      return NextResponse.json({ data, rows: data?.length ?? 0, m4_limpo: true, sessao_wpp_limpo: true })
    }

    if (action === 'deletar_lead') {
      if (!telefone) return NextResponse.json({ error: 'Telefone obrigatório' }, { status: 400 })
      const suffix = telefone.replace(/\D/g, '').slice(-8)
      const { data, error } = await supabase
        .from('leads')
        .delete()
        .like('telefone', `%${suffix}%`)
        .select('id, nome, telefone')
      if (error) throw error
      await supabase.from('mensagens_whatsapp').delete().like('phone', `%${suffix}%`)
      await supabase.from('leads_m4_flag').delete().like('telefone', `%${suffix}%`)
      await supabase.from('contatos_referidos').delete().like('indicado_por_telefone', `%${suffix}%`)
      return NextResponse.json({ data, rows: data?.length ?? 0, m4_limpo: true })
    }

    if (action === 'resetar_referidos') {
      if (!telefone) return NextResponse.json({ error: 'Telefone obrigatório' }, { status: 400 })
      const { data, error } = await supabase
        .from('contatos_referidos')
        .update({ status: 'aguardando' })
        .like('telefone', `%${telefone.replace(/\D/g, '').slice(-9)}%`)
        .select('id, nome, telefone, status')
      if (error) throw error
      return NextResponse.json({ data, rows: data?.length ?? 0 })
    }

    if (action === 'limpar_todos_leads') {
      const { data, error } = await supabase
        .from('leads')
        .delete()
        .gte('created_at', '2000-01-01')
        .select('id')
      if (error) throw error
      await supabase.from('mensagens_whatsapp').delete().gte('ts', '2000-01-01')
      return NextResponse.json({ data, rows: data?.length ?? 0 })
    }

    if (action === 'limpar_todos_referidos') {
      const { data, error } = await supabase
        .from('contatos_referidos')
        .delete()
        .gte('created_at', '2000-01-01')
        .select('id')
      if (error) throw error
      return NextResponse.json({ data, rows: data?.length ?? 0 })
    }

    if (action === 'zerar_historico_voz') {
      if (!telefone) return NextResponse.json({ error: 'Telefone obrigatório' }, { status: 400 })
      const suffix = telefone.replace(/\D/g, '').slice(-8)
      const { data, error } = await supabase
        .from('historico_voz')
        .delete()
        .like('telefone', `%${suffix}%`)
        .select('id')
      if (error) throw error
      return NextResponse.json({ data, rows: data?.length ?? 0 })
    }

    if (action === 'resetar_em_ligacao') {
      if (!telefone) return NextResponse.json({ error: 'Telefone obrigatório' }, { status: 400 })
      const suffix = telefone.replace(/\D/g, '').slice(-8)
      const { data, error } = await supabase
        .from('leads')
        .update({ em_ligacao: false })
        .like('telefone', `%${suffix}%`)
        .select('id, telefone, em_ligacao')
      if (error) throw error
      return NextResponse.json({ data, rows: data?.length ?? 0 })
    }

    if (action === 'ver_estado_banco') {
      const tabelas = ['leads', 'contatos_referidos', 'sessao_wpp', 'leads_m4_flag', 'ana_memoria', 'ana_padroes', 'pagamentos', 'pagamentos_recorrentes', 'mensagens_whatsapp', 'historico_voz'] as const
      const contagens: Record<string, number> = {}
      for (const tabela of tabelas) {
        const { count } = await supabase.from(tabela).select('*', { count: 'exact', head: true })
        contagens[tabela] = count ?? 0
      }
      const total = Object.values(contagens).reduce((a, b) => a + b, 0)
      return NextResponse.json({ contagens, total })
    }

    if (action === 'limpar_memoria_ana') {
      const { data, error } = await supabase
        .from('ana_memoria')
        .delete()
        .gte('created_at', '2000-01-01')
        .select('id')
      if (error) throw error
      await supabase.from('ana_padroes').delete().gte('created_at', '2000-01-01')
      return NextResponse.json({ data, rows: data?.length ?? 0, tabelas: ['ana_memoria', 'ana_padroes'] })
    }

    if (action === 'limpar_ana_master') {
      const { count: c1 } = await supabase.from('ana_memories').select('id', { count: 'exact', head: true })
      const { count: c2 } = await supabase.from('ana_calls').select('id', { count: 'exact', head: true })
      await supabase.from('ana_memories').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('ana_calls').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      return NextResponse.json({
        rows: (c1 ?? 0) + (c2 ?? 0),
        tabelas: ['ana_memories', 'ana_calls'],
        detalhes: { ana_memories: c1 ?? 0, ana_calls: c2 ?? 0 },
      })
    }

    if (action === 'limpar_pagamentos') {
      const { data: p1 } = await supabase.from('pagamentos').delete().gte('created_at', '2000-01-01').select('id')
      const { data: p2 } = await supabase.from('pagamentos_recorrentes').delete().gte('created_at', '2000-01-01').select('id')
      const { data: p3 } = await supabase
        .from('leads')
        .update({ status_pagamento: null, tentativas_pagamento: 0, payment_token: null, metodo_pagamento: null })
        .gte('created_at', '2000-01-01')
        .select('id')
      const rows = (p1?.length ?? 0) + (p2?.length ?? 0) + (p3?.length ?? 0)
      return NextResponse.json({ rows, tabelas: ['pagamentos', 'pagamentos_recorrentes', 'leads (campos pagamento)'] })
    }

    if (action === 'reset_total') {
      const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12] = await Promise.all([
        supabase.from('leads').delete().gte('created_at', '2000-01-01').select('id'),
        supabase.from('contatos_referidos').delete().gte('created_at', '2000-01-01').select('id'),
        supabase.from('leads_m4_flag').delete().gte('created_at', '2000-01-01').select('telefone'),
        supabase.from('ana_memoria').delete().gte('created_at', '2000-01-01').select('id'),
        supabase.from('ana_padroes').delete().gte('created_at', '2000-01-01').select('id'),
        supabase.from('pagamentos').delete().gte('created_at', '2000-01-01').select('id'),
        supabase.from('pagamentos_recorrentes').delete().gte('created_at', '2000-01-01').select('id'),
        supabase.from('mensagens_whatsapp').delete().gte('ts', '2000-01-01').select('id'),
        supabase.from('historico_voz').delete().gte('created_at', '2000-01-01').select('id'),
        supabase.from('sessao_wpp').delete().gte('created_at', '2000-01-01').select('phone'),
        supabase.from('ana_memories').delete().gte('created_at', '2000-01-01').select('id'),
        supabase.from('ana_calls').delete().gte('created_at', '2000-01-01').select('id'),
      ])
      const rows = [r1,r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12].reduce((s,r) => s + (r.data?.length ?? 0), 0)
      return NextResponse.json({ rows, detalhes: { leads: r1.data?.length ?? 0, referidos: r2.data?.length ?? 0, m4_flag: r3.data?.length ?? 0, memoria: r4.data?.length ?? 0, padroes: r5.data?.length ?? 0, pagamentos: r6.data?.length ?? 0, recorrentes: r7.data?.length ?? 0, mensagens: r8.data?.length ?? 0, historico_voz: r9.data?.length ?? 0, sessao_wpp: r10.data?.length ?? 0, ana_memories: r11.data?.length ?? 0, ana_calls: r12.data?.length ?? 0 } })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
