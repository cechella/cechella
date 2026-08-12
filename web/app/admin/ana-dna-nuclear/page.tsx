'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Phone, Zap, Activity, BarChart3, Settings, GitBranch, RefreshCw, PhoneCall, Mic, Play, ChevronDown, ChevronUp, Volume2 } from 'lucide-react'

const TABS = [
  { key: 'disparar', label: 'Disparar', icon: <Zap className="w-4 h-4" /> },
  { key: 'ligacoes', label: 'Ligações', icon: <Phone className="w-4 h-4" /> },
  { key: 'monitor', label: 'Live Monitor', icon: <Activity className="w-4 h-4" /> },
  { key: 'simulacoes', label: 'Simulações', icon: <BarChart3 className="w-4 h-4" /> },
  { key: 'simulador', label: 'Simulador de Voz', icon: <Mic className="w-4 h-4" /> },
  { key: 'sessoes', label: 'Sessões', icon: <Play className="w-4 h-4" /> },
  { key: 'config', label: 'Realtime Config', icon: <Settings className="w-4 h-4" /> },
  { key: 'state', label: 'State Machine', icon: <GitBranch className="w-4 h-4" /> },
]

// ─── Tab: Disparar ────────────────────────────────────────────────────────────

function TabDisparar() {
  const [numero, setNumero] = useState('+5548988416899')
  const [referidor, setReferidor] = useState('')
  const [contexto, setContexto] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function ligar() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/ana-master-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero, referidor, contexto }),
      })
      const data = await res.json()
      setResult(data)
    } catch (e: any) {
      setResult({ error: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900 }}>
      {/* LEGADO — VAPI */}
      <div style={{ background: '#1C1C1E', border: '1px solid #3A3A3C', borderRadius: 16, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <PhoneCall className="w-5 h-5" style={{ color: '#A855F7' }} />
          <div>
            <p style={{ color: '#fff', fontWeight: 600, margin: 0 }}>Ana Realtime Test</p>
            <p style={{ color: '#71717A', fontSize: 12, margin: 0 }}>Via VAPI</p>
          </div>
          <span style={{ marginLeft: 'auto', background: '#3A1F5C', color: '#A855F7', fontSize: 10, padding: '2px 8px', borderRadius: 99, border: '1px solid #6B21A8' }}>LEGADO</span>
        </div>
        <p style={{ color: '#52525B', fontSize: 13, marginBottom: 20 }}>VAPI controla a conversa. Gates, memória e DNA não disponíveis.</p>
        <button disabled style={{ width: '100%', padding: '12px', background: '#3A1F5C', color: '#A855F7', border: '1px solid #6B21A8', borderRadius: 10, cursor: 'not-allowed', opacity: 0.6 }}>
          📞 Ligar (VAPI) — desativado
        </button>
      </div>

      {/* NOVO — ANA MASTER */}
      <div style={{ background: '#0A1628', border: '1px solid #1D4ED8', borderRadius: 16, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Zap className="w-5 h-5" style={{ color: '#38BDF8' }} />
          <div>
            <p style={{ color: '#fff', fontWeight: 700, margin: 0 }}>ANA MASTER</p>
            <p style={{ color: '#38BDF8', fontSize: 11, margin: 0 }}>TwilioTransport · RealtimeAgent · gpt-realtime</p>
          </div>
          <span style={{ marginLeft: 'auto', background: '#0C4A6E', color: '#38BDF8', fontSize: 10, padding: '2px 8px', borderRadius: 99, border: '1px solid #0369A1' }}>NOVO</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <div>
            <label style={{ color: '#9CA3AF', fontSize: 12, display: 'block', marginBottom: 4 }}>Número do lead</label>
            <input
              value={numero}
              onChange={e => setNumero(e.target.value)}
              style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
              placeholder="+5548988416899"
            />
          </div>
          <div>
            <label style={{ color: '#9CA3AF', fontSize: 12, display: 'block', marginBottom: 4 }}>Referidor (opcional)</label>
            <input
              value={referidor}
              onChange={e => setReferidor(e.target.value)}
              style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
              placeholder="Ex: Adriana"
            />
          </div>
          <div>
            <label style={{ color: '#9CA3AF', fontSize: 12, display: 'block', marginBottom: 4 }}>Contexto inicial (opcional)</label>
            <input
              value={contexto}
              onChange={e => setContexto(e.target.value)}
              style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
              placeholder="Ex: lead perguntou sobre implante"
            />
          </div>
        </div>

        <div style={{ background: '#0C4A6E22', border: '1px solid #0369A155', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 11, color: '#38BDF8' }}>
          ⚡ TwilioTransport · RealtimeAgent · State Machine · 8 Gates · Memory · Recovery
        </div>

        <button
          onClick={ligar}
          disabled={loading}
          style={{ width: '100%', padding: '14px', background: loading ? '#1D4ED8' : 'linear-gradient(135deg, #1D4ED8, #0EA5E9)', color: '#fff', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15 }}
        >
          {loading ? '⏳ Iniciando ligação...' : '⚡ Ligar com ANA MASTER'}
        </button>

        {result && (
          <div style={{ marginTop: 12, background: result.error ? '#3B0A0A' : '#0A2E0A', border: `1px solid ${result.error ? '#7F1D1D' : '#14532D'}`, borderRadius: 8, padding: '10px 14px' }}>
            {result.error ? (
              <p style={{ color: '#F87171', fontSize: 13, margin: 0 }}>❌ {result.error}</p>
            ) : (
              <>
                <p style={{ color: '#4ADE80', fontSize: 13, margin: 0 }}>✅ Ligação iniciada!</p>
                <p style={{ color: '#86EFAC', fontSize: 11, margin: '4px 0 0' }}>SID: {result.sid} · Status: {result.status}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Ligações ────────────────────────────────────────────────────────────

function TabLigacoes() {
  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/ana-master?table=ana_calls&limit=50')
      .then(r => r.json())
      .then(j => { setCalls(j.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const statusColor: Record<string, string> = {
    active: '#38BDF8', ganho: '#4ADE80', perdido: '#F87171', encerrado: '#9CA3AF'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ color: '#fff', margin: 0 }}>Ligações ANA MASTER</h3>
        <button onClick={() => window.location.reload()} style={{ background: '#1C1C1E', border: '1px solid #3A3A3C', borderRadius: 8, padding: '6px 12px', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw className="w-3 h-3" /> Atualizar
        </button>
      </div>
      {loading ? (
        <p style={{ color: '#9CA3AF' }}>Carregando...</p>
      ) : calls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#52525B' }}>
          <Phone className="w-12 h-12" style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p>Nenhuma ligação registrada ainda.</p>
          <p style={{ fontSize: 12 }}>Dispare a primeira ligação pela aba "Disparar".</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {calls.map(c => (
            <div key={c.id} style={{ background: '#1C1C1E', border: '1px solid #3A3A3C', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', margin: 0, fontWeight: 500 }}>{c.telefone}</p>
                <p style={{ color: '#71717A', fontSize: 12, margin: '2px 0 0' }}>Etapa: {c.stage} · SID: {c.call_sid?.slice(0, 16)}...</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ background: `${statusColor[c.status] ?? '#9CA3AF'}22`, color: statusColor[c.status] ?? '#9CA3AF', fontSize: 11, padding: '3px 10px', borderRadius: 99, border: `1px solid ${statusColor[c.status] ?? '#9CA3AF'}44` }}>
                  {c.status}
                </span>
                <p style={{ color: '#52525B', fontSize: 11, margin: '4px 0 0' }}>{new Date(c.created_at).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Live Monitor ────────────────────────────────────────────────────────

function TabMonitor() {
  const [active, setActive] = useState<any[]>([])
  const timerRef = useRef<any>(null)

  function load() {
    fetch('/api/admin/ana-master?table=ana_calls&limit=10')
      .then(r => r.json())
      .then(j => setActive((j.data || []).filter((c: any) => c.status === 'active')))
  }

  useEffect(() => {
    load()
    timerRef.current = setInterval(load, 5000)
    return () => clearInterval(timerRef.current)
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <span style={{ width: 8, height: 8, background: '#4ADE80', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #4ADE80' }} />
        <h3 style={{ color: '#fff', margin: 0 }}>Live Monitor — atualiza a cada 5s</h3>
      </div>
      {active.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#52525B' }}>
          <Activity className="w-12 h-12" style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p>Nenhuma ligação ativa no momento.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {active.map(c => (
            <div key={c.id} style={{ background: '#0A2E0A', border: '1px solid #14532D', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: '#4ADE80', fontWeight: 600, margin: 0 }}>{c.telefone}</p>
                  <p style={{ color: '#86EFAC', fontSize: 12, margin: '4px 0 0' }}>Etapa atual: <strong>{c.stage}</strong></p>
                  <p style={{ color: '#86EFAC', fontSize: 12, margin: '2px 0 0' }}>Gates: {(c.gates_passed || []).join(' → ') || 'nenhum'}</p>
                </div>
                <span style={{ background: '#14532D', color: '#4ADE80', fontSize: 11, padding: '4px 12px', borderRadius: 99, height: 'fit-content' }}>● ATIVA</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Simulações ─────────────────────────────────────────────────────────

function TabSimulacoes() {
  return (
    <div style={{ textAlign: 'center', padding: 60, color: '#52525B' }}>
      <BarChart3 className="w-12 h-12" style={{ margin: '0 auto 12px', opacity: 0.3 }} />
      <p style={{ color: '#9CA3AF' }}>Simulações disponíveis na página anterior.</p>
      <a href="/admin/ana-master" style={{ color: '#38BDF8', fontSize: 14 }}>→ Abrir painel de simulações</a>
    </div>
  )
}

// ─── Tab: Sessões ─────────────────────────────────────────────────────────────

const GATE_ORDER = ['GATE_ABERTURA','GATE_CONEXAO','GATE_COMBINADO','GATE_SPEECH','GATE_FECHAMENTO','GATE_PAGAMENTO','GATE_REFERIDOS','GATE_VALIDACAO']
const GATE_SHORT: Record<string,string> = {
  GATE_ABERTURA:'Aber.',GATE_CONEXAO:'Conex.',GATE_COMBINADO:'Comb.',
  GATE_SPEECH:'Speech',GATE_FECHAMENTO:'Fech.',GATE_PAGAMENTO:'Pag.',
  GATE_REFERIDOS:'Ref.',GATE_VALIDACAO:'Valid.',
}
const STAGE_LABEL_MAP: Record<string,string> = {
  apresentacao:'Abertura',conexao:'Conexão',combinado:'Combinado',speech:'Speech',
  fechamento:'Fechamento',pagamento:'Pagamento',referidos:'Referidos',validacao:'Validação',ganho:'Ganho',
}

function formatTime(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
}

function TabSessoes() {
  const [sessions, setSessions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [expanded, setExpanded] = React.useState<string | null>(null)
  const [detail, setDetail] = React.useState<any>(null)
  const [loadingDetail, setLoadingDetail] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/ana-master/simulador/sessions')
      const data = await r.json()
      setSessions(data.sessions ?? [])
    } catch {}
    setLoading(false)
  }, [])

  React.useEffect(() => { load() }, [load])

  async function expand(callSid: string) {
    if (expanded === callSid) { setExpanded(null); setDetail(null); return }
    setExpanded(callSid)
    setLoadingDetail(true)
    try {
      const r = await fetch(`/api/admin/ana-master/simulador/sessions?callSid=${callSid}`)
      const data = await r.json()
      setDetail(data.session)
    } catch {}
    setLoadingDetail(false)
  }

  const detailTranscript: any[] = detail?.memories?.transcript ?? []
  const detailCheckpoints: Record<string,any> = detail?.memories?.checkpoints ?? {}
  const detailAudio: string | null = detail?.memories?.audio_url ?? null

  return (
    <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 16px', flexShrink: 0 }}>
        <div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>Sessões gravadas</p>
          <p style={{ color: '#52525B', fontSize: 12, margin: '2px 0 0' }}>Transcrição + áudio + checkpoints por gate</p>
        </div>
        <button onClick={load} style={{ background: '#1C1C1E', border: '1px solid #3A3A3C', borderRadius: 8, padding: '6px 12px', color: '#9CA3AF', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw className="w-3 h-3" /> Atualizar
        </button>
      </div>

      {loading && <p style={{ color: '#52525B', textAlign: 'center', padding: 40, fontSize: 13 }}>Carregando sessões...</p>}
      {!loading && sessions.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#52525B' }}>
          <Mic className="w-10 h-10" style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 13 }}>Nenhuma sessão gravada ainda.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Use o Simulador de Voz para começar.</p>
        </div>
      )}

      {sessions.map((s: any) => {
        const isOpen = expanded === s.callSid
        const gatesPassed = new Set((s.gates ?? []).map((g: any) => g.gate))
        const progress = GATE_ORDER.filter(g => gatesPassed.has(g)).length

        return (
          <div key={s.callSid} style={{ borderRadius: 12, border: `1px solid ${isOpen ? '#7B3FE4' : '#27272A'}`, marginBottom: 8, overflow: 'hidden', background: '#111113' }}>
            {/* Row header */}
            <button
              onClick={() => expand(s.callSid)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              {/* Progress ring */}
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1C1C1E', border: '2px solid #3A3A3C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: progress === 8 ? '#34D399' : '#A78BFA' }}>{progress}/8</span>
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{s.telefone ?? 'sem telefone'}</span>
                  <span style={{ fontSize: 11, color: '#52525B' }}>{formatTime(s.updatedAt)}</span>
                  {s.hasAudio && <span style={{ fontSize: 10, color: '#38BDF8', background: '#38BDF8/10', border: '1px solid #38BDF8/20', borderRadius: 4, padding: '1px 6px' }}>🎙 áudio</span>}
                  {s.stage === 'ganho' && <span style={{ fontSize: 10, color: '#34D399', background: 'rgba(52,211,153,0.1)', borderRadius: 4, padding: '1px 6px' }}>🏆 GANHO</span>}
                </div>
                {/* Gate timeline */}
                <div style={{ display: 'flex', gap: 3, marginTop: 6, flexWrap: 'wrap' }}>
                  {GATE_ORDER.map(g => {
                    const passed = gatesPassed.has(g)
                    return (
                      <span key={g} style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
                        background: passed ? 'rgba(52,211,153,0.12)' : '#1C1C1E',
                        color: passed ? '#34D399' : '#3A3A3C',
                        border: `1px solid ${passed ? 'rgba(52,211,153,0.25)' : '#27272A'}`,
                      }}>
                        {passed ? '✓ ' : ''}{GATE_SHORT[g]}
                      </span>
                    )
                  })}
                </div>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4" style={{ color: '#52525B', flexShrink: 0 }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#52525B', flexShrink: 0 }} />}
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div style={{ borderTop: '1px solid #1C1C1E', padding: 16 }}>
                {loadingDetail && <p style={{ color: '#52525B', fontSize: 12, textAlign: 'center', padding: 20 }}>Carregando detalhes...</p>}
                {!loadingDetail && detail && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                    {/* Left: Transcript */}
                    <div>
                      <p style={{ color: '#52525B', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                        Transcrição ({detailTranscript.length} turnos)
                      </p>
                      {detailTranscript.length === 0 && (
                        <p style={{ color: '#3A3A3C', fontSize: 12 }}>Sem transcrição salva.</p>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                        {detailTranscript.map((t: any, i: number) => (
                          <div key={i} style={{
                            borderRadius: 8, padding: '8px 12px', fontSize: 12, lineHeight: 1.5,
                            background: t.role === 'ana' ? 'rgba(123,63,228,0.08)' : t.role === 'lead' ? '#1C1C1E' : 'transparent',
                            border: `1px solid ${t.role === 'ana' ? 'rgba(123,63,228,0.2)' : t.role === 'lead' ? '#27272A' : 'transparent'}`,
                            color: t.role === 'ana' ? '#fff' : t.role === 'lead' ? '#A1A1AA' : '#52525B',
                          }}>
                            {(t.role === 'ana' || t.role === 'lead') && (
                              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 3px', color: t.role === 'ana' ? '#A78BFA' : '#52525B' }}>
                                {t.role === 'ana' ? 'ANA' : 'LEAD'}
                              </p>
                            )}
                            {t.text}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Timeline + audio + actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                      {/* Checkpoint timeline */}
                      <div>
                        <p style={{ color: '#52525B', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                          Linha do tempo
                        </p>
                        <div style={{ position: 'relative', paddingLeft: 20 }}>
                          {/* Vertical line */}
                          <div style={{ position: 'absolute', left: 6, top: 8, bottom: 8, width: 1, background: '#27272A' }} />
                          {GATE_ORDER.map((gate, idx) => {
                            const cp = detailCheckpoints[gate]
                            const passed = !!cp
                            return (
                              <div key={gate} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, position: 'relative' }}>
                                {/* Dot */}
                                <div style={{
                                  position: 'absolute', left: -14, top: 3,
                                  width: 10, height: 10, borderRadius: '50%',
                                  background: passed ? '#34D399' : '#27272A',
                                  border: `2px solid ${passed ? '#34D399' : '#3A3A3C'}`,
                                  flexShrink: 0,
                                }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: passed ? '#34D399' : '#3A3A3C' }}>
                                      {GATE_SHORT[gate]}
                                    </span>
                                    {cp && <span style={{ fontSize: 10, color: '#52525B' }}>→ {STAGE_LABEL_MAP[cp.stage] ?? cp.stage}</span>}
                                    {cp && <span style={{ fontSize: 10, color: '#3A3A3C' }}>{formatTime(cp.ts)}</span>}
                                  </div>
                                  {cp && (
                                    <a
                                      href={`/admin/ana-master/simulador?checkpoint=${gate}&resumeFrom=${s.callSid}`}
                                      style={{ fontSize: 10, color: '#7B3FE4', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}
                                    >
                                      ↩ Retomar daqui
                                    </a>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Audio player */}
                      {detailAudio && (
                        <div>
                          <p style={{ color: '#52525B', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Volume2 className="w-3 h-3" /> Gravação de áudio
                          </p>
                          <audio
                            controls
                            src={detailAudio}
                            style={{ width: '100%', borderRadius: 8, background: '#1C1C1E' }}
                          />
                        </div>
                      )}

                      {/* Quick stats */}
                      <div style={{ background: '#1C1C1E', borderRadius: 10, padding: 12 }}>
                        <p style={{ color: '#52525B', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>Resumo</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: '#71717A' }}>Gates passados</span>
                            <span style={{ color: '#fff', fontWeight: 700 }}>{progress}/8</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: '#71717A' }}>Etapa final</span>
                            <span style={{ color: '#A78BFA' }}>{STAGE_LABEL_MAP[detail.current_stage ?? ''] ?? detail.current_stage ?? '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: '#71717A' }}>Turnos transcritos</span>
                            <span style={{ color: '#fff' }}>{detailTranscript.length}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: '#71717A' }}>Áudio gravado</span>
                            <span style={{ color: detailAudio ? '#34D399' : '#3A3A3C' }}>{detailAudio ? 'Sim' : 'Não'}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab: Simulador ───────────────────────────────────────────────────────────

function TabSimulador() {
  return (
    <div style={{ height: 'calc(100vh - 220px)', borderRadius: 12, overflow: 'hidden', border: '1px solid #27272A' }}>
      <iframe
        src="/admin/ana-master/simulador"
        style={{ width: '100%', height: '100%', border: 'none' }}
        allow="microphone"
      />
    </div>
  )
}

// ─── Tab: Config ──────────────────────────────────────────────────────────────

function TabConfig() {
  const stages = ['apresentacao','conexao','combinado','speech','fechamento','pagamento','referidos','validacao','ganho']
  const gates = ['GATE_CONEXAO','GATE_COMBINADO','GATE_SPEECH','GATE_FECHAMENTO','GATE_PAGAMENTO','GATE_REFERIDOS','GATE_RECOVERY','GATE_VALIDACAO']

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div style={{ background: '#1C1C1E', border: '1px solid #3A3A3C', borderRadius: 16, padding: 24 }}>
        <h4 style={{ color: '#fff', margin: '0 0 16px' }}>Etapas (9)</h4>
        {stages.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < stages.length - 1 ? '1px solid #2A2A2C' : 'none' }}>
            <span style={{ color: '#38BDF8', fontWeight: 600, width: 20, textAlign: 'right' }}>{i + 1}</span>
            <span style={{ color: '#E5E7EB', fontFamily: 'monospace' }}>{s}</span>
          </div>
        ))}
      </div>
      <div style={{ background: '#1C1C1E', border: '1px solid #3A3A3C', borderRadius: 16, padding: 24 }}>
        <h4 style={{ color: '#fff', margin: '0 0 16px' }}>Gates (8)</h4>
        {gates.map((g, i) => (
          <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < gates.length - 1 ? '1px solid #2A2A2C' : 'none' }}>
            <span style={{ color: '#A855F7', fontWeight: 600, width: 20, textAlign: 'right' }}>{i + 1}</span>
            <span style={{ color: '#E5E7EB', fontFamily: 'monospace', fontSize: 13 }}>{g}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnaDNANuclearPage() {
  const [tab, setTab] = useState('disparar')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#09090B' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TopBar />
        <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Ana DNA Nuclear</h1>
              <p style={{ color: '#71717A', fontSize: 14, margin: '4px 0 0' }}>
                Gestão completa da ANA MASTER — simulações, ligações, estado e configuração Realtime
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ background: '#1C1C1E', border: '1px solid #3A3A3C', borderRadius: 10, padding: '8px 16px', color: '#E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <Zap className="w-4 h-4" style={{ color: '#FBBF24' }} /> Disparar Ligação
              </button>
            </div>
          </div>

          {/* Info banner */}
          <div style={{ background: '#0A1628', border: '1px solid #1D4ED8', borderRadius: 12, padding: '12px 20px', marginBottom: 24, fontSize: 13, color: '#93C5FD' }}>
            ⚡ <strong>ANA MASTER (Opção A)</strong> usa <code>TwilioRealtimeTransportLayer</code> + <code>RealtimeSession</code> + <code>RealtimeAgent</code> — SDK cuida do áudio, nosso backend cuida de tudo comercial.
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid #27272A', paddingBottom: 0 }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: tab === t.key ? '#38BDF8' : '#71717A',
                  borderBottom: `2px solid ${tab === t.key ? '#38BDF8' : 'transparent'}`,
                  fontSize: 14, fontWeight: tab === t.key ? 600 : 400,
                  marginBottom: -1,
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'disparar' && <TabDisparar />}
          {tab === 'ligacoes' && <TabLigacoes />}
          {tab === 'monitor' && <TabMonitor />}
          {tab === 'simulacoes' && <TabSimulacoes />}
          {tab === 'config' && <TabConfig />}
          {tab === 'simulador' && <TabSimulador />}
          {tab === 'sessoes' && <TabSessoes />}
          {tab === 'state' && (
            <div style={{ textAlign: 'center', padding: 60, color: '#52525B' }}>
              <GitBranch className="w-12 h-12" style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p>State Machine visual — em breve.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
