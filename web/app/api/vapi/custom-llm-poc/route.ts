import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

// Capture directory — adjust if needed
const LOG_DIR = '/tmp/vapi-poc'
const LOG_FILE = join(LOG_DIR, 'capture.jsonl')

function ensureDir() {
  try { mkdirSync(LOG_DIR, { recursive: true }) } catch {}
}

function log(entry: object) {
  ensureDir()
  appendFileSync(LOG_FILE, JSON.stringify({ ts: Date.now(), ...entry }) + '\n')
}

// ── GET: inspect captured logs ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  ensureDir()
  try {
    const { readFileSync } = await import('fs')
    const raw = readFileSync(LOG_FILE, 'utf-8')
    const lines = raw.trim().split('\n').filter(Boolean).map(l => JSON.parse(l))
    return NextResponse.json({ count: lines.length, entries: lines })
  } catch {
    return NextResponse.json({ count: 0, entries: [], note: 'No captures yet' })
  }
}

// ── DELETE: clear log ─────────────────────────────────────────────────────────
export async function DELETE() {
  try {
    const { unlinkSync } = await import('fs')
    unlinkSync(LOG_FILE)
  } catch {}
  return NextResponse.json({ cleared: true })
}

// ── POST: capture VAPI Custom LLM request ────────────────────────────────────
export async function POST(req: NextRequest) {
  const headers: Record<string, string> = {}
  req.headers.forEach((v, k) => { headers[k] = v })

  const contentType = headers['content-type'] || ''
  let body: any = null
  let bodyRaw = ''

  try {
    bodyRaw = await req.text()
    body = JSON.parse(bodyRaw)
  } catch {
    body = bodyRaw
  }

  const entry = {
    method: 'POST',
    url: req.url,
    headers,
    contentType,
    bodyType: typeof body,
    isArray: Array.isArray(body),
    topLevelKeys: body && typeof body === 'object' ? Object.keys(body) : [],
    modelField: body?.model,
    messagesCount: body?.messages?.length,
    messagesRoles: body?.messages?.map((m: any) => m.role),
    streamField: body?.stream,
    hasAudio: bodyRaw.includes('audio') || bodyRaw.includes('base64'),
    hasBinary: /[\x00-\x08\x0e-\x1f]/.test(bodyRaw.slice(0, 200)),
    bodyPreview: bodyRaw.slice(0, 2000),
  }

  log(entry)
  console.log('[POC] Captured POST:', JSON.stringify(entry, null, 2))

  // Return minimal OpenAI-compatible streaming response
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // delta chunk
      const chunk = {
        id: 'chatcmpl-poc',
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4o',
        choices: [{
          index: 0,
          delta: { role: 'assistant', content: 'Captura realizada com sucesso.' },
          finish_reason: null,
        }],
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))

      // done chunk
      const done = {
        id: 'chatcmpl-poc',
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4o',
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(done)}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
