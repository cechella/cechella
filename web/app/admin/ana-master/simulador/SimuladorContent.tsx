'use client'

import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mic, MicOff, Phone, PhoneOff, Copy, Check, RefreshCw, Link, RotateCcw, Activity } from 'lucide-react'
import { SPEECH_PART_INSTRUCTIONS, ANA_BASE_PROMPT, STAGE_INSTRUCTIONS } from '@/lib/ana-master/constants'
import { VOICE_BEHAVIOR_PROFILES, ACTIVE_PROFILE } from '@/lib/ana-master/runtime-profile'

// ── Types ──────────────────────────────────────────────────────────────────────

interface TranscriptLine {
  role: 'ana' | 'lead' | 'tool' | 'system'
  text: string
  ts: number
  streaming?: boolean
  disposition?: LeadTurnDisposition
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

// FASE 1 — AnaDeliveryState: Transport fornece evidência. Core mantém decisão.
interface AnaDeliveryState {
  responseId: string
  generated: boolean
  audio_started: boolean
  interrupted: boolean
  truncated: boolean
  response_status: string | null  // 'completed' | 'cancelled' | null
  delivery_complete: boolean
}

// FASE 1 — LeadTurnDisposition: classifyLeadTurn() output
// Conversation Intelligence v1 — ConversationExpectation
type ExpectedResponseType =
  | 'ANSWER_YES_NO'
  | 'ANSWER_CHOICE'
  | 'ANSWER_OPEN'
  | 'ANSWER_CONFIRMATION'
  | 'NONE'

interface ConversationExpectation {
  waiting: boolean
  expected_type: ExpectedResponseType
  originating_stage: string
  originating_turn_id: string
  pendingClarification: string | null
}

type LeadTurnDisposition =
  | 'BACKCHANNEL'
  | 'ANSWER'
  | 'ANSWER_AMBIGUOUS'
  | 'GENERIC_POSITIVE_RESPONSE'
  | 'THINKING'
  | 'UNINTELLIGIBLE'
  | 'CONTINUE'
  | 'QUESTION'
  | 'CONFUSION'
  | 'INTERRUPTION'
  | 'OBJECTION'
  | 'FINAL_INTEREST_RESPONSE'
  | 'UNKNOWN'

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

// FASE 2 — Latency metrics
interface LatencyMetrics {
  lastResponseMs: number | null
  interruptionCount: number
  turnCount: number
}

type SessionStatus = 'idle' | 'connecting' | 'active' | 'error' | 'ended'

// ── Constants ──────────────────────────────────────────────────────────────────

// PASSO 2A — Tool response policy: silent = no response.create after tool output
//            controller_decides = response.create is sent (behavior unchanged in 2A)
const TOOL_RESPONSE_POLICY: Record<string, 'silent' | 'controller_decides'> = {
  save_memory:              'controller_decides',
  send_whatsapp:            'silent',
  set_expectation:          'silent',
  gateValidator:            'controller_decides',
  registrar_parte_speech:   'controller_decides',
  verificar_pagamento:      'controller_decides',
  verificar_referidos:      'controller_decides',
  iniciar_coleta_referidos: 'controller_decides',
  get_lead_context:         'controller_decides',
}

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
const DISPOSITION_LABELS: Record<LeadTurnDisposition, string> = {
  BACKCHANNEL: 'Backchannel', ANSWER: 'Resposta', ANSWER_AMBIGUOUS: 'Resp. Ambígua',
  GENERIC_POSITIVE_RESPONSE: 'Resp. Genérica',
  THINKING: 'Pensando', UNINTELLIGIBLE: 'Ininteligível',
  CONTINUE: 'Continuar', QUESTION: 'Pergunta',
  CONFUSION: 'Confusão', INTERRUPTION: 'Interrupção', OBJECTION: 'Objeção',
  FINAL_INTEREST_RESPONSE: 'Resp. Final', UNKNOWN: 'Desconhecido',
}
const DISPOSITION_COLORS: Record<LeadTurnDisposition, string> = {
  BACKCHANNEL: '#52525E', ANSWER: '#34D399', ANSWER_AMBIGUOUS: '#F59E0B',
  GENERIC_POSITIVE_RESPONSE: '#FB923C',
  THINKING: '#818CF8', UNINTELLIGIBLE: '#6B7280',
  CONTINUE: '#34D399', QUESTION: '#60A5FA',
  CONFUSION: '#F59E0B', INTERRUPTION: '#F87171', OBJECTION: '#EF4444',
  FINAL_INTEREST_RESPONSE: '#A78BFA', UNKNOWN: '#3F3F46',
}

// Conversation Intelligence v1 — valid ExpectedResponseType by stage
const VALID_EXPECTATION_TYPES_BY_STAGE: Record<string, ExpectedResponseType[]> = {
  apresentacao: ['ANSWER_OPEN', 'ANSWER_YES_NO'],
  conexao:      ['ANSWER_OPEN', 'ANSWER_YES_NO'],
  combinado:    ['ANSWER_YES_NO', 'ANSWER_CONFIRMATION'],
  fechamento:   ['ANSWER_CHOICE', 'ANSWER_YES_NO'],
  pagamento:    ['ANSWER_OPEN', 'ANSWER_YES_NO'],
  referidos:    ['ANSWER_OPEN', 'ANSWER_YES_NO', 'ANSWER_CONFIRMATION'],
  validacao:    ['ANSWER_OPEN', 'ANSWER_YES_NO'],
}

function resetExpectation(): ConversationExpectation {
  return { waiting: false, expected_type: 'NONE', originating_stage: '', originating_turn_id: '', pendingClarification: null }
}

function inferPendingClarification(exp: ConversationExpectation): string {
  const tid = exp.originating_turn_id ?? ''
  if (tid.includes('combinado_fala4')) return 'viagem'
  if (tid.includes('combinado_fala3')) return 'decisão de saúde'
  if (tid.includes('fechamento_escolha')) return 'forma de pagamento'
  if (exp.originating_stage === 'combinado') return 'combinado'
  return 'última resposta'
}

// ── Pure helpers ───────────────────────────────────────────────────────────────

function initialSpeechProgress(): SpeechProgress {
  return {
    parte_atual: 1, partes_entregues: [], parte_em_execucao: 1,
    state: 'DELIVERING_PART', waiting_for_lead: false,
    pergunta_final_feita: false, resposta_final_recebida: false,
  }
}

function initialDelivery(responseId = ''): AnaDeliveryState {
  return { responseId, generated: true, audio_started: false, interrupted: false, truncated: false, response_status: null, delivery_complete: false }
}

// Conversation Intelligence v1 — classifyLeadTurn: context-aware, no API call (latency-sensitive)
function classifyLeadTurn(
  text: string,
  stage: string,
  sp: SpeechProgress,
  wasInterrupted: boolean,
  expectation: ConversationExpectation
): LeadTurnDisposition {
  const t = text.toLowerCase().trim()
  const words = t.split(/\s+/).filter(Boolean).length

  // Always-on: detected regardless of expectation state
  if (wasInterrupted) return 'INTERRUPTION'
  if (/(é caro|muito caro|não tenho (dinheiro|grana)|sem dinheiro|meu marido|preciso pensar|vou pesquisar|meu médico|causa câncer|é perigoso|tenho medo|não sei se|vou esperar|não posso agora|não tem condição)/i.test(t)) return 'OBJECTION'
  if (/não (entendi|entendo|compreendi)|pode repetir|o que (você |vc )?disse|como assim|não ficou claro|repete|repita|pode (re)?explicar/i.test(t)) return 'CONFUSION'

  // THINKING: fragmento de hesitação — lead ainda está formulando o pensamento
  if (words <= 3 && /^(então|deixa|hmm|hm|espera|perai|deixa eu|então eu|então a|vou ver|como assim|ah espera|ah então|bom então|aí então|deixa ver)/i.test(t)) return 'THINKING'

  // UNINTELLIGIBLE: transcrição incoerente ou não-PT — sem conteúdo semântico aproveitável
  if (words <= 1 && !/^(sim|não|nao|s|n|ok|tá|ta|pode|claro|é|bom|boa)$/i.test(t) && !/[a-záàãâéêíóôõúüç]/i.test(t)) return 'UNINTELLIGIBLE'

  // Speech stage: final interest response always takes precedence
  if (stage === 'speech' && (sp.state === 'WAITING_FINAL_RESPONSE' || sp.pergunta_final_feita)) return 'FINAL_INTEREST_RESPONSE'

  // With active expectation — interpret relative to what ANA was waiting for
  if (expectation.waiting && expectation.expected_type !== 'NONE') {
    const isShortAffirmative = /^(sim|s|não|nao|pode|claro|ok|tá|ta|certo|combinado|exato|é isso|isso|com certeza|verdade|perfeito|pode ser|pode sim|ta bom|tá bom|confirmado|de jeito nenhum|não quero|prefiro não|prefiro nao|isso mesmo|pois é|claro que sim)$/i.test(t)
    const isPureBackchannel = words <= 2 && /^(hm+|mm+|ah+|ã+|uhm+|uh+|é+)$/i.test(t)

    switch (expectation.expected_type) {
      case 'ANSWER_YES_NO':
        if (isShortAffirmative) return 'ANSWER'
        if (isPureBackchannel) return 'BACKCHANNEL'
        if (words >= 2) return 'ANSWER'
        return 'BACKCHANNEL'

      case 'ANSWER_CONFIRMATION':
        if (isShortAffirmative) return 'ANSWER'
        if (isPureBackchannel) return 'BACKCHANNEL'
        if (words >= 2) return 'ANSWER'
        return 'BACKCHANNEL'

      case 'ANSWER_OPEN': {
        if (isPureBackchannel) return 'BACKCHANNEL'
        // In speech stage: generic positives without specific content need aprofundamento
        const isGenericPositive = /^(gostei de tudo|adorei|muito bom|ótimo|foi ótimo|foi muito bom|achei ótimo|achei muito bom|tudo|gostei|amei|perfeito|incrível|fantástico|maravilhoso|legal|que bom|tá bom|ta bom|bom demais)$/i.test(t)
        if (stage === 'speech' && isGenericPositive) return 'GENERIC_POSITIVE_RESPONSE'
        if (words >= 2) return 'ANSWER'
        return 'BACKCHANNEL'
      }

      case 'ANSWER_CHOICE': {
        const hasPix = /pix/i.test(t)
        const hasVistaPhonetic = /à vista|a vista|avista/i.test(t)
        const hasAmbiguousVista = /pizzas?|biz\b|mix\b/i.test(t) && !hasPix
        const hasCartao = /cart[aã]o|cartao|parcel|cr[eé]dito|credito|6x|seis vezes/i.test(t)
        if (hasPix || (hasVistaPhonetic && !hasAmbiguousVista)) return 'ANSWER'
        if (hasAmbiguousVista) return 'ANSWER_AMBIGUOUS'
        if (hasCartao) return 'ANSWER'
        if (isPureBackchannel) return 'BACKCHANNEL'
        if (words >= 2) return 'ANSWER_AMBIGUOUS'
        return 'BACKCHANNEL'
      }
    }
  }

  // No active expectation — original logic preserved
  if (
    words <= 4 &&
    /^(sim|s|tá|ta|ok|entendi|uhm+|mm+|ah+|é|é mesmo|certo|claro|bom|boa|legal|ótimo|pode|vai|prossiga|continue|pode sim|tá bom|tudo bem|perfeito|maravilha|certo certo|sim sim|hm+)/.test(t)
  ) return 'BACKCHANNEL'

  if (/^(continue|pode continuar|prossiga|fala mais|me conta mais|conta|fale|pode falar|vá em frente|pode ir|vai)/i.test(t)) return 'CONTINUE'
  if (/\?/.test(text) || /^(o que|quando|como|onde|por qu[eê]|quanto|qual|quais|quem|me diga|me conta|pode (me )?explicar|e se|mas e|mas (o que|como|quando)|e (o que|como|quando)|qual o|quanto (é|custa|fica))/i.test(t)) return 'QUESTION'

  return 'UNKNOWN'
}

// Build full instruction string for a stage (base + stage + voice behavior profile)
function buildInstructions(stage: string, speechPart?: string | number): string {
  const base = ANA_BASE_PROMPT
  const stageInst = speechPart
    ? SPEECH_PART_INSTRUCTIONS[String(speechPart)] ?? STAGE_INSTRUCTIONS[stage] ?? ''
    : STAGE_INSTRUCTIONS[stage] ?? ''
  const vbp = VOICE_BEHAVIOR_PROFILES[stage] ?? ''
  return `${base}\n\n${stageInst}${vbp ? '\n\n' + vbp : ''}`
}

// ── Inner component ────────────────────────────────────────────────────────────

function SimuladorInner() {
  const searchParams = useSearchParams()

  // ── State ──────────────────────────────────────────────────────────────────
  const [telefone, setTelefone] = useState('5548988416899')
  const [nome, setNome] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('marin')
  const [selectedModel, setSelectedModel] = useState('gpt-realtime-2.1')
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [currentStage, setCurrentStage] = useState('apresentacao')
  const [speechProgress, setSpeechProgress] = useState<SpeechProgress>(initialSpeechProgress())
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [streamingAnaText, setStreamingAnaText] = useState('')
  const [memories, setMemories] = useState<Memory>({})
  const [gateLog, setGateLog] = useState<GateEntry[]>([])
  const [savedCheckpoints, setSavedCheckpoints] = useState<Record<string, CheckpointData>>({})
  const [referidosLink, setReferidosLink] = useState<string | null>(null)
  const [referidosStatus, setReferidosStatus] = useState<{ total: number; semDados: number; missaoCompleta: boolean } | null>(null)
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const [audioUploading, setAudioUploading] = useState(false)
  const [profileVersion, setProfileVersion] = useState('')
  const [activeModel, setActiveModel] = useState('')
  const [activeVoice, setActiveVoice] = useState('')
  const [metrics, setMetrics] = useState<LatencyMetrics>({ lastResponseMs: null, interruptionCount: 0, turnCount: 0 })
  const [lastDisposition, setLastDisposition] = useState<LeadTurnDisposition | null>(null)
  // PASSO 2A
  const [timeline, setTimeline] = useState<{ts: number; event: string; detail?: string}[]>([])
  const [showTimeline, setShowTimeline] = useState(false)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const mixDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
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
  const audioUploadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingInstructionsRef = useRef<string | null>(null)
  // FASE 1 — delivery tracking
  const currentDeliveryRef = useRef<AnaDeliveryState>(initialDelivery())
  const wasInterruptedRef = useRef(false)
  // Conversation Intelligence v1 — ConversationExpectation
  const expectationRef = useRef<ConversationExpectation>(resetExpectation())
  // FASE 2 — latency tracking
  const speechStoppedAtRef = useRef<number | null>(null)
  const metricsRef = useRef<LatencyMetrics>({ lastResponseMs: null, interruptionCount: 0, turnCount: 0 })
  // PASSO 2A — response authority tracking
  const timelineRef = useRef<{ts: number; event: string; detail?: string}[]>([])
  const sessionStartTsRef = useRef<number>(0)
  const pendingManualResponseRef = useRef(false)
  const lastResponseOriginRef = useRef<string>('unknown')
  // HV-v4: tracks whether the initial session.update (create_response:false) was acknowledged
  const sessionReadyRef = useRef(false)
  // HV-v4: true while a response is in progress — guards against double response.create
  const responseInProgressRef = useRef(false)
  // HV-v4: if lead speaks while response is in progress, save origin to fire on response.done
  const pendingSkippedDispositionRef = useRef<string | null>(null)

  useEffect(() => { speechRef.current = speechProgress }, [speechProgress])
  useEffect(() => { stageRef.current = currentStage }, [currentStage])
  useEffect(() => { gateLogRef.current = gateLog }, [gateLog])
  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [transcript, streamingAnaText])

  // Auto-restore checkpoint from URL params (?checkpoint=GATE_X&resumeFrom=sim-browser-...)
  // Upload audio via sendBeacon if page closes/crashes before stopSession
  useEffect(() => {
    const handleUnload = () => {
      const chunks = audioChunksRef.current
      const callSid = callSidRef.current
      if (chunks.length === 0 || !callSid) return
      const blob = new Blob(chunks, { type: 'audio/webm' })
      navigator.sendBeacon(`/api/admin/ana-master/simulador/audio?callSid=${callSid}`, blob)
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  useEffect(() => {
    const gate = searchParams.get('checkpoint')
    const resumeCallSid = searchParams.get('resumeFrom')
    if (!gate || !resumeCallSid) return
    fetch(`/api/admin/ana-master/simulador/sessions?callSid=${resumeCallSid}`)
      .then(r => r.json())
      .then(data => {
        const cp = data.session?.memories?.checkpoints?.[gate]
        if (cp) {
          setSavedCheckpoints({ [gate]: cp })
          checkpointsRef.current = { [gate]: cp }
          addTranscript('system', `📂 Checkpoint carregado: ${gate} → ${cp.stage?.toUpperCase()}. Clique em Iniciar para retomar.`)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addTranscript = useCallback((role: TranscriptLine['role'], text: string, extra?: Partial<TranscriptLine>) => {
    setTranscript(prev => [...prev, { role, text, ts: Date.now(), ...extra }])
  }, [])

  const sendEvent = useCallback((event: unknown) => {
    if (dcRef.current?.readyState === 'open') dcRef.current.send(JSON.stringify(event))
  }, [])

  // PASSO 2A — timeline logger (stable identity, no deps)
  const logTimeline = useCallback((event: string, detail?: string) => {
    const entry = { ts: Date.now(), event, detail }
    timelineRef.current = [...timelineRef.current, entry]
    setTimeline(prev => [...prev.slice(-150), entry])
  }, [])

  // PASSO 2A — send response.create with origin tracking
  // HV-v4: include output_modalities:["audio"] — required when create_response:false is active,
  // otherwise the server may produce a response with no audio output.
  const sendResponseCreate = useCallback((origin: string) => {
    pendingManualResponseRef.current = true
    lastResponseOriginRef.current = origin
    logTimeline('RESPONSE_CREATE_SENT', `origin=${origin}`)
    sendEvent({ type: 'response.create', response: { output_modalities: ['audio'] } })
  }, [sendEvent, logTimeline])

  const updateInstructions = useCallback((instructions: string) => {
    // GA protocol: session.update must include type: 'realtime'
    logTimeline('SESSION_UPDATE_SENT', `chars=${instructions.length}`)
    sendEvent({ type: 'session.update', session: { type: 'realtime', instructions } })
  }, [sendEvent, logTimeline])

  // ── Persistence ────────────────────────────────────────────────────────────

  const saveTranscriptTurn = useCallback((role: string, text: string) => {
    if (!callSidRef.current || !text.trim()) return
    fetch('/api/admin/ana-master/simulador/transcript', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callSid: callSidRef.current, role, text }),
    }).catch(() => {})
  }, [])

  // FASE 2B — persist SpeechProgress on each relevant event (not just gate transitions)
  const saveSpeechState = useCallback((sp: SpeechProgress, event: string) => {
    if (!callSidRef.current) return
    fetch('/api/admin/ana-master/simulador/transcript', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callSid: callSidRef.current,
        speech_state: { event, speech_progress: sp, stage: stageRef.current },
      }),
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
        // Model now sends flat args (gate_id + evidence fields at top level)
        const { gate_id, ...flatEvidence } = args as { gate_id: string } & Record<string, unknown>
        const sp = speechRef.current
        const enriched = {
          ...flatEvidence,
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
          if (data.next_stage === 'speech') {
            const sp0 = initialSpeechProgress()
            setSpeechProgress(sp0); speechRef.current = sp0
          }
          // After GATE_FECHAMENTO: auto-generate referidos link (real infrastructure)
          if (gate_id === 'GATE_FECHAMENTO') {
            fetch(`${base}/referidos`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ telefone: telefoneRef.current, callSid: callSidRef.current }),
            }).then(r => r.json()).then(d => {
              if (d.link) {
                setReferidosLink(d.link)
                setMemories(prev => ({ ...prev, token_indicacao: d.token }))
                addTranscript('system', `🔗 Link referidos gerado: ${d.link}`)
              }
            }).catch(() => {})
          }
          // FASE 3 — inject Voice Behavior Profile at gate transition
          const inst = buildInstructions(data.next_stage)
          updateInstructions(inst)
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
      case 'registrar_parte_speech':
        return handleRegistrarParteSpeech(args.parte as number | string)
      case 'send_whatsapp':
        addTranscript('tool', `📱 WhatsApp (simulador — não enviado): ${args.mensagem}`)
        return 'Mensagem enviada.'
      case 'set_expectation': {
        // Conversation Intelligence v1 — declarative: model declares, controller validates
        const { expected_type, turn_id } = args as { expected_type: ExpectedResponseType; turn_id?: string }
        const stage = stageRef.current
        if (stage === 'speech') return JSON.stringify({ rejected: true, reason: 'speech stage controlled by SpeechProgress' })
        const validTypes = VALID_EXPECTATION_TYPES_BY_STAGE[stage] ?? []
        if (!validTypes.includes(expected_type)) return JSON.stringify({ rejected: true, reason: `${expected_type} invalid for stage=${stage}` })
        expectationRef.current = {
          waiting: true, expected_type,
          originating_stage: stage,
          originating_turn_id: turn_id ?? `auto-${Date.now()}`,
          pendingClarification: null,
        }
        logTimeline('EXPECTATION_SET', `type=${expected_type} stage=${stage}`)
        return JSON.stringify({ registered: true, expected_type, stage })
      }
      default:
        return JSON.stringify({ error: `Tool desconhecida: ${name}` })
    }
  }, [memories, addTranscript, updateInstructions, saveCheckpoint, logTimeline])

  // FASE 1 — SpeechProgress guard: só avança se delivery_complete === true
  function handleRegistrarParteSpeech(parte: number | string): string {
    const sp = speechRef.current
    const delivery = currentDeliveryRef.current

    // Guard: reject if the current delivery was interrupted or truncated
    if (!delivery.delivery_complete && (delivery.interrupted || delivery.truncated)) {
      return JSON.stringify({ error: 'delivery_incomplete — parte interrompida, não pode ser registrada', delivery_state: delivery })
    }

    if (typeof parte === 'number') {
      if (parte !== sp.parte_atual) return JSON.stringify({ error: `Ordem incorreta. parte_atual=${sp.parte_atual}` })
      const newPartes = [...sp.partes_entregues, parte as never]
      if (parte < 4) {
        const newSp: SpeechProgress = { ...sp, partes_entregues: newPartes, parte_atual: parte + 1, parte_em_execucao: undefined, state: 'WAITING_LEAD', waiting_for_lead: true }
        setSpeechProgress(newSp); speechRef.current = newSp
        saveSpeechState(newSp, `parte_${parte}_concluida`)  // FASE 2B
        // Send next part instructions immediately so ANA has them when she responds to lead's turn
        updateInstructions(buildInstructions('speech', parte + 1))
        return JSON.stringify({ ok: true, parte_registrada: parte, aguardando: 'turno_da_lead' })
      } else {
        const newSp: SpeechProgress = { ...sp, partes_entregues: newPartes, parte_atual: 'final_question', parte_em_execucao: undefined, state: 'WAITING_LEAD', waiting_for_lead: false }
        setSpeechProgress(newSp); speechRef.current = newSp
        updateInstructions(buildInstructions('speech', 'final_question'))
        saveSpeechState(newSp, 'parte_4_concluida')  // FASE 2B
        return JSON.stringify({ ok: true, parte_registrada: 4, proximo: 'pergunta_final' })
      }
    }
    if (parte === 'pergunta_feita') {
      const newSp: SpeechProgress = { ...sp, pergunta_final_feita: true, state: 'WAITING_FINAL_RESPONSE', waiting_for_lead: true }
      setSpeechProgress(newSp); speechRef.current = newSp
      saveSpeechState(newSp, 'pergunta_final_feita')  // FASE 2B
      return JSON.stringify({ ok: true, pergunta_final: 'registrada' })
    }
    if (parte === 'resposta_recebida') {
      const newSp: SpeechProgress = { ...sp, resposta_final_recebida: true, parte_atual: 'complete', state: 'COMPLETE', waiting_for_lead: false }
      setSpeechProgress(newSp); speechRef.current = newSp
      updateInstructions(buildInstructions('speech', 'complete'))
      saveSpeechState(newSp, 'resposta_final_recebida')  // FASE 2B
      return JSON.stringify({ ok: true, speech_progress: 'COMPLETE' })
    }
    return JSON.stringify({ error: `parte inválida: ${parte}` })
  }

  // Conversation Intelligence v1 — controller decides turn-by-turn based on expectation + disposition
  const handleLeadTurnDisposition = useCallback((text: string, disposition: LeadTurnDisposition) => {
    const sp = speechRef.current
    const stage = stageRef.current
    const exp = expectationRef.current

    setLastDisposition(disposition)
    setMetrics(prev => {
      const m = { ...prev, turnCount: prev.turnCount + 1 }
      metricsRef.current = m; return m
    })

    switch (disposition) {
      case 'ANSWER': {
        // Lead satisfied the pending expectation — clear it and let ANA continue
        if (exp.waiting) {
          expectationRef.current = resetExpectation()
          logTimeline('EXPECTATION_CLEARED', 'ANSWER received')
        }
        // Advance SpeechProgress if WAITING_LEAD in speech
        if (stage === 'speech' && sp.state === 'WAITING_LEAD' && sp.waiting_for_lead) {
          const newSp = { ...sp, waiting_for_lead: false, parte_em_execucao: typeof sp.parte_atual === 'number' ? sp.parte_atual : undefined }
          setSpeechProgress(newSp); speechRef.current = newSp
          saveSpeechState(newSp, 'lead_answer')
          updateInstructions(buildInstructions('speech', sp.parte_atual))
        }
        break
      }

      case 'ANSWER_AMBIGUOUS': {
        // Do NOT satisfy expectation — escalate to ANSWER_CONFIRMATION with specific field
        const field = inferPendingClarification(exp)
        logTimeline('EXPECTATION_ESCALATED', `ANSWER_AMBIGUOUS stage=${stage} field=${field}`)
        expectationRef.current = {
          waiting: true,
          expected_type: 'ANSWER_CONFIRMATION',
          originating_stage: stage,
          originating_turn_id: `confirm-${Date.now()}`,
          pendingClarification: field,
        }
        updateInstructions(
          buildInstructions(stage) +
          `\n\nCONTEXTO IMEDIATO: A resposta da lead foi ambígua. Confirme APENAS "${field}" em até 5 palavras — ex: "PIX à vista, certo?" ou "Pode viajar?" Não repita outros pontos. Não chame gates antes de confirmação.`
        )
        break
      }

      case 'THINKING': {
        // Lead still formulating — hold, do not respond
        logTimeline('THINKING_DETECTED', `stage=${stage}`)
        return  // HV-v4: explicit return — no response.create
      }

      case 'UNINTELLIGIBLE': {
        // ASR returned incoherent content — gentle one-shot clarification
        logTimeline('UNINTELLIGIBLE_DETECTED', `stage=${stage}`)
        updateInstructions(
          buildInstructions(stage) +
          '\n\nCONTEXTO IMEDIATO: A lead disse algo que não ficou claro. Peça gentilmente para repetir em uma frase curta. Ex: "Não peguei bem — pode repetir?" Sem desculpas, sem drama, sem explicar o motivo.'
        )
        break
      }

      case 'BACKCHANNEL': {
        // Speech WAITING_LEAD: hold — no response.create
        if (stage === 'speech' && sp.state === 'WAITING_LEAD' && sp.waiting_for_lead) return
        // Active expectation outside speech: lead hasn't answered — hold
        if (exp.waiting && stage !== 'speech') {
          logTimeline('EXPECTATION_HOLDING', `BACKCHANNEL stage=${stage} type=${exp.expected_type}`)
          updateInstructions(
            buildInstructions(stage) +
            '\n\nCONTEXTO IMEDIATO: AGUARDE — a lead ainda não respondeu sua pergunta. Não avance, não reformule, não faça nova pergunta. Aguarde turno real.'
          )
          return  // HV-v4: explicit return — no response.create
        }
        // No expectation — implicit continue: ANA continues naturally
        break
      }

      case 'CONTINUE': {
        // Lead wants ANA to continue — clear expectation and advance if WAITING_LEAD
        if (exp.waiting) {
          expectationRef.current = resetExpectation()
          logTimeline('EXPECTATION_CLEARED', 'CONTINUE received')
        }
        if (stage === 'speech' && sp.state === 'WAITING_LEAD' && sp.waiting_for_lead) {
          const newSp = { ...sp, waiting_for_lead: false, parte_em_execucao: typeof sp.parte_atual === 'number' ? sp.parte_atual : undefined }
          setSpeechProgress(newSp); speechRef.current = newSp
          saveSpeechState(newSp, 'lead_continue')
          updateInstructions(buildInstructions('speech', sp.parte_atual))
        }
        break
      }

      case 'QUESTION': {
        // Lead asked a question — clear expectation, conversation moved on
        if (exp.waiting) {
          expectationRef.current = resetExpectation()
          logTimeline('EXPECTATION_CLEARED', 'QUESTION received')
        }
        break
      }

      case 'CONFUSION':
        // ANA re-explains — no state change, no advancement
        break

      case 'INTERRUPTION': {
        const m = { ...metricsRef.current, interruptionCount: metricsRef.current.interruptionCount + 1 }
        setMetrics(m); metricsRef.current = m
        if (stage === 'speech' && typeof sp.parte_atual === 'number') {
          const newSp = { ...sp, parte_em_execucao: undefined }
          setSpeechProgress(newSp); speechRef.current = newSp
          saveSpeechState(newSp, 'parte_interrompida')
        }
        break
      }

      case 'OBJECTION': {
        // ANA handles via ISOLA — clear expectation (conversation interrupted)
        if (exp.waiting) {
          expectationRef.current = resetExpectation()
          logTimeline('EXPECTATION_CLEARED', 'OBJECTION received')
        }
        break
      }

      case 'FINAL_INTEREST_RESPONSE': {
        if (exp.waiting) {
          expectationRef.current = resetExpectation()
          logTimeline('EXPECTATION_CLEARED', 'FINAL_INTEREST_RESPONSE')
        }
        break
      }

      case 'GENERIC_POSITIVE_RESPONSE': {
        // In speech awaiting_final: do NOT clear expectation — model must aprofundar first
        // Outside speech: treat as ANSWER (generic positives are valid confirmations elsewhere)
        if (stage === 'speech') {
          logTimeline('GENERIC_POSITIVE_BLOCKED', 'speech awaiting_final — aprofundamento required')
          // Leave expectation active
        } else {
          if (exp.waiting) expectationRef.current = resetExpectation()
          logTimeline('GENERIC_POSITIVE_AS_ANSWER', `stage=${stage}`)
        }
        break
      }

      case 'UNKNOWN':
        // Leave expectation active — wait for clearer signal
        break
    }

    // For non-blocking dispositions during WAITING_LEAD in speech, let ANA continue
    // Note: THINKING already returned above — TypeScript narrows it out of this check
    if (stage === 'speech' && sp.state === 'WAITING_LEAD' && sp.waiting_for_lead &&
        disposition !== 'BACKCHANNEL' && disposition !== 'QUESTION' && disposition !== 'CONFUSION' &&
        disposition !== 'GENERIC_POSITIVE_RESPONSE' && disposition !== 'UNINTELLIGIBLE') {
      const newSp = { ...sp, waiting_for_lead: false, parte_em_execucao: typeof sp.parte_atual === 'number' ? sp.parte_atual : undefined }
      setSpeechProgress(newSp); speechRef.current = newSp
      updateInstructions(buildInstructions('speech', sp.parte_atual))
    }

    // HV-v4: controller_response_gate — fire response.create explicitly for all non-suppressed dispositions.
    // Guard: skip if a response is already in progress (prevents "active response" error).
    // session.update (updateInstructions) was sent above; DataChannel ordering ensures server processes
    // it before this response.create. output_modalities:["audio"] is set inside sendResponseCreate.
    if (ACTIVE_PROFILE.controller_response_gate && !responseInProgressRef.current) {
      pendingSkippedDispositionRef.current = null
      sendResponseCreate(`disposition:${disposition}`)
    } else if (ACTIVE_PROFILE.controller_response_gate) {
      pendingSkippedDispositionRef.current = `disposition:${disposition}`
      logTimeline('RESPONSE_CREATE_QUEUED', `disposition=${disposition} — response in progress, will fire on response.done`)
    }
  }, [updateInstructions, saveSpeechState, logTimeline, sendResponseCreate])

  // ── DataChannel message handler ────────────────────────────────────────────

  const handleDCMessage = useCallback(async (event: MessageEvent) => {
    let msg: any
    try { msg = JSON.parse(event.data) } catch { return }

    switch (msg.type) {

      // ── FASE 1 — AnaDeliveryState tracking ──────────────────────────────────

      case 'response.created': {
        // PASSO 2A — detect automatic (VAD) vs manual (controller) response creation
        const isAutomatic = !pendingManualResponseRef.current
        pendingManualResponseRef.current = false
        logTimeline('RESPONSE_CREATED', isAutomatic
          ? 'AUTOMATIC — VAD/server (no local response.create sent)'
          : `manual origin=${lastResponseOriginRef.current}`)
        // New response starting — reset delivery state
        currentDeliveryRef.current = initialDelivery(msg.response?.id ?? '')
        wasInterruptedRef.current = false
        responseInProgressRef.current = true  // HV-v4: block further response.create
        break
      }

      case 'session.updated': {
        logTimeline('SESSION_UPDATED')
        // HV-v4: first session.updated confirms create_response:false is active.
        // ANA waits for the lead to speak first (simulates real call: lead picks up → says "Alô").
        if (ACTIVE_PROFILE.controller_response_gate && !sessionReadyRef.current) {
          sessionReadyRef.current = true
          logTimeline('SESSION_READY', 'waiting for lead to speak first (call pickup simulation)')
        }
        break
      }

      case 'response.audio.delta': {
        // FASE 1: mark audio as started (generated audio is now being streamed)
        if (!currentDeliveryRef.current.audio_started) {
          currentDeliveryRef.current.audio_started = true
          logTimeline('FIRST_AUDIO_DELTA')
          // FASE 2 — latency: measure speech_stopped → first audio delta
          if (speechStoppedAtRef.current) {
            const latencyMs = Date.now() - speechStoppedAtRef.current
            speechStoppedAtRef.current = null
            setMetrics(prev => {
              const m = { ...prev, lastResponseMs: latencyMs }
              metricsRef.current = m; return m
            })
          }
        }
        break
      }

      // Streaming transcript — GA protocol renamed to output_audio_transcript
      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta': {
        setStreamingAnaText(prev => prev + (msg.delta ?? ''))
        break
      }

      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done': {
        // Streaming text finalized — will be committed in response.done
        break
      }

      case 'response.done': {
        const responseStatus = msg.response?.status ?? null
        logTimeline('RESPONSE_DONE', `status=${responseStatus}`)
        currentDeliveryRef.current.response_status = responseStatus

        if (responseStatus === 'cancelled') {
          // Barge-in confirmed: ANA's response was interrupted
          currentDeliveryRef.current.interrupted = true
          currentDeliveryRef.current.delivery_complete = false
          wasInterruptedRef.current = true
          addTranscript('system', `⚡ Turno interrompido pela lead`)
        } else {
          // Normal completion: delivery is complete if audio started and not truncated
          currentDeliveryRef.current.delivery_complete = currentDeliveryRef.current.audio_started && !currentDeliveryRef.current.truncated
        }

        // Clear streaming text
        setStreamingAnaText('')

        // Commit transcript from response.done output
        // GA protocol: content type is 'output_audio' or 'audio', transcript in .transcript
        const audioItem = msg.response?.output?.find((o: any) => o.type === 'message' && o.role === 'assistant')
        if (audioItem) {
          const audioContent = audioItem.content?.find((c: any) => c.type === 'output_audio' || c.type === 'audio')
          const text = audioContent?.transcript
          if (text) { addTranscript('ana', text); saveTranscriptTurn('ana', text) }
        }

        // Execute function calls — wrapped in try/catch so a failing tool never
        // silently locks responseInProgressRef and freezes ANA permanently.
        const funcCalls = (msg.response?.output ?? []).filter((o: any) => o.type === 'function_call')
        let nonSilentToolFired = false
        for (const call of funcCalls) {
          let parsedArgs: Record<string, unknown> = {}
          try { parsedArgs = JSON.parse(call.arguments ?? '{}') } catch {}
          const policy = TOOL_RESPONSE_POLICY[call.name] ?? 'controller_decides'
          addTranscript('tool', `→ ${call.name}(${JSON.stringify(parsedArgs).slice(0, 80)}) [${policy}]`)
          logTimeline('TOOL_CALL', `${call.name} policy=${policy}`)
          let result = 'ok'
          try {
            result = await executeTool(call.name, parsedArgs)
          } catch (toolErr: any) {
            logTimeline('TOOL_ERROR', `${call.name} threw: ${toolErr?.message ?? toolErr}`)
            result = `error: ${toolErr?.message ?? 'unknown'}`
          }
          sendEvent({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: call.call_id, output: result } })
          logTimeline('FUNCTION_CALL_OUTPUT_SENT', call.name)
          logTimeline('RESPONSE_CREATE_DECISION', `tool=${call.name} policy=${policy}`)
          if (policy !== 'silent') { sendResponseCreate(`tool:${call.name}`); nonSilentToolFired = true }
        }
        // HV-v4: response is done — unlock response.create for next turn
        responseInProgressRef.current = false
        // HV-v4: if lead spoke while response was in progress, fire the queued response.create now
        if (ACTIVE_PROFILE.controller_response_gate && pendingSkippedDispositionRef.current) {
          const queuedOrigin = pendingSkippedDispositionRef.current
          pendingSkippedDispositionRef.current = null
          logTimeline('RESPONSE_CREATE_DEQUEUED', `firing queued ${queuedOrigin}`)
          sendResponseCreate(queuedOrigin)
        } else if (
          // Response completed with no audio and only silent tools — ANA must continue speaking
          ACTIVE_PROFILE.controller_response_gate &&
          responseStatus !== 'cancelled' &&
          !currentDeliveryRef.current.audio_started &&
          funcCalls.length > 0 &&
          !nonSilentToolFired
        ) {
          logTimeline('RESPONSE_CREATE_SILENT_RECOVERY', 'no audio + only silent tools — firing recovery response.create')
          sendResponseCreate('silent-tool-recovery')
        }
        break
      }

      // FASE 1 — barge-in: VAD detected lead speech during ANA's turn
      case 'input_audio_buffer.speech_started': {
        logTimeline('LEAD_SPEECH_STARTED')
        // Mark current delivery as interrupted
        if (!currentDeliveryRef.current.interrupted) {
          currentDeliveryRef.current.interrupted = true
          currentDeliveryRef.current.delivery_complete = false
        }
        break
      }

      // FASE 2 — latency: record when lead stops speaking
      case 'input_audio_buffer.speech_stopped': {
        logTimeline('LEAD_SPEECH_STOPPED')
        speechStoppedAtRef.current = Date.now()
        break
      }

      // FASE 1 — truncation: audio item was cut at barge-in point
      case 'conversation.item.truncated': {
        currentDeliveryRef.current.truncated = true
        currentDeliveryRef.current.delivery_complete = false
        // FASE 2B — persist truncation state
        if (stageRef.current === 'speech') {
          saveSpeechState(speechRef.current, 'audio_truncated')
        }
        break
      }

      // FASE 1 — lead turn with disposition classification
      case 'conversation.item.input_audio_transcription.completed': {
        const text = msg.transcript
        if (!text) break
        logTimeline('LEAD_TRANSCRIPTION_COMPLETED', `chars=${text.length}`)
        const disposition = classifyLeadTurn(text, stageRef.current, speechRef.current, wasInterruptedRef.current, expectationRef.current)
        addTranscript('lead', text, { disposition })
        saveTranscriptTurn('lead', text)
        handleLeadTurnDisposition(text, disposition)
        wasInterruptedRef.current = false  // reset after processing
        break
      }

      case 'error':
        setErrorMsg(`Erro OpenAI: ${msg.error?.message ?? JSON.stringify(msg.error)}`)
        break
    }
  }, [executeTool, addTranscript, sendEvent, sendResponseCreate, logTimeline, handleLeadTurnDisposition, saveTranscriptTurn, saveSpeechState])

  // ── Checkpoint restore ─────────────────────────────────────────────────────

  const restoreCheckpoint = useCallback((cp: CheckpointData) => {
    setCurrentStage(cp.stage); stageRef.current = cp.stage
    if (cp.speech_progress) { setSpeechProgress(cp.speech_progress); speechRef.current = cp.speech_progress }
    if (cp.gate_log) { setGateLog(cp.gate_log); gateLogRef.current = cp.gate_log }
    const inst = cp.stage === 'speech'
      ? buildInstructions('speech', cp.speech_progress?.parte_atual ?? 1)
      : buildInstructions(cp.stage)
    pendingInstructionsRef.current = inst
    addTranscript('system', `🔄 Retomando → ${(STAGE_LABELS[cp.stage] ?? cp.stage).toUpperCase()}`)
  }, [addTranscript])

  // ── Session start ──────────────────────────────────────────────────────────

  const startSession = useCallback(async (checkpointOverride?: CheckpointData) => {
    if (!telefone.trim()) { setErrorMsg('Digite o telefone de teste antes de iniciar.'); return }
    setErrorMsg(''); setStatus('connecting')
    setTranscript([]); setGateLog([]); gateLogRef.current = []
    setMemories({}); setReferidosLink(null); setReferidosStatus(null)
    setSpeechProgress(initialSpeechProgress()); setCurrentStage('apresentacao')
    checkpointsRef.current = {}; setSavedCheckpoints({}); audioChunksRef.current = []
    setStreamingAnaText(''); setLastDisposition(null)
    const m0 = { lastResponseMs: null, interruptionCount: 0, turnCount: 0 }
    setMetrics(m0); metricsRef.current = m0
    // PASSO 2A — reset timeline
    timelineRef.current = []; setTimeline([])
    sessionStartTsRef.current = Date.now()
    pendingManualResponseRef.current = false
    lastResponseOriginRef.current = 'unknown'
    sessionReadyRef.current = false
    responseInProgressRef.current = false
    pendingSkippedDispositionRef.current = null

    try {
      const sessionRes = await fetch('/api/admin/ana-master/simulador/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone, nome: nome.trim() || undefined, voice: selectedVoice, model: selectedModel }),
      })
      if (!sessionRes.ok) throw new Error('Falha ao criar sessão')
      const { callSid, clientSecret, telefone: normPhone, profileVersion: pv, model: mdl, voice: vc } = await sessionRes.json()
      callSidRef.current = callSid; telefoneRef.current = normPhone
      if (pv) setProfileVersion(pv)
      if (mdl) setActiveModel(mdl)
      if (vc) setActiveVoice(vc)

      if (checkpointOverride) restoreCheckpoint(checkpointOverride)

      const pc = new RTCPeerConnection(); pcRef.current = pc

      // Get local mic stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      // FASE 2 — AudioContext: create mixing graph (local mic → dest)
      try {
        const audioCtx = new AudioContext()
        audioCtxRef.current = audioCtx
        const dest = audioCtx.createMediaStreamDestination()
        mixDestRef.current = dest
        const localSource = audioCtx.createMediaStreamSource(stream)
        localSource.connect(dest)

        // Start MediaRecorder on the mixed stream (ANA will be added when remote track arrives)
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
        const recorder = new MediaRecorder(dest.stream, { mimeType })
        audioChunksRef.current = []
        recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
        recorder.start(2000); mediaRecorderRef.current = recorder; setIsRecording(true)
        // Periodic upload every 60s — survive Safari crashes
        audioUploadIntervalRef.current = setInterval(() => {
          const chunks = audioChunksRef.current
          const sid = callSidRef.current
          if (chunks.length === 0 || !sid) return
          const blob = new Blob(chunks, { type: 'audio/webm' })
          fetch(`/api/admin/ana-master/simulador/audio?callSid=${sid}`, {
            method: 'POST', body: blob, headers: { 'Content-Type': 'audio/webm' },
          }).catch(() => {})
        }, 60000)
      } catch {
        // Fallback: record mic only if AudioContext fails
        try {
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
          const recorder = new MediaRecorder(stream, { mimeType })
          audioChunksRef.current = []
          recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
          recorder.start(2000); mediaRecorderRef.current = recorder; setIsRecording(true)
          audioUploadIntervalRef.current = setInterval(() => {
            const chunks = audioChunksRef.current
            const sid = callSidRef.current
            if (chunks.length === 0 || !sid) return
            const blob = new Blob(chunks, { type: 'audio/webm' })
            fetch(`/api/admin/ana-master/simulador/audio?callSid=${sid}`, {
              method: 'POST', body: blob, headers: { 'Content-Type': 'audio/webm' },
            }).catch(() => {})
          }, 60000)
        } catch {}
      }

      pc.ontrack = (e) => {
        // Play ANA's remote audio
        const audio = document.createElement('audio')
        audio.autoplay = true; audio.srcObject = e.streams[0]
        document.body.appendChild(audio); audioRef.current = audio

        // FASE 2 — Mix ANA's remote track into the recording
        if (audioCtxRef.current && mixDestRef.current) {
          try {
            const remoteSource = audioCtxRef.current.createMediaStreamSource(e.streams[0])
            remoteSource.connect(mixDestRef.current)
          } catch {}
        }
      }

      const dc = pc.createDataChannel('oai-events'); dcRef.current = dc
      dc.onmessage = handleDCMessage

      // FASE 2B — persist SpeechProgress on DataChannel close (session drop)
      dc.onclose = () => {
        if (stageRef.current === 'speech') {
          saveSpeechState(speechRef.current, 'datachannel_closed')
        }
      }

      dc.onopen = () => {
        sessionReadyRef.current = false
        addTranscript('system', '🎙️ Conectado — diga "Alô" para iniciar (simula lead atendendo a ligação)')

        if (ACTIVE_PROFILE.controller_response_gate) {
          // HV-v4: set create_response:false via session.update (not in initial payload).
          // Merge checkpoint instructions if present so we only need one round-trip.
          logTimeline('SESSION_START', 'HV-v4 — sending session.update create_response:false')
          const vadSession: Record<string, unknown> = {
            type: 'realtime',
            audio: { input: { turn_detection: { type: 'semantic_vad', eagerness: 'low', create_response: false } } },
          }
          if (pendingInstructionsRef.current) {
            vadSession.instructions = pendingInstructionsRef.current
            pendingInstructionsRef.current = null
          }
          sendEvent({ type: 'session.update', session: vadSession })
          // Greeting fires in session.updated handler once create_response:false is confirmed.
        } else {
          logTimeline('SESSION_START', 'HV-v3 — ANA response will be AUTOMATIC')
          if (pendingInstructionsRef.current) {
            logTimeline('SESSION_UPDATE_SENT', `checkpoint restore chars=${pendingInstructionsRef.current.length}`)
            sendEvent({ type: 'session.update', session: { type: 'realtime', instructions: pendingInstructionsRef.current } })
            pendingInstructionsRef.current = null
          }
        }
      }

      // FASE 2B — persist SpeechProgress on page unload
      const handleUnload = () => { if (stageRef.current === 'speech') saveSpeechState(speechRef.current, 'page_unload') }
      window.addEventListener('beforeunload', handleUnload)

      const offer = await pc.createOffer(); await pc.setLocalDescription(offer)
      // GA Realtime API: POST SDP offer to /v1/realtime/calls (replaced /v1/realtime?model=...)
      const oaiRes = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${clientSecret}`, 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      })
      if (!oaiRes.ok) throw new Error(`Falha ao conectar ao OpenAI Realtime: ${await oaiRes.text()}`)
      await pc.setRemoteDescription({ type: 'answer', sdp: await oaiRes.text() })
      setStatus('active')
    } catch (e: any) { setStatus('error'); setErrorMsg(e.message) }
  }, [telefone, nome, handleDCMessage, addTranscript, sendEvent, logTimeline, restoreCheckpoint, saveSpeechState])

  const stopSession = useCallback(() => {
    // FASE 2B — persist speech state on explicit end
    if (stageRef.current === 'speech') saveSpeechState(speechRef.current, 'session_ended')

    if (audioUploadIntervalRef.current) {
      clearInterval(audioUploadIntervalRef.current)
      audioUploadIntervalRef.current = null
    }

    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => uploadAudio()
      recorder.stop()
    } else if (recorder && recorder.state === 'inactive') {
      // recorder already stopped (e.g. ended by browser) — upload whatever was collected
      uploadAudio()
    }
    mediaRecorderRef.current = null; setIsRecording(false)

    pcRef.current?.close(); pcRef.current = null; dcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null

    audioCtxRef.current?.close().catch(() => {}); audioCtxRef.current = null; mixDestRef.current = null
    if (audioRef.current) { audioRef.current.srcObject = null; audioRef.current.remove(); audioRef.current = null }

    setStatus('ended'); setStreamingAnaText(''); addTranscript('system', '⏹ Sessão encerrada.')
  }, [addTranscript, uploadAudio, saveSpeechState])

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => { t.enabled = isMuted })
    setIsMuted(!isMuted)
  }, [isMuted])

  // ── UI helpers ─────────────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100%', background: '#0A0A0B', color: '#fff', overflow: 'hidden' }}>

      {/* Left panel */}
      <div style={{ width: 272, flexShrink: 0, borderRight: '1px solid #1C1C1E', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1C1C1E' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#7B3FE4', textTransform: 'uppercase', margin: '0 0 2px' }}>ANA MASTER</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Simulador de Voz</p>
          <p style={{ fontSize: 10, color: '#52525E', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            WebRTC
            {profileVersion
              ? <span style={{ color: '#7B3FE4', fontWeight: 700 }}>{profileVersion}</span>
              : <span>· gpt-4o-realtime</span>}
            {activeVoice && <span style={{ color: '#22C55E', fontWeight: 700 }}>· {activeVoice}</span>}
            {activeModel && activeModel !== 'gpt-realtime' && <span style={{ color: '#F59E0B', fontWeight: 700 }}>· {activeModel}</span>}
            {isRecording && (
              <span style={{ color: '#F87171', display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F87171', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                REC {audioCtxRef.current ? '(ANA+lead)' : ''}
              </span>
            )}
            {audioUploading && <span style={{ color: '#F59E0B' }}>↑ áudio...</span>}
          </p>
        </div>

        {/* Phone input */}
        <div style={{ padding: 12, borderBottom: '1px solid #1C1C1E' }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#52525E', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Telefone</label>
          <input
            type="tel" value={telefone} onChange={e => setTelefone(e.target.value)}
            placeholder="+55 11 9 9999-0000"
            disabled={status === 'active' || status === 'connecting'}
            style={{ width: '100%', background: '#111113', border: '1px solid #27272F', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
          {errorMsg && <p style={{ fontSize: 11, color: '#F87171', marginTop: 6 }}>{errorMsg}</p>}
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#52525E', textTransform: 'uppercase', display: 'block', marginTop: 8, marginBottom: 6 }}>Nome (opcional)</label>
          <input
            type="text" value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Ex: Ana, Maria..."
            disabled={status === 'active' || status === 'connecting'}
            style={{ width: '100%', background: '#111113', border: '1px solid #27272F', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#52525E', textTransform: 'uppercase', display: 'block', marginTop: 8, marginBottom: 4 }}>Voz</label>
          <select
            value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)}
            disabled={status === 'active' || status === 'connecting'}
            style={{ width: '100%', background: '#111113', border: '1px solid #27272F', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
          >
            <option value="marin">marin ★ (atual)</option>
            <option value="cedar">cedar ★ (recomendada OpenAI)</option>
            <option value="ash">ash</option>
            <option value="ballad">ballad</option>
            <option value="coral">coral</option>
            <option value="sage">sage</option>
            <option value="verse">verse</option>
            <option value="alloy">alloy</option>
            <option value="echo">echo</option>
            <option value="shimmer">shimmer</option>
          </select>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#52525E', textTransform: 'uppercase', display: 'block', marginTop: 8, marginBottom: 4 }}>Modelo</label>
          <select
            value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
            disabled={status === 'active' || status === 'connecting'}
            style={{ width: '100%', background: '#111113', border: '1px solid #27272F', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
          >
            <option value="gpt-realtime-2.1">gpt-realtime-2.1 ★ (recomendado OpenAI)</option>
            <option value="gpt-realtime-2">gpt-realtime-2 (GPT-5 class)</option>
            <option value="gpt-realtime-2.1-mini">gpt-realtime-2.1-mini (econômico)</option>
            <option value="gpt-realtime-1.5">gpt-realtime-1.5</option>
            <option value="gpt-realtime">gpt-realtime (anterior)</option>
          </select>
        </div>

        {/* Controls */}
        <div style={{ padding: 12, borderBottom: '1px solid #1C1C1E', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {status === 'idle' || status === 'ended' || status === 'error' ? (
            <button onClick={() => {
              setShowStartPicker(p => {
                if (!p) fetch('/api/admin/ana-master/simulador/sessions').then(r => r.json()).then(d => setRecentSessions((d.sessions ?? []).filter((s: any) => Object.keys(s.checkpoints ?? {}).length > 0).slice(0, 5)))
                return !p
              })
            }} style={btnStyle('#7B3FE4', '#6D35CC')}>
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

        {/* Start picker */}
        {showStartPicker && (status === 'idle' || status === 'ended' || status === 'error') && (
          <div style={{ padding: 12, borderBottom: '1px solid #1C1C1E', background: '#0D0D0F' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#52525E', textTransform: 'uppercase', margin: '0 0 10px' }}>Como iniciar?</p>

            {/* Opção 1: do zero */}
            <button onClick={() => { setShowStartPicker(false); startSession() }} style={{ width: '100%', textAlign: 'left', background: 'rgba(123,63,228,0.08)', border: '1px solid rgba(123,63,228,0.25)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, cursor: 'pointer' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA', margin: 0 }}>▶ Começar do zero</p>
              <p style={{ fontSize: 10, color: '#52525E', margin: '2px 0 0' }}>ANA inicia pela Etapa 1 — Abertura</p>
            </button>

            {/* Opção 2: checkpoint da sessão atual */}
            {checkpointEntries.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <p style={{ fontSize: 10, color: '#F59E0B', fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Checkpoint desta sessão</p>
                {checkpointEntries.map(([gate, cp]) => (
                  <button key={gate} onClick={() => { setShowStartPicker(false); startSession(cp) }} style={{ width: '100%', textAlign: 'left', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '7px 12px', marginBottom: 4, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', margin: 0 }}>{GATE_LABELS[gate] ?? gate}</p>
                      <p style={{ fontSize: 10, color: '#52525E', margin: 0 }}>→ {STAGE_LABELS[cp.stage] ?? cp.stage}</p>
                    </div>
                    <RotateCcw size={11} style={{ color: '#F59E0B', opacity: 0.5 }} />
                  </button>
                ))}
              </div>
            )}

            {/* Opção 3: sessão anterior */}
            {recentSessions.length > 0 && (
              <div>
                <p style={{ fontSize: 10, color: '#38BDF8', fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sessão anterior</p>
                {recentSessions.map((s: any) => {
                  const gates = Object.keys(s.checkpoints ?? {})
                  return gates.map(gate => {
                    const cp = s.checkpoints[gate]
                    return (
                      <button key={`${s.callSid}-${gate}`} onClick={() => {
                        setShowStartPicker(false)
                        startSession({ stage: cp.stage, speech_progress: cp.speech_progress, gate_log: cp.gate_log ?? [], ts: cp.ts })
                      }} style={{ width: '100%', textAlign: 'left', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 8, padding: '7px 12px', marginBottom: 4, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#38BDF8', margin: 0 }}>{GATE_LABELS[gate] ?? gate}</p>
                          <p style={{ fontSize: 10, color: '#52525E', margin: 0 }}>{s.callSid?.slice(0, 22)} · {new Date(cp.ts).toLocaleTimeString('pt-BR')}</p>
                        </div>
                        <RotateCcw size={11} style={{ color: '#38BDF8', opacity: 0.5 }} />
                      </button>
                    )
                  })
                })}
              </div>
            )}

            {recentSessions.length === 0 && checkpointEntries.length === 0 && (
              <p style={{ fontSize: 11, color: '#3A3A3C', fontStyle: 'italic' }}>Nenhum checkpoint salvo ainda.</p>
            )}
          </div>
        )}

        {/* FASE 2 — Metrics panel */}
        {(status === 'active' || status === 'ended') && (
          <div style={{ padding: 12, borderBottom: '1px solid #1C1C1E' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#52525E', textTransform: 'uppercase', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Activity size={9} style={{ opacity: 0.6 }} /> Métricas
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div style={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 7, padding: '6px 8px' }}>
                <p style={{ fontSize: 9, color: '#52525E', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Latência</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: metrics.lastResponseMs === null ? '#3F3F46' : metrics.lastResponseMs < 800 ? '#34D399' : metrics.lastResponseMs < 1500 ? '#F59E0B' : '#F87171', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {metrics.lastResponseMs === null ? '—' : `${metrics.lastResponseMs}ms`}
                </p>
              </div>
              <div style={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 7, padding: '6px 8px' }}>
                <p style={{ fontSize: 9, color: '#52525E', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Interrupções</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: metrics.interruptionCount === 0 ? '#3F3F46' : '#F87171', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {metrics.interruptionCount}
                </p>
              </div>
              <div style={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 7, padding: '6px 8px' }}>
                <p style={{ fontSize: 9, color: '#52525E', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Turnos</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#A78BFA', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {metrics.turnCount}
                </p>
              </div>
              <div style={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 7, padding: '6px 8px' }}>
                <p style={{ fontSize: 9, color: '#52525E', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Disposição</p>
                <p style={{ fontSize: 10, fontWeight: 800, color: lastDisposition ? DISPOSITION_COLORS[lastDisposition] : '#3F3F46', margin: 0 }}>
                  {lastDisposition ? DISPOSITION_LABELS[lastDisposition] : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PASSO 2A — Timeline panel */}
        {(status === 'active' || status === 'ended') && (
          <div style={{ borderBottom: '1px solid #1C1C1E' }}>
            <button onClick={() => setShowTimeline(p => !p)} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#52525E', textTransform: 'uppercase' }}>📋 Timeline</span>
              <span style={{ fontSize: 10, color: '#3A3A3C' }}>{showTimeline ? '▲' : '▼'} {timeline.length}</span>
            </button>
            {showTimeline && (
              <div style={{ maxHeight: 260, overflowY: 'auto', padding: '0 12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {timeline.map((e, i) => {
                  const rel = ((e.ts - sessionStartTsRef.current) / 1000).toFixed(2)
                  const isAuto = e.event === 'RESPONSE_CREATED' && e.detail?.includes('AUTOMATIC')
                  const isSent = e.event === 'RESPONSE_CREATE_SENT'
                  const isSession = e.event === 'SESSION_UPDATE_SENT' || e.event === 'SESSION_UPDATED'
                  const color = isAuto ? '#F87171' : isSent ? '#34D399' : isSession ? '#A78BFA' : '#52525E'
                  return (
                    <div key={i} style={{ fontSize: 9, fontFamily: 'monospace', color, lineHeight: 1.4 }}>
                      <span style={{ color: '#3A3A3C', marginRight: 4 }}>{rel}s</span>
                      <span style={{ fontWeight: 700 }}>{e.event}</span>
                      {e.detail && <span style={{ color: '#3A3A3C', marginLeft: 4 }}>{e.detail}</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Checkpoints */}
        {checkpointEntries.length > 0 && (
          <div style={{ padding: 12, borderBottom: '1px solid #1C1C1E' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#F59E0B', textTransform: 'uppercase', margin: '0 0 8px' }}>Checkpoints</p>
            {checkpointEntries.map(([gate, cp]) => (
              <button key={gate} onClick={() => {
                if (status === 'active') {
                  restoreCheckpoint(cp)
                  updateInstructions(cp.stage === 'speech' ? buildInstructions('speech', cp.speech_progress?.parte_atual ?? 1) : buildInstructions(cp.stage))
                } else {
                  startSession(cp)
                }
              }}
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

        {/* Stage progress */}
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

          {/* FASE 3 — Voice Behavior Profile tag for current stage */}
          {status === 'active' && VOICE_BEHAVIOR_PROFILES[currentStage] && (
            <div style={{ marginTop: 8, fontSize: 10, color: '#52525E', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 6, padding: '4px 8px' }}>
              🎭 {currentStage === 'speech' ? 'Energia crescente P1→P4' :
                  currentStage === 'apresentacao' ? 'Calorosa · pausada' :
                  currentStage === 'conexao' ? 'Curiosidade genuína' :
                  currentStage === 'combinado' ? 'Colaborativo' :
                  currentStage === 'fechamento' ? 'Autoridade calma' :
                  currentStage === 'pagamento' ? 'Direto · confiante' :
                  currentStage === 'referidos' ? 'Gratidão · narrativa' :
                  currentStage === 'validacao' ? 'Encerramento caloroso' : ''}
            </div>
          )}
        </div>

        {/* Memories */}
        <div style={{ padding: 12, borderBottom: '1px solid #1C1C1E' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#52525E', textTransform: 'uppercase', margin: '0 0 8px' }}>Memórias</p>
          {Object.keys(memories).filter(k => !['telefone','nome','sim_browser','transcript','speech_progress','speech_state_log','checkpoints','audio_url','profile_version'].includes(k)).length === 0
            ? <p style={{ fontSize: 11, color: '#52525E' }}>Nenhuma salva.</p>
            : Object.entries(memories).filter(([k]) => !['telefone','nome','sim_browser','transcript','speech_progress','speech_state_log','checkpoints','audio_url','profile_version'].includes(k)).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: '#52525E', flexShrink: 0 }}>{k}</span>
                  <span style={{ color: '#fff', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }} title={String(v)}>{String(v)}</span>
                </div>
              ))
          }
        </div>

        {/* Referidos link */}
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

      {/* Right panel — Transcript */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {metrics.lastResponseMs !== null && (
                <span style={{ fontSize: 10, color: metrics.lastResponseMs < 800 ? '#34D399' : metrics.lastResponseMs < 1500 ? '#F59E0B' : '#F87171', fontVariantNumeric: 'tabular-nums' }}>
                  {metrics.lastResponseMs}ms
                </span>
              )}
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#34D399' }}>AO VIVO</span>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {transcript.length === 0 && !streamingAnaText && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(123,63,228,0.1)', border: '1px solid rgba(123,63,228,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mic size={22} style={{ color: '#7B3FE4' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Simulador de Voz ANA</p>
                <p style={{ fontSize: 12, color: '#52525E', margin: '4px 0 0' }}>Digite o telefone e clique em Iniciar Simulação</p>
                <p style={{ fontSize: 11, color: '#3A3A3C', margin: '2px 0 0' }}>
                  ANA+lead gravados · Streaming transcript · Métricas de latência · Recovery sub-gate
                </p>
              </div>
            </div>
          )}

          {transcript.map((line, i) => (
            <div key={i} style={{ borderRadius: 10, padding: '10px 14px', lineHeight: 1.6, background: line.role === 'ana' ? 'rgba(123,63,228,0.1)' : line.role === 'lead' ? '#1C1C1E' : line.role === 'tool' ? 'rgba(249,115,22,0.05)' : 'transparent', border: `1px solid ${line.role === 'ana' ? 'rgba(123,63,228,0.2)' : line.role === 'lead' ? '#27272A' : line.role === 'tool' ? 'rgba(249,115,22,0.1)' : 'transparent'}`, color: line.role === 'ana' ? '#fff' : line.role === 'lead' ? '#A1A1AA' : line.role === 'tool' ? '#FB923C' : '#52525E', fontFamily: line.role === 'tool' ? 'monospace' : 'inherit', fontSize: line.role === 'tool' || line.role === 'system' ? 11 : 13, fontStyle: line.role === 'system' ? 'italic' : 'normal' }}>
              {(line.role === 'ana' || line.role === 'lead') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0, color: line.role === 'ana' ? '#A78BFA' : '#52525E' }}>
                    {line.role === 'ana' ? 'ANA' : 'VOCÊ'}
                  </p>
                  {/* FASE 1 — show disposition badge on lead turns */}
                  {line.role === 'lead' && line.disposition && (
                    <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: DISPOSITION_COLORS[line.disposition], background: DISPOSITION_COLORS[line.disposition] + '18', border: `1px solid ${DISPOSITION_COLORS[line.disposition]}30`, borderRadius: 4, padding: '1px 5px' }}>
                      {DISPOSITION_LABELS[line.disposition]}
                    </span>
                  )}
                </div>
              )}
              {line.text}
            </div>
          ))}

          {/* FASE 2 — Streaming transcript: live ANA text as it's generated */}
          {streamingAnaText && (
            <div style={{ borderRadius: 10, padding: '10px 14px', lineHeight: 1.6, background: 'rgba(123,63,228,0.06)', border: '1px dashed rgba(123,63,228,0.25)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px', color: '#7B3FE4', display: 'flex', alignItems: 'center', gap: 4 }}>
                ANA <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#7B3FE4', display: 'inline-block', animation: 'pulse 0.8s infinite' }} />
              </p>
              {streamingAnaText}
            </div>
          )}

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

function btnStyle(bg: string, _hover: string): React.CSSProperties {
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
