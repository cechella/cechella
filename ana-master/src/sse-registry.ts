// In-memory registry of active SSE clients keyed by callSid
type SseClient = { write: (data: string) => void; close: () => void }
const registry = new Map<string, Set<SseClient>>()

export function registerSseClient(callSid: string, client: SseClient): () => void {
  if (!registry.has(callSid)) registry.set(callSid, new Set())
  registry.get(callSid)!.add(client)
  return () => {
    registry.get(callSid)?.delete(client)
    if (registry.get(callSid)?.size === 0) registry.delete(callSid)
  }
}

export function pushTranscriptEvent(callSid: string, role: string, text: string) {
  const clients = registry.get(callSid)
  if (!clients || clients.size === 0) return
  const payload = JSON.stringify({ role, text, ts: Date.now() })
  for (const client of clients) {
    try { client.write(`data: ${payload}\n\n`) } catch { /* ignore closed connections */ }
  }
}
