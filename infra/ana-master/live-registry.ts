// Registry of active GPT-Live sessions by callSid.
// Mirrors session-registry.ts but uses Live API events instead of Realtime events.

type LiveRef = {
  sendToLive: (event: object) => void
  setTokenIndicacao: (token: string) => void
  setReferidosNotificados: () => void
}

const registry = new Map<string, LiveRef>()

export function registerLiveSession(callSid: string, ref: LiveRef) {
  registry.set(callSid, ref)
  console.log(`[LIVE_REGISTRY] registered callSid=${callSid}`)
}

export function unregisterLiveSession(callSid: string) {
  registry.delete(callSid)
  console.log(`[LIVE_REGISTRY] unregistered callSid=${callSid}`)
}

function send(callSid: string, event: object): boolean {
  const ref = registry.get(callSid)
  if (!ref) {
    console.log(`[LIVE_REGISTRY] callSid=${callSid} not in registry`)
    return false
  }
  ref.sendToLive(event)
  return true
}

export function injectLivePaymentConfirmed(callSid: string): boolean {
  console.log(`[LIVE_REGISTRY] 💰 payment confirmed callSid=${callSid}`)
  return send(callSid, {
    type: 'session.commentary.append',
    event_id: `payment_${Date.now()}`,
    delegation_id: null,
    content: 'O pagamento foi confirmado agora. Celebre com a lead de forma natural e avance para a etapa de indicações de amigas.',
  })
}

export function injectLivePixDataSent(callSid: string, metodo: 'pix' | 'cartao'): boolean {
  console.log(`[LIVE_REGISTRY] 💳 pix/cartao sent callSid=${callSid} metodo=${metodo}`)
  const content = metodo === 'cartao'
    ? 'O link de pagamento chegou agora no WhatsApp da lead. Diga naturalmente que o link chegou e que ela pode finalizar com segurança.'
    : 'Os dados do PIX chegaram agora no WhatsApp da lead. Diga que ela pode copiar a chave e colar no banco, e que você aguarda a confirmação do pagamento.'
  return send(callSid, {
    type: 'session.commentary.append',
    event_id: `pix_${Date.now()}`,
    delegation_id: null,
    content,
  })
}

export function injectLiveReferralLinkSent(callSid: string, token?: string): boolean {
  console.log(`[LIVE_REGISTRY] 🔗 referral link sent callSid=${callSid} token=${token}`)
  const ref = registry.get(callSid)
  if (!ref) {
    console.log(`[LIVE_REGISTRY] callSid=${callSid} not in registry`)
    return false
  }
  // Mark token in session state so delegation handler won't send the link again
  if (token) ref.setTokenIndicacao(token)
  ref.sendToLive({
    type: 'session.commentary.append',
    event_id: `referral_link_${Date.now()}`,
    delegation_id: null,
    content: 'O link de indicações foi enviado no WhatsApp da lead. Pergunte se ela conhece amigas que também podem se beneficiar do tratamento. Aguarde a confirmação positiva dela. Somente após ela confirmar, diga que o link já chegou no WhatsApp dela. Explique: abrir o link, tocar em Importar amigas pelo WhatsApp, selecionar as amigas e enviar. Meta: 20 indicações.',
  })
  return true
}

export function injectLiveReferidosUpdate(callSid: string, total: number, semDados: number, semMensagem: number, missaoCompleta: boolean): boolean {
  console.log(`[LIVE_REGISTRY] 👥 referidos update callSid=${callSid} total=${total} semDados=${semDados} semMensagem=${semMensagem} missaoCompleta=${missaoCompleta}`)

  // Mark that real contacts arrived — unblocks verificar_referidos for this session
  const ref = registry.get(callSid)
  if (ref) ref.setReferidosNotificados()

  // When total >= 20, semDados = 0 and only messages remain: stay silent.
  // The lead is sending messages from the web — injecting commentary on every send creates a loop.
  // Only speak when missaoCompleta or when contacts/data are still missing.
  if (total >= 20 && semDados === 0 && !missaoCompleta) {
    return true
  }

  let content: string
  if (missaoCompleta) {
    content = `Perfeito, missão cumprida! Você indicou 20 amigas — nossa equipe vai entrar em contato com cada uma. Foi um prazer enorme falar com você!`
  } else if (total >= 20 && semDados > 0) {
    content = `Ficou ótimo! Você enviou ${total} amigas — meta batida! Mas ${semDados} ainda estão sem profissão preenchida. Consegue completar no link? É rapidinho.`
  } else if (total < 20) {
    content = `Você enviou ${total} de 20 amigas. Faltam ${20 - total}. Consegue selecionar mais?`
  } else {
    return true
  }
  // Lock state before commentary: prevent Ana from restarting "Posso te pedir um favor?" flow
  send(callSid, {
    type: 'session.thinking.append',
    event_id: `ref_lock_${Date.now()}`,
    delegation_id: null,
    content: JSON.stringify({
      estado: 'REFERIDOS_EM_ANDAMENTO',
      link_enviado: true,
      favor_ja_pedido_e_confirmado: true,
      instrucao: 'NAO repita "Posso te pedir um favor?" nem a fala de melhores decisoes. Voce ja disse isso. Apenas comente o progresso dos contatos recebidos.',
    }),
  })
  // commentary.append: Ana speaks this immediately when contacts arrive (no delegation needed)
  return send(callSid, {
    type: 'session.commentary.append',
    event_id: `referidos_${Date.now()}`,
    delegation_id: null,
    content,
  })
}
