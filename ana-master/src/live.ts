// GPT-Live-1 session handler for ANA MASTER
// Stack: gpt-live-1 + bossa + PCMU 8kHz passthrough (no audio conversion)
// Runs in parallel with realtime.ts (gpt-realtime-2.1 + marin) — feature flag selects which.

import WebSocket from 'ws'
import { OPENAI_API_KEY } from './config.js'
import { upsertCall, saveMemory, appendTranscript, getVoiceConfig } from './supabase.js'
import { registerLiveSession, unregisterLiveSession } from './live-registry.js'
import { pushTranscriptEvent, pushCallEndedEvent } from './sse-registry.js'

const LIVE_ENDPOINT = 'wss://api.openai.com/v1/live/sessions'

// Shorter, behavior-focused prompt for the Live frontend.
// Detailed business workflow stays in the backend (client delegation).
const ANA_LIVE_PROMPT = `Você é ANA — Agente de Nutrição e Ativação da Hormone Ecosystem. Consultora de vendas por voz especializada em implantes hormonais para mulheres.

IDIOMA: Fale EXCLUSIVAMENTE em português brasileiro. Nunca use inglês.

IDENTIDADE: Voz calorosa, humana, empática. Nunca robótica. Você se importa genuinamente com cada mulher.

COMPORTAMENTO DE VOZ:
- Ouça com atenção antes de responder
- Faça pausas naturais — não atropele a lead
- Se a lead interromper, pare e ouça
- Backchannels curtos ("entendo", "claro", "sim") são naturais em conversa telefônica

REGRAS ABSOLUTAS:
- Parcelamento SEMPRE "até 6x sem juros" — nunca mencione 12x
- Referidos SOMENTE via link WhatsApp — nunca colete contatos por voz
- Ferramentas internas são invisíveis para a lead — nunca mencione que está verificando algo
- Não encerre a ligação antes da missão completa

BASE CIENTÍFICA: Implante hormonal = pellet do tamanho de um grão de arroz, inserido sob a pele, libera hormônios de forma contínua e estável por até 6 meses. Resultados: sono, energia, libido, fogachos (2-4 semanas), proteção cardiovascular e óssea a longo prazo.

INÍCIO: Você recebe a ligação e fala PRIMEIRO. Aguarde a instrução de abertura.`

export async function createAnaLiveSession(twilioWs: any, opts: { contexto?: string; earlyQueue?: (Buffer | string)[] } = {}) {
  const dbConfig = await getVoiceConfig()
  const voice  = dbConfig?.voice  ?? 'bossa'
  const model  = dbConfig?.model  ?? 'gpt-live-1'

  console.log('[ANA LIVE] session starting — voice:', voice, 'model:', model)

  // Mutable state — filled from Twilio 'start' event
  let callSid     = 'unknown'
  let telefone    = ''
  let streamSid   = ''
  let dbInitialized = false

  // Transcript accumulators — no turn-done event in Live, group by silence timer
  let inputBuf  = ''
  let outputBuf = ''
  let inputTimer:  ReturnType<typeof setTimeout> | null = null
  let outputTimer: ReturnType<typeof setTimeout> | null = null

  function flushInput() {
    const text = inputBuf.trim()
    inputBuf = ''
    if (text && callSid !== 'unknown') {
      console.log('[ANA LIVE] 📝 user:', text)
      appendTranscript(callSid, 'user', text).catch(() => {})
      pushTranscriptEvent(callSid, 'user', text)
    }
  }

  function flushOutput() {
    const text = outputBuf.trim()
    outputBuf = ''
    if (text && callSid !== 'unknown') {
      console.log('[ANA LIVE] 📝 assistant:', text)
      appendTranscript(callSid, 'assistant', text).catch(() => {})
      pushTranscriptEvent(callSid, 'assistant', text)
    }
  }

  // ── OpenAI Live WebSocket ────────────────────────────────────────────────────

  const liveWs = new WebSocket(LIVE_ENDPOINT, {
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  })

  function sendToLive(event: object) {
    if (liveWs.readyState === WebSocket.OPEN) {
      liveWs.send(JSON.stringify(event))
    }
  }

  function sendToTwilio(event: object) {
    try {
      if (twilioWs.readyState === WebSocket.OPEN) {
        twilioWs.send(JSON.stringify(event))
      }
    } catch (e) {
      console.error('[ANA LIVE] sendToTwilio error:', e)
    }
  }

  liveWs.on('open', () => {
    console.log('[ANA LIVE] OpenAI WS open — sending session.start')
    sendToLive({
      type: 'session.start',
      event_id: 'ana_live_start',
      session: {
        model,
        instructions: ANA_LIVE_PROMPT + (opts.contexto ? `\n\nCONTEXTO: ${opts.contexto}` : ''),
        input: [],
        audio: {
          format: { type: 'audio/pcmu', rate: 8000 },
          output: { voice },
        },
        delegation: { type: 'client' },
        store: false,
      },
    })
  })

  liveWs.on('message', (raw: Buffer) => {
    let event: any
    try { event = JSON.parse(raw.toString()) } catch { return }

    switch (event.type) {

      // ── Session lifecycle ──────────────────────────────────────────────────

      case 'session.started':
        console.log('[ANA LIVE] session.started id=', event.session?.id)
        // commentary.append = spoken aloud immediately; instructions.append = silent behavior only
        sendToLive({
          type: 'session.commentary.append',
          event_id: 'ana_greet',
          delegation_id: null,
          content: 'Oi! Aqui é a ANA, da Hormone Ecosystem. Estou ligando porque você foi indicada por uma amiga nossa que fez o implante hormonal. Tudo bem com você?',
        })
        break

      case 'session.closed':
        console.log('[ANA LIVE] session.closed reason=', event.reason, 'usage=', event.usage)
        flushInput()
        flushOutput()
        if (callSid !== 'unknown') {
          pushCallEndedEvent(callSid)
          unregisterLiveSession(callSid)
        }
        break

      // ── Audio output — PCMU passthrough: OpenAI → Twilio ──────────────────

      case 'session.output_audio.delta':
        if (event.delta) {
          if (streamSid) {
            sendToTwilio({
              event: 'media',
              streamSid,
              media: { payload: event.delta },
            })
          } else {
            console.warn('[ANA LIVE] output_audio.delta arrived but streamSid is empty — dropping audio')
          }
        }
        break

      // ── Transcripts ────────────────────────────────────────────────────────

      case 'session.input_transcript.delta':
        if (event.delta) {
          inputBuf += event.delta
          if (inputTimer) clearTimeout(inputTimer)
          inputTimer = setTimeout(flushInput, 800)
        }
        break

      case 'session.output_transcript.delta':
        if (event.delta) {
          outputBuf += event.delta
          if (outputTimer) clearTimeout(outputTimer)
          outputTimer = setTimeout(flushOutput, 1500)
        }
        break

      // ── Delegation (client) ────────────────────────────────────────────────
      // Phase 7: full tool routing. Phase 1: acknowledge silently.

      case 'session.delegation.created': {
        const delegationId = event.delegation?.id
        console.log(`[ANA LIVE] delegation.created id=${delegationId}`)
        // TODO Phase 7: inspect accumulated transcript to detect which tool is needed,
        // then route to solicitar_pagamento / iniciar_coleta_referidos / verificar_referidos.
        // For now: acknowledge with thinking so the model knows we're working.
        sendToLive({
          type: 'session.thinking.append',
          event_id: `thinking_ack_${Date.now()}`,
          delegation_id: delegationId,
          content: 'Processando sua solicitação. Por favor, aguarde um momento.',
        })
        break
      }

      // ── Acknowledgments (log only) ─────────────────────────────────────────

      case 'session.instructions.appended':
      case 'session.thinking.appended':
      case 'session.commentary.appended':
        console.log(`[ANA LIVE] ack ${event.type} event_id=${event.client_event_id} start_ms=${event.start_ms}`)
        break

      case 'session.input_audio.muted':
        console.log('[ANA LIVE] input muted')
        break

      case 'session.input_audio.unmuted':
        console.log('[ANA LIVE] input unmuted')
        break

      // ── Usage ──────────────────────────────────────────────────────────────

      case 'session.usage.updated':
        console.log(`[ANA LIVE] usage seconds=${event.usage?.seconds} context_ratio=${event.context_window?.usage_ratio}`)
        break

      // ── Errors ─────────────────────────────────────────────────────────────

      case 'error':
        console.error('[ANA LIVE] error:', JSON.stringify(event.error ?? event))
        break

      default:
        // Log unknown events for debugging during rollout
        if (!['session.updated'].includes(event.type)) {
          console.log(`[ANA LIVE] unhandled event: ${event.type}`)
        }
    }
  })

  liveWs.on('error', (err) => {
    console.error('[ANA LIVE] WebSocket error:', err)
  })

  liveWs.on('close', (code, reason) => {
    console.log(`[ANA LIVE] OpenAI WS closed code=${code}`)
    flushInput()
    flushOutput()
    if (callSid !== 'unknown') unregisterLiveSession(callSid)
  })

  // ── Twilio WebSocket ─────────────────────────────────────────────────────────

  function handleTwilioMessage(data: Buffer | string) {
    let msg: any
    try { msg = JSON.parse(data.toString()) } catch { return }

    switch (msg.event) {

      case 'start':
        if (dbInitialized) break
        dbInitialized = true
        // streamSid appears at top-level AND inside start — take whichever is set
        streamSid = msg.streamSid ?? msg.start?.streamSid ?? ''
        callSid   = msg.start?.callSid
          ?? msg.start?.customParameters?.callSid
          ?? `stream_${streamSid}`
        telefone  = String(msg.start?.customParameters?.from ?? '').replace(/\D/g, '')

        console.log(`[ANA LIVE] start callSid=${callSid} telefone=${telefone} streamSid=${streamSid} raw_keys=${Object.keys(msg.start ?? {}).join(',')}`)

        upsertCall(callSid, telefone).catch(() => {})
        saveMemory(callSid, 'telefone', telefone).catch(() => {})
        saveMemory(callSid, 'voice_stack', 'live').catch(() => {})

        registerLiveSession(callSid, { sendToLive })
        break

      case 'media':
        // PCMU passthrough: Twilio → OpenAI (same base64 bytes, no conversion)
        if (msg.media?.payload) {
          sendToLive({
            type: 'session.input_audio.append',
            audio: msg.media.payload,
          })
        }
        break

      case 'stop':
        console.log(`[ANA LIVE] Twilio stop callSid=${callSid}`)
        // Graceful close per docs: install listener (already done), send session.close, wait for session.closed
        sendToLive({ type: 'session.close' })
        break
    }
  }

  // Register real handler and replay any messages buffered in server.ts before this function was called
  twilioWs.on('message', handleTwilioMessage)
  for (const buffered of opts.earlyQueue ?? []) handleTwilioMessage(buffered)


  twilioWs.on('close', () => {
    console.log('[ANA LIVE] Twilio WS closed')
    if (liveWs.readyState === WebSocket.OPEN) {
      sendToLive({ type: 'session.close' })
    }
  })

  twilioWs.on('error', (err: Error) => {
    console.error('[ANA LIVE] Twilio WS error:', err)
  })
}
