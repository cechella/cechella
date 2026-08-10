'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Brain, Star, XCircle, BarChart3, Grid3X3, Clock,
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle,
  AlertTriangle, Sparkles, Target, BookOpen, Zap,
  Copy, Check, RefreshCw, TrendingUp, Award
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Simulacao {
  id: string
  created_at: string
  titulo: string
  descricao?: string
  etapa: string
  score_geral: number
  score_conexao: number
  score_objecao: number
  score_fechamento: number
  aprovada: boolean
  transcript?: string
  observacoes?: string
  updated_at?: string
}

interface GoldItem {
  id: string
  created_at: string
  etapa: string
  categoria: string
  titulo: string
  exemplo: string
  motivo: string
  sim_id?: string
  updated_at?: string
}

interface AntiGoldItem {
  id: string
  created_at: string
  etapa: string
  categoria: string
  titulo: string
  exemplo: string
  problema: string
  alternativa?: string
  sim_id?: string
  updated_at?: string
}

interface ScorecardEntry {
  id: string
  created_at: string
  sim_id?: string
  etapa: string
  criterio: string
  score: number
  max_score: number
  nota?: string
  updated_at?: string
}

interface MatrizItem {
  id: string
  created_at: string
  habilidade: string
  descricao: string
  nivel: 'nao_definido' | 'raso' | 'adequado' | 'ouro'
  evidencias?: string
  proximos_passos?: string
  updated_at?: string
}

interface ChangelogEntry {
  id: string
  created_at: string
  tipo: 'decisao' | 'aprendizado' | 'diretriz' | 'restricao'
  titulo: string
  descricao: string
  impacto?: string
  autor?: string
  updated_at?: string
}

type Tab = 'central' | 'simulacoes' | 'gold' | 'anti-gold' | 'scorecard' | 'matriz' | 'changelog'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(ts: string) {
  return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function ScoreBadge({ score, max = 10 }: { score: number; max?: number }) {
  const pct = score / max
  const color = pct >= 0.8 ? '#22c55e' : pct >= 0.6 ? '#f59e0b' : '#ef4444'
  return (
    <span style={{ fontSize: 11, fontWeight: 800, color, background: color + '20', border: `1px solid ${color}40`, borderRadius: 6, padding: '2px 7px', fontVariantNumeric: 'tabular-nums' }}>
      {score}/{max}
    </span>
  )
}

function NivelBadge({ nivel }: { nivel: MatrizItem['nivel'] }) {
  const map: Record<MatrizItem['nivel'], { label: string; color: string }> = {
    nao_definido: { label: 'Não definido', color: '#555' },
    raso: { label: 'Raso', color: '#ef4444' },
    adequado: { label: 'Adequado', color: '#f59e0b' },
    ouro: { label: 'Ouro ✦', color: '#f59e0b' },
  }
  const { label, color } = map[nivel]
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: color + '20', border: `1px solid ${color}40`, borderRadius: 6, padding: '2px 8px' }}>
      {label}
    </span>
  )
}

function TipoBadge({ tipo }: { tipo: ChangelogEntry['tipo'] }) {
  const map: Record<ChangelogEntry['tipo'], { label: string; color: string }> = {
    decisao: { label: 'Decisão', color: '#7B3FE4' },
    aprendizado: { label: 'Aprendizado', color: '#22c55e' },
    diretriz: { label: 'Diretriz', color: '#3B82F6' },
    restricao: { label: 'Restrição', color: '#ef4444' },
  }
  const { label, color } = map[tipo]
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: color + '20', border: `1px solid ${color}40`, borderRadius: 6, padding: '2px 8px' }}>
      {label}
    </span>
  )
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchTable<T>(table: string): Promise<T[]> {
  const res = await fetch(`/api/admin/ana-master?table=${table}&limit=200`)
  const json = await res.json()
  return json.data || []
}

async function createRecord(table: string, record: Record<string, unknown>) {
  const res = await fetch('/api/admin/ana-master', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, record }),
  })
  return res.json()
}

async function deleteRecord(table: string, id: string) {
  await fetch(`/api/admin/ana-master?table=${table}&id=${id}`, { method: 'DELETE' })
}

async function patchRecord(table: string, id: string, updates: Record<string, unknown>) {
  const res = await fetch('/api/admin/ana-master', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, id, updates }),
  })
  return res.json()
}

// ─── Shared modal container ────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#111113', border: '1px solid #2a2a2a', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #1C1C1E', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F0F0F5' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#555', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#A1A1AA', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0A0A0B', border: '1px solid #2a2a2a', borderRadius: 8,
  padding: '8px 10px', fontSize: 13, color: '#E4E4E7', outline: 'none', boxSizing: 'border-box',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer',
}

const ETAPAS = ['apresentacao', 'conexao', 'di', 'speech', 'fechamento', 'referidos', 'validacao', 'geral']
const ETAPA_LABELS: Record<string, string> = {
  apresentacao: 'Apresentação', conexao: 'Conexão', di: 'D.I.', speech: 'Speech',
  fechamento: 'Fechamento', referidos: 'Referidos', validacao: 'Validação', geral: 'Geral',
}

const GOLD_CATS = ['abertura', 'conexao', 'di', 'speech', 'objecao', 'fechamento', 'referidos', 'transicao', 'escuta', 'outro']
const SCORECARD_CRITERIOS = ['Abertura natural', 'Nome cedo', 'Conexão pessoal', 'D.I. completa', 'Speech fluido', 'Objeção tratada', 'Fechamento direto', 'Sem filler', 'Tom adequado', 'Lógica sequencial']

// ─── CENTRAL TAB ─────────────────────────────────────────────────────────────

function CentralTab({ sims, gold, antiGold, scorecard, matriz, changelog }: {
  sims: Simulacao[]; gold: GoldItem[]; antiGold: AntiGoldItem[]
  scorecard: ScorecardEntry[]; matriz: MatrizItem[]; changelog: ChangelogEntry[]
}) {
  const avgScore = sims.length > 0 ? Math.round(sims.reduce((s, sim) => s + sim.score_geral, 0) / sims.length * 10) / 10 : 0
  const aprovadas = sims.filter(s => s.aprovada).length
  const ourosCount = matriz.filter(m => m.nivel === 'ouro').length
  const totalHabilidades = matriz.length

  const phase1Items = [
    { label: 'Rodar ≥ 5 simulações', done: sims.length >= 5, value: `${sims.length}/5` },
    { label: 'Gold Standard ≥ 10 exemplos', done: gold.length >= 10, value: `${gold.length}/10` },
    { label: 'Anti-Gold ≥ 5 exemplos', done: antiGold.length >= 5, value: `${antiGold.length}/5` },
    { label: 'Scorecard ≥ 10 entradas', done: scorecard.length >= 10, value: `${scorecard.length}/10` },
    { label: 'Matriz populada', done: matriz.length >= 5, value: `${totalHabilidades} habilidades` },
    { label: 'Score médio ≥ 7.0', done: avgScore >= 7.0, value: avgScore > 0 ? avgScore.toFixed(1) : '—' },
  ]

  const phasePct = Math.round((phase1Items.filter(i => i.done).length / phase1Items.length) * 100)

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Phase Progress */}
      <div style={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F0F0F5' }}>Fase 1 — Simulação & Documentação</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#555' }}>Design sem engenharia. Resultados aprovados viram diretivas da Ana.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: phasePct >= 100 ? '#22c55e' : '#7B3FE4' }}>{phasePct}%</div>
            <div style={{ fontSize: 10, color: '#555' }}>completo</div>
          </div>
        </div>
        <div style={{ height: 6, background: '#1C1C1E', borderRadius: 99, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: '100%', width: `${phasePct}%`, background: 'linear-gradient(90deg, #7B3FE4, #3B82F6)', borderRadius: 99, transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {phase1Items.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: item.done ? '#22c55e10' : '#1A1A20', borderRadius: 8, border: `1px solid ${item.done ? '#22c55e30' : '#2a2a2a'}` }}>
              {item.done
                ? <CheckCircle style={{ width: 14, height: 14, color: '#22c55e', flexShrink: 0 }} />
                : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #333', flexShrink: 0 }} />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: item.done ? '#A1A1AA' : '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: item.done ? '#22c55e' : '#555', flexShrink: 0 }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { icon: <Brain style={{ width: 18, height: 18 }} />, label: 'Simulações', value: sims.length, sub: `${aprovadas} aprovadas`, color: '#7B3FE4' },
          { icon: <Star style={{ width: 18, height: 18 }} />, label: 'Gold Standard', value: gold.length, sub: 'exemplos ouro', color: '#f59e0b' },
          { icon: <XCircle style={{ width: 18, height: 18 }} />, label: 'Anti-Gold', value: antiGold.length, sub: 'padrões proibidos', color: '#ef4444' },
          { icon: <Award style={{ width: 18, height: 18 }} />, label: 'Score médio', value: avgScore > 0 ? avgScore.toFixed(1) : '—', sub: 'última simulação', color: avgScore >= 7 ? '#22c55e' : '#f59e0b' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 12, padding: 18 }}>
            <div style={{ color: kpi.color, marginBottom: 10 }}>{kpi.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#F0F0F5', lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginTop: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Last sims */}
        <div style={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 12, padding: 18 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Últimas simulações</h3>
          {sims.length === 0 ? (
            <p style={{ fontSize: 12, color: '#444', textAlign: 'center', padding: '16px 0' }}>Nenhuma simulação ainda</p>
          ) : sims.slice(0, 5).map(sim => (
            <div key={sim.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1A1A20' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#D4D4D8' }}>{sim.titulo}</div>
                <div style={{ fontSize: 10, color: '#555' }}>{ETAPA_LABELS[sim.etapa] || sim.etapa} · {fmtDate(sim.created_at)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ScoreBadge score={sim.score_geral} />
                {sim.aprovada && <CheckCircle style={{ width: 13, height: 13, color: '#22c55e' }} />}
              </div>
            </div>
          ))}
        </div>

        {/* Last changelog */}
        <div style={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 12, padding: 18 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Changelog recente</h3>
          {changelog.length === 0 ? (
            <p style={{ fontSize: 12, color: '#444', textAlign: 'center', padding: '16px 0' }}>Nenhuma entrada ainda</p>
          ) : changelog.slice(0, 5).map(entry => (
            <div key={entry.id} style={{ padding: '8px 0', borderBottom: '1px solid #1A1A20' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <TipoBadge tipo={entry.tipo} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#D4D4D8' }}>{entry.titulo}</span>
              </div>
              <div style={{ fontSize: 10, color: '#555' }}>{fmtDate(entry.created_at)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── SIMULAÇÕES TAB ────────────────────────────────────────────────────────────

function SimulacoesTab({ sims, onRefresh }: { sims: Simulacao[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    titulo: '', descricao: '', etapa: 'geral', transcript: '', observacoes: '',
    score_geral: 7, score_conexao: 7, score_objecao: 7, score_fechamento: 7, aprovada: false,
  })

  const save = async () => {
    if (!form.titulo.trim()) return
    setSaving(true)
    await createRecord('ana_simulacoes', form)
    setSaving(false)
    setShowForm(false)
    setForm({ titulo: '', descricao: '', etapa: 'geral', transcript: '', observacoes: '', score_geral: 7, score_conexao: 7, score_objecao: 7, score_fechamento: 7, aprovada: false })
    onRefresh()
  }

  const remove = async (id: string) => {
    if (!confirm('Remover simulação?')) return
    await deleteRecord('ana_simulacoes', id)
    onRefresh()
  }

  const toggleAprovada = async (sim: Simulacao) => {
    await patchRecord('ana_simulacoes', sim.id, { aprovada: !sim.aprovada })
    onRefresh()
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F0F0F5' }}>Simulações</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#555' }}>Cole transcrições de simulações OpenAI e avalie cada uma.</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#7B3FE4', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700 }}>
          <Plus style={{ width: 14, height: 14 }} /> Nova simulação
        </button>
      </div>

      {sims.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#444' }}>
          <Brain style={{ width: 36, height: 36, margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: 13 }}>Nenhuma simulação. Rode uma conversa com a Ana no OpenAI e cole o transcript aqui.</p>
        </div>
      )}

      {sims.map(sim => (
        <div key={sim.id} style={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#F0F0F5' }}>{sim.titulo}</span>
                <span style={{ fontSize: 10, color: '#555', background: '#1C1C1E', padding: '2px 6px', borderRadius: 5 }}>{ETAPA_LABELS[sim.etapa] || sim.etapa}</span>
                {sim.aprovada && <span style={{ fontSize: 10, color: '#22c55e', background: '#22c55e20', border: '1px solid #22c55e30', padding: '2px 6px', borderRadius: 5 }}>✓ Aprovada</span>}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#555' }}>
                <span>Score: <strong style={{ color: '#D4D4D8' }}>{sim.score_geral}/10</strong></span>
                <span>Conexão: {sim.score_conexao}/10</span>
                <span>Objeção: {sim.score_objecao}/10</span>
                <span>Fechamento: {sim.score_fechamento}/10</span>
                <span>{fmtDate(sim.created_at)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => toggleAprovada(sim)}
                title={sim.aprovada ? 'Desaprovar' : 'Aprovar'}
                style={{ padding: '6px 10px', background: sim.aprovada ? '#22c55e20' : '#1C1C1E', border: `1px solid ${sim.aprovada ? '#22c55e40' : '#2a2a2a'}`, borderRadius: 7, cursor: 'pointer', color: sim.aprovada ? '#22c55e' : '#555' }}
              >
                <CheckCircle style={{ width: 13, height: 13 }} />
              </button>
              <button onClick={() => setExpanded(expanded === sim.id ? null : sim.id)} style={{ padding: '6px 10px', background: '#1C1C1E', border: '1px solid #2a2a2a', borderRadius: 7, cursor: 'pointer', color: '#A1A1AA' }}>
                {expanded === sim.id ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
              </button>
              <button onClick={() => remove(sim.id)} style={{ padding: '6px 10px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 7, cursor: 'pointer', color: '#ef4444' }}>
                <Trash2 style={{ width: 13, height: 13 }} />
              </button>
            </div>
          </div>

          {expanded === sim.id && (
            <div style={{ borderTop: '1px solid #1A1A20', padding: 16 }}>
              {sim.descricao && <p style={{ margin: '0 0 12px', fontSize: 13, color: '#A1A1AA', lineHeight: 1.6 }}>{sim.descricao}</p>}
              {sim.observacoes && (
                <div style={{ background: '#7B3FE410', border: '1px solid #7B3FE430', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#7B3FE4', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Observações</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#A1A1AA', whiteSpace: 'pre-wrap' }}>{sim.observacoes}</p>
                </div>
              )}
              {sim.transcript && (
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase' }}>Transcript</p>
                  <pre style={{ margin: 0, fontSize: 11, color: '#888', background: '#0A0A0B', border: '1px solid #1C1C1E', borderRadius: 8, padding: 12, maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', lineHeight: 1.5 }}>
                    {sim.transcript}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {showForm && (
        <Modal title="Nova Simulação" onClose={() => setShowForm(false)}>
          <Field label="Título *">
            <input style={inputStyle} value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Simulação 003 — objeção de preço" />
          </Field>
          <Field label="Etapa foco">
            <select style={selectStyle} value={form.etapa} onChange={e => setForm(f => ({ ...f, etapa: e.target.value }))}>
              {ETAPAS.map(e => <option key={e} value={e}>{ETAPA_LABELS[e]}</option>)}
            </select>
          </Field>
          <Field label="Descrição">
            <textarea style={textareaStyle} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Contexto e objetivo desta simulação..." />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {(['score_geral', 'score_conexao', 'score_objecao', 'score_fechamento'] as const).map(key => (
              <Field key={key} label={key.replace('score_', '').replace('_', ' ') + ' (0–10)'}>
                <input type="number" min={0} max={10} style={inputStyle} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))} />
              </Field>
            ))}
          </div>
          <Field label="Observações">
            <textarea style={textareaStyle} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="O que funcionou? O que falhou?" />
          </Field>
          <Field label="Transcript (cole aqui)">
            <textarea style={{ ...textareaStyle, minHeight: 140, fontFamily: 'monospace', fontSize: 11 }} value={form.transcript} onChange={e => setForm(f => ({ ...f, transcript: e.target.value }))} placeholder="Cole o transcript da simulação aqui..." />
          </Field>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <input type="checkbox" id="aprovada" checked={form.aprovada} onChange={e => setForm(f => ({ ...f, aprovada: e.target.checked }))} />
            <label htmlFor="aprovada" style={{ fontSize: 13, color: '#A1A1AA', cursor: 'pointer' }}>Marcar como aprovada</label>
          </div>
          <button onClick={save} disabled={saving || !form.titulo.trim()} style={{ width: '100%', padding: '10px', background: saving ? '#444' : '#7B3FE4', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 13, fontWeight: 700 }}>
            {saving ? 'Salvando...' : 'Salvar simulação'}
          </button>
        </Modal>
      )}
    </div>
  )
}

// ─── GOLD STANDARD TAB ────────────────────────────────────────────────────────

function GoldTab({ items, onRefresh }: { items: GoldItem[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [filterEtapa, setFilterEtapa] = useState('todos')
  const [filterCat, setFilterCat] = useState('todos')
  const [form, setForm] = useState({ etapa: 'geral', categoria: 'abertura', titulo: '', exemplo: '', motivo: '' })

  const save = async () => {
    if (!form.titulo.trim() || !form.exemplo.trim()) return
    setSaving(true)
    await createRecord('ana_gold', form)
    setSaving(false)
    setShowForm(false)
    setForm({ etapa: 'geral', categoria: 'abertura', titulo: '', exemplo: '', motivo: '' })
    onRefresh()
  }

  const remove = async (id: string) => {
    if (!confirm('Remover exemplo Gold?')) return
    await deleteRecord('ana_gold', id)
    onRefresh()
  }

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const filtered = items.filter(item => {
    if (filterEtapa !== 'todos' && item.etapa !== filterEtapa) return false
    if (filterCat !== 'todos' && item.categoria !== filterCat) return false
    return true
  })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F0F0F5' }}>Gold Standard ✦</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#555' }}>Exemplos aprovados. Estes são os padrões que a Ana deve alcançar.</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#f59e0b', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#000', fontSize: 12, fontWeight: 700 }}>
          <Plus style={{ width: 14, height: 14 }} /> Novo exemplo
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select style={{ ...selectStyle, width: 'auto', fontSize: 12 }} value={filterEtapa} onChange={e => setFilterEtapa(e.target.value)}>
          <option value="todos">Todas etapas</option>
          {ETAPAS.map(e => <option key={e} value={e}>{ETAPA_LABELS[e]}</option>)}
        </select>
        <select style={{ ...selectStyle, width: 'auto', fontSize: 12 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="todos">Todas categorias</option>
          {GOLD_CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#555', padding: '8px 0' }}>{filtered.length} exemplos</span>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#444' }}>
          <Star style={{ width: 36, height: 36, margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: 13 }}>Nenhum exemplo Gold Standard ainda. Adicione transcrições aprovadas aqui.</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map(item => (
          <div key={item.id} style={{ background: '#111113', border: '1px solid #f59e0b30', borderLeft: '3px solid #f59e0b', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#F0F0F5' }}>{item.titulo}</span>
                  <span style={{ fontSize: 10, background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b30', borderRadius: 5, padding: '1px 6px' }}>{item.categoria}</span>
                  <span style={{ fontSize: 10, background: '#1C1C1E', color: '#555', borderRadius: 5, padding: '1px 6px' }}>{ETAPA_LABELS[item.etapa] || item.etapa}</span>
                </div>
                <div style={{ fontSize: 10, color: '#444' }}>{fmtDate(item.created_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                <button onClick={() => copy(item.id, item.exemplo)} title="Copiar exemplo" style={{ padding: '5px 8px', background: '#1C1C1E', border: '1px solid #2a2a2a', borderRadius: 6, cursor: 'pointer', color: copiedId === item.id ? '#22c55e' : '#555' }}>
                  {copiedId === item.id ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                </button>
                <button onClick={() => remove(item.id)} style={{ padding: '5px 8px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 6, cursor: 'pointer', color: '#ef4444' }}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            </div>
            <div style={{ background: '#0A0A0B', border: '1px solid #1C1C1E', borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#D4D4D8', fontStyle: 'italic', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>"{item.exemplo}"</p>
            </div>
            {item.motivo && (
              <p style={{ margin: 0, fontSize: 12, color: '#A1A1AA', lineHeight: 1.5 }}>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>✦ Por que é ouro: </span>{item.motivo}
              </p>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <Modal title="Novo exemplo Gold Standard" onClose={() => setShowForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Etapa">
              <select style={selectStyle} value={form.etapa} onChange={e => setForm(f => ({ ...f, etapa: e.target.value }))}>
                {ETAPAS.map(e => <option key={e} value={e}>{ETAPA_LABELS[e]}</option>)}
              </select>
            </Field>
            <Field label="Categoria">
              <select style={selectStyle} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {GOLD_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Título *">
            <input style={inputStyle} value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Abertura com nome cedo e pergunta aberta" />
          </Field>
          <Field label="Exemplo (fala da Ana) *">
            <textarea style={textareaStyle} value={form.exemplo} onChange={e => setForm(f => ({ ...f, exemplo: e.target.value }))} placeholder="Cole aqui a fala exata que é considerada Gold..." />
          </Field>
          <Field label="Por que é Gold?">
            <textarea style={{ ...textareaStyle, minHeight: 60 }} value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} placeholder="O que torna esta fala exemplar?" />
          </Field>
          <button onClick={save} disabled={saving || !form.titulo.trim() || !form.exemplo.trim()} style={{ width: '100%', padding: '10px', background: saving ? '#444' : '#f59e0b', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#000', fontSize: 13, fontWeight: 700 }}>
            {saving ? 'Salvando...' : 'Salvar exemplo Gold'}
          </button>
        </Modal>
      )}
    </div>
  )
}

// ─── ANTI-GOLD TAB ────────────────────────────────────────────────────────────

function AntiGoldTab({ items, onRefresh }: { items: AntiGoldItem[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ etapa: 'geral', categoria: 'outro', titulo: '', exemplo: '', problema: '', alternativa: '' })

  const save = async () => {
    if (!form.titulo.trim() || !form.exemplo.trim()) return
    setSaving(true)
    await createRecord('ana_anti_gold', form)
    setSaving(false)
    setShowForm(false)
    setForm({ etapa: 'geral', categoria: 'outro', titulo: '', exemplo: '', problema: '', alternativa: '' })
    onRefresh()
  }

  const remove = async (id: string) => {
    if (!confirm('Remover Anti-Gold?')) return
    await deleteRecord('ana_anti_gold', id)
    onRefresh()
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F0F0F5' }}>Anti-Gold ✕</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#555' }}>Padrões proibidos. A Ana nunca deve repetir estes comportamentos.</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700 }}>
          <Plus style={{ width: 14, height: 14 }} /> Novo Anti-Gold
        </button>
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#444' }}>
          <XCircle style={{ width: 36, height: 36, margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: 13 }}>Nenhum padrão proibido registrado ainda.</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {items.map(item => (
          <div key={item.id} style={{ background: '#111113', border: '1px solid #ef444430', borderLeft: '3px solid #ef4444', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#F0F0F5' }}>{item.titulo}</span>
                  <span style={{ fontSize: 10, background: '#ef444420', color: '#ef4444', border: '1px solid #ef444430', borderRadius: 5, padding: '1px 6px' }}>{item.categoria}</span>
                  <span style={{ fontSize: 10, background: '#1C1C1E', color: '#555', borderRadius: 5, padding: '1px 6px' }}>{ETAPA_LABELS[item.etapa] || item.etapa}</span>
                </div>
                <div style={{ fontSize: 10, color: '#444' }}>{fmtDate(item.created_at)}</div>
              </div>
              <button onClick={() => remove(item.id)} style={{ padding: '5px 8px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 6, cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}>
                <Trash2 style={{ width: 12, height: 12 }} />
              </button>
            </div>
            <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#fca5a5', fontStyle: 'italic', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>"{item.exemplo}"</p>
            </div>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: '#A1A1AA', lineHeight: 1.5 }}>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>✕ Problema: </span>{item.problema}
            </p>
            {item.alternativa && (
              <p style={{ margin: 0, fontSize: 12, color: '#A1A1AA', lineHeight: 1.5 }}>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>→ Alternativa: </span>{item.alternativa}
              </p>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <Modal title="Novo Anti-Gold" onClose={() => setShowForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Etapa">
              <select style={selectStyle} value={form.etapa} onChange={e => setForm(f => ({ ...f, etapa: e.target.value }))}>
                {ETAPAS.map(e => <option key={e} value={e}>{ETAPA_LABELS[e]}</option>)}
              </select>
            </Field>
            <Field label="Categoria">
              <select style={selectStyle} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {GOLD_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Título *">
            <input style={inputStyle} value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Filler 'certo, certo' repetido" />
          </Field>
          <Field label="Exemplo proibido *">
            <textarea style={textareaStyle} value={form.exemplo} onChange={e => setForm(f => ({ ...f, exemplo: e.target.value }))} placeholder="Cole aqui a fala que NÃO deve ser replicada..." />
          </Field>
          <Field label="Qual é o problema?">
            <textarea style={{ ...textareaStyle, minHeight: 60 }} value={form.problema} onChange={e => setForm(f => ({ ...f, problema: e.target.value }))} placeholder="Por que é ruim?" />
          </Field>
          <Field label="Alternativa sugerida">
            <textarea style={{ ...textareaStyle, minHeight: 60 }} value={form.alternativa} onChange={e => setForm(f => ({ ...f, alternativa: e.target.value }))} placeholder="Como deveria ser?" />
          </Field>
          <button onClick={save} disabled={saving || !form.titulo.trim() || !form.exemplo.trim()} style={{ width: '100%', padding: '10px', background: saving ? '#444' : '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700 }}>
            {saving ? 'Salvando...' : 'Salvar Anti-Gold'}
          </button>
        </Modal>
      )}
    </div>
  )
}

// ─── MATRIZ TAB ───────────────────────────────────────────────────────────────

function MatrizTab({ items, onRefresh }: { items: MatrizItem[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<{ habilidade: string; descricao: string; nivel: MatrizItem['nivel']; evidencias: string; proximos_passos: string }>({
    habilidade: '', descricao: '', nivel: 'nao_definido', evidencias: '', proximos_passos: '',
  })

  const save = async () => {
    if (!form.habilidade.trim()) return
    setSaving(true)
    await createRecord('ana_matriz', form)
    setSaving(false)
    setShowForm(false)
    setForm({ habilidade: '', descricao: '', nivel: 'nao_definido', evidencias: '', proximos_passos: '' })
    onRefresh()
  }

  const updateNivel = async (id: string, nivel: MatrizItem['nivel']) => {
    await patchRecord('ana_matriz', id, { nivel })
    onRefresh()
  }

  const remove = async (id: string) => {
    if (!confirm('Remover habilidade?')) return
    await deleteRecord('ana_matriz', id)
    onRefresh()
  }

  const nivelOrder: MatrizItem['nivel'][] = ['nao_definido', 'raso', 'adequado', 'ouro']
  const nivelColors: Record<MatrizItem['nivel'], string> = {
    nao_definido: '#555',
    raso: '#ef4444',
    adequado: '#f59e0b',
    ouro: '#f59e0b',
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F0F0F5' }}>Matriz de Habilidades</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#555' }}>Mapa de capacidades da Ana. Atualize conforme as simulações evoluem.</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#3B82F6', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700 }}>
          <Plus style={{ width: 14, height: 14 }} /> Nova habilidade
        </button>
      </div>

      {/* Summary row */}
      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {nivelOrder.map(n => {
            const count = items.filter(i => i.nivel === n).length
            const pct = Math.round(count / items.length * 100)
            const color = nivelColors[n]
            return (
              <div key={n} style={{ background: '#111113', border: `1px solid ${color}30`, borderRadius: 10, padding: '10px 16px', flex: 1, minWidth: 100 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color }}>{count}</div>
                <div style={{ fontSize: 11, color: '#555' }}><NivelBadge nivel={n} /></div>
                <div style={{ fontSize: 10, color: '#444', marginTop: 4 }}>{pct}%</div>
              </div>
            )
          })}
        </div>
      )}

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#444' }}>
          <Grid3X3 style={{ width: 36, height: 36, margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: 13 }}>Nenhuma habilidade mapeada ainda.</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {items.map(item => (
          <div key={item.id} style={{ background: '#111113', border: '1px solid #1C1C1E', borderLeft: `3px solid ${nivelColors[item.nivel]}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#F0F0F5' }}>{item.habilidade}</span>
                  <NivelBadge nivel={item.nivel} />
                </div>
                {item.descricao && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#A1A1AA', lineHeight: 1.5 }}>{item.descricao}</p>}
                {item.evidencias && <p style={{ margin: 0, fontSize: 11, color: '#555' }}><span style={{ color: '#3B82F6' }}>Evidências: </span>{item.evidencias}</p>}
                {item.proximos_passos && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#555' }}><span style={{ color: '#7B3FE4' }}>Próximos passos: </span>{item.proximos_passos}</p>}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {nivelOrder.map(n => (
                  <button
                    key={n}
                    onClick={() => updateNivel(item.id, n)}
                    title={n}
                    style={{
                      width: 24, height: 24, borderRadius: 6, border: `1px solid ${nivelColors[n]}${item.nivel === n ? 'ff' : '40'}`,
                      background: item.nivel === n ? nivelColors[n] + '30' : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.nivel === n ? nivelColors[n] : nivelColors[n] + '60' }} />
                  </button>
                ))}
                <button onClick={() => remove(item.id)} style={{ padding: '4px 6px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 6, cursor: 'pointer', color: '#ef4444', marginLeft: 4 }}>
                  <Trash2 style={{ width: 11, height: 11 }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <Modal title="Nova Habilidade" onClose={() => setShowForm(false)}>
          <Field label="Habilidade *">
            <input style={inputStyle} value={form.habilidade} onChange={e => setForm(f => ({ ...f, habilidade: e.target.value }))} placeholder="Ex: Conexão emocional no D.I." />
          </Field>
          <Field label="Descrição">
            <textarea style={textareaStyle} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="O que significa dominar esta habilidade?" />
          </Field>
          <Field label="Nível atual">
            <select style={selectStyle} value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value as MatrizItem['nivel'] }))}>
              <option value="nao_definido">Não definido</option>
              <option value="raso">Raso</option>
              <option value="adequado">Adequado</option>
              <option value="ouro">Ouro</option>
            </select>
          </Field>
          <Field label="Evidências observadas">
            <textarea style={{ ...textareaStyle, minHeight: 60 }} value={form.evidencias} onChange={e => setForm(f => ({ ...f, evidencias: e.target.value }))} placeholder="O que foi observado nas simulações?" />
          </Field>
          <Field label="Próximos passos">
            <textarea style={{ ...textareaStyle, minHeight: 60 }} value={form.proximos_passos} onChange={e => setForm(f => ({ ...f, proximos_passos: e.target.value }))} placeholder="O que precisa ser trabalhado?" />
          </Field>
          <button onClick={save} disabled={saving || !form.habilidade.trim()} style={{ width: '100%', padding: '10px', background: saving ? '#444' : '#3B82F6', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700 }}>
            {saving ? 'Salvando...' : 'Salvar habilidade'}
          </button>
        </Modal>
      )}
    </div>
  )
}

// ─── CHANGELOG TAB ────────────────────────────────────────────────────────────

function ChangelogTab({ entries, onRefresh }: { entries: ChangelogEntry[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<{ tipo: ChangelogEntry['tipo']; titulo: string; descricao: string; impacto: string; autor: string }>({
    tipo: 'decisao', titulo: '', descricao: '', impacto: '', autor: '',
  })

  const save = async () => {
    if (!form.titulo.trim()) return
    setSaving(true)
    await createRecord('ana_changelog', form)
    setSaving(false)
    setShowForm(false)
    setForm({ tipo: 'decisao', titulo: '', descricao: '', impacto: '', autor: '' })
    onRefresh()
  }

  const remove = async (id: string) => {
    if (!confirm('Remover entrada?')) return
    await deleteRecord('ana_changelog', id)
    onRefresh()
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F0F0F5' }}>Changelog de Decisões</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#555' }}>Registro imutável de decisões, aprendizados e diretrizes da Ana.</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#7B3FE4', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700 }}>
          <Plus style={{ width: 14, height: 14 }} /> Nova entrada
        </button>
      </div>

      {entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#444' }}>
          <Clock style={{ width: 36, height: 36, margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: 13 }}>Nenhuma entrada no changelog ainda. Registre decisões e aprendizados aqui.</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {entries.map(entry => (
          <div key={entry.id} style={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                  <TipoBadge tipo={entry.tipo} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#F0F0F5' }}>{entry.titulo}</span>
                </div>
                <div style={{ fontSize: 10, color: '#444' }}>{fmtDate(entry.created_at)}{entry.autor ? ` · por ${entry.autor}` : ''}</div>
              </div>
              <button onClick={() => remove(entry.id)} style={{ padding: '5px 8px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 6, cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}>
                <Trash2 style={{ width: 12, height: 12 }} />
              </button>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#A1A1AA', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.descricao}</p>
            {entry.impacto && (
              <p style={{ margin: 0, fontSize: 12, color: '#555' }}><span style={{ color: '#7B3FE4', fontWeight: 700 }}>Impacto: </span>{entry.impacto}</p>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <Modal title="Nova entrada no changelog" onClose={() => setShowForm(false)}>
          <Field label="Tipo">
            <select style={selectStyle} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as ChangelogEntry['tipo'] }))}>
              <option value="decisao">Decisão</option>
              <option value="aprendizado">Aprendizado</option>
              <option value="diretriz">Diretriz</option>
              <option value="restricao">Restrição</option>
            </select>
          </Field>
          <Field label="Título *">
            <input style={inputStyle} value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Ana não deve usar a palavra 'produto'" />
          </Field>
          <Field label="Descrição">
            <textarea style={textareaStyle} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhe a decisão ou aprendizado..." />
          </Field>
          <Field label="Impacto esperado">
            <input style={inputStyle} value={form.impacto} onChange={e => setForm(f => ({ ...f, impacto: e.target.value }))} placeholder="Ex: Melhora naturalidade do script" />
          </Field>
          <Field label="Autor">
            <input style={inputStyle} value={form.autor} onChange={e => setForm(f => ({ ...f, autor: e.target.value }))} placeholder="Quem tomou esta decisão?" />
          </Field>
          <button onClick={save} disabled={saving || !form.titulo.trim()} style={{ width: '100%', padding: '10px', background: saving ? '#444' : '#7B3FE4', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700 }}>
            {saving ? 'Salvando...' : 'Registrar entrada'}
          </button>
        </Modal>
      )}
    </div>
  )
}

// ─── SCORECARD TAB ────────────────────────────────────────────────────────────

function ScorecardTab({ entries, sims, onRefresh }: { entries: ScorecardEntry[]; sims: Simulacao[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ sim_id: '', etapa: 'geral', criterio: SCORECARD_CRITERIOS[0], score: 7, max_score: 10, nota: '' })

  const save = async () => {
    setSaving(true)
    await createRecord('ana_scorecard', { ...form, sim_id: form.sim_id || null })
    setSaving(false)
    setShowForm(false)
    setForm({ sim_id: '', etapa: 'geral', criterio: SCORECARD_CRITERIOS[0], score: 7, max_score: 10, nota: '' })
    onRefresh()
  }

  const remove = async (id: string) => {
    if (!confirm('Remover avaliação?')) return
    await deleteRecord('ana_scorecard', id)
    onRefresh()
  }

  // Group by criterio
  const byCriterio: Record<string, ScorecardEntry[]> = {}
  for (const e of entries) {
    if (!byCriterio[e.criterio]) byCriterio[e.criterio] = []
    byCriterio[e.criterio].push(e)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F0F0F5' }}>Scorecard</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#555' }}>Avaliações por critério através das simulações.</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#22c55e', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#000', fontSize: 12, fontWeight: 700 }}>
          <Plus style={{ width: 14, height: 14 }} /> Nova avaliação
        </button>
      </div>

      {/* Averages by criterio */}
      {Object.keys(byCriterio).length > 0 && (
        <div style={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 12, padding: 18, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Médias por critério</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(byCriterio).map(([crit, list]) => {
              const avg = list.reduce((s, e) => s + e.score / e.max_score, 0) / list.length
              const pct = Math.round(avg * 100)
              const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'
              return (
                <div key={crit} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#A1A1AA', width: 200, flexShrink: 0 }}>{crit}</span>
                  <div style={{ flex: 1, height: 6, background: '#1C1C1E', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color, width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                  <span style={{ fontSize: 10, color: '#444', width: 30, textAlign: 'right' }}>n={list.length}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#444' }}>
          <BarChart3 style={{ width: 36, height: 36, margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: 13 }}>Nenhuma avaliação ainda. Avalie critérios após cada simulação.</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {entries.map(entry => {
          const pct = Math.round(entry.score / entry.max_score * 100)
          const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'
          const sim = sims.find(s => s.id === entry.sim_id)
          return (
            <div key={entry.id} style={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#D4D4D8' }}>{entry.criterio}</div>
                <div style={{ fontSize: 10, color: '#555' }}>
                  {ETAPA_LABELS[entry.etapa] || entry.etapa}
                  {sim ? ` · ${sim.titulo}` : ''}
                  {entry.nota ? ` — ${entry.nota}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ScoreBadge score={entry.score} max={entry.max_score} />
                <button onClick={() => remove(entry.id)} style={{ padding: '4px 6px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 6, cursor: 'pointer', color: '#ef4444' }}>
                  <Trash2 style={{ width: 11, height: 11 }} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <Modal title="Nova avaliação" onClose={() => setShowForm(false)}>
          <Field label="Simulação (opcional)">
            <select style={selectStyle} value={form.sim_id} onChange={e => setForm(f => ({ ...f, sim_id: e.target.value }))}>
              <option value="">— sem vínculo —</option>
              {sims.map(s => <option key={s.id} value={s.id}>{s.titulo}</option>)}
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Etapa">
              <select style={selectStyle} value={form.etapa} onChange={e => setForm(f => ({ ...f, etapa: e.target.value }))}>
                {ETAPAS.map(e => <option key={e} value={e}>{ETAPA_LABELS[e]}</option>)}
              </select>
            </Field>
            <Field label="Critério">
              <select style={selectStyle} value={form.criterio} onChange={e => setForm(f => ({ ...f, criterio: e.target.value }))}>
                {SCORECARD_CRITERIOS.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="outro">Outro...</option>
              </select>
            </Field>
          </div>
          {form.criterio === 'outro' && (
            <Field label="Critério personalizado">
              <input style={inputStyle} placeholder="Ex: Timing de escuta" onChange={e => setForm(f => ({ ...f, criterio: e.target.value }))} />
            </Field>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Score">
              <input type="number" min={0} max={form.max_score} style={inputStyle} value={form.score} onChange={e => setForm(f => ({ ...f, score: Number(e.target.value) }))} />
            </Field>
            <Field label="Máximo">
              <input type="number" min={1} max={100} style={inputStyle} value={form.max_score} onChange={e => setForm(f => ({ ...f, max_score: Number(e.target.value) }))} />
            </Field>
          </div>
          <Field label="Nota (opcional)">
            <input style={inputStyle} value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} placeholder="Ex: Ana repetiu pergunta fechada duas vezes" />
          </Field>
          <button onClick={save} disabled={saving} style={{ width: '100%', padding: '10px', background: saving ? '#444' : '#22c55e', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#000', fontSize: 13, fontWeight: 700 }}>
            {saving ? 'Salvando...' : 'Salvar avaliação'}
          </button>
        </Modal>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'central', label: 'Central', icon: <Sparkles style={{ width: 13, height: 13 }} />, color: '#7B3FE4' },
  { id: 'simulacoes', label: 'Simulações', icon: <Brain style={{ width: 13, height: 13 }} />, color: '#7B3FE4' },
  { id: 'gold', label: 'Gold Standard', icon: <Star style={{ width: 13, height: 13 }} />, color: '#f59e0b' },
  { id: 'anti-gold', label: 'Anti-Gold', icon: <XCircle style={{ width: 13, height: 13 }} />, color: '#ef4444' },
  { id: 'matriz', label: 'Matriz', icon: <Grid3X3 style={{ width: 13, height: 13 }} />, color: '#3B82F6' },
  { id: 'scorecard', label: 'Scorecard', icon: <BarChart3 style={{ width: 13, height: 13 }} />, color: '#22c55e' },
  { id: 'changelog', label: 'Changelog', icon: <Clock style={{ width: 13, height: 13 }} />, color: '#A1A1AA' },
]

export default function AnaMasterPage() {
  const [tab, setTab] = useState<Tab>('central')
  const [sims, setSims] = useState<Simulacao[]>([])
  const [gold, setGold] = useState<GoldItem[]>([])
  const [antiGold, setAntiGold] = useState<AntiGoldItem[]>([])
  const [scorecard, setScorecard] = useState<ScorecardEntry[]>([])
  const [matriz, setMatriz] = useState<MatrizItem[]>([])
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [s, g, ag, sc, m, cl] = await Promise.all([
      fetchTable<Simulacao>('ana_simulacoes'),
      fetchTable<GoldItem>('ana_gold'),
      fetchTable<AntiGoldItem>('ana_anti_gold'),
      fetchTable<ScorecardEntry>('ana_scorecard'),
      fetchTable<MatrizItem>('ana_matriz'),
      fetchTable<ChangelogEntry>('ana_changelog'),
    ])
    setSims(s)
    setGold(g)
    setAntiGold(ag)
    setScorecard(sc)
    setMatriz(m)
    setChangelog(cl)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Ana DNA Nuclear — Painel de Simulação" />

        {/* Header */}
        <div style={{ background: '#0A0A0B', borderBottom: '1px solid #1A1A1C', padding: '0 20px', display: 'flex', alignItems: 'stretch', gap: 0, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'transparent',
                  color: tab === t.id ? t.color : '#555',
                  borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
                  transition: 'color 0.15s',
                }}
              >
                <span style={{ color: tab === t.id ? t.color : '#444' }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={refresh}
            title="Atualizar"
            style={{ padding: '0 14px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#444', flexShrink: 0 }}
          >
            <RefreshCw style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <div className="w-6 h-6 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {tab === 'central' && <CentralTab sims={sims} gold={gold} antiGold={antiGold} scorecard={scorecard} matriz={matriz} changelog={changelog} />}
              {tab === 'simulacoes' && <SimulacoesTab sims={sims} onRefresh={refresh} />}
              {tab === 'gold' && <GoldTab items={gold} onRefresh={refresh} />}
              {tab === 'anti-gold' && <AntiGoldTab items={antiGold} onRefresh={refresh} />}
              {tab === 'scorecard' && <ScorecardTab entries={scorecard} sims={sims} onRefresh={refresh} />}
              {tab === 'matriz' && <MatrizTab items={matriz} onRefresh={refresh} />}
              {tab === 'changelog' && <ChangelogTab entries={changelog} onRefresh={refresh} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
