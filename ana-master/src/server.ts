import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { PORT, PUBLIC_HOST } from './config.js'
import { createAnaMasterSession } from './realtime.js'
import { registerSseClient } from './sse-registry.js'
import { supabase, saveMemory } from './supabase.js'
import { injectPaymentConfirmed, injectReferralLinkSent, injectPixDataSent, injectReferidosUpdate } from './session-registry.js'
import { iniciarColetaReferidos } from './tools/whatsapp.js'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER!

const app = Fastify({ logger: true })

await app.register(websocket)

// Global payment confirmation listener — fires as soon as MercadoPago webhook updates pagamentos.status=approved.
// Injects a context message into the active Realtime session so Ana reacts naturally without any blocking.
supabase
  .channel('payment-confirmations')
  .on(
    'postgres_changes' as any,
    { event: 'UPDATE', schema: 'public', table: 'pagamentos' },
    (payload: any) => {
      const { call_sid, status, lead_telefone } = payload.new ?? {}
      if (status === 'approved' && call_sid) {
        console.log(`[SERVER] 💰 pagamento aprovado call_sid=${call_sid} — enviando link referidos + injetando confirmação`)
        // Auto-send referral link via WhatsApp before injecting into session
        if (lead_telefone) {
          iniciarColetaReferidos(lead_telefone)
            .then(r => {
              console.log(`[SERVER] referidos link enviado token=${r?.token ?? 'null'}`)
              if (r?.token) {
                saveMemory(call_sid, 'token_indicacao', r.token).catch(() => {})
                injectReferralLinkSent(call_sid)
              }
            })
            .catch(e => console.error(`[SERVER] referidos link erro: ${e.message}`))
        }
        injectPaymentConfirmed(call_sid)
      }
    },
  )
  .subscribe((status: string) => {
    console.log(`[SERVER] payment listener status=${status}`)
  })

// PIX/cartão data sent listener — fires as soon as a new payment row is inserted in pagamentos.
// Same pattern as payment-confirmations: Supabase Realtime → inject into active session, no HTTP dependency.
supabase
  .channel('pix-data-sent')
  .on(
    'postgres_changes' as any,
    { event: 'INSERT', schema: 'public', table: 'pagamentos' },
    (payload: any) => {
      const { call_sid, metodo } = payload.new ?? {}
      if (call_sid && metodo) {
        console.log(`[SERVER] 💳 PIX/cartão inserido call_sid=${call_sid} metodo=${metodo} — injetando notificação`)
        injectPixDataSent(call_sid, metodo as 'pix' | 'cartao')
      }
    },
  )
  .subscribe((status: string) => {
    console.log(`[SERVER] pix-data-sent listener status=${status}`)
  })

// Referidos real-time listener — fires when a contact is inserted in contatos_referidos.
// Looks up the active call for that lead's phone and injects the updated count into Ana's session.
supabase
  .channel('referidos-inserts')
  .on(
    'postgres_changes' as any,
    { event: 'INSERT', schema: 'public', table: 'contatos_referidos' },
    async (payload: any) => {
      const indicadorPhone = payload.new?.indicado_por_telefone as string | undefined
      if (!indicadorPhone) return

      // Find active call for this lead
      const digits = String(indicadorPhone).replace(/\D/g, '')
      const bare = digits.replace(/^55/, '')
      const { data: call } = await supabase
        .from('ana_calls')
        .select('call_sid')
        .eq('em_ligacao', true)
        .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${bare}`)
        .maybeSingle()

      if (!call?.call_sid) return

      // Count total referidos and semDados for this lead
      const { data: refs } = await supabase
        .from('contatos_referidos')
        .select('profissao, hobby, status')
        .or(`indicado_por_telefone.eq.${digits},indicado_por_telefone.eq.55${digits},indicado_por_telefone.eq.${bare}`)

      if (!refs) return
      const ativos = refs.filter((r: any) => r.status !== 'recusou')
      const semDados = ativos.filter((r: any) => !r.profissao || !r.hobby).length
      const total = ativos.length
      const missaoCompleta = total >= 20 && semDados === 0

      console.log(`[SERVER] 👥 referidos update call_sid=${call.call_sid} total=${total} semDados=${semDados} missaoCompleta=${missaoCompleta}`)
      injectReferidosUpdate(call.call_sid, total, semDados, missaoCompleta)
    },
  )
  .subscribe((status: string) => {
    console.log(`[SERVER] referidos listener status=${status}`)
  })

// Parse Twilio's application/x-www-form-urlencoded webhook bodies
// Must be registered BEFORE any routes that consume this content type
app.addContentTypeParser(
  'application/x-www-form-urlencoded',
  { parseAs: 'string' },
  (_req, body, done) => {
    try {
      done(null, Object.fromEntries(new URLSearchParams(body as string)))
    } catch (err: any) {
      done(err)
    }
  },
)

app.get('/health', async () => ({
  ok: true,
  service: 'ana-master',
  ts: new Date().toISOString(),
}))

// Twilio webhook — returns TwiML connecting call to Media Stream WebSocket
app.post('/twiml', async (req, reply) => {
  const body = req.body as Record<string, string>
  const query = req.query as Record<string, string>
  const callSid = body?.CallSid ?? 'unknown'
  // For outbound calls: lead's number is in query.numero (set by /outbound).
  // body.From = Twilio number; body.To = lead number — but query.numero is unambiguous.
  const from = (query?.numero ?? body?.From ?? '').replace(/\D/g, '')
  const contexto = query?.contexto ?? ''          // passed via URL query from /outbound
  const host = PUBLIC_HOST.replace(/^https?:\/\//, '')

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${host}/media-stream">
      <Parameter name="callSid" value="${callSid}" />
      <Parameter name="from" value="${from}" />
      <Parameter name="contexto" value="${contexto}" />
    </Stream>
  </Connect>
</Response>`

  reply.header('Content-Type', 'text/xml')
  return reply.send(twiml)
})

// Twilio Media Streams WebSocket handler
app.get('/media-stream', { websocket: true }, (socket, req) => {
  const query = req.query as Record<string, string>
  const contexto = query?.contexto ?? ''
  app.log.info({ contexto }, 'Twilio Media Stream connected')

  // TwilioRealtimeTransportLayer needs the raw ws.WebSocket (has addEventListener).
  // Fastify gives us a SocketStream wrapper — socket.socket is the actual ws instance.
  const rawWs = (socket as any).socket

  // Create session immediately so the Transport sees all events including 'start'
  // (it uses 'start' to capture streamSid, required for sending audio back).
  createAnaMasterSession(rawWs, { contexto })
    .then(() => { app.log.info({ contexto }, 'ANA MASTER session started') })
    .catch((err: unknown) => {
      app.log.error({ err }, 'Failed to start RealtimeSession — closing stream')
      socket.destroy()
    })

  socket.on('close', () => { app.log.info('Media Stream closed') })
  socket.on('error', (err: Error) => { app.log.error({ err }, 'Media Stream error') })
})

// Outbound call — Admin dispara ligação para lead
app.post('/outbound', async (req, reply) => {
  const body = req.body as Record<string, string>
  const numero = (body?.numero ?? '').replace(/\D/g, '')
  const referidor = body?.referidor ?? ''
  const contexto = body?.contexto ?? ''

  if (!numero) return reply.status(400).send({ error: 'numero obrigatório' })

  const to = numero.startsWith('+') ? numero : `+${numero}`

  const twimlUrl = new URL(`${PUBLIC_HOST}/twiml`)
  twimlUrl.searchParams.set('numero', numero)   // lead's number — From/To are swapped in outbound
  if (referidor) twimlUrl.searchParams.set('referidor', referidor)
  if (contexto) twimlUrl.searchParams.set('contexto', contexto)

  const recordingCallback = `${PUBLIC_HOST}/recording-status`

  const params = new URLSearchParams({
    To: to,
    From: TWILIO_PHONE_NUMBER,
    Url: twimlUrl.toString(),
    Method: 'POST',
    Record: 'true',
    RecordingChannels: 'dual',
    RecordingStatusCallback: recordingCallback,
    RecordingStatusCallbackMethod: 'POST',
  })

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')

  const res = await fetch(twilioUrl, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = await res.json() as any
  if (!res.ok) return reply.status(res.status).send({ error: data?.message ?? 'Twilio error' })

  app.log.info({ sid: data.sid, to }, 'Outbound call initiated')

  // Garante que o lead existe na tabela leads antes da ligação começar
  // Sem isso, o CRM fica vazio quando o banco está zerado
  // telefone não tem UNIQUE constraint — não podemos usar upsert, usamos insert condicional
  const phone = numero.startsWith('55') ? numero : `55${numero}`
  const bare = phone.replace(/^55/, '')
  const { supabase: sb } = await import('./supabase.js')
  const { data: existingLead } = await sb.from('leads').select('id')
    .or(`telefone.eq.${phone},telefone.eq.${bare}`)
    .maybeSingle()
  if (!existingLead) {
    await sb.from('leads').insert({
      telefone: phone, etapa: 'apresentacao', etapa_agente: 1, origem: 'ptl',
    })
  }

  return reply.send({ ok: true, sid: data.sid, status: data.status })
})


// Twilio recording status callback — saves audio URL to Supabase when recording is ready
app.post('/recording-status', async (req, reply) => {
  const body = req.body as Record<string, string>
  const callSid = body?.CallSid
  const status = body?.RecordingStatus
  const url = body?.RecordingUrl

  app.log.info({ callSid, status, url }, 'Recording status callback')

  if (status === 'completed' && callSid && url) {
    const audioUrl = `${url}.mp3`
    const { saveMemory } = await import('./supabase.js')
    await saveMemory(callSid, 'audio_url', audioUrl).catch((e: unknown) =>
      app.log.error({ e }, 'Failed to save recording URL')
    )
    app.log.info({ callSid, audioUrl }, 'Recording URL saved')
  }

  return reply.status(204).send()
})

// Internal endpoint — called by web/Vercel route after sending PIX/cartão data to lead's WhatsApp
// Injects a natural notification into Ana's active Realtime session
app.post('/inject-pix-sent', async (req, reply) => {
  const body = req.body as Record<string, string>
  const callSid = body?.callSid
  const metodo = (body?.metodo ?? 'pix') as 'pix' | 'cartao'
  if (!callSid) return reply.status(400).send({ error: 'callSid obrigatório' })
  const ok = injectPixDataSent(callSid, metodo)
  console.log(`[SERVER] /inject-pix-sent callSid=${callSid} metodo=${metodo} ok=${ok}`)
  return reply.send({ ok })
})

// SSE live transcript stream — browser connects here to receive real-time turns
app.get('/transcript-stream/:callSid', (req, reply) => {
  const { callSid } = req.params as { callSid: string }

  reply.raw.setHeader('Content-Type', 'text/event-stream')
  reply.raw.setHeader('Cache-Control', 'no-cache')
  reply.raw.setHeader('Connection', 'keep-alive')
  reply.raw.setHeader('Access-Control-Allow-Origin', '*')
  reply.raw.flushHeaders()

  // Heartbeat every 15s to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    try { reply.raw.write(': ping\n\n') } catch { clearInterval(heartbeat) }
  }, 15000)

  const unregister = registerSseClient(callSid, {
    write: (data: string) => reply.raw.write(data),
    close: () => reply.raw.end(),
  })

  req.raw.on('close', () => {
    clearInterval(heartbeat)
    unregister()
  })
})

await app.listen({ port: PORT, host: '0.0.0.0' })
