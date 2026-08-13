'use client'

import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mic, MicOff, Phone, PhoneOff, Copy, Check, RefreshCw, Link, RotateCcw } from 'lucide-react'
import { SPEECH_PART_INSTRUCTIONS, ANA_BASE_PROMPT, STAGE_INSTRUCTIONS } from '@/lib/ana-master/constants'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TranscriptLine {
  role: 'ana' | 'lead' | 'tool' | 'system'
  text: string
  ts: number
}

interface SpeechProgress {
  parte_atual: number | 'final_question' | 'complete'
  partes_entregues: number[]
  parte_em_execucao?: number
  state: 'DELIVERING_PART' | 'WAITING_LEAD' | 'WAITING_FINAL_RESPONSE' | 'COMPLETE'
  waiting_for_lead: boolean
  pergunta_final_feita: boolean
  resposta_final_recebida: boolean
}

interface GateEntry {
  gate: string
  ts: string
  next_stage: string
}

interface CheckpointData {
  stage: string
  speech_progress: SpeechProgress
  gate_log: GateEntry[]
  ts: string
}

interface Memory {
  [key: string]: unknown
}

type SessionStatus = 'idle' | 'connecting' | 'active' | 'error' | 'ended'

const STAGES_ORDER = ['apresentacao', 'conexao', 'combinado', 'speech', 'fechamento', 'pagamento', 'referidos', 'validacao', 'ganho']
const STAGE_LABELS: Record<string, string> = {
  apresentacao: 'Abertura', conexao: 'Conexão', combinado: 'Combinado',
  speech: 'Speech', fechamento: 'Fechamento', pagamento: 'Pagamento',
  referidos: 'Referidos', validacao: 'Validação', ganho: 'Ganho',
}
const GATE_LABELS: Record<string, string> = {
  GATE_ABERTURA: 'Abertura', GATE_CONEXAO: 'Conexão', GATE_COMBINADO: 'Combinado',
  GATE_SPEECH: 'Speech', GATE_FECHAMENTO: 'Fechamento', GATE_PAGAMENTO: 'Pagamento',
  GATE_REFERIDOS: 'Referidos', GATE_VALIDACAO: 'Validação',
}

function initialSpeechProgress(): SpeechProgress {
  return {
    parte_atual: 1, partes_entregues: [], parte_em_execucao: 1,
    state: 'DELIVERING_PART', waiting_for_lead: false,
    pergunta_final_feita: false, resposta_final_recebida: false,
  }
}

// ── Inner component ────────────────────────────────────────────────────────────

function SimuladorInner() {
  const searchParams = useSearchParams()

  const [telefone, setTelefone] = useState('')
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [currentStage, setCurrentStage] = useState('apresentacao')
  const [speechProgress, setSpeechProgress] = useState<SpeechProgress>(initialSpeechProgress())
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [memories, setMemories] = useState<Memory>({})
  const [gateLog, setGateLog] = useState<GateEntry[]>([])
  const [savedCheckpoints, setSavedCheckpoints] = useState<Record<string, CheckpointData>>({})
  const [referidosLink, setReferidosLink] = useState<string | null>(null)
  const [referidosStatus, setReferidosStatus] = useState<{ total: number; semDados: number; missaoCompleta: boolean } | null>(null)
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [profileVersion, setProfileVersion] = useState('')
  const [activeModel, setActiveModel] = useState('')
  const [audioUploading, setAudioUploading] = useState(false)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const callSidRef = useRef('')
  const telefoneRef = useRef('')
  const speechRef = useRef<SpeechProgress>(initialSpeechProgress())
  const stageRef = useRef('apresentacao')
  const localStreamRef = useRef<MediaStream | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)
  const gateLogRef = useRef<GateEntry[]>([])
  const checkpointsRef = useRef<Record<string, CheckpointData>>({})
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const pendingInstructionsRef = useRef<string | null>(null)

  useEffect(() => { speechRef.current = speechProgress }, [speechProgress])
  useEffect(() => { stageRef.current = currentStage }, [currentStage])
  useEffect(() => { gateLogRef.current = gateLog }, [gateLog])
  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [transcript])

  const addTranscript = useCallback((role: TranscriptLine['role'], text: string) => {
    setTranscript(prev => [...prev, { role, text, ts: Date.now() }])
  }, [])

  const sendEvent = useCallback((event: unknown) => {
    if (dcRef.current?.readyState === 'open') dcRef.current.send(JSON.stringify(event))
  }, [])

  const updateInstructions = useCallback((instructions: string) => {
    sendEvent({ type: 'session.update', session: { instructions } })
  }, [sendEvent])

  const saveTranscriptTurn = useCallback((role: string, text: string) => {
    if (!callSidRef.current || !text.trim()) return
    fetch('/api/admin/ana-master/simulador/transcript', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callSid: callSidRef.current, role, text }),
    }).catch(() => {})
  }, [])

  const saveCheckpoint = useCallback((gateName: string, nextStage: string) => {
    const cp: CheckpointData = {
      stage: nextStage, speech_progress: speechRef.current,
      gate_log: gateLogRef.current, ts: new Date().toISOString(),
    }
    checkpointsRef.current[gateName] = cp
    setSavedCheckpoints(prev => ({ ...prev, [gateName]: cp }))
    fetch('/api/admin/ana-master/simulador/transcript', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callSid: callSidRef.current, checkpoint: { gate: gateName, ...cp } }),
    }).catch(() => {})
  }, [])

  const uploadAudio = useCallback(async () => {
    const chunks = audioChunksRef.current
    if (chunks.length === 0 || !callSidRef.current) return
    setAudioUploading(true)
    try {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      await fetch(`/api/admin/ana-master/simulador/audio?callSid=${callSidRef.current}`, {
        method: 'POST', body: blob, headers: { 'Content-Type': 'audio/webm' },
      })
    } catch {}
    setAudioUploading(false)
  }, [])

  // ── Tool execution ─────────────────────────────────────────────────────────

  const executeTool = useCallback(async (name: string, args: Record<string, unknown>): Promise<string> => {
    const base = '/api/admin/ana-master/simulador'
    switch (name) {
      case 'gateValidator': {
        const { gate_id, evidence } = args as { gate_id: string; evidence: Record<string, unknown> }
        const sp = speechRef.current
        const enriched = {
          ...evidence,
          speech_progress_complete: sp.state === 'COMPLETE',
          parte1_entregue: sp.partes_entregues.includes(1),
          parte2_entregue: sp.partes_entregues.includes(2),
          parte3_entregue: sp.partes_entregues.includes(3),
          parte4_entregue: sp.partes_entregues.includes(4),
          pergunta_final_feita: sp.pergunta_final_feita,
          resposta_lead_recebida: sp.resposta_final_recebida,
        }
        const res = await fetch(`${base}/gate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callSid: callSidRef.current, gateId: gate_id, evidence: enriched, telefone: telefoneRef.current }),
        })
        const data = await res.json()
        if (data.approved) {
          setCurrentStage(data.next_stage)
          const entry = { gate: gate_id, ts: new Date().toISOString(), next_stage: data.next_stage }
          setGateLog(prev => { const u = [...prev, entry]; gateLogRef.current = u; return u })
          saveCheckpoint(gate_id, data.next_stage)
          addTranscript('system', `✓ ${gate_id} → ${data.next_stage.toUpperCase()}`)
          if (data.next_stage === 'speech') setSpeechProgress(initialSpeechProgress())
          updateInstructions(data.next_instructions)
          return '{"gate":"aprovado"}'
        }
        return `{"gate":"bloqueado","sistema":"${data.reason?.replace(/"/g, "'")}"}`
      }
      case 'get_lead_context': {
        const res = await fetch(`${base}/memory?callSid=${callSidRef.current}&telefone=${encodeURIComponent(telefoneRef.current)}`)
        const data = await res.json()
        setMemories(data.memories ?? {})
        return JSON.stringify({ lead: data.lead, memories: data.memories })
      }
      case 'save_memory': {
        const { key, value } = args as { key: string; value: string }
        await fetch(`${base}/memory`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callSid: callSidRef.current, key, value }) })
        setMemories(prev => ({ ...prev, [key]: value }))
        return `Memória "${key}" salva.`
      }
      case 'verificar_pagamento': {
        const res = await fetch(`${base}/payment?telefone=${encodeURIComponent(telefoneRef.current)}`)
        const data = await res.json()
        return data.pago ? 'Pagamento confirmado! ✅' : 'Pagamento ainda não confirmado.'
      }
      case 'iniciar_coleta_referidos': {
        const res = await fetch(`${base}/referidos`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telefone: telefoneRef.current, callSid: callSidRef.current }),
        })
        const data = await res.json()
        if (data.link) {
          setReferidosLink(data.link)
          setMemories(prev => ({ ...prev, token_indicacao: data.token }))
          return `Link de indicações: ${data.link}. Token: ${data.token}.`
        }
        return 'Não foi possível gerar o link.'
      }
      case 'verificar_referidos': {
        const token = (memories.token_indicacao as string) ?? ''
        if (!token) return 'Token não encontrado.'
        const res = await fetch(`${base}/referidos?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        setReferidosStatus({ total: data.total ?? 0, semDados: data.semDados ?? 0, missaoCompleta: data.missaoCompleta ?? false })
        if (data.missaoCompleta) return '✅ Missão completa! 20+ indicadas, semDados=0.'
        if (data.semDados > 0) return `⏳ ${data.semDados} indicadas sem dados.`
        return `⏳ total=${data.total ?? 0}, semDados=${data.semDados ?? 0}`
      }
      case 'registrar_parte_speech': {
        return handleRegistrarParteSpeech(args.parte as number | string)
      }
      case 'send_whatsapp': {
        addTranscript('tool', `📱 WhatsApp (simulador — não enviado): ${args.mensagem}`)
        return 'Mensagem enviada.'
      }
      default:
        return JSON.stringify({ error: `Tool desconhecida: ${name}` })
    }
  }, [memories, addTranscript, updateInstructions, saveCheckpoint])

  function handleRegistrarParteSpeech(parte: number | string): string {
    const sp = speechRef.current
    if (typeof parte === 'number') {
      if (parte !== sp.parte_atual) return JSON.stringify({ error: `Ordem incorreta. parte_atual=${sp.parte_atual}` })
      const newPartes = [...sp.partes_entregues, parte as never]
      if (parte < 4) {
        const newSp: SpeechProgress = { ...sp, partes_entregues: newPartes, parte_atual: parte + 1, parte_em_execucao: undefined, state: 'WAITING_LEAD', waiting_for_lead: true }
        setSpeechProgress(newSp); speechRef.current = newSp
        return JSON.stringify({ ok: true, parte_registrada: parte, aguardando: 'turno_da_lead' })
      } else {
        const newSp: SpeechProgress = { ...sp, partes_entregues: newPartes, parte_atual: 'final_question', parte_em_execucao: undefined, state: 'WAITING_LEAD', waiting_for_lead: false }
        setSpeechProgress(newSp); speechRef.current = newSp
        updateInstructions(`${ANA_BASE_PROMPT}\n\n${SPEECH_PART_INSTRUCTIONS['final_question']}`)
        return JSON.stringify({ ok: true, parte_registrada: 4, proximo: 'pergunta_final' })
      }
    }
    if (parte === 'pergunta_feita') {
      const newSp: SpeechProgress = { ...sp, pergunta_final_feita: true, state: 'WAITING_FINAL_RESPONSE', waiting_for_lead: true }
      setSpeechProgress(newSp); speechRef.current = newSp
      return JSON.stringify({ ok: true, pergunta_final: 'registrada' })
    }
    if (parte === 'resposta_recebida') {
      const newSp: SpeechProgress = { ...sp, resposta_final_recebida: true, parte_atual: 'complete', state: 'COMPLETE', waiting_for_lead: false }
      setSpeechProgress(newSp); speechRef.current = newSp
      updateInstructions(`${ANA_BASE_PROMPT}\n\n${SPEECH_PART_INSTRUCTIONS['complete']}`)
      return JSON.stringify({ ok: true, speech_progress: 'COMPLETE' })
    }
    return JSON.stringify({ error: `parte inválida: ${parte}` })
  }

  const onLeadTurn = useCallback(() => {
    const sp = speechRef.current
    if (!sp.waiting_for_lead || sp.state !== 'WAITING_LEAD') return
    const newSp = { ...sp, waiting_for_lead: false, parte_em_execucao: typeof sp.parte_atual === 'number' ? sp.parte_atual : undefined }
    setSpeechProgress(newSp); speechRef.current = newSp
    const instruction = SPEECH_PART_INSTRUCTIONS[String(sp.parte_atual)]
    if (instruction) updateInstructions(`${ANA_BASE_PROMPT}\n\n${instruction}`)
  }, [updateInstructions])

  const handleDCMessage = useCallback(async (event: MessageEvent) => {
    let msg: any
    try { msg = JSON.parse(event.data) } catch { return }
    switch (msg.type) {
      case 'response.done': {
        const audioItem = msg.response?.output?.find((o: any) => o.type === 'message' && o.role === 'assistant')
        if (audioItem) {
          const text = audioItem.content?.find((c: any) => c.type === 'audio')?.transcript
          if (text) { addTranscript('ana', text); saveTranscriptTurn('ana', text) }
        }
        const funcCalls = (msg.response?.output ?? []).filter((o: any) => o.type === 'function_call')
        for (const call of funcCalls) {
          let parsedArgs: Record<string, unknown> = {}
          try { parsedArgs = JSON.parse(call.arguments ?? '{}') } catch {}
          addTranscript('tool', `→ ${call.name}(${JSON.stringify(parsedArgs).slice(0, 80)})`)
          const result = await executeTool(call.name, parsedArgs)
          sendEvent({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: call.call_id, output: result } })
          sendEvent({ type: 'response.create' })
        }
        break
      }
      case 'conversation.item.input_audio_transcription.completed': {
        const text = msg.transcript
        if (text) { addTranscript('lead', text); saveTranscriptTurn('lead', text); onLeadTurn() }
        break
      }
      case 'error':
        setErrorMsg(`Erro OpenAI: ${msg.error?.message ?? JSON.stringify(msg.error)}`)
        break
    }
  }, [executeTool, addTranscript, sendEvent, onLeadTurn, saveTranscriptTurn])

  const restoreCheckpoint = useCallback((cp: CheckpointData) => {
    setCurrentStage(cp.stage); stageRef.current = cp.stage
    if (cp.speech_progress) { setSpeechProgress(cp.speech_progress); speechRef.current = cp.speech_progress }
    if (cp.gate_log) { setGateLog(cp.gate_log); gateLogRef.current = cp.gate_log }
    const instructions = cp.stage === 'speech'
      ? `${ANA_BASE_PROMPT}\n\n${SPEECH_PART_INSTRUCTIONS[String(cp.speech_progress?.parte_atual ?? 1)]}`
      : `${ANA_BASE_PROMPT}\n\n${STAGE_INSTRUCTIONS[cp.stage] ?? ''}`
    pendingInstructionsRef.current = instructions
    addTranscript('system', `🔄 Retomando → ${(STAGE_LABELS[cp.stage] ?? cp.stage).toUpperCase()}`)
  }, [addTranscript])

  const startSession = useCallback(async (checkpointOverride?: CheckpointData) => {
    if (!telefone.trim()) { setErrorMsg('Digite o telefone de teste antes de iniciar.'); return }
    setErrorMsg(''); setStatus('connecting')
    setTranscript([]); setGateLog([]); gateLogRef.current = []
    setMemories({}); setReferidosLink(null); setReferidosStatus(null)
    setSpeechProgress(initialSpeechProgress()); setCurrentStage('apresentacao')
    checkpointsRef.current = {}; setSavedCheckpoints({}); audioChunksRef.current = []

    try {
      const sessionRes = await fetch('/api/admin/ana-master/simulador/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone, nome: 'Lead Teste' }),
      })
      if (!sessionRes.ok) throw new Error('Falha ao criar sessão')
      const { callSid, clientSecret, telefone: normPhone, profileVersion: pv, model: mdl } = await sessionRes.json()
      callSidRef.current = callSid; telefoneRef.current = normPhone
      if (pv) setProfileVersion(pv)
      if (mdl) setActiveModel(mdl)

      if (checkpointOverride) restoreCheckpoint(checkpointOverride)

      const pc = new RTCPeerConnection(); pcRef.current = pc
      const audio = document.createElement('audio'); audio.autoplay = true; audioRef.current = audio
      pc.ontrack = (e) => { audio.srcObject = e.streams[0] }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
        const recorder = new MediaRecorder(stream, { mimeType })
        audioChunksRef.current = []
        recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
        recorder.start(2000); mediaRecorderRef.current = recorder; setIsRecording(true)
      } catch {}

      const dc = pc.createDataChannel('oai-events'); dcRef.current = dc
      dc.onmessage = handleDCMessage
      dc.onopen = () => {
        addTranscript('system', '🎙️ Conectado — ANA está iniciando...')
        if (pendingInstructionsRef.current) {
          sendEvent({ type: 'session.update', session: { instructions: pendingInstructionsRef.current } })
          pendingInstructionsRef.current = null
        }
      }

      const offer = await pc.createOffer(); await pc.setLocalDescription(offer)
      const oaiRes = await fetch(`https://api.openai.com/v1/realtime?model=${mdl ?? 'gpt-4o-realtime-preview-2025-06-03'}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${clientSecret}`, 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      })
      if (!oaiRes.ok) throw new Error('Falha ao conectar ao OpenAI Realtime')
      await pc.setRemoteDescription({ type: 'answer', sdp: await oaiRes.text() })
      setStatus('active')
    } catch (e: any) { setStatus('error'); setErrorMsg(e.message) }
  }, [telefone, handleDCMessage, addTranscript, sendEvent, restoreCheckpoint])

  const stopSession = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') { recorder.onstop = () => uploadAudio(); recorder.stop() }
    mediaRecorderRef.current = null; setIsRecording(false)
    pcRef.current?.close(); pcRef.current = null; dcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null
    if (audioRef.current) audioRef.current.srcObject = null
    setStatus('ended'); addTranscript('system', '⏹ Sessão encerrada.')
  }, [addTranscript, uploadAudio])

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => { t.enabled = isMuted })
    setIsMuted(!isMuted)
  }, [isMuted])

  const speechBadge = () => {
    if (currentStage !== 'speech') return null
    const sp = speechProgress
    if (sp.state === 'COMPLETE') return <span style={badgeStyle('#34D399')}>Speech Completo ✓</span>
    if (sp.state === 'WAITING_FINAL_RESPONSE') return <span style={badgeStyle('#F59E0B')}>Aguardando resposta final</span>
    if (sp.parte_atual === 'final_question') return <span style={badgeStyle('#F59E0B')}>Pergunta final</span>
    if (typeof sp.parte_atual === 'number') return <span style={badgeStyle('#A78BFA')}>P{sp.parte_atual} — {sp.state === 'WAITING_LEAD' ? 'aguardando lead' : 'entregando'}</span>
    return null
  }

  const checkpointEntries = Object.entries(savedCheckpoints).sort(([, a], [, b]) => new Date(a.ts).getTime() - new Date(b.ts).getTime())

  return (
    <div style={{ display: 'flex', height: '100%', background: '#0A0A0B', color: '#fff', overflow: 'hidden' }}>
      {/* Left panel */}
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid #1C1C1E', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1C1C1E' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#7B3FE4', textTransform: 'uppercase', margin: '0 0 2px' }}>ANA MASTER</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Simulador de Voz</p>
          <p style={{ fontSize: 10, color: '#52525E', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            WebRTC
            {profileVersion
              ? <span style={{ color: '#7B3FE4', fontWeight: 700 }}>{profileVersion}</span>
              : <span>· gpt-4o-realtime</span>}
            {isRecording && <span style={{ color: '#F87171', display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F87171', display: 'inline-block', animation: 'pulse 1s infinite' }} />REC</span>}
            {audioUploading && <span style={{ color: '#F59E0B' }}>↑ áudio...</span>}
          </p>
        </div>

        <div style={{ padding: 12, borderBottom: '1px solid #1C1C1E' }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#52525E', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Telefone</label>
          <input
            type="tel" value={telefone} onChange={e => setTelefone(e.target.value)}
            placeholder="+55 11 9 9999-0000"
            disabled={status === 'active' || status === 'connecting'}
            style={{ width: '100%', background: '#111113', border: '1px solid #27272F', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
          {errorMsg && <p style={{ fontSize: 11, color: '#F87171', marginTop: 6 }}>{errorMsg}</p>}
        </div>

        <div style={{ padding: 12, borderBottom: '1px solid #1C1C1E', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {status === 'idle' || status === 'ended' || status === 'error' ? (
            <button onClick={() => startSession()} style={btnStyle('#7B3FE4', '#6D35CC')}>
              <Phone size={14} /> Iniciar Simulação
            </button>
          ) : status === 'connecting' ? (
            <button disabled style={{ ...btnStyle('#7B3FE4', '#7B3FE4'), opacity: 0.5 }}>
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Conectando...
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={toggleMute} style={{ flex: 1, ...btnStyle(isMuted ? '#78350F' : '#1C1C1E', isMuted ? '#92400E' : '#27272F'), border: `1px solid ${isMuted ? '#F59E0B44' : '#27272F'}` }}>
                {isMuted ? <MicOff size={13} /> : <Mic size={13} />} {isMuted ? 'Mudo' : 'Mic'}
              </button>
              <button onClick={stopSession} style={{ flex: 1, ...btnStyle('#1C1818', '#2D1515'), border: '1px solid #F8717144', color: '#F87171' }}>
                <PhoneOff size={13} /> Encerrar
              </button>
            </div>
          )}
        </div>

        {checkpointEntries.length > 0 && (
          <div style={{ padding: 12, borderBottom: '1px solid #1C1C1E' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#F59E0B', textTransform: 'uppercase', margin: '0 0 8px' }}>Checkpoints</p>
            {checkpointEntries.map(([gate, cp]) => (
              <button key={gate} onClick={() => { if (status === 'active') { restoreCheckpoint(cp); updateInstructions(cp.stage === 'speech' ? `${ANA_BASE_PROMPT}\n\n${SPEECH_PART_INSTRUCTIONS[String(cp.speech_progress?.parte_atual ?? 1)]}` : `${ANA_BASE_PROMPT}\n\n${STAGE_INSTRUCTIONS[cp.stage] ?? ''}`) } else { startSession(cp) } }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '7px 10px', marginBottom: 5, cursor: 'pointer' }}>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', margin: 0 }}>{GATE_LABELS[gate] ?? gate}</p>
                  <p style={{ fontSize: 10, color: '#52525E', margin: 0 }}>→ {STAGE_LABELS[cp.stage] ?? cp.stage}</p>
                </div>
                <RotateCcw size={11} style={{ color: '#F59E0B', opacity: 0.6 }} />
              </button>
            ))}
            <p style={{ fontSize: 10, color: '#52525E', margin: '4px 0 0' }}>{status === 'active' ? 'Retomar nesta etapa' : 'Iniciar daqui'}</p>
          </div>
        )}

        <div style={{ padding: 12, borderBottom: '1px solid #1C1C1E' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#52525E', textTransform: 'uppercase', margin: '0 0 8px' }}>Etapas</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {STAGES_ORDER.filter(s => s !== 'ganho').map(stage => {
              const idx = STAGES_ORDER.indexOf(stage), cur = STAGES_ORDER.indexOf(currentStage)
              const done = idx < cur, active = stage === currentStage
              return (
                <span key={stage} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700, background: done ? 'rgba(52,211,153,0.1)' : active ? 'rgba(123,63,228,0.2)' : '#111113', color: done ? '#34D399' : active ? '#A78BFA' : '#52525E', border: `1px solid ${done ? 'rgba(52,211,153,0.2)' : active ? 'rgba(123,63,228,0.4)' : '#1C1C1E'}` }}>
                  {done ? '✓ ' : ''}{STAGE_LABELS[stage]}
                </span>
              )
            })}
            {currentStage === 'ganho' && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700, background: 'rgba(52,211,153,0.2)', color: '#34D399', border: '1px solid rgba(52,211,153,0.4)' }}>🏆 GANHO</span>}
          </div>
          {currentStage === 'speech' && <div style={{ marginTop: 8 }}>{speechBadge()}</div>}
        </div>

        <div style={{ padding: 12, borderBottom: '1px solid #1C1C1E' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#52525E', textTransform: 'uppercase', margin: '0 0 8px' }}>Memórias</p>
          {Object.keys(memories).filter(k => !['telefone','nome','sim_browser','transcript','speech_progress','checkpoints','audio_url'].includes(k)).length === 0
            ? <p style={{ fontSize: 11, color: '#52525E' }}>Nenhuma salva.</p>
            : Object.entries(memories).filter(([k]) => !['telefone','nome','sim_browser','transcript','speech_progress','checkpoints','audio_url'].includes(k)).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: '#52525E', flexShrink: 0 }}>{k}</span>
                  <span style={{ color: '#fff', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }} title={String(v)}>{String(v)}</span>
                </div>
              ))
          }
        </div>

        {referidosLink && (
          <div style={{ padding: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 4 }}><Link size={10} /> Referidos</p>
            <p style={{ fontSize: 11, color: '#34D399', wordBreak: 'break-all', marginBottom: 6 }}>{referidosLink}</p>
            <button onClick={() => { navigator.clipboard.writeText(referidosLink); setCopied(true); setTimeout(() => setCopied(false), 2000) }} style={{ fontSize: 11, color: '#A78BFA', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              {copied ? <><Check size={11} /> Copiado!</> : <><Copy size={11} /> Copiar link</>}
            </button>
            {referidosStatus && (
              <p style={{ fontSize: 11, color: '#52525E', marginTop: 6 }}>
                Indicadas: <strong style={{ color: '#fff' }}>{referidosStatus.total}/20</strong>
                {referidosStatus.semDados > 0 && <span style={{ color: '#F59E0B', marginLeft: 6 }}>semDados: {referidosStatus.semDados}</span>}
                {referidosStatus.missaoCompleta && <span style={{ color: '#34D399', marginLeft: 6 }}>✓ Completa</span>}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #1C1C1E', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: 0 }}>Transcrição ao vivo</p>
            <p style={{ fontSize: 10, color: '#52525E', margin: '2px 0 0' }}>
              {status === 'active' ? `● Ativo · ${STAGE_LABELS[currentStage] ?? currentStage}` :
               status === 'connecting' ? '◌ Conectando...' :
               status === 'ended' ? '■ Encerrado' :
               status === 'error' ? '✕ Erro' : '○ Aguardando início'}
            </p>
          </div>
          {status === 'active' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#34D399' }}>AO VIVO</span>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {transcript.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(123,63,228,0.1)', border: '1px solid rgba(123,63,228,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mic size={22} style={{ color: '#7B3FE4' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Simulador de Voz ANA</p>
                <p style={{ fontSize: 12, color: '#52525E', margin: '4px 0 0' }}>Digite o telefone e clique em Iniciar Simulação</p>
                <p style={{ fontSize: 11, color: '#3A3A3C', margin: '2px 0 0' }}>Áudio gravado automaticamente · Checkpoints por gate</p>
              </div>
            </div>
          )}
          {transcript.map((line, i) => (
            <div key={i} style={{ borderRadius: 10, padding: '10px 14px', lineHeight: 1.6, background: line.role === 'ana' ? 'rgba(123,63,228,0.1)' : line.role === 'lead' ? '#1C1C1E' : line.role === 'tool' ? 'rgba(249,115,22,0.05)' : 'transparent', border: `1px solid ${line.role === 'ana' ? 'rgba(123,63,228,0.2)' : line.role === 'lead' ? '#27272A' : line.role === 'tool' ? 'rgba(249,115,22,0.1)' : 'transparent'}`, color: line.role === 'ana' ? '#fff' : line.role === 'lead' ? '#A1A1AA' : line.role === 'tool' ? '#FB923C' : '#52525E', fontFamily: line.role === 'tool' ? 'monospace' : 'inherit', fontSize: line.role === 'tool' || line.role === 'system' ? 11 : 13, fontStyle: line.role === 'system' ? 'italic' : 'normal' }}>
              {(line.role === 'ana' || line.role === 'lead') && (
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px', color: line.role === 'ana' ? '#A78BFA' : '#52525E' }}>
                  {line.role === 'ana' ? 'ANA' : 'VOCÊ'}
                </p>
              )}
              {line.text}
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}

function badgeStyle(color: string): React.CSSProperties {
  return { fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: `${color}22`, color, border: `1px solid ${color}44`, display: 'inline-block' }
}

function btnStyle(bg: string, hover: string): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }
}

// ── Export ─────────────────────────────────────────────────────────────────────

export function SimuladorContent() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#52525E', fontSize: 13 }}>Carregando...</div>}>
      <SimuladorInner />
    </Suspense>
  )
}
