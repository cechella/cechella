'use client'

import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
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
    parte_atual: 1,
    partes_entregues: [],
    parte_em_execucao: 1,
    state: 'DELIVERING_PART',
    waiting_for_lead: false,
    pergunta_final_feita: false,
    resposta_final_recebida: false,
  }
}

// ── Inner component (uses useSearchParams) ────────────────────────────────────

function SimuladorVozInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

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
  const [audioUploading, setAudioUploading] = useState(false)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const callSidRef = useRef<string>('')
  const telefoneRef = useRef<string>('')
  const speechRef = useRef<SpeechProgress>(initialSpeechProgress())
  const stageRef = useRef<string>('apresentacao')
  const localStreamRef = useRef<MediaStream | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)
  const gateLogRef = useRef<GateEntry[]>([])
  const checkpointsRef = useRef<Record<string, CheckpointData>>({})
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const pendingInstructionsRef = useRef<string | null>(null)

  // Keep refs in sync
  useEffect(() => { speechRef.current = speechProgress }, [speechProgress])
  useEffect(() => { stageRef.current = currentStage }, [currentStage])
  useEffect(() => { gateLogRef.current = gateLog }, [gateLog])
  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [transcript])

  // ── Helpers ────────────────────────────────────────────────────────────────

  const addTranscript = useCallback((role: TranscriptLine['role'], text: string) => {
    setTranscript(prev => [...prev, { role, text, ts: Date.now() }])
  }, [])

  const sendEvent = useCallback((event: unknown) => {
    if (dcRef.current?.readyState === 'open') {
      dcRef.current.send(JSON.stringify(event))
    }
  }, [])

  const updateInstructions = useCallback((instructions: string) => {
    sendEvent({ type: 'session.update', session: { instructions } })
  }, [sendEvent])

  const saveTranscriptTurn = useCallback((role: string, text: string) => {
    if (!callSidRef.current || !text.trim()) return
    fetch('/api/admin/ana-master/simulador/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callSid: callSidRef.current, role, text }),
    }).catch(() => {})
  }, [])

  const saveCheckpoint = useCallback((gateName: string, nextStage: string) => {
    const sp = speechRef.current
    const gl = gateLogRef.current
    const cp: CheckpointData = {
      stage: nextStage,
      speech_progress: sp,
      gate_log: gl,
      ts: new Date().toISOString(),
    }
    checkpointsRef.current[gateName] = cp
    setSavedCheckpoints(prev => ({ ...prev, [gateName]: cp }))
    fetch('/api/admin/ana-master/simulador/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callSid: callSidRef.current,
        checkpoint: { gate: gateName, ...cp },
      }),
    }).catch(() => {})
  }, [])

  const uploadAudio = useCallback(async () => {
    const chunks = audioChunksRef.current
    if (chunks.length === 0 || !callSidRef.current) return
    setAudioUploading(true)
    try {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      await fetch(`/api/admin/ana-master/simulador/audio?callSid=${callSidRef.current}`, {
        method: 'POST',
        body: blob,
        headers: { 'Content-Type': 'audio/webm' },
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
        const enrichedEvidence = {
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
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callSid: callSidRef.current, gateId: gate_id, evidence: enrichedEvidence, telefone: telefoneRef.current }),
        })
        const data = await res.json()
        if (data.approved) {
          setCurrentStage(data.next_stage)
          const newEntry = { gate: gate_id, ts: new Date().toISOString(), next_stage: data.next_stage }
          setGateLog(prev => {
            const updated = [...prev, newEntry]
            gateLogRef.current = updated
            return updated
          })
          saveCheckpoint(gate_id, data.next_stage)
          addTranscript('system', `✓ ${gate_id} → ${data.next_stage.toUpperCase()}`)
          if (data.next_stage === 'speech') {
            setSpeechProgress(initialSpeechProgress())
          }
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
        await fetch(`${base}/memory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callSid: callSidRef.current, key, value }),
        })
        setMemories(prev => ({ ...prev, [key]: value }))
        return `Memória "${key}" salva.`
      }

      case 'verificar_pagamento': {
        const res = await fetch(`${base}/payment?telefone=${encodeURIComponent(telefoneRef.current)}`)
        const data = await res.json()
        return data.pago
          ? 'Pagamento confirmado! ✅'
          : 'Pagamento ainda não confirmado. Aguarde e verifique novamente.'
      }

      case 'iniciar_coleta_referidos': {
        const res = await fetch(`${base}/referidos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telefone: telefoneRef.current, callSid: callSidRef.current }),
        })
        const data = await res.json()
        if (data.link) {
          setReferidosLink(data.link)
          setMemories(prev => ({ ...prev, token_indicacao: data.token }))
          return `Link de indicações: ${data.link}. Token: ${data.token}. O link foi exibido na tela do simulador.`
        }
        return 'Não foi possível gerar o link de indicações.'
      }

      case 'verificar_referidos': {
        const token = (memories.token_indicacao as string) ?? ''
        if (!token) return 'Token não encontrado. O link foi gerado?'
        const res = await fetch(`${base}/referidos?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        setReferidosStatus({ total: data.total ?? 0, semDados: data.semDados ?? 0, missaoCompleta: data.missaoCompleta ?? false })
        if (data.missaoCompleta) return '✅ Missão completa! 20+ indicadas, semDados=0. Pode chamar gateValidator GATE_REFERIDOS.'
        if (data.semDados > 0) return `⏳ ${data.semDados} indicadas ainda sem profissão/hobby.`
        return `⏳ Formulário em andamento. total=${data.total ?? 0}, semDados=${data.semDados ?? 0}`
      }

      case 'registrar_parte_speech': {
        const { parte } = args as { parte: number | string }
        return handleRegistrarParteSpeech(parte)
      }

      case 'send_whatsapp': {
        addTranscript('tool', `📱 WhatsApp (simulador — não enviado): ${args.mensagem}`)
        return 'Mensagem enviada.'
      }

      default:
        return JSON.stringify({ error: `Tool desconhecida: ${name}` })
    }
  }, [memories, addTranscript, updateInstructions, saveCheckpoint])

  // ── Speech Progress ────────────────────────────────────────────────────────

  function handleRegistrarParteSpeech(parte: number | string): string {
    const sp = speechRef.current

    if (typeof parte === 'number') {
      if (parte !== sp.parte_atual) {
        return JSON.stringify({ error: `Ordem incorreta. parte_atual=${sp.parte_atual}, tentou=${parte}. Não pule partes.` })
      }

      const newPartes = [...sp.partes_entregues, parte as never]

      if (parte < 4) {
        const next = (parte + 1) as number
        const newSp: SpeechProgress = {
          ...sp,
          partes_entregues: newPartes,
          parte_atual: next,
          parte_em_execucao: undefined,
          state: 'WAITING_LEAD',
          waiting_for_lead: true,
        }
        setSpeechProgress(newSp)
        speechRef.current = newSp
        return JSON.stringify({ ok: true, parte_registrada: parte, aguardando: 'turno_da_lead', instrucao: 'ENCERRE SEU TURNO AGORA. A lead falará quando quiser.' })
      } else {
        const newSp: SpeechProgress = {
          ...sp,
          partes_entregues: newPartes,
          parte_atual: 'final_question',
          parte_em_execucao: undefined,
          state: 'WAITING_LEAD',
          waiting_for_lead: false,
        }
        setSpeechProgress(newSp)
        speechRef.current = newSp
        updateInstructions(`${ANA_BASE_PROMPT}\n\n${SPEECH_PART_INSTRUCTIONS['final_question']}`)
        return JSON.stringify({ ok: true, parte_registrada: 4, proximo: 'pergunta_final', instrucao: 'Faça agora a pergunta final: "[Nome], o que mais te chamou atenção do que eu acabei de te apresentar?"' })
      }
    }

    if (parte === 'pergunta_feita') {
      const newSp: SpeechProgress = { ...sp, pergunta_final_feita: true, state: 'WAITING_FINAL_RESPONSE', waiting_for_lead: true }
      setSpeechProgress(newSp)
      speechRef.current = newSp
      return JSON.stringify({ ok: true, pergunta_final: 'registrada', aguardando: 'resposta_final_da_lead' })
    }

    if (parte === 'resposta_recebida') {
      const newSp: SpeechProgress = {
        ...sp,
        resposta_final_recebida: true,
        parte_atual: 'complete',
        state: 'COMPLETE',
        waiting_for_lead: false,
      }
      setSpeechProgress(newSp)
      speechRef.current = newSp
      updateInstructions(`${ANA_BASE_PROMPT}\n\n${SPEECH_PART_INSTRUCTIONS['complete']}`)
      return JSON.stringify({ ok: true, speech_progress: 'COMPLETE', instrucao: 'Pode chamar gateValidator GATE_SPEECH agora.' })
    }

    return JSON.stringify({ error: `parte inválida: ${parte}` })
  }

  // ── Lead turn handler ──────────────────────────────────────────────────────

  const onLeadTurn = useCallback(() => {
    const sp = speechRef.current
    if (!sp.waiting_for_lead || sp.state !== 'WAITING_LEAD') return
    const next = String(sp.parte_atual)
    const newSp = { ...sp, waiting_for_lead: false, parte_em_execucao: typeof sp.parte_atual === 'number' ? sp.parte_atual : undefined }
    setSpeechProgress(newSp)
    speechRef.current = newSp
    const instruction = SPEECH_PART_INSTRUCTIONS[next]
    if (instruction) {
      updateInstructions(`${ANA_BASE_PROMPT}\n\n${instruction}`)
    }
  }, [updateInstructions])

  // ── DataChannel event handler ──────────────────────────────────────────────

  const handleDCMessage = useCallback(async (event: MessageEvent) => {
    let msg: any
    try { msg = JSON.parse(event.data) } catch { return }

    switch (msg.type) {
      case 'response.done': {
        const audioItem = msg.response?.output?.find((o: any) => o.type === 'message' && o.role === 'assistant')
        if (audioItem) {
          const text = audioItem.content?.find((c: any) => c.type === 'audio')?.transcript
          if (text) {
            addTranscript('ana', text)
            saveTranscriptTurn('ana', text)
          }
        }

        const funcCalls = (msg.response?.output ?? []).filter((o: any) => o.type === 'function_call')
        for (const call of funcCalls) {
          let parsedArgs: Record<string, unknown> = {}
          try { parsedArgs = JSON.parse(call.arguments ?? '{}') } catch {}
          addTranscript('tool', `→ ${call.name}(${JSON.stringify(parsedArgs).slice(0, 80)})`)
          const result = await executeTool(call.name, parsedArgs)
          sendEvent({
            type: 'conversation.item.create',
            item: { type: 'function_call_output', call_id: call.call_id, output: result },
          })
          sendEvent({ type: 'response.create' })
        }
        break
      }

      case 'conversation.item.input_audio_transcription.completed': {
        const text = msg.transcript
        if (text) {
          addTranscript('lead', text)
          saveTranscriptTurn('lead', text)
          onLeadTurn()
        }
        break
      }

      case 'error':
        setErrorMsg(`Erro OpenAI: ${msg.error?.message ?? JSON.stringify(msg.error)}`)
        break
    }
  }, [executeTool, addTranscript, sendEvent, onLeadTurn, saveTranscriptTurn])

  // ── Restore checkpoint state ───────────────────────────────────────────────

  const restoreCheckpoint = useCallback((cp: CheckpointData) => {
    setCurrentStage(cp.stage)
    stageRef.current = cp.stage
    if (cp.speech_progress) {
      setSpeechProgress(cp.speech_progress)
      speechRef.current = cp.speech_progress
    }
    if (cp.gate_log) {
      setGateLog(cp.gate_log)
      gateLogRef.current = cp.gate_log
    }
    const instructions = cp.stage === 'speech'
      ? `${ANA_BASE_PROMPT}\n\n${SPEECH_PART_INSTRUCTIONS[String(cp.speech_progress?.parte_atual ?? 1)]}`
      : `${ANA_BASE_PROMPT}\n\n${STAGE_INSTRUCTIONS[cp.stage] ?? ''}`
    pendingInstructionsRef.current = instructions
    addTranscript('system', `🔄 Retomando do checkpoint → ${(STAGE_LABELS[cp.stage] ?? cp.stage).toUpperCase()}`)
  }, [addTranscript])

  // ── Start session ─────────────────────────────────────────────────────────

  const startSession = useCallback(async (checkpointOverride?: CheckpointData) => {
    if (!telefone.trim()) {
      setErrorMsg('Digite o telefone de teste antes de iniciar.')
      return
    }
    setErrorMsg('')
    setStatus('connecting')
    setTranscript([])
    setGateLog([])
    gateLogRef.current = []
    setMemories({})
    setReferidosLink(null)
    setReferidosStatus(null)
    setSpeechProgress(initialSpeechProgress())
    setCurrentStage('apresentacao')
    checkpointsRef.current = {}
    setSavedCheckpoints({})
    audioChunksRef.current = []

    try {
      const sessionRes = await fetch('/api/admin/ana-master/simulador/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone, nome: 'Lead Teste' }),
      })
      if (!sessionRes.ok) throw new Error('Falha ao criar sessão')
      const { callSid, clientSecret, telefone: normPhone } = await sessionRes.json()
      callSidRef.current = callSid
      telefoneRef.current = normPhone

      // Apply checkpoint if resuming
      if (checkpointOverride) {
        restoreCheckpoint(checkpointOverride)
      }

      const pc = new RTCPeerConnection()
      pcRef.current = pc

      const audio = document.createElement('audio')
      audio.autoplay = true
      audioRef.current = audio
      pc.ontrack = (e) => { audio.srcObject = e.streams[0] }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      // Start audio recording
      try {
        const supportedType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''
        const recorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : {})
        audioChunksRef.current = []
        recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
        recorder.start(2000)
        mediaRecorderRef.current = recorder
        setIsRecording(true)
      } catch {}

      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc
      dc.onmessage = handleDCMessage
      dc.onopen = () => {
        addTranscript('system', '🎙️ Conectado — ANA está iniciando...')
        if (pendingInstructionsRef.current) {
          sendEvent({ type: 'session.update', session: { instructions: pendingInstructionsRef.current } })
          pendingInstructionsRef.current = null
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const oaiRes = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      })
      if (!oaiRes.ok) throw new Error('Falha ao conectar ao OpenAI Realtime')

      const sdp = await oaiRes.text()
      await pc.setRemoteDescription({ type: 'answer', sdp })

      setStatus('active')
    } catch (e: any) {
      setStatus('error')
      setErrorMsg(e.message)
    }
  }, [telefone, handleDCMessage, addTranscript, sendEvent, restoreCheckpoint])

  // ── Stop session ───────────────────────────────────────────────────────────

  const stopSession = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => uploadAudio()
      recorder.stop()
    }
    mediaRecorderRef.current = null
    setIsRecording(false)

    pcRef.current?.close()
    pcRef.current = null
    dcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    if (audioRef.current) { audioRef.current.srcObject = null }
    setStatus('ended')
    addTranscript('system', '⏹ Sessão encerrada.')
  }, [addTranscript, uploadAudio])

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => { t.enabled = isMuted })
    setIsMuted(!isMuted)
  }, [isMuted])

  const copyLink = useCallback(() => {
    if (referidosLink) {
      navigator.clipboard.writeText(referidosLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [referidosLink])

  // ── Speech progress display ────────────────────────────────────────────────

  const speechBadge = () => {
    if (currentStage !== 'speech') return null
    const sp = speechProgress
    if (sp.state === 'COMPLETE') return <span className="badge-green">Speech Completo ✓</span>
    if (sp.state === 'WAITING_FINAL_RESPONSE') return <span className="badge-amber">Aguardando resposta final</span>
    if (sp.parte_atual === 'final_question') return <span className="badge-amber">Pergunta final</span>
    if (typeof sp.parte_atual === 'number') {
      return <span className="badge-purple">P{sp.parte_atual} — {sp.state === 'WAITING_LEAD' ? 'aguardando lead' : 'entregando'}</span>
    }
    return null
  }

  const checkpointEntries = Object.entries(savedCheckpoints).sort(
    ([, a], [, b]) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#0A0A0B] text-white overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT PANEL ── */}
          <div className="w-72 flex-shrink-0 border-r border-[#1C1C1E] flex flex-col overflow-y-auto">

            {/* Header */}
            <div className="p-4 border-b border-[#1C1C1E]">
              <p className="text-[10px] font-semibold tracking-widest text-[#7B3FE4] uppercase mb-1">ANA MASTER</p>
              <h1 className="text-base font-bold text-white">Simulador de Voz</h1>
              <p className="text-xs text-[#52525E] mt-0.5 flex items-center gap-1.5">
                WebRTC · gpt-4o-realtime
                {isRecording && <span className="flex items-center gap-1 text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block"></span>REC</span>}
                {audioUploading && <span className="text-amber-400">↑ salvando áudio...</span>}
              </p>
            </div>

            {/* Phone input */}
            <div className="p-4 border-b border-[#1C1C1E]">
              <label className="text-[10px] font-semibold tracking-widest text-[#52525E] uppercase block mb-2">Telefone de teste</label>
              <input
                type="tel"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                placeholder="+55 11 9 9999-0000"
                disabled={status === 'active' || status === 'connecting'}
                className="w-full bg-[#111113] border border-[#27272F] rounded-lg px-3 py-2 text-sm text-white placeholder-[#52525E] focus:outline-none focus:border-[#7B3FE4] disabled:opacity-50"
              />
              {errorMsg && <p className="text-xs text-red-400 mt-2">{errorMsg}</p>}
            </div>

            {/* Controls */}
            <div className="p-4 border-b border-[#1C1C1E] flex flex-col gap-2">
              {status === 'idle' || status === 'ended' || status === 'error' ? (
                <button
                  onClick={() => startSession()}
                  className="flex items-center justify-center gap-2 bg-[#7B3FE4] hover:bg-[#6D35CC] text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  <Phone size={15} />
                  Iniciar Simulação
                </button>
              ) : status === 'connecting' ? (
                <button disabled className="flex items-center justify-center gap-2 bg-[#7B3FE4]/50 text-white rounded-lg px-4 py-2.5 text-sm font-semibold">
                  <RefreshCw size={15} className="animate-spin" />
                  Conectando...
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={toggleMute}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${isMuted ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-[#1C1C1E] text-white border border-[#27272F] hover:border-[#7B3FE4]'}`}
                  >
                    {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                    {isMuted ? 'Mudo' : 'Mic ON'}
                  </button>
                  <button
                    onClick={stopSession}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors"
                  >
                    <PhoneOff size={14} />
                    Encerrar
                  </button>
                </div>
              )}
            </div>

            {/* Checkpoints */}
            {checkpointEntries.length > 0 && (
              <div className="p-4 border-b border-[#1C1C1E]">
                <p className="text-[10px] font-semibold tracking-widest text-amber-500 uppercase mb-3">Checkpoints</p>
                <div className="flex flex-col gap-1.5">
                  {checkpointEntries.map(([gate, cp]) => (
                    <button
                      key={gate}
                      onClick={() => {
                        if (status === 'active') {
                          restoreCheckpoint(cp)
                          updateInstructions(
                            cp.stage === 'speech'
                              ? `${ANA_BASE_PROMPT}\n\n${SPEECH_PART_INSTRUCTIONS[String(cp.speech_progress?.parte_atual ?? 1)]}`
                              : `${ANA_BASE_PROMPT}\n\n${STAGE_INSTRUCTIONS[cp.stage] ?? ''}`
                          )
                        } else {
                          startSession(cp)
                        }
                      }}
                      className="flex items-center justify-between gap-2 bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 rounded-lg px-3 py-2 text-left transition-colors"
                    >
                      <div>
                        <p className="text-[10px] font-bold text-amber-400">{GATE_LABELS[gate] ?? gate}</p>
                        <p className="text-[10px] text-[#52525E]">→ {STAGE_LABELS[cp.stage] ?? cp.stage}</p>
                      </div>
                      <RotateCcw size={11} className="text-amber-500/60 shrink-0" />
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#52525E] mt-2">
                  {status === 'active' ? 'Clique para retomar nesta etapa' : 'Clique para iniciar daqui'}
                </p>
              </div>
            )}

            {/* Stages */}
            <div className="p-4 border-b border-[#1C1C1E]">
              <p className="text-[10px] font-semibold tracking-widest text-[#52525E] uppercase mb-3">Etapas</p>
              <div className="flex flex-wrap gap-1.5">
                {STAGES_ORDER.filter(s => s !== 'ganho').map(stage => {
                  const idx = STAGES_ORDER.indexOf(stage)
                  const currentIdx = STAGES_ORDER.indexOf(currentStage)
                  const done = idx < currentIdx
                  const active = stage === currentStage
                  return (
                    <span
                      key={stage}
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                        done ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        active ? 'bg-[#7B3FE4]/20 text-[#A78BFA] border-[#7B3FE4]/40' :
                        'bg-[#111113] text-[#52525E] border-[#1C1C1E]'
                      }`}
                    >
                      {done ? '✓ ' : ''}{STAGE_LABELS[stage]}
                    </span>
                  )
                })}
                {currentStage === 'ganho' && (
                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">🏆 GANHO</span>
                )}
              </div>
              {currentStage === 'speech' && (
                <div className="mt-2">{speechBadge()}</div>
              )}
            </div>

            {/* Memories */}
            <div className="p-4 border-b border-[#1C1C1E]">
              <p className="text-[10px] font-semibold tracking-widest text-[#52525E] uppercase mb-3">Memórias</p>
              {Object.keys(memories).length === 0 ? (
                <p className="text-xs text-[#52525E]">Nenhuma memória salva.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {Object.entries(memories)
                    .filter(([k]) => !['telefone', 'nome', 'sim_browser', 'transcript', 'speech_progress', 'checkpoints', 'audio_url'].includes(k))
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 text-xs">
                        <span className="text-[#52525E] shrink-0">{k}</span>
                        <span className="text-white text-right truncate max-w-[120px]" title={String(v)}>{String(v)}</span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Referidos */}
            {referidosLink && (
              <div className="p-4 border-b border-[#1C1C1E]">
                <p className="text-[10px] font-semibold tracking-widest text-emerald-500 uppercase mb-2 flex items-center gap-1">
                  <Link size={10} /> Referidos
                </p>
                <div className="bg-[#111113] border border-emerald-500/20 rounded-lg p-2.5 mb-2">
                  <p className="text-[10px] text-[#52525E] mb-1">Link de indicação:</p>
                  <p className="text-xs text-emerald-400 break-all">{referidosLink}</p>
                </div>
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1.5 text-xs text-[#A78BFA] hover:text-white transition-colors"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copiado!' : 'Copiar link'}
                </button>
                {referidosStatus && (
                  <div className="mt-2 text-xs text-[#52525E]">
                    <span>Indicadas: <strong className="text-white">{referidosStatus.total}/20</strong></span>
                    {referidosStatus.semDados > 0 && <span className="ml-2 text-amber-400">semDados: {referidosStatus.semDados}</span>}
                    {referidosStatus.missaoCompleta && <span className="ml-2 text-emerald-400">✓ Missão completa</span>}
                  </div>
                )}
              </div>
            )}

            {/* Gate log */}
            {gateLog.length > 0 && (
              <div className="p-4">
                <p className="text-[10px] font-semibold tracking-widest text-[#52525E] uppercase mb-3">Gates</p>
                <div className="flex flex-col gap-1">
                  {gateLog.map((g, i) => (
                    <div key={i} className="text-xs text-emerald-400">✓ {g.gate}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL: Transcript ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-3 border-b border-[#1C1C1E] flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Transcrição ao vivo</p>
                <p className="text-[10px] text-[#52525E]">
                  {status === 'active' ? `● Ativo · ${STAGE_LABELS[currentStage] ?? currentStage}` :
                   status === 'connecting' ? '◌ Conectando...' :
                   status === 'ended' ? '■ Encerrado' :
                   status === 'error' ? '✕ Erro' : '○ Aguardando início'}
                </p>
              </div>
              {status === 'active' && (
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-emerald-400">AO VIVO</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
              {transcript.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#7B3FE4]/10 border border-[#7B3FE4]/20 flex items-center justify-center">
                    <Mic size={24} className="text-[#7B3FE4]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Simulador de Voz ANA</p>
                    <p className="text-xs text-[#52525E] mt-1">Digite o telefone e clique em Iniciar Simulação</p>
                    <p className="text-xs text-[#52525E] mt-0.5">Áudio gravado automaticamente · Checkpoints por gate</p>
                  </div>
                </div>
              )}

              {transcript.map((line, i) => (
                <div key={i} className={`rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                  line.role === 'ana'
                    ? 'bg-[#7B3FE4]/10 border border-[#7B3FE4]/20 text-white'
                    : line.role === 'lead'
                    ? 'bg-[#1C1C1E] border border-[#27272F] text-[#A1A1AA]'
                    : line.role === 'tool'
                    ? 'bg-orange-500/5 border border-orange-500/10 text-orange-400 font-mono text-xs'
                    : 'bg-[#111113] border border-[#1C1C1E] text-[#52525E] text-xs italic'
                }`}>
                  {line.role !== 'system' && line.role !== 'tool' && (
                    <p className={`text-[10px] font-bold tracking-widest uppercase mb-1 ${
                      line.role === 'ana' ? 'text-[#A78BFA]' : 'text-[#52525E]'
                    }`}>
                      {line.role === 'ana' ? 'ANA' : 'Você'}
                    </p>
                  )}
                  {line.text}
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        .badge-purple { @apply text-[10px] px-2 py-0.5 rounded font-semibold bg-[#7B3FE4]/20 text-[#A78BFA] border border-[#7B3FE4]/40; }
        .badge-green  { @apply text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30; }
        .badge-amber  { @apply text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30; }
      `}</style>
    </div>
  )
}

// ── Page wrapper (Suspense for useSearchParams) ────────────────────────────────

export default function SimuladorVozPage() {
  return (
    <Suspense fallback={<div className="flex h-screen bg-[#0A0A0B] items-center justify-center text-white text-sm">Carregando...</div>}>
      <SimuladorVozInner />
    </Suspense>
  )
}
