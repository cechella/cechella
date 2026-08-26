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
        text: '[LINK DE INDICAÇÕES ENVIADO: O sistema acabou de enviar o link de indicações para o WhatsApp da lead agora mesmo. Diga naturalmente: "Que bom! O link já foi pro seu WhatsApp agora mesmo. Pode abrir?" e então guie-a: "No link, toca em Importar amigas pelo WhatsApp, seleciona suas amigas e toca em Enviar." Aguarde ela completar e chame verificar_referidos() a cada 2 minutos. Não mencione sistema, ferramenta ou mecanismo técnico.]',
      }],
    },
  })
  transport.sendEvent({ type: 'response.create' })
  return true
}
