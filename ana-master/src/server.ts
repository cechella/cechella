import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { PORT, PUBLIC_HOST } from './config.js'
import { createAnaMasterSession } from './realtime.js'

const app = Fastify({ logger: true })

await app.register(websocket)

app.get('/health', async () => ({
  ok: true,
  service: 'ana-master',
  ts: new Date().toISOString(),
}))

// Twilio webhook — returns TwiML connecting call to Media Stream WebSocket
app.post('/twiml', async (req, reply) => {
  const body = req.body as Record<string, string>
  const callSid = body?.CallSid ?? 'unknown'
  const from = (body?.From ?? '').replace(/\D/g, '')
  const host = PUBLIC_HOST.replace(/^https?:\/\//, '')

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${host}/media-stream">
      <Parameter name="callSid" value="${callSid}" />
      <Parameter name="from" value="${from}" />
    </Stream>
  </Connect>
</Response>`

  reply.header('Content-Type', 'text/xml')
  return reply.send(twiml)
})

// Twilio Media Streams WebSocket handler
app.get('/media-stream', { websocket: true }, (socket, _req) => {
  app.log.info('Twilio Media Stream connected')

  let callSid = 'unknown'
  let telefone = ''
  let sessionStarted = false

  socket.on('message', async (raw: Buffer) => {
    let msg: Record<string, any>
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }

    // First message from Twilio is always 'start' — contains metadata
    if (msg.event === 'start' && !sessionStarted) {
      sessionStarted = true
      callSid = msg.start?.callSid ?? msg.start?.customParameters?.callSid ?? 'unknown'
      telefone = String(msg.start?.customParameters?.from ?? '').replace(/\D/g, '')

      try {
        await createAnaMasterSession(socket, callSid, telefone)
        app.log.info({ callSid, telefone }, 'ANA MASTER session started')
      } catch (err) {
        app.log.error({ err, callSid }, 'Failed to start RealtimeSession — closing stream')
        socket.destroy()
      }
    }
  })

  socket.on('close', () => {
    app.log.info({ callSid }, 'Media Stream closed')
  })

  socket.on('error', (err: Error) => {
    app.log.error({ err, callSid }, 'Media Stream error')
  })
})

// Parse Twilio's application/x-www-form-urlencoded webhook bodies
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

await app.listen({ port: PORT, host: '0.0.0.0' })
