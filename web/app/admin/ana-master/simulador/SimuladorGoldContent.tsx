'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react'
import { ANA_PROFILE_GOLD } from '@/lib/ana-master/runtime-profile'

// ── Types ─────────────────────────────────────────────────────────────────────

type SessionStatus = 'idle' | 'connecting' | 'active' | 'ended' | 'error'

interface TranscriptLine {
  role: 'ana' | 'lead' | 'system'
  text: string
  ts: number
}

interface Metrics {
  turns: number
  interruptions: number
  lastResponseMs: number | null
}

// ── Passive stage detection ───────────────────────────────────────────────────

const STAGE_PATTERNS: { stage: string; label: string; pattern: RegExp }[] = [
  { stage: 'abertura',  label: 'Abertura',  pattern: /qual.{0,20}(teu|seu|o seu) nome|como (é que )?você se chama|pra eu te chamar|posso te chamar|quem me indicou|quem te indicou|por quem (você|vc) foi indicad/i },
  { stage: 'conexao',   label: 'Conexão',   pattern: /me conta.{0,30}(dia a dia|vida|rotina)|como (é|tá|está) (a sua|tua|sua) (rotina|vida|dia)|me fala mais sobre|o que (você|vc) (faz|trabalha)|tem filhos|família|mora com/i },
  { stage: 'combinado', label: 'Combinado', pattern: /combinado|combinamos|combina|no final.{0,30}apresent|quando eu terminar|ao final|antes de (eu te |te )apresentar|só (me |te )pede|decisão no final|sim ou não/i },
  { stage: 'speech',    label: 'Speech',    pattern: /pellet|implante hormonal|grão de arroz|libera hormônios|cilindro|subcutâneo|hormônio bioidêntico|testosterona|progesterona|estrogênio|implantado|implante/i },
  { stage: 'fechamento',label: 'Fechamento',pattern: /lembra (do nosso|que a gente fez|do) combinado|faz sentido pra você|qual (seria|é) a sua decisão|você quer|vamos avançar|fechar|investimento|valor|quanto custa|preço/i },
  { stage: 'pagamento', label: 'Pagamento', pattern: /pix ou cartão|prefere (fazer|pagar|parcelar|o )?pix|cartão de crédito|forma de pagamento|pagamento|pagar|vou (gerar|mandar|enviar).{0,20}pix/i },
  { stage: 'referidos', label: 'Referidos', pattern: /conhece alguma amiga|alguém que (também esteja|possa|poderia)|indicar|indicação|amiga.{0,20}(benefício|desconto|vantagem)|seu link|link de indicação/i },
  { stage: 'encerramento', label: 'Encerramento', pattern: /obrigada pela confiança|foi um prazer falar|até (logo|breve)|nossa equipe (vai|irá|entrará)|(muito )?obrigada|encerrando|encerrar|tchau|boa (sorte|tarde|noite|semana)/i },
]

function detectStage(text: string): string | null {
  for (const { stage, pattern } of STAGE_PATTERNS) {
    if (pattern.test(text)) return stage
  }
  return null
}

// ── Component ─────────────────────────────────────────────────────────────────

const PROFILE = ANA_PROFILE_GOLD

const badgeStyle = (color: string): React.CSSProperties => ({
  background: color + '22', color, border: `1px solid ${color}44`,
  borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700,
})

export function SimuladorGoldContent() {
  const [telefone, setTelefone] = useState('5548988416899')
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [metrics, setMetrics] = useState<Metrics>({ turns: 0, interruptions: 0, lastResponseMs: null })
  const [isMuted, setIsMuted] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [detectedStages, setDetectedStages] = useState<string[]>([])
  const [profileVersion, setProfileVersion] = useState('')
  const [activeModel, setActiveModel] = useState('')
  const [activeVoice, setActiveVoice] = useState('')

  const metricsRef = useRef(metrics)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const responseStartTsRef = useRef<number | null>(null)
  const callSidRef = useRef<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const mixDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const audioUploadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [pixState, setPixState] = useState<'idle' | 'sending' | 'pending' | 'paid'>('idle')
  const [pixCallId, setPixCallId] = useState<string | null>(null)
  const pixValorRef = useRef<number>(5000)

  const pixPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const referidosPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const saveTranscriptTurn = useCallback((role: string, text: string) => {
    if (!callSidRef.current || !text.trim()) return
    fetch('/api/admin/ana-master/simulador/transcript', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callSid: callSidRef.current, role, text }),
    }).catch(() => {})
  }, [])

  const uploadAudio = useCallback(async () => {
    const chunks = audioChunksRef.current
    if (chunks.length === 0 || !callSidRef.current) return
    try {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      await fetch(`/api/admin/ana-master/simulador/audio?callSid=${callSidRef.current}`, {
        method: 'POST', body: blob, headers: { 'Content-Type': 'audio/webm' },
      })
    } catch {}
  }, [])

  useEffect(() => { metricsRef.current = metrics }, [metrics])
  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
  }, [transcript, streamingText])

  const addTranscript = useCallback((role: TranscriptLine['role'], text: string) => {
    setTranscript(prev => [...prev, { role, text, ts: Date.now() }])
  }, [])

  const updateStageInDB = useCallback((stage: string) => {
    if (!callSidRef.current) return
    fetch('/api/admin/ana-master/simulador/stage', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callSid: callSidRef.current, stage }),
    }).catch(() => {})
  }, [])

  const sendEvent = useCallback((event: Record<string, unknown>) => {
    if (dcRef.current?.readyState === 'open') {
      dcRef.current.send(JSON.stringify(event))
    }
  }, [])

  const startPixPolling = useCallback((callId: string) => {
    if (pixPollRef.current) clearInterval(pixPollRef.current)
    pixPollRef.current = setInterval(async () => {
      if (!callSidRef.current) return
      try {
        const r = await fetch(`/api/admin/ana-master/simulador/pix-status?callSid=${callSidRef.current}`)
        const data = await r.json()
        if (data.paid) {
          clearInterval(pixPollRef.current!); pixPollRef.current = null
          setPixState('paid')
          const valor = pixValorRef.current
          const valorFmt = `R$ ${(valor / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          // Inject payment confirmation into DataChannel so ANA reacts naturally
          sendEvent({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: JSON.stringify({ paid: true, message: `Pagamento confirmado! ${valorFmt} recebido com sucesso.` }),
            },
          })
          sendEvent({ type: 'response.create' })
        }
      } catch {}
    }, 4000)
  }, [sendEvent])

  const requestPix = useCallback(async (callId: string, metodo: string = 'pix') => {
    if (!callSidRef.current) return
    setPixState('sending')
    setPixCallId(callId)
    try {
      const r = await fetch('/api/admin/ana-master/simulador/pix', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callSid: callSidRef.current, telefone, metodo }),
      })
      const data = await r.json()
      if (data.ok) {
        if (data.valor) pixValorRef.current = data.valor
        setPixState('pending')
        addTranscript('system', `💳 ${metodo === 'pix' ? 'PIX' : 'Link de cartão'} enviado via WhatsApp — aguardando pagamento...`)
        startPixPolling(callId)
      } else {
        addTranscript('system', `❌ Erro ao gerar pagamento: ${data.error}`)
        // Inform ANA of failure
        sendEvent({
          type: 'conversation.item.create',
          item: { type: 'function_call_output', call_id: callId, output: JSON.stringify({ paid: false, error: data.error }) },
        })
        sendEvent({ type: 'response.create' })
        setPixState('idle')
      }
    } catch (e: any) {
      addTranscript('system', `❌ Erro de rede ao gerar pagamento`)
      setPixState('idle')
    }
  }, [telefone, addTranscript, startPixPolling, sendEvent])

  const handleDCMessage = useCallback((e: MessageEvent) => {
    let msg: any
    try { msg = JSON.parse(e.data) } catch { return }

    switch (msg.type) {
      case 'response.created': {
        responseStartTsRef.current = Date.now()
        break
      }
      case 'response.audio_transcript.delta':
      case 'response.output_audio_transcript.delta': {
        setStreamingText(prev => prev + (msg.delta ?? ''))
        break
      }
      case 'response.done': {
        setStreamingText('')
        const responseStatus = msg.response?.status ?? null
        if (responseStatus === 'cancelled') {
          setMetrics(prev => {
            const m = { ...prev, interruptions: prev.interruptions + 1 }
            metricsRef.current = m; return m
          })
          addTranscript('system', '⚡ Turno interrompido pela lead')
        }

        const audioItem = msg.response?.output?.find((o: any) => o.type === 'message' && o.role === 'assistant')
        if (audioItem) {
          const audioContent = audioItem.content?.find((c: any) => c.type === 'output_audio' || c.type === 'audio')
          const text = audioContent?.transcript
          if (text) {
            addTranscript('ana', text)
            saveTranscriptTurn('ana', text)
            const stage = detectStage(text)
            if (stage) {
              setDetectedStages(prev => prev.includes(stage) ? prev : [...prev, stage])
              updateStageInDB(stage)
            }
          }
        }

        if (responseStartTsRef.current && responseStatus !== 'cancelled') {
          const ms = Date.now() - responseStartTsRef.current
          setMetrics(prev => {
            const m = { ...prev, lastResponseMs: ms, turns: prev.turns + 1 }
            metricsRef.current = m; return m
          })
        }
        responseStartTsRef.current = null
        break
      }
      case 'conversation.item.input_audio_transcription.completed': {
        const text = msg.transcript?.trim()
        if (text) {
          addTranscript('lead', text)
          saveTranscriptTurn('lead', text)
        }
        break
      }
      case 'response.output_item.done': {
        const item = msg.item
        if (item?.type === 'function_call' && item?.name === 'solicitar_pagamento') {
          let args: any = {}
          try { args = JSON.parse(item.arguments || '{}') } catch {}
          const metodo = (args.metodo || 'pix').toLowerCase()
          requestPix(item.call_id, metodo)
        }
        break
      }
      case 'error': {
        const errMsg = msg.error?.message ?? JSON.stringify(msg.error)
        setErrorMsg(`Erro OpenAI: ${errMsg}`)
        break
      }
    }
  }, [addTranscript, requestPix, updateStageInDB])

  const startSession = useCallback(async () => {
    if (!telefone.trim()) { setErrorMsg('Digite o telefone de teste antes de iniciar.'); return }
    setErrorMsg(''); setStatus('connecting')
    setTranscript([]); setStreamingText(''); setDetectedStages([])
    setPixState('idle'); setPixCallId(null)
    if (pixPollRef.current) { clearInterval(pixPollRef.current); pixPollRef.current = null }
    if (referidosPollRef.current) { clearInterval(referidosPollRef.current); referidosPollRef.current = null }
    setMetrics({ turns: 0, interruptions: 0, lastResponseMs: null })

    try {
      const sessionRes = await fetch('/api/admin/ana-master/simulador/session-gold', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone }),
      })
      if (!sessionRes.ok) {
        const errBody = await sessionRes.json().catch(() => ({}))
        throw new Error(`Falha ao criar sessão Gold: ${errBody?.error ?? sessionRes.status}`)
      }
      const { callSid: _sid, clientSecret, profileVersion: pv, model: mdl, voice: vc } = await sessionRes.json()
      callSidRef.current = _sid
      if (pv) setProfileVersion(pv)
      if (mdl) setActiveModel(mdl)
      if (vc) setActiveVoice(vc)

      const pc = new RTCPeerConnection(); pcRef.current = pc

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false, sampleRate: 24000 },
      })
      localStreamRef.current = stream
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      // Audio recording — mix local mic + ANA remote track
      try {
        const audioCtx = new AudioContext()
        audioCtxRef.current = audioCtx
        const dest = audioCtx.createMediaStreamDestination()
        mixDestRef.current = dest
        const localSource = audioCtx.createMediaStreamSource(stream)
        localSource.connect(dest)
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
        const recorder = new MediaRecorder(dest.stream, { mimeType })
        audioChunksRef.current = []
        recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
        recorder.start(2000); mediaRecorderRef.current = recorder; setIsRecording(true)
        audioUploadIntervalRef.current = setInterval(async () => {
          const chunks = audioChunksRef.current.splice(0)
          const sid = callSidRef.current
          if (chunks.length === 0 || !sid) return
          const blob = new Blob(chunks, { type: 'audio/webm' })
          try {
            await fetch(`/api/admin/ana-master/simulador/audio?callSid=${sid}&partial=true`, {
              method: 'POST', body: blob, headers: { 'Content-Type': 'audio/webm' },
            })
          } catch {}
        }, 60000)
      } catch { setIsRecording(false) }

      pc.ontrack = (e) => {
        const audio = document.createElement('audio')
        audio.autoplay = true; audio.srcObject = e.streams[0]
        document.body.appendChild(audio); audioRef.current = audio
        if (audioCtxRef.current && mixDestRef.current) {
          try {
            const remoteSource = audioCtxRef.current.createMediaStreamSource(e.streams[0])
            remoteSource.connect(mixDestRef.current)
          } catch {}
        }
      }

      const dc = pc.createDataChannel('oai-events'); dcRef.current = dc
      dc.onmessage = handleDCMessage
      dc.onopen = () => {
        addTranscript('system', '🎙️ Conectado — diga "Alô" para iniciar')
      }

      const offer = await pc.createOffer(); await pc.setLocalDescription(offer)
      const oaiRes = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${clientSecret}`, 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      })
      if (!oaiRes.ok) throw new Error(`Falha ao conectar ao OpenAI Realtime: ${await oaiRes.text()}`)
      await pc.setRemoteDescription({ type: 'answer', sdp: await oaiRes.text() })
      setStatus('active')
    } catch (e: any) { setStatus('error'); setErrorMsg(e.message) }
  }, [telefone, handleDCMessage, addTranscript])

  const stopSession = useCallback(() => {
    if (audioUploadIntervalRef.current) {
      clearInterval(audioUploadIntervalRef.current)
      audioUploadIntervalRef.current = null
    }
    if (pixPollRef.current) { clearInterval(pixPollRef.current); pixPollRef.current = null }
    if (referidosPollRef.current) { clearInterval(referidosPollRef.current); referidosPollRef.current = null }
    setPixState('idle'); setPixCallId(null)
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => uploadAudio()
      recorder.stop()
    } else if (recorder) {
      uploadAudio()
    }
    mediaRecorderRef.current = null; setIsRecording(false)
    audioCtxRef.current?.close().catch(() => {}); audioCtxRef.current = null; mixDestRef.current = null

    pcRef.current?.close(); pcRef.current = null; dcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null
    if (audioRef.current) { audioRef.current.srcObject = null; audioRef.current.remove(); audioRef.current = null }
    setStatus('ended'); setStreamingText(''); addTranscript('system', '⏹ Sessão encerrada.')
  }, [addTranscript, uploadAudio])

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => { t.enabled = isMuted })
    setIsMuted(!isMuted)
  }, [isMuted])

  const ALL_STAGES = ['abertura', 'conexao', 'combinado', 'speech', 'fechamento', 'pagamento', 'referidos', 'encerramento']
  const STAGE_LABELS: Record<string, string> = { abertura: 'Abertura', conexao: 'Conexão', combinado: 'Combinado', speech: 'Speech', fechamento: 'Fechamento', pagamento: 'Pagamento', referidos: 'Referidos', encerramento: 'Encerramento' }

  const isActive = status === 'active'
  const isConnecting = status === 'connecting'

  return (
    <div style={{ display: 'flex', height: '100%', background: '#0A0A0B', color: '#fff', overflow: 'hidden' }}>

      {/* Left panel */}
      <div style={{ width: 272, flexShrink: 0, borderRight: '1px solid #1C1C1E', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1C1C1E' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#F59E0B', textTransform: 'uppercase', margin: '0 0 2px' }}>ANA MASTER</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Simulador Gold ✦</p>
          <p style={{ fontSize: 10, color: '#52525E', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            WebRTC
            {profileVersion && <span style={{ color: '#F59E0B', fontWeight: 700 }}>{profileVersion}</span>}
            {activeVoice && <span style={{ color: '#22C55E', fontWeight: 700 }}>· {activeVoice}</span>}
            {activeModel && <span style={{ color: '#F59E0B', fontWeight: 700 }}>· {activeModel}</span>}
          </p>
          <p style={{ fontSize: 9, color: '#3F3F46', margin: '4px 0 0' }}>Prompt puro · sem gates · sem controller</p>
        </div>

        {/* Error */}
        {errorMsg && (
          <div style={{ padding: '8px 14px', background: '#3B0A0A', borderBottom: '1px solid #7F1D1D' }}>
            <p style={{ fontSize: 11, color: '#FCA5A5', margin: 0 }}>{errorMsg}</p>
          </div>
        )}

        {/* Phone input */}
        <div style={{ padding: '14px 14px 0' }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#52525E', display: 'block', marginBottom: 4 }}>Telefone</label>
          <input
            type="tel"
            value={telefone}
            onChange={e => setTelefone(e.target.value)}
            placeholder="5548988416899"
            disabled={isActive || isConnecting}
            style={{ width: '100%', background: '#111113', border: '1px solid #2A2A2E', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, outline: 'none' }}
          />
        </div>

        {/* Start / Stop */}
        <div style={{ padding: '12px 14px', display: 'flex', gap: 8 }}>
          {!isActive ? (
            <button onClick={startSession} disabled={isConnecting} style={{ flex: 1, padding: '10px 0', background: isConnecting ? '#333' : '#F59E0B', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: isConnecting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Phone size={15} />
              {isConnecting ? 'Conectando...' : 'Iniciar Gold'}
            </button>
          ) : (
            <>
              <button onClick={toggleMute} style={{ padding: '10px 12px', background: isMuted ? '#7F1D1D' : '#1C1C1E', border: '1px solid #2A2A2E', borderRadius: 8, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
                {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
              <button onClick={stopSession} style={{ flex: 1, padding: '10px 0', background: '#7F1D1D', color: '#FCA5A5', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <PhoneOff size={15} /> Encerrar
              </button>
            </>
          )}
        </div>

        {/* Metrics */}
        <div style={{ padding: '0 14px 14px', borderBottom: '1px solid #1C1C1E' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Turnos', value: metrics.turns },
              { label: 'Interrupções', value: metrics.interruptions },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#111113', borderRadius: 8, padding: '8px 10px' }}>
                <p style={{ fontSize: 9, color: '#52525E', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: value > 0 ? '#F59E0B' : '#3F3F46', margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Passive stage tracker */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #1C1C1E' }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#52525E', margin: '0 0 8px' }}>Etapas detectadas</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {ALL_STAGES.map(s => {
              const detected = detectedStages.includes(s)
              return (
                <span key={s} style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                  background: detected ? '#F59E0B22' : '#1C1C1E',
                  color: detected ? '#F59E0B' : '#3F3F46',
                  border: `1px solid ${detected ? '#F59E0B44' : '#2A2A2E'}`,
                }}>
                  {STAGE_LABELS[s]}
                </span>
              )
            })}
          </div>
          <p style={{ fontSize: 9, color: '#3F3F46', margin: '6px 0 0' }}>Detecção passiva por transcript</p>
        </div>

        {/* PIX status */}
        {pixState !== 'idle' && (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #1C1C1E' }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#52525E', margin: '0 0 6px' }}>Pagamento</p>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 5,
              background: pixState === 'paid' ? '#22C55E22' : pixState === 'pending' ? '#F59E0B22' : '#3B82F622',
              color: pixState === 'paid' ? '#22C55E' : pixState === 'pending' ? '#F59E0B' : '#60A5FA',
              border: `1px solid ${pixState === 'paid' ? '#22C55E44' : pixState === 'pending' ? '#F59E0B44' : '#3B82F644'}`,
            }}>
              {pixState === 'paid' ? '✓ Pago' : pixState === 'pending' ? '⏳ Aguardando...' : '💳 Enviando...'}
            </span>
          </div>
        )}

      </div>

      {/* Right panel — Transcript */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #1C1C1E', display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>Transcrição ao vivo</p>
          {status === 'active' && (
            <span style={{ fontSize: 10, color: '#22C55E', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
              AO VIVO
            </span>
          )}
          {status === 'ended' && <span style={{ fontSize: 10, color: '#52525E' }}>· Encerrado</span>}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#F59E0B', fontWeight: 700 }}>✦ GOLD MODE</span>
        </div>

        <div ref={transcriptRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {transcript.length === 0 && status === 'idle' && (
            <p style={{ color: '#3F3F46', fontSize: 12, textAlign: 'center', marginTop: 40 }}>Inicie uma sessão Gold para ver a transcrição</p>
          )}
          {transcript.map((line, i) => {
            if (line.role === 'system') {
              return <p key={i} style={{ fontSize: 11, color: '#52525E', fontStyle: 'italic', margin: 0 }}>{line.text}</p>
            }
            const isAna = line.role === 'ana'
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isAna ? 'flex-start' : 'flex-end' }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: isAna ? '#F59E0B' : '#60A5FA', margin: '0 0 3px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  {isAna ? 'ANA' : 'VOCÊ'}
                </p>
                <div style={{ maxWidth: '80%', background: isAna ? '#1A1A1C' : '#1C2A3A', borderRadius: isAna ? '4px 12px 12px 12px' : '12px 4px 12px 12px', padding: '8px 12px' }}>
                  <p style={{ fontSize: 13, color: '#E4E4E7', margin: 0, lineHeight: 1.5 }}>{line.text}</p>
                </div>
              </div>
            )
          })}
          {streamingText && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#F59E0B', margin: '0 0 3px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>ANA</p>
              <div style={{ maxWidth: '80%', background: '#1A1A1C', borderRadius: '4px 12px 12px 12px', padding: '8px 12px', opacity: 0.7 }}>
                <p style={{ fontSize: 13, color: '#E4E4E7', margin: 0, lineHeight: 1.5 }}>{streamingText}<span style={{ opacity: 0.5 }}>▋</span></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
