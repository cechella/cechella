'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

let sb: ReturnType<typeof createBrowserClient> | null = null
function getSupabase() {
  if (!sb) sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return sb
}

const ZAPI_URL = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text'
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'

type Comercial = { id: string; nome: string; email: string; cargo?: string; telefone?: string }

type ContatoReferido = {
  id: string
  nome: string | null
  telefone: string | null
  profissao: string | null
  hobby: string | null
  status: string
  indicado_por_nome: string | null
  created_at: string
  assigned_comercial_id: string | null
}

type Stats = {
  fechados: number
  ranking: number
  totalComerciais: number
  comissao: number
  fechadosPorDia: number[]
}

type AnaCall = {
  id: string; call_sid: string; telefone: string; stage: string
  status: string; em_ligacao: boolean; nome: string | null
  created_at: string; updated_at: string
}

const COMM_COLORS = ['#7B3FE4','#06B6D4','#10B981','#F59E0B','#EF4444','#3B82F6','#EC4899']

function makeInitials(nome: string | null, tel?: string | null) {
  if (nome) return nome.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()
  return (tel || '??').slice(-2)
}

function minutesAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

function formatWait(mins: number) {
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60); const m = mins % 60
  return `${h}h${m.toString().padStart(2,'0')}`
}

function urgencyLevel(mins: number): 'urgent' | 'warm' | 'new' {
  if (mins >= 120) return 'urgent'
  if (mins >= 45) return 'warm'
  return 'new'
}

function TimerRing({ mins }: { mins: number }) {
  const level = urgencyLevel(mins)
  const color = level === 'urgent' ? '#EF4444' : level === 'warm' ? '#F59E0B' : '#7B3FE4'
  // ring: full circle at 240min, starts filling at 0
  const maxMins = 240
  const pct = Math.min(mins / maxMins, 1)
  const circumference = 2 * Math.PI * 17
  const offset = circumference * (1 - pct)
  return (
    <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
      <svg width={44} height={44} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={22} cy={22} r={17} fill="none" stroke="#27272A" strokeWidth={3} />
        <circle cx={22} cy={22} r={17} fill="none" stroke={color} strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 700, color, lineHeight: 1, textAlign: 'center',
      }}>
        {formatWait(mins)}
      </div>
    </div>
  )
}

function UrgencyBar({ level }: { level: 'urgent' | 'warm' | 'new' }) {
  const color = level === 'urgent' ? '#EF4444' : level === 'warm' ? '#F59E0B' : '#7B3FE4'
  return <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color, borderRadius: '12px 0 0 12px' }} />
}

function BadgePill({ level }: { level: 'urgent' | 'warm' | 'new' }) {
  const cfg = {
    urgent: { label: 'Urgente', bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
    warm:   { label: 'Quente',  bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
    new:    { label: 'Novo',    bg: 'rgba(123,63,228,0.12)', color: '#A78BFA' },
  }[level]
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
      padding: '2px 5px', borderRadius: 4, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function ScoreDots({ level }: { level: 'urgent' | 'warm' | 'new' }) {
  const count = level === 'urgent' ? 4 : level === 'warm' ? 3 : 2
  const color = level === 'urgent' ? '#EF4444' : level === 'warm' ? '#F59E0B' : '#7B3FE4'
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < count ? color : '#27272A' }} />
      ))}
    </div>
  )
}

export default function SalesDashboard() {
  const [me, setMe] = useState<Comercial | null>(null)
  const [fila, setFila] = useState<ContatoReferido[]>([])
  const [aoVivo, setAoVivo] = useState<AnaCall[]>([])
  const [stats, setStats] = useState<Stats>({ fechados: 8, ranking: 3, totalComerciais: 8, comissao: 4800, fechadosPorDia: [1,2,1,3,2,1,0] })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [now, setNow] = useState(Date.now())
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    const [meRes, refRes, filaRes] = await Promise.all([
      fetch('/api/sales/me'),
      fetch('/api/sales/referidos'),
      fetch('/api/sales/fila'),
    ])
    if (meRes.status === 401 || meRes.status === 404) {
      await getSupabase().auth.signOut()
      router.replace('/sales/login')
      return
    }
    const [meData, refData, filaData] = await Promise.all([
      meRes.json(), refRes.json(), filaRes.json(),
    ])
    setMe(meData)
    const calls = Array.isArray(refData) ? refData : []
    setAoVivo(calls.filter((c: AnaCall) => c.em_ligacao))
    if (filaData.fila) setFila(filaData.fila)
    if (filaData.stats) setStats(filaData.stats)
    setLoading(false)
  }, [router])

  useEffect(() => {
    load()
    const iv = setInterval(load, 30000)
    const tick = setInterval(() => setNow(Date.now()), 60000)
    return () => { clearInterval(iv); clearInterval(tick) }
  }, [load])

  async function marcarContatado(ref: ContatoReferido) {
    await fetch('/api/sales/fila', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ref.id, status: 'contatado' }),
    })
    setFila(prev => prev.filter(r => r.id !== ref.id))
    showToast('Marcado como contatado ✓')
  }

  async function dispararPTL(ref: ContatoReferido) {
    if (!ref.telefone) return showToast('Sem telefone', false)
    const tel = ref.telefone.replace(/\D/g, '')
    try {
      const res = await fetch('/api/admin/ana-master-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: tel, referidor: ref.indicado_por_nome || '', contexto: 'gold' }),
      })
      if (res.ok) showToast(`PTL iniciada para ${ref.nome || ref.telefone}!`)
      else showToast('Erro ao disparar PTL', false)
    } catch { showToast('Erro de conexão', false) }
  }

  const comissaoFormatado = `R$ ${stats.comissao.toLocaleString('pt-BR')}`
  const metaFechamentos = 12
  const pctMeta = Math.min(Math.round((stats.fechados / metaFechamentos) * 100), 100)
  const diasRestantes = (() => {
    const d = new Date(); const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return fim.getDate() - d.getDate()
  })()
  const totalFila = fila.length + aoVivo.length

  const rankPct = stats.totalComerciais > 1
    ? Math.round(((stats.totalComerciais - stats.ranking) / (stats.totalComerciais - 1)) * 100)
    : 100

  const chartMax = Math.max(...stats.fechadosPorDia, 1)
  const days = ['S','T','Q','Q','S','S','D']

  const s = (v: string | number) => String(v)

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#0A0A0B', minHeight: '100vh', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          background: toast.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${toast.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: toast.ok ? '#6EE7B7' : '#FCA5A5',
          padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── HERO BANNER ── */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(123,63,228,0.12),rgba(6,182,212,0.06))',
        border: '1px solid rgba(123,63,228,0.2)',
        borderRadius: 20, padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 50%,rgba(123,63,228,0.15),transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg,#7B3FE4,#A78BFA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#fff',
            boxShadow: '0 0 0 3px rgba(123,63,228,0.3)',
            flexShrink: 0,
          }}>
            {loading ? '?' : makeInitials(me?.nome ?? null)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                {loading ? '...' : me?.nome ?? 'Consultor'}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '2px 7px', borderRadius: 20,
                background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)',
              }}>Nv 2</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Ao Vivo</span>
              <span style={{ fontSize: 11, color: '#52525B', margin: '0 2px' }}>·</span>
              <span style={{ fontSize: 11, color: '#71717A' }}>{me?.cargo ?? 'Consultor de Vendas'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          {/* Commission */}
          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 12, padding: '10px 16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#F59E0B', marginBottom: 3 }}>Comissão do Mês</div>
            <div style={{ fontFamily: "'Space Grotesk',system-ui", fontSize: 20, fontWeight: 700, color: '#FCD34D', lineHeight: 1 }}>
              {loading ? '...' : comissaoFormatado}
            </div>
          </div>
          {/* Ranking */}
          <div style={{
            background: 'rgba(123,63,228,0.08)', border: '1px solid rgba(123,63,228,0.2)',
            borderRadius: 12, padding: '10px 16px', textAlign: 'center', minWidth: 80,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A78BFA', marginBottom: 3 }}>Ranking</div>
            <div style={{ fontFamily: "'Space Grotesk',system-ui", fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
              #{loading ? '…' : stats.ranking}<span style={{ fontSize: 11, color: '#71717A' }}> / {stats.totalComerciais}</span>
            </div>
          </div>
          {/* Queue alert */}
          {totalFila > 0 && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 12, padding: '10px 16px', textAlign: 'center', minWidth: 80,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#EF4444', marginBottom: 3 }}>Na Fila</div>
              <div style={{ fontFamily: "'Space Grotesk',system-ui", fontSize: 20, fontWeight: 700, color: '#FCA5A5', lineHeight: 1 }}>
                {totalFila}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── KPI ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { ico: '🔥', val: loading ? '…' : s(totalFila), label: 'Leads na Fila', color: totalFila > 0 ? '#EF4444' : '#71717A', top: totalFila > 0 ? '#EF4444' : '#27272A', delta: totalFila > 0 ? `${fila.filter(f => urgencyLevel(minutesAgo(f.created_at)) === 'urgent').length} urgente(s)` : 'Tudo atendido', deltaColor: totalFila > 0 ? '#EF4444' : '#10B981', deltaBg: totalFila > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' },
          { ico: '💰', val: loading ? '…' : comissaoFormatado, label: 'Comissão do Mês', color: '#F59E0B', top: '#F59E0B', delta: `${stats.fechados} fechamentos`, deltaColor: '#F59E0B', deltaBg: 'rgba(245,158,11,0.1)' },
          { ico: '✅', val: loading ? '…' : s(stats.fechados), label: 'Convertidos — Mês', color: '#10B981', top: '#10B981', delta: `Meta: ${pctMeta}%`, deltaColor: '#10B981', deltaBg: 'rgba(16,185,129,0.1)' },
          { ico: '🏆', val: loading ? '…' : `#${stats.ranking}`, label: 'Ranking da Equipe', color: '#A78BFA', top: '#7B3FE4', delta: `de ${stats.totalComerciais} consultores`, deltaColor: '#A78BFA', deltaBg: 'rgba(123,63,228,0.1)' },
        ].map((k, i) => (
          <div key={i} style={{
            background: '#111113', border: '1px solid #27272A', borderRadius: 20,
            padding: '20px 22px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.top, borderRadius: '20px 20px 0 0' }} />
            <div style={{ fontSize: 20, marginBottom: 10 }}>{k.ico}</div>
            <div style={{ fontFamily: "'Space Grotesk',system-ui", fontSize: 28, fontWeight: 700, color: k.color, lineHeight: 1, marginBottom: 4 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: '#71717A', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{k.label}</div>
            <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: k.deltaBg, color: k.deltaColor }}>
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* ── FILA ── */}
        <div style={{ background: '#111113', border: '1px solid #27272A', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1C1C1E' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Fila de Atendimento</span>
              {totalFila > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                  {totalFila} aguardando
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: '#71717A' }}>mais antigo primeiro · atualiza em 30s</span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ height: 100, background: '#18181A', margin: '0 0 1px', opacity: 0.5 }} />
              ))}
            </div>
          ) : totalFila === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>Fila limpa — bom trabalho!</div>
              <div style={{ fontSize: 12, color: '#52525B' }}>Novos leads distribuídos pelo admin aparecem aqui</div>
            </div>
          ) : (
            <div>
              {/* Ao vivo calls first */}
              {aoVivo.map((r) => {
                const mins = minutesAgo(r.updated_at)
                return (
                  <div key={r.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14, alignItems: 'start', padding: '16px 20px', borderBottom: '1px solid #1C1C1E', position: 'relative', background: 'rgba(6,182,212,0.03)' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#06B6D4', borderRadius: '12px 0 0 12px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 2, width: 44 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#06B6D4,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                        {makeInitials(r.nome, r.telefone)}
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, fontSize: 14, fontWeight: 700, color: '#fff' }}>
                        {r.nome ?? '(sem cadastro)'}
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: 'rgba(6,182,212,0.15)', color: '#06B6D4', letterSpacing: '0.07em' }}>● AO VIVO</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: '#06B6D4', fontWeight: 500 }}>{r.telefone}</span>
                        <span style={{ fontSize: 10, color: '#52525B' }}>·</span>
                        <span style={{ fontSize: 11, color: '#A1A1AA' }}>Etapa: {r.stage}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <a href={`https://wa.me/55${r.telefone?.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: 'rgba(37,209,102,0.1)', color: '#25D166', border: '1px solid rgba(37,209,102,0.2)', textDecoration: 'none' }}>
                          💬 WhatsApp
                        </a>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, paddingTop: 2 }}>
                      <span style={{ fontSize: 10, color: '#52525B' }}>há {formatWait(mins)}</span>
                    </div>
                  </div>
                )
              })}

              {/* Referidos fila */}
              {fila.map((ref) => {
                const mins = minutesAgo(ref.created_at)
                const level = urgencyLevel(mins)
                return (
                  <div key={ref.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14, alignItems: 'start', padding: '16px 20px', borderBottom: '1px solid #1C1C1E', position: 'relative', cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#18181A')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <UrgencyBar level={level} />
                    <TimerRing mins={mins} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, fontSize: 14, fontWeight: 700, color: '#fff', flexWrap: 'wrap' }}>
                        {ref.nome || '(sem nome)'}
                        <BadgePill level={level} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: '#06B6D4', fontWeight: 500 }}>{ref.telefone || '—'}</span>
                        {ref.profissao && <><span style={{ fontSize: 10, color: '#52525B' }}>·</span><span style={{ fontSize: 11, color: '#A1A1AA' }}>{ref.profissao}</span></>}
                        {ref.indicado_por_nome && <><span style={{ fontSize: 10, color: '#52525B' }}>·</span><span style={{ fontSize: 11, color: '#71717A' }}>🔗 {ref.indicado_por_nome}</span></>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => dispararPTL(ref)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)', cursor: 'pointer' }}>
                          📞 Disparar PTL
                        </button>
                        {ref.telefone && (
                          <a href={`https://wa.me/55${ref.telefone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: 'rgba(37,209,102,0.1)', color: '#25D166', border: '1px solid rgba(37,209,102,0.2)', textDecoration: 'none' }}>
                            💬 WhatsApp
                          </a>
                        )}
                        <button onClick={() => marcarContatado(ref)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: 'rgba(123,63,228,0.1)', color: '#A78BFA', border: '1px solid rgba(123,63,228,0.25)', cursor: 'pointer' }}>
                          ✓ Marcar Contatado
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, paddingTop: 2 }}>
                      <span style={{ fontSize: 10, color: '#52525B', whiteSpace: 'nowrap' }}>há {formatWait(mins)}</span>
                      <ScoreDots level={level} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── SIDEBAR ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Ranking */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(123,63,228,0.15),rgba(6,182,212,0.08))',
            border: '1px solid rgba(123,63,228,0.25)', borderRadius: 20, padding: 22, textAlign: 'center', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%,rgba(123,63,228,0.2),transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A78BFA', marginBottom: 8, position: 'relative' }}>Ranking da Equipe</div>
            <div style={{ fontFamily: "'Space Grotesk',system-ui", fontSize: 52, fontWeight: 700, lineHeight: 1, color: '#fff', textShadow: '0 0 40px rgba(123,63,228,0.5)', position: 'relative' }}>
              <span style={{ fontSize: 22, color: '#A78BFA' }}>#</span>{loading ? '…' : stats.ranking}
            </div>
            <div style={{ fontSize: 12, color: '#A1A1AA', marginTop: 4, position: 'relative' }}>de {stats.totalComerciais} consultores</div>
            <div style={{ marginTop: 16, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#71717A', marginBottom: 5 }}>
                <span>Último</span><span>Você</span><span>1º lugar</span>
              </div>
              <div style={{ height: 6, background: '#27272A', borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg,#7B3FE4,#06B6D4)', borderRadius: 20, width: `${rankPct}%` }} />
              </div>
            </div>
          </div>

          {/* Meta */}
          <div style={{ background: '#111113', border: '1px solid #27272A', borderRadius: 20, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Meta de {new Date().toLocaleString('pt-BR',{month:'long'})}</div>
                <div style={{ fontSize: 10, color: '#71717A', marginTop: 2 }}>{metaFechamentos} fechamentos · {diasRestantes} dias restantes</div>
              </div>
              <div style={{ fontFamily: "'Space Grotesk',system-ui", fontSize: 22, fontWeight: 700, color: '#F59E0B' }}>{pctMeta}%</div>
            </div>
            <div style={{ height: 8, background: '#1C1C1E', borderRadius: 20, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${pctMeta}%`, background: 'linear-gradient(90deg,#FCD34D,#F59E0B)', borderRadius: 20, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#71717A' }}>
              <span>0</span><span>{stats.fechados} / {metaFechamentos} fechados</span><span>{metaFechamentos}</span>
            </div>
          </div>

          {/* Streak + tempo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { ico: '🔥', val: '5', sub: 'Dias seguidos', tip: 'contato < 30min' },
              { ico: '⚡', val: '22min', sub: 'Tempo médio', tip: '1º contato' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#111113', border: '1px solid #27272A', borderRadius: 16, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.ico}</div>
                <div style={{ fontFamily: "'Space Grotesk',system-ui", fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#71717A', marginTop: 3 }}>{s.sub}</div>
                <div style={{ fontSize: 9, color: '#52525B', marginTop: 1 }}>{s.tip}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ background: '#111113', border: '1px solid #27272A', borderRadius: 20, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Fechamentos — 7 dias</span>
              <span style={{ fontSize: 10, color: '#71717A' }}>esta semana</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 60 }}>
              {stats.fechadosPorDia.map((v, i) => {
                const h = chartMax > 0 ? Math.round((v / chartMax) * 100) : 10
                const isToday = i === 6
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4 }}>
                    <div style={{
                      width: '100%', borderRadius: '4px 4px 0 0',
                      height: `${Math.max(h, 8)}%`,
                      background: isToday ? 'linear-gradient(180deg,#A78BFA,#7B3FE4)' : v > 0 ? 'rgba(123,63,228,0.4)' : '#1C1C1E',
                    }} title={`${days[i]}: ${v}`} />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
              {days.map((d, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: i === 6 ? '#A78BFA' : '#52525B', fontWeight: i === 6 ? 700 : 400 }}>{d}</div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
