// Registry of active Realtime transport sessions by callSid.
// Used to inject payment confirmations into live calls.

type TransportRef = {
  sendEvent: (event: object) => void
}

const registry = new Map<string, TransportRef>()

export function registerSession(callSid: string, transport: TransportRef) {
  registry.set(callSid, transport)
  console.log(`[SESSION_REGISTRY] registered callSid=${callSid}`)
}

export function unregisterSession(callSid: string) {
  registry.delete(callSid)
  console.log(`[SESSION_REGISTRY] unregistered callSid=${callSid}`)
}

export function injectPaymentConfirmed(callSid: string): boolean {
  const transport = registry.get(callSid)
  if (!transport) {
    console.log(`[SESSION_REGISTRY] callSid=${callSid} not found in registry — call may have ended`)
    return false
  }
  console.log(`[SESSION_REGISTRY] 💰 injecting payment confirmation for callSid=${callSid}`)
  transport.sendEvent({
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{
        type: 'input_text',
        text: '[PAGAMENTO CONFIRMADO: O sistema confirmou o pagamento agora. Celebre naturalmente com a lead e avance para a etapa de referidos. Não mencione sistema, ferramenta ou qualquer mecanismo técnico.]',
      }],
    },
  })
  transport.sendEvent({ type: 'response.create' })
  return true
}

export function injectPixDataSent(callSid: string, metodo: 'pix' | 'cartao'): boolean {
  const transport = registry.get(callSid)
  if (!transport) return false
  console.log(`[SESSION_REGISTRY] 💳 injecting PIX/cartão data sent for callSid=${callSid} metodo=${metodo}`)
  const text = metodo === 'cartao'
    ? '[LINK CARTÃO ENVIADO: O link de pagamento chegou agora no WhatsApp da lead. Diga naturalmente: "Vi que o link chegou pra você — pode abrir e finalizar com segurança que eu aguardo aqui." Não mencione sistema, ferramenta ou qualquer mecanismo técnico.]'
    : '[PIX ENVIADO: Os dados de pagamento chegaram agora no WhatsApp da lead. Diga naturalmente: "Vi que você recebeu os dados — pode copiar a chave e colar no seu banco que eu aguardo aqui. Assim que pagar, me avisa pra gente seguir." Não mencione sistema, ferramenta ou qualquer mecanismo técnico.]'
  transport.sendEvent({
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text }],
    },
  })
  transport.sendEvent({ type: 'response.create' })
  return true
}

export function injectReferralLinkSent(callSid: string): boolean {
  const transport = registry.get(callSid)
  if (!transport) return false
  console.log(`[SESSION_REGISTRY] 🔗 injecting referral link confirmation for callSid=${callSid}`)
  transport.sendEvent({
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{
        type: 'input_text',
        text: '[LINK DE INDICAÇÕES ENVIADO: O sistema acabou de enviar o link de indicações para o WhatsApp da lead agora mesmo. Diga naturalmente: "Que bom! O link já foi pro seu WhatsApp agora mesmo. Pode abrir?" e então guie-a: "No link, toca em Importar amigas pelo WhatsApp, seleciona suas amigas e toca em Enviar. Depois volte para o link e seus contatos aparecerão automaticamente." Fique em silêncio aguardando — você receberá atualizações automáticas do sistema quando os contatos chegarem. Não chame verificar_referidos() nem pergunte quantos enviou. Não mencione sistema, ferramenta ou mecanismo técnico.]',
      }],
    },
  })
  transport.sendEvent({ type: 'response.create' })
  return true
}

export function injectReferidosUpdate(callSid: string, total: number, semDados: number, missaoCompleta: boolean): boolean {
  const transport = registry.get(callSid)
  if (!transport) {
    console.log(`[SESSION_REGISTRY] callSid=${callSid} não encontrado para referidos update`)
    return false
  }
  console.log(`[SESSION_REGISTRY] 👥 injecting referidos update callSid=${callSid} total=${total} semDados=${semDados} missaoCompleta=${missaoCompleta}`)

  let text: string
  if (missaoCompleta) {
    text = `[REFERIDOS COMPLETOS: A lead completou as 20 indicações com todos os dados preenchidos. Celebre naturalmente: "Perfeito, missão cumprida! Você indicou 20 amigas — nossa equipe vai entrar em contato com cada uma delas. Foi um prazer falar com você!" e encerre a ligação com carinho. Não mencione sistema ou ferramenta.]`
  } else if (total >= 20 && semDados > 0) {
    text = `[REFERIDOS ATUALIZAÇÃO: A lead já enviou ${total} amigas — meta atingida! Mas ${semDados} ainda estão sem profissão e hobby. Diga naturalmente: "Que ótimo, você já tem ${total} amigas enviadas! Só falta preencher a profissão e o hobby de cada uma no link — é rapidinho, pode fazer agora?" Aguarde silenciosamente. Não mencione sistema ou ferramenta.]`
  } else {
    const faltam = 20 - total
    text = `[REFERIDOS ATUALIZAÇÃO: A lead acabou de enviar contatos. Total atual: ${total} de 20 amigas indicadas, faltam ${faltam}. Diga naturalmente: "Recebi ${total} amigas suas — faltam só ${faltam} para completar!" e incentive ela a continuar. Não mencione sistema ou ferramenta.]`
  }

  transport.sendEvent({
    type: 'conversation.item.create',
    item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
  })
  transport.sendEvent({ type: 'response.create' })
  return true
}
