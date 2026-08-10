import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ETAPA_LABELS: Record<number, string> = {
  1: 'Apresentação', 2: 'Conexão', 3: 'D.I.', 4: 'Speech',
  5: 'Fechamento', 6: 'Referidos', 7: 'Validação', 8: 'Ganho',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    let telefone: string | undefined
    let callId: string | undefined

    if (body.message?.type === 'function-call') {
      telefone = body.message.functionCall?.parameters?.telefone
        || body.message.call?.customer?.number
        || body.message.call?.phoneNumber?.number
      callId = body.message.call?.id
    } else if (body.message?.type === 'tool-calls') {
      const tool = body.message.toolCallList?.find((t: any) => t.function?.name === 'get_lead_context')
      if (tool) {
        const params = typeof tool.function?.arguments === 'string'
          ? JSON.parse(tool.function.arguments)
          : (tool.function?.arguments || {})
        telefone = params.telefone
      }
      if (!telefone || String(telefone).replace(/\D/g, '').length < 8) {
        telefone = body.message.call?.customer?.number
          || body.message.call?.customer?.numberE164
          || body.telefone
          || body.message.call?.to
          || body.message.call?.from
      }
      callId = body.message.call?.id
    } else {
      telefone = body.telefone
        || body.call?.customer?.number
        || body.call?.phoneNumber?.number
      callId = body.call?.id
      // Also try toolCallList when type is absent
      if (!telefone && body.message?.toolCallList?.length) {
        const tool = body.message.toolCallList[0]
        const args = typeof tool.function?.arguments === 'string'
          ? JSON.parse(tool.function.arguments)
          : (tool.function?.arguments || {})
        if (!telefone) telefone = args.telefone
        if (!callId) callId = args.callId
      }
    }

    // If telefone is empty (VAPI apiRequest doesn't inject call context),
    // fall back to most recent active call in historico_voz (created by call-start serverUrl event)
    if (!telefone || String(telefone).replace(/\D/g, '').length < 8) {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { data: activeCall } = await supabase
        .from('historico_voz')
        .select('telefone, call_id')
        .is('duracao_segundos', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (activeCall?.telefone) {
        telefone = activeCall.telefone
        if (!callId) callId = activeCall.call_id
      }
    }

    if (!telefone || String(telefone).replace(/\D/g, '').length < 8) {
      return NextResponse.json({ result: 'Telefone não informado. Trate como novo lead.' })
    }

    const digits = String(telefone).replace(/\D/g, '')
    const telefoneNorm = digits.startsWith('55') ? digits : `55${digits}`

    const { data: leads } = await supabase
      .from('leads')
      .select('id, nome, etapa_agente, temperatura, dor_principal, origem, total_referidos')
      .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)
      .limit(1)

    let lead = leads?.[0]
    let etapa = 1

    if (!lead) {
      // Create lead immediately so it appears in CRM/Pipeline when call starts
      const { data: newLead } = await supabase.from('leads').insert({
        telefone: telefoneNorm,
        etapa: 'apresentacao',
        etapa_agente: 1,
        origem: 'vapi_voz',
        em_ligacao: true,
        updated_at: new Date().toISOString(),
      }).select('id').single()

      // Open historico_voz entry so call appears in Agente IA Voz monitor
      if (callId && newLead) {
        await supabase.from('historico_voz').insert({
          telefone: telefoneNorm,
          call_id: callId,
          etapa_inicio: 1,
          tentativas: 1,
        })
      }

      return NextResponse.json({
        result: JSON.stringify({
          status: 'novo_lead',
          telefone: telefoneNorm,
          etapa: 1,
          etapa_label: 'Apresentação',
          instrucao: 'Novo lead. Inicie pela apresentação do Hormone Ecosystem.',
        }),
      })
    }

    etapa = Number(lead.etapa_agente) || 1

    // Mark lead as in a voice call and open historico_voz entry
    await supabase.from('leads').update({ em_ligacao: true, updated_at: new Date().toISOString() }).eq('id', lead.id)

    if (callId) {
      await supabase.from('historico_voz').insert({
        telefone: telefoneNorm,
        call_id: callId,
        etapa_inicio: etapa,
        tentativas: 1,
      })
    }

    const totalReferidos = Number(lead.total_referidos) || 0
    const referidosFaltam = Math.max(0, 20 - totalReferidos)

    // Busca detalhes dos referidos quando na etapa 7
    let referidosDetalhe: any[] | null = null
    if (etapa === 7) {
      const { data: refs } = await supabase
        .from('contatos_referidos')
        .select('nome, profissao, hobby, status, mensagem_enviada')
        .eq('indicado_por_telefone', telefoneNorm.replace(/^55/, '') )
        .order('created_at', { ascending: true })

      // tenta também com 55 prefix se não achou
      const lista = refs?.length ? refs : (await supabase
        .from('contatos_referidos')
        .select('nome, profissao, hobby, status, mensagem_enviada')
        .eq('indicado_por_telefone', telefoneNorm)
        .order('created_at', { ascending: true })
      ).data

      if (lista?.length) {
        referidosDetalhe = lista.map(r => ({
          nome: r.nome,
          profissao: r.profissao || null,
          hobby: r.hobby || null,
          mensagem_enviada: r.mensagem_enviada ?? r.status === 'mensagem_enviada',
        }))
      }
    }

    const semProfissao = referidosDetalhe?.filter(r => !r.profissao || !r.hobby).length ?? 0
    const semMensagem = referidosDetalhe?.filter(r => !r.mensagem_enviada).length ?? 0

    let instrucao = etapa >= 3
      ? `Lead já está na etapa ${etapa} (${ETAPA_LABELS[etapa]}). Continue de onde parou, não repita apresentação.`
      : 'Inicie pelo rapport e apresentação do Hormone Ecosystem.'

    if (etapa === 7) {
      instrucao += ` Já indicou ${totalReferidos} contatos, faltam ${referidosFaltam} para completar 20.`
      if (semProfissao > 0) instrucao += ` ${semProfissao} referidos ainda sem profissão/hobby — colete essas informações.`
      if (semMensagem > 0) instrucao += ` ${semMensagem} referidos ainda não receberam a mensagem — certifique o envio.`
      if (referidosFaltam === 0 && semProfissao === 0 && semMensagem === 0) instrucao += ' Todos os 20 referidos completos com profissão, hobby e mensagem enviada. Avance para etapa 8 (ganho).'
    }

    return NextResponse.json({
      result: JSON.stringify({
        nome: lead.nome || null,
        telefone: telefoneNorm,
        etapa,
        etapa_label: ETAPA_LABELS[etapa] || 'Apresentação',
        temperatura: lead.temperatura || 'frio',
        dor_principal: lead.dor_principal || null,
        origem: lead.origem || null,
        total_referidos: totalReferidos,
        referidos_faltam: referidosFaltam,
        referidos_sem_profissao_hobby: semProfissao,
        referidos_sem_mensagem: semMensagem,
        referidos: referidosDetalhe,
        instrucao,
      }),
    })
  } catch (err: any) {
    console.error('get-lead error:', err)
    return NextResponse.json({ result: 'Erro ao buscar lead. Trate como novo.' })
  }
}
