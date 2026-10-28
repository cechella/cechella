/**
 * SIP/TLS server for WhatsApp Business Calling (Meta)
 *
 * Meta sends a SIP INVITE to this server when someone calls Gustavo's WhatsApp number.
 * We accept the call, exchange RTP audio, and bridge it to GPT Live 1 (createAnaLiveSession).
 *
 * Flow:
 *   Meta → SIP INVITE (TLS:5061) → 200 OK (SDP) → RTP audio ↔ GPT Live 1
 */

import * as tls from 'tls'
import * as dgram from 'dgram'
import * as fs from 'fs'
import { createAnaLiveSession } from './live.js'
import { PUBLIC_HOST } from './config.js'

export const SIP_PORT = 5061

// Derive local IP/hostname from PUBLIC_HOST
const LOCAL_HOST = PUBLIC_HOST.replace(/^https?:\/\//, '')

// RTP port pool (even ports only)
let _rtpPort = 20000
function allocRtpPort(): number {
  const p = _rtpPort
  _rtpPort += 2
  if (_rtpPort > 20200) _rtpPort = 20000
  return p
}

// ── SIP message parser ────────────────────────────────────────────────────────

interface SipMsg {
  firstLine: string
  headers: Record<string, string>
  body: string
}

function parseSip(raw: string): SipMsg {
  const lines = raw.split('\r\n')
  const headers: Record<string, string> = {}
  let bodyIdx = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '') { bodyIdx = i + 1; break }
    const c = lines[i].indexOf(':')
    if (c > 0) headers[lines[i].slice(0, c).trim().toLowerCase()] = lines[i].slice(c + 1).trim()
  }
  return {
    firstLine: lines[0],
    headers,
    body: bodyIdx >= 0 ? lines.slice(bodyIdx).join('\r\n') : '',
  }
}

// ── SDP helpers ───────────────────────────────────────────────────────────────

function parseSdpRtp(sdp: string): { ip: string; port: number } | null {
  const c = sdp.match(/^c=IN IP4 (.+)$/m)
  const m = sdp.match(/^m=audio (\d+)/m)
  if (!c || !m) return null
  return { ip: c[1].trim(), port: parseInt(m[1]) }
}

function makeSdp(localRtpPort: number): string {
  return [
    'v=0',
    `o=ana 0 0 IN IP4 ${LOCAL_HOST}`,
    's=ana-master',
    `c=IN IP4 ${LOCAL_HOST}`,
    't=0 0',
    `m=audio ${localRtpPort} RTP/AVP 0`,
    'a=rtpmap:0 PCMU/8000',
    'a=ptime:20',
    'a=sendrecv',
  ].join('\r\n') + '\r\n'
}

// ── RTP helpers ───────────────────────────────────────────────────────────────

let _rtpSeq = Math.floor(Math.random() * 0xffff)
let _rtpTs = Math.floor(Math.random() * 0xffffffff)
const RTP_SSRC = Math.floor(Math.random() * 0xffffffff)

function wrapRtp(pcmu: Buffer): Buffer {
  const hdr = Buffer.alloc(12)
  hdr[0] = 0x80
  hdr[1] = 0x00 // PT=0 PCMU
  hdr.writeUInt16BE(_rtpSeq++ & 0xffff, 2)
  hdr.writeUInt32BE(_rtpTs & 0xffffffff, 4)
  _rtpTs += pcmu.length
  hdr.writeUInt32BE(RTP_SSRC, 8)
  return Buffer.concat([hdr, pcmu])
}

// Strip 12-byte RTP header (basic, ignores extension/CSRC)
function stripRtp(pkt: Buffer): Buffer | null {
  if (pkt.length < 12) return null
  const cc = pkt[0] & 0x0f
  const offset = 12 + cc * 4
  const hasExt = (pkt[0] >> 4) & 0x01
  if (hasExt && pkt.length >= offset + 4) {
    const extLen = pkt.readUInt16BE(offset + 2)
    return pkt.slice(offset + 4 + extLen * 4)
  }
  return pkt.slice(offset)
}

// ── Fake WebSocket adapter (RTP ↔ Twilio-format) ─────────────────────────────

function createRtpAdapter(
  rtpSocket: dgram.Socket,
  remote: { ip: string; port: number } | null,
  callSid: string,
  profile: string,
) {
  type Handler = (...args: any[]) => void
  const listeners: Record<string, Handler[]> = {}
  const msgListeners: Handler[] = []

  function emit(event: string, ...args: any[]) {
    ;(listeners[event] ?? []).forEach(h => h(...args))
    if (event === 'message') msgListeners.forEach(h => h(...args))
  }

  const adapter = {
    readyState: 1,

    on(event: string, handler: Handler) {
      if (event === 'message') { msgListeners.push(handler); return }
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(handler)
    },

    send(data: Buffer | string) {
      if (!remote) return
      try {
        const msg = JSON.parse(data.toString())
        if (msg.event === 'media' && msg.media?.payload) {
          const pcmu = Buffer.from(msg.media.payload, 'base64')
          const pkt = wrapRtp(pcmu)
          rtpSocket.send(pkt, remote.port, remote.ip)
        }
      } catch {}
    },

    close() { rtpSocket.close() },

    _emit: emit,
  }

  // Send fake Twilio "start" after listeners are registered
  setTimeout(() => {
    const streamSid = `sip-${callSid}`
    const startMsg = JSON.stringify({
      event: 'start',
      streamSid,
      start: {
        callSid,
        streamSid,
        customParameters: { profile, contexto: 'pos_vendas' },
      },
    })
    emit('message', Buffer.from(startMsg))
  }, 80)

  // Forward incoming RTP as Twilio media events
  rtpSocket.on('message', (pkt: Buffer) => {
    const pcmu = stripRtp(pkt)
    if (!pcmu || pcmu.length === 0) return
    const payload = pcmu.toString('base64')
    const mediaMsg = JSON.stringify({ event: 'media', media: { payload } })
    emit('message', Buffer.from(mediaMsg))
  })

  return adapter
}

// ── SIP call handler ──────────────────────────────────────────────────────────

function handleInvite(socket: tls.TLSSocket, msg: SipMsg, profile: string) {
  const { headers, body } = msg
  const callId = headers['call-id'] ?? `unknown-${Date.now()}`
  const via = headers['via'] ?? ''
  const from = headers['from'] ?? ''
  const to = headers['to'] ?? ''
  const cseq = headers['cseq'] ?? '1 INVITE'
  const callSid = `sip-${callId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`

  const remoteRtp = parseSdpRtp(body)
  const localRtpPort = allocRtpPort()

  // 100 Trying
  socket.write(
    ['SIP/2.0 100 Trying', `Via: ${via}`, `From: ${from}`, `To: ${to}`,
      `Call-ID: ${callId}`, `CSeq: ${cseq}`, 'Content-Length: 0', '', ''].join('\r\n')
  )

  // Set up RTP socket
  const rtpSocket = dgram.createSocket('udp4')
  rtpSocket.bind(localRtpPort, () => {
    const sdp = makeSdp(localRtpPort)

    // 200 OK
    const ok = [
      'SIP/2.0 200 OK',
      `Via: ${via}`,
      `From: ${from}`,
      `To: ${to};tag=ana${Date.now()}`,
      `Call-ID: ${callId}`,
      `CSeq: ${cseq}`,
      `Contact: <sip:ana@${LOCAL_HOST}:${SIP_PORT};transport=tls>`,
      'Content-Type: application/sdp',
      `Content-Length: ${Buffer.byteLength(sdp)}`,
      '',
      sdp,
    ].join('\r\n')
    socket.write(ok)

    console.log(`[SIP] INVITE accepted callId=${callId} localRtp=${localRtpPort} remoteRtp=${JSON.stringify(remoteRtp)}`)

    // Bridge to GPT Live 1
    const fakeWs = createRtpAdapter(rtpSocket, remoteRtp, callSid, profile)
    createAnaLiveSession(fakeWs as any, { contexto: 'pos_vendas', earlyQueue: [], profile })
      .catch(e => console.error('[SIP] session error', e.message))
  })

  rtpSocket.on('error', e => console.error('[SIP] rtp error', e.message))
}

function handleBye(socket: tls.TLSSocket, msg: SipMsg) {
  const { headers } = msg
  socket.write(
    ['SIP/2.0 200 OK', `Via: ${headers['via'] ?? ''}`,
      `From: ${headers['from'] ?? ''}`, `To: ${headers['to'] ?? ''}`,
      `Call-ID: ${headers['call-id'] ?? ''}`, `CSeq: ${headers['cseq'] ?? ''}`,
      'Content-Length: 0', '', ''].join('\r\n')
  )
  console.log(`[SIP] BYE callId=${headers['call-id']}`)
}

// ── TLS server ────────────────────────────────────────────────────────────────

export function startSipServer(profile = '') {
  const certBase = `/etc/letsencrypt/live/${LOCAL_HOST}`
  let serverOpts: tls.TlsOptions

  try {
    serverOpts = {
      key: fs.readFileSync(`${certBase}/privkey.pem`),
      cert: fs.readFileSync(`${certBase}/fullchain.pem`),
      requestCert: false,
      rejectUnauthorized: false, // Meta's client cert may vary
    }
  } catch (e: any) {
    console.error(`[SIP] Cannot read TLS cert at ${certBase}: ${e.message}`)
    console.error('[SIP] Server NOT started — fix cert path and restart')
    return
  }

  const server = tls.createServer(serverOpts)

  server.on('secureConnection', (socket: tls.TLSSocket) => {
    console.log('[SIP] TLS connection from', socket.remoteAddress)
    let buf = ''

    socket.on('data', (chunk: Buffer) => {
      buf += chunk.toString('binary')

      // SIP messages are delimited by \r\n\r\n
      while (true) {
        const end = buf.indexOf('\r\n\r\n')
        if (end === -1) break

        const rawMsg = buf.slice(0, end + 4)
        buf = buf.slice(end + 4)
        const msg = parseSip(rawMsg)

        if (msg.firstLine.startsWith('INVITE')) {
          handleInvite(socket, msg, profile)
        } else if (msg.firstLine.startsWith('BYE')) {
          handleBye(socket, msg)
        } else if (msg.firstLine.startsWith('ACK')) {
          console.log('[SIP] ACK received — call established')
        } else if (msg.firstLine.startsWith('CANCEL')) {
          socket.write(
            ['SIP/2.0 200 OK', `Call-ID: ${msg.headers['call-id'] ?? ''}`, 'Content-Length: 0', '', ''].join('\r\n')
          )
        }
      }
    })

    socket.on('error', e => console.error('[SIP] socket error', e.message))
    socket.on('close', () => console.log('[SIP] connection closed'))
  })

  server.on('error', e => console.error('[SIP] server error', e.message))

  server.listen(SIP_PORT, '0.0.0.0', () => {
    console.log(`[SIP] TLS server listening on 0.0.0.0:${SIP_PORT}`)
  })

  return server
}
