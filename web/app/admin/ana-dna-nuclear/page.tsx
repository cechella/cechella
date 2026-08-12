'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Phone, Zap, Activity, BarChart3, Settings, GitBranch, RefreshCw, PhoneCall, Mic } from 'lucide-react'

const TABS = [
  { key: 'disparar', label: 'Disparar', icon: <Zap className="w-4 h-4" /> },
  { key: 'ligacoes', label: 'Ligações', icon: <Phone className="w-4 h-4" /> },
  { key: 'monitor', label: 'Live Monitor', icon: <Activity className="w-4 h-4" /> },
  { key: 'simulacoes', label: 'Simulações', icon: <BarChart3 className="w-4 h-4" /> },
  { key: 'simulador', label: 'Simulador de Voz', icon: <Mic className="w-4 h-4" /> },
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
