import { verifyPayment, checkReferidos, setCallStatusGanho, recordGatePassed, updateCallStage, saveMemory, getMemories } from './supabase.js'
import { GateId, GATE_TRANSITIONS, STAGE_INSTRUCTIONS, Stage } from './state-machine.js'
import { sendWelcome } from './tools/whatsapp.js'

export interface GateEvidence {
  // GATE_ABERTURA
  nome_confirmado?: boolean
  referida_confirmada?: boolean
  disponibilidade_confirmada?: boolean
  // GATE_CONEXAO
  rotina_compreendida?: boolean
  sintomas_identificados?: boolean
  dor_prioritaria?: boolean
  personalizacao_possivel?: boolean
  interesse_confirmado?: boolean
  // GATE_COMBINADO
  permissao_combinado?: boolean
  combinado_confirmado?: boolean
  decisao_saude_respondida?: boolean
  viagem_respondida?: boolean
  pendencia_decisor?: boolean
  // GATE_SPEECH
  parte1_entregue?: boolean
  parte2_entregue?: boolean
  parte3_entregue?: boolean
  parte4_entregue?: boolean
  pergunta_final_feita?: boolean
  resposta_lead_recebida?: boolean
  interesse_pos_speech?: boolean
  interesse_protocolo?: string
  // GATE_FECHAMENTO
  investimento_apresentado?: boolean
  forma_pagamento_escolhida?: 'pix' | 'cartao'
  parcelamento_6x_mencionado?: boolean
  // GATE_PAGAMENTO (server verifies independently)
  telefone?: string
  // GATE_REFERIDOS
  token_indicacao?: string
  // GATE_VALIDACAO
  negativas_verificadas?: boolean
}

export interface GateResult {
  approved: boolean
  reason: string
  next_stage?: Stage
  next_instructions?: string
}

export async function validateGate(
  gateId: GateId,
  evidence: GateEvidence,
  callSid: string,
): Promise<GateResult> {
  const { to: nextStage } = GATE_TRANSITIONS[gateId]

  switch (gateId) {
    case 'GATE_ABERTURA': {
      if (!evidence.nome_confirmado) return { approved: false, reason: 'Nome da lead não foi confirmado.' }
      if (!evidence.referida_confirmada) return { approved: false, reason: 'Quem indicou não foi identificado.' }
      if (!evidence.disponibilidade_confirmada) return { approved: false, reason: 'Lead não confirmou disponibilidade para a ligação.' }
      break
    }

    case 'GATE_CONEXAO': {
      if (!evidence.rotina_compreendida) return { approved: false, reason: 'Contexto de vida/rotina não foi compreendido — continue ouvindo.' }
      if (!evidence.sintomas_identificados) return { approved: false, reason: 'Sintomas ou queixas da lead não foram identificados.' }
      if (!evidence.dor_prioritaria) return { approved: false, reason: 'ANA ainda não identificou o que mais incomoda a lead hoje.' }
      if (!evidence.personalizacao_possivel) return { approved: false, reason: 'Não há contexto suficiente para personalizar a apresentação.' }
      if (!evidence.interesse_confirmado) return { approved: false, reason: 'Lead ainda não confirmou que quer entender como funciona o implante.' }
      break
    }

    case 'GATE_COMBINADO': {
      if (!evidence.permissao_combinado)
        return { approved: false, reason: 'Permissão para o combinado não foi pedida.' }
      if (!evidence.combinado_confirmado)
        return { approved: false, reason: 'Lead não confirmou o contrato do combinado.' }
      if (!evidence.decisao_saude_respondida)
        return { approved: false, reason: 'Pergunta sobre autonomia de decisão não foi feita.' }
      if (!evidence.viagem_respondida)
        return { approved: false, reason: 'Pergunta sobre viagem não foi feita.' }
      if (evidence.pendencia_decisor)
        return { approved: false, reason: 'GATE BLOQUEADO — lead depende de terceiro para decidir. Seguir branch decisor compartilhado.' }
      break
    }

    case 'GATE_SPEECH': {
      if (!evidence.parte1_entregue)
        return { approved: false, reason: 'Parte 1 não entregue — personalização com dor/impacto da lead.' }
      if (!evidence.parte2_entregue)
        return { approved: false, reason: 'Parte 2 não entregue — explicação do implante.' }
      if (!evidence.parte3_entregue)
        return { approved: false, reason: 'Parte 3 não entregue — benefícios conectados ao contexto da lead.' }
      if (!evidence.parte4_entregue)
        return { approved: false, reason: 'Parte 4 não entregue — duração/continuidade do protocolo.' }
      if (!evidence.pergunta_final_feita)
        return { approved: false, reason: 'Pergunta final obrigatória não foi feita.' }
      if (!evidence.resposta_lead_recebida)
        return { approved: false, reason: 'A resposta da lead à pergunta final ainda não foi recebida.' }
      if (!evidence.interesse_pos_speech)
        return { approved: false, reason: 'Lead ainda não demonstrou interesse suficiente para avançar.' }
      break
    }

    case 'GATE_FECHAMENTO': {
      if (!evidence.investimento_apresentado) return { approved: false, reason: 'Investimento de R$ 5.000 não apresentado.' }
      if (!evidence.forma_pagamento_escolhida) return { approved: false, reason: 'Lead não escolheu forma de pagamento (PIX ou cartão). Continue na etapa.' }
      if (evidence.parcelamento_6x_mencionado === false) {
        return { approved: false, reason: 'Parcelamento deve ser apresentado como ATÉ 6X SEM JUROS — nunca 12x.' }
      }
      await saveMemory(callSid, 'forma_pagamento_escolhida', evidence.forma_pagamento_escolhida)
      break
    }

    case 'GATE_PAGAMENTO': {
      // Always verify server-side from Supabase — never trust model report alone
      if (!evidence.telefone) return { approved: false, reason: 'Telefone necessário para verificar pagamento.' }
      const pago = await verifyPayment(evidence.telefone)
      if (!pago) return { approved: false, reason: 'Pagamento ainda não confirmado no sistema. Continue aguardando.' }
      break
    }

    case 'GATE_REFERIDOS': {
      if (!evidence.token_indicacao) return { approved: false, reason: 'Token de indicação não encontrado. Link foi enviado?' }
      const ref = await checkReferidos(evidence.token_indicacao)
      if (!ref.missaoCompleta) {
        if (ref.semDados > 0) {
          return { approved: false, reason: `${ref.semDados} indicadas ainda sem profissão/hobby. Peça para a lead completar no link.` }
        }
        return { approved: false, reason: `Meta de 20 indicadas ainda não atingida. Aguarde o formulário ser completado.` }
      }
      break
    }

    case 'GATE_VALIDACAO': {
      // C1: Negatives filter executed (server trusts model report — post-dispatch)
      if (!evidence.negativas_verificadas) {
        return { approved: false, reason: 'Verificação de negativas não executada. Confirme se alguma indicada recusou contato.' }
      }
      // C2: Referidos semDados=0 — recheck from DB via token
      if (evidence.token_indicacao) {
        const ref = await checkReferidos(evidence.token_indicacao)
        if (!ref.missaoCompleta) {
          return { approved: false, reason: `Referidos incompletos. semDados=${ref.semDados}. Missão não concluída.` }
        }
      }
      // C3+C4: Set GANHO — this is the ONLY point in the system that writes GANHO
      await setCallStatusGanho(callSid)
      // C5: Send welcome message
      const memories = await getMemories(callSid)
      const telefoneRaw = (memories.telefone as string) ?? ''
      if (telefoneRaw) await sendWelcome(telefoneRaw)
      break
    }
  }

  // Gate passed — persist and return next stage instructions
  await recordGatePassed(callSid, gateId)
  await updateCallStage(callSid, nextStage)

  return {
    approved: true,
    reason: `${gateId} aprovado.`,
    next_stage: nextStage,
    next_instructions: STAGE_INSTRUCTIONS[nextStage],
  }
}
