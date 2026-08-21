// In-memory registry of active SSE clients keyed by callSid
// Also buffers recent events so late-connecting clients get caught up
type SseClient = { write: (data: string) => void; close: () => void }
const registry = new Map<string, Set<SseClient>>()
const eventBuffer = new Map<string, string[]>()  // callSid → recent SSE payloads
const BUFFER_MAX = 100

export function registerSseClient(callSid: string, client: SseClient): () => void {
  if (!registry.has(callSid)) registry.set(callSid, new Set())
  registry.get(callSid)!.add(client)
  // Replay buffered events to the new client
  const buf = eventBuffer.get(callSid)
  if (buf && buf.length > 0) {
    for (const payload of buf) {
      try { client.write(payload) } catch { }
    }
  }
  return () => {
    registry.get(callSid)?.delete(client)
    if (registry.get(callSid)?.size === 0) registry.delete(callSid)
  }
}

function bufferEvent(callSid: string, ssePayload: string) {
  if (!eventBuffer.has(callSid)) eventBuffer.set(callSid, [])
  const buf = eventBuffer.get(callSid)!
  buf.push(ssePayload)
  if (buf.length > BUFFER_MAX) buf.shift()
}

export function pushTranscriptEvent(callSid: string, role: string, text: string, eventType: string = 'message') {
  const payload = JSON.stringify({ type: eventType, role, text, ts: Date.now() })
  const ssePayload = `data: ${payload}\n\n`
  bufferEvent(callSid, ssePayload)
  const clients = registry.get(callSid)
  if (!clients || clients.size === 0) return
  for (const client of clients) {
    try { client.write(ssePayload) } catch { /* ignore closed connections */ }
  }
}

export function pushCallEndedEvent(callSid: string) {
  const payload = JSON.stringify({ type: 'call_ended', ts: Date.now() })
  const ssePayload = `data: ${payload}\n\n`
  const clients = registry.get(callSid)
  if (clients) {
    for (const client of clients) {
      try { client.write(ssePayload); client.close() } catch { }
    }
  }
  registry.delete(callSid)
  eventBuffer.delete(callSid)
}
