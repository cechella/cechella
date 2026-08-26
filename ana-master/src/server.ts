import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { PORT, PUBLIC_HOST } from './config.js'
import { createAnaMasterSession } from './realtime.js'
import { registerSseClient } from './sse-registry.js'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER!

const app = Fastify({ logger: true })

await app.register(websocket)

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
  const phone = numero.startsWith('55') ? numero : `55${numero}`
  const { supabase: sb } = await import('./supabase.js')
  await sb.from('leads').upsert(
    { telefone: phone, etapa: 'apresentacao', etapa_agente: 1, origem: 'ptl', updated_at: new Date().toISOString() },
    { onConflict: 'telefone' }
  )

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
