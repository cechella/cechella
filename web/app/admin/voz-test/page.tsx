'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  PhoneCall, Loader2, CheckCircle2, XCircle,
  FileText, Volume2, ChevronDown, ChevronUp, Search,
} from 'lucide-react'

const VAPI_API_KEY = 'e3bc519a-7466-4450-bcfc-2ae9566d9e2f'
const ASSISTANT_ID = 'f2ab9277-dcf3-4fe5-9ac4-5cd0c45229c5'
const PHONE_NUMBER_ID = '41636d14-3f1f-4343-8d1c-f16327403690'

interface TranscriptMessage {
  role: 'assistant' | 'user' | 'tool_call' | 'tool_result' | string
  message?: string
  content?: string | any[]
  time?: number
  endTime?: number
  duration?: number
  name?: string          // tool name
  result?: string
}

interface CallData {
  id: string
  status: string
  startedAt?: string
  endedAt?: string
  endedReason?: string
  durationSeconds?: number
  transcript?: string
  recordingUrl?: string
  stereoRecordingUrl?: string
  messages?: TranscriptMessage[]
  analysis?: { summary?: string; successEvaluation?: string }
  costBreakdown?: { total?: number }
  customer?: { number?: string }
}

function roleBadge(role: string) {
  if (role === 'assistant') return 'bg-[#7B3FE4]/20 text-[#A78BFA] border border-[#7B3FE4]/30'
  if (role === 'user') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
  if (role === 'tool_call') return 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
  if (role === 'tool_result') return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
  return 'bg-[#1C1C1E] text-[#71717A]'
}

function roleLabel(role: string) {
  if (role === 'assistant') return 'Ana'
  if (role === 'user') return 'Lead'
  if (role === 'tool_call') return 'Tool →'
  if (role === 'tool_result') return '← Resultado'
  return role
}

function msgText(msg: TranscriptMessage): string {
  if (msg.message) return msg.message
  if (typeof msg.content === 'string') return msg.content
  if (Array.isArray(msg.content)) return msg.content.map((c: any) => c.text || c.content || JSON.stringify(c)).join(' ')
  if (msg.result) return msg.result
  return ''
}

export default function VozTestPage() {
  const [telefone, setTelefone] = useState('+5548988416899')
  const [callStatus, setCallStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [callId, setCallId] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // transcript
  const [manualCallId, setManualCallId] = useState('')
  const [transcriptLoading, setTranscriptLoading] = useState(false)
  const [callData, setCallData] = useState<CallData | null>(null)
  const [transcriptError, setTranscriptError] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const [showMessages, setShowMessages] = useState(true)

  const dispararLigacao = async () => {
    setCallStatus('loading')
    setCallId('')
    setErrorMsg('')

    try {
      const res = await fetch('/api/admin/vapi-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: telefone }),
      })
      const data = await res.json()
      if (res.ok && data.id) {
        setCallId(data.id)
        setCallStatus('success')
        setManualCallId(data.id)
      } else {
        setErrorMsg(data.message || data.error || JSON.stringify(data))
        setCallStatus('error')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro desconhecido')
      setCallStatus('error')
    }
  }

  const buscarTranscript = async (id?: string) => {
    const target = id || manualCallId || callId
    if (!target) return
    setTranscriptLoading(true)
    setTranscriptError('')
    setCallData(null)

    try {
      const res = await fetch(`https://api.vapi.ai/call/${target}`, {
        headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
      })
      const data = await res.json()
      if (res.ok) {
        setCallData(data)
      } else {
        setTranscriptError(data.message || data.error || 'Erro ao buscar ligação')
      }
    } catch (err: any) {
      setTranscriptError(err.message || 'Erro de rede')
    } finally {
      setTranscriptLoading(false)
    }
  }

  const buscarUltimaLigacao = async () => {
    setTranscriptLoading(true)
    setTranscriptError('')
    setCallData(null)
    try {
      const res = await fetch(`https://api.vapi.ai/call?assistantId=${ASSISTANT_ID}&limit=1`, {
        headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
      })
      const data = await res.json()
      const list = Array.isArray(data) ? data : data.results || []
      if (list.length > 0) {
        setCallData(list[0])
        setManualCallId(list[0].id)
      } else {
        setTranscriptError('Nenhuma ligação encontrada')
      }
    } catch (err: any) {
      setTranscriptError(err.message || 'Erro de rede')
    } finally {
      setTranscriptLoading(false)
    }
  }

  const duracao = callData?.durationSeconds
    ? `${Math.floor(callData.durationSeconds / 60)}m ${Math.round(callData.durationSeconds % 60)}s`
    : null

  const messages: TranscriptMessage[] = callData?.messages || []

  return (
    <div className="flex h-screen bg-[#0A0A0B]">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Agente IA Voz — Teste" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto mt-4 space-y-4">

            {/* ── Disparar ligação ── */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center shadow-[0_0_15px_rgba(123,63,228,0.3)]">
                  <PhoneCall className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-base">Disparar Ligação PTL</h2>
                  <p className="text-[#71717A] text-xs">Ana — Agente IA Voz</p>
                </div>
              </div>

              <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                Número do lead (formato internacional)
              </label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="+5548988416899"
                className="w-full bg-[#18181A] border border-[#2C2C2E] rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#3F3F46] focus:outline-none focus:border-[#7B3FE4] transition-colors mb-4"
              />

              <button
                onClick={dispararLigacao}
                disabled={callStatus === 'loading' || !telefone}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(123,63,228,0.3)]"
              >
                {callStatus === 'loading'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Ligando...</>
                  : <><PhoneCall className="w-4 h-4" /> Ligar Agora</>}
              </button>

              {callStatus === 'success' && (
                <div className="mt-4 flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-emerald-400 font-medium text-sm">Ligação criada!</p>
                    <p className="text-emerald-400/70 text-xs mt-0.5 font-mono break-all">ID: {callId}</p>
                    <p className="text-[#71717A] text-xs mt-1">Aguarde a chamada no número {telefone}</p>
                  </div>
                </div>
              )}

              {callStatus === 'error' && (
                <div className="mt-4 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium text-sm">Erro ao criar ligação</p>
                    <p className="text-red-400/70 text-xs mt-0.5 break-all">{errorMsg}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Buscar transcript ── */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#EF4444] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-base">Transcrição & Análise</h2>
                  <p className="text-[#71717A] text-xs">Busca o transcript da ligação no VAPI</p>
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={manualCallId}
                  onChange={(e) => setManualCallId(e.target.value)}
                  placeholder="Call ID (preenchido automaticamente após ligar)"
                  className="flex-1 bg-[#18181A] border border-[#2C2C2E] rounded-xl px-4 py-2.5 text-white text-sm font-mono placeholder:text-[#3F3F46] focus:outline-none focus:border-[#F59E0B] transition-colors"
                />
                <button
                  onClick={() => buscarTranscript()}
                  disabled={transcriptLoading || !manualCallId}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 text-sm font-semibold"
                >
                  {transcriptLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Buscar
                </button>
              </div>

              <button
                onClick={buscarUltimaLigacao}
                disabled={transcriptLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#18181A] border border-[#2C2C2E] rounded-xl text-[#A1A1AA] hover:text-white hover:border-[#3F3F46] transition-all text-sm disabled:opacity-40"
              >
                {transcriptLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Buscar última ligação da Ana
              </button>

              {transcriptError && (
                <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs">
                  {transcriptError}
                </div>
              )}
            </div>

            {/* ── Resultado da ligação ── */}
            {callData && (
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">

                {/* Header da call */}
                <div className="p-5 border-b border-[#1C1C1E]">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {callData.customer?.number || 'Número desconhecido'}
                      </p>
                      <p className="text-[#52525B] text-xs font-mono mt-0.5">{callData.id}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        callData.status === 'ended' ? 'bg-emerald-500/10 text-emerald-400' :
                        callData.status === 'in-progress' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-[#1C1C1E] text-[#71717A]'
                      }`}>
                        {callData.status}
                      </span>
                      {duracao && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-[#1C1C1E] text-[#A1A1AA]">
                          ⏱ {duracao}
                        </span>
                      )}
                      {callData.endedReason && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400">
                          {callData.endedReason}
                        </span>
                      )}
                      {callData.costBreakdown?.total !== undefined && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-[#1C1C1E] text-[#71717A]">
                          ${callData.costBreakdown.total.toFixed(3)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamps */}
                  {(callData.startedAt || callData.endedAt) && (
                    <div className="flex gap-4 mt-3 text-xs text-[#52525B] font-mono">
                      {callData.startedAt && <span>Início: {new Date(callData.startedAt).toLocaleString('pt-BR')}</span>}
                      {callData.endedAt && <span>Fim: {new Date(callData.endedAt).toLocaleString('pt-BR')}</span>}
                    </div>
                  )}
                </div>

                {/* Resumo da análise */}
                {callData.analysis?.summary && (
                  <div className="p-5 border-b border-[#1C1C1E] bg-[#7B3FE4]/5">
                    <p className="text-xs text-[#7B3FE4] uppercase tracking-wider mb-2 font-semibold">Resumo VAPI</p>
                    <p className="text-[#A1A1AA] text-sm leading-relaxed">{callData.analysis.summary}</p>
                    {callData.analysis.successEvaluation && (
                      <p className="text-xs text-[#71717A] mt-2">
                        Avaliação: <span className="text-white">{callData.analysis.successEvaluation}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Áudio */}
                {(callData.recordingUrl || callData.stereoRecordingUrl) && (
                  <div className="p-5 border-b border-[#1C1C1E]">
                    <p className="text-xs text-[#71717A] uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5" /> Gravação
                    </p>
                    <audio
                      controls
                      src={`/api/admin/vapi-audio?url=${encodeURIComponent(callData.stereoRecordingUrl || callData.recordingUrl || '')}`}
                      className="w-full h-10 rounded-lg"
                    />
                    <a
                      href={`/api/admin/vapi-audio?url=${encodeURIComponent(callData.stereoRecordingUrl || callData.recordingUrl || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#7B3FE4] hover:text-[#A78BFA] mt-2 inline-block"
                    >
                      Abrir áudio em nova aba →
                    </a>
                  </div>
                )}

                {/* Transcript por mensagens */}
                {messages.length > 0 && (
                  <div className="p-5 border-b border-[#1C1C1E]">
                    <button
                      onClick={() => setShowMessages(!showMessages)}
                      className="w-full flex items-center justify-between text-xs text-[#71717A] uppercase tracking-wider mb-3 hover:text-white transition-colors"
                    >
                      <span>Conversa — {messages.length} mensagens</span>
                      {showMessages ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showMessages && (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                        {messages.map((msg, i) => {
                          const text = msgText(msg)
                          if (!text && msg.role !== 'tool_call') return null
                          return (
                            <div key={i} className={`rounded-xl p-3 ${
                              msg.role === 'assistant' ? 'bg-[#7B3FE4]/10 border border-[#7B3FE4]/20' :
                              msg.role === 'user' ? 'bg-emerald-500/5 border border-emerald-500/15' :
                              'bg-[#18181A] border border-[#2C2C2E]'
                            }`}>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${roleBadge(msg.role)}`}>
                                  {roleLabel(msg.role)}{msg.name ? `: ${msg.name}` : ''}
                                </span>
                                {msg.duration !== undefined && (
                                  <span className="text-[10px] text-[#52525B]">{msg.duration.toFixed(1)}s</span>
                                )}
                              </div>
                              <p className="text-sm text-[#E4E4E7] leading-relaxed whitespace-pre-wrap break-words">
                                {text || (msg.role === 'tool_call' ? '(chamada sem parâmetros)' : '')}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Transcript texto puro */}
                {callData.transcript && (
                  <div className="p-5 border-b border-[#1C1C1E]">
                    <button
                      onClick={() => setShowRaw(!showRaw)}
                      className="w-full flex items-center justify-between text-xs text-[#71717A] uppercase tracking-wider mb-3 hover:text-white transition-colors"
                    >
                      <span>Transcript texto puro</span>
                      {showRaw ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showRaw && (
                      <pre className="text-xs text-[#A1A1AA] whitespace-pre-wrap leading-relaxed font-mono max-h-80 overflow-y-auto bg-[#0A0A0B] rounded-xl p-4">
                        {callData.transcript}
                      </pre>
                    )}
                  </div>
                )}

                {/* JSON completo */}
                <div className="p-5">
                  <details className="group">
                    <summary className="text-xs text-[#3F3F46] cursor-pointer hover:text-[#71717A] transition-colors list-none flex items-center gap-2">
                      <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
                      JSON completo da call
                    </summary>
                    <pre className="mt-3 text-xs text-[#71717A] whitespace-pre-wrap font-mono bg-[#0A0A0B] rounded-xl p-4 max-h-80 overflow-auto">
                      {JSON.stringify(callData, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
              <p className="text-[#3F3F46] text-xs font-mono">Assistente: Agente IA ana</p>
              <p className="text-[#3F3F46] text-xs font-mono mt-1">ID: {ASSISTANT_ID}</p>
              <p className="text-[#3F3F46] text-xs font-mono mt-1">Número Twilio: +17196742872</p>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
