'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { SimuladorContent } from './simulador/SimuladorContent'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Brain, Star, XCircle, BarChart3, Grid3X3, Clock,
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle,
  Sparkles, Copy, Check, RefreshCw, Award, Zap,
  BookOpen, Target, TrendingUp, AlertTriangle, Filter,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Simulacao {
  id: string; created_at: string; updated_at?: string
  titulo: string; descricao?: string; etapa: string; transcript?: string; observacoes?: string
  score_geral: number; score_conexao: number; score_objecao: number; score_fechamento: number
  aprovada: boolean
  // Extended fields (Phase 2 migration)
  simulation_type?: string
  consultant?: string
  lead_name?: string
  lead_origin?: string
  referrer_name?: string
  dna_version?: string
  gold_reference?: boolean
  immutable_reference?: boolean
  reference_simulation_id?: string
}
interface SimTurn {
  id: string; simulation_id: string; turn_number: number
  stage?: string; speaker: string; content: string
  text_source?: string; behavioral_intent?: string
  gold_moment?: boolean; gold_marker?: string
  creates_memory?: string; consumes_memory?: string
  gate_passed?: string; created_at: string
}
interface SimMemory {
  id: string; simulation_id: string; memory_key: string
  fact_captured: string; origin_stage?: string
  reused_stage?: string; commercial_function?: string
  created_at: string
}
interface GoldItem {
  id: string; created_at: string; updated_at?: string
  etapa: string; categoria: string; titulo: string; exemplo: string; motivo: string; sim_id?: string
}
interface AntiGoldItem {
  id: string; created_at: string; updated_at?: string
  etapa: string; categoria: string; titulo: string; exemplo: string; problema: string; alternativa?: string; sim_id?: string
}
interface ScorecardEntry {
  id: string; created_at: string; updated_at?: string
  sim_id?: string; etapa: string; criterio: string; score: number; max_score: number; nota?: string
}
interface MatrizItem {
  id: string; created_at: string; updated_at?: string
  habilidade: string; descricao: string; nivel: 'nao_definido' | 'raso' | 'adequado' | 'ouro'
  evidencias?: string; proximos_passos?: string
}
interface ChangelogEntry {
  id: string; created_at: string; updated_at?: string
  tipo: 'decisao' | 'aprendizado' | 'diretriz' | 'restricao'
  titulo: string; descricao: string; impacto?: string; autor?: string
}

// ANA MASTER live types
interface AnaCall {
  id: string; call_sid: string; telefone: string; stage: string; status: string
  gates_passed: string[]; memories: Record<string, unknown>; created_at: string; updated_at: string
}

type Tab = 'central' | 'dna' | 'recovery' | 'simulacoes' | 'gold' | 'anti-gold' | 'scorecard' | 'matriz' | 'changelog' | 'disparar' | 'ligacoes' | 'monitor' | 'script' | 'config' | 'voz' | 'simulador' | 'sessoes'

// ─── Constants ────────────────────────────────────────────────────────────────

const ETAPAS = ['apresentacao', 'conexao', 'di', 'speech', 'fechamento', 'referidos', 'validacao', 'geral']
const ETAPA_LABELS: Record<string, string> = {
  apresentacao: 'Apresentação', conexao: 'Conexão', di: 'D.I.', speech: 'Speech',
  fechamento: 'Fechamento', referidos: 'Referidos', validacao: 'Validação', geral: 'Geral',
}
const GOLD_CATS = ['abertura', 'conexao', 'di', 'speech', 'objecao', 'fechamento', 'referidos', 'transicao', 'escuta', 'outro']
const SCORECARD_CRITERIOS = [
  'Abertura natural', 'Nome cedo', 'Conexão pessoal', 'D.I. completa',
  'Speech fluido', 'Objeção tratada', 'Fechamento direto', 'Sem filler',
  'Tom adequado', 'Lógica sequencial',
]

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchTable<T>(table: string): Promise<T[]> {
  const r = await fetch(`/api/admin/ana-master?table=${table}&limit=200`)
  return (await r.json()).data || []
}
async function createRecord(table: string, record: Record<string, unknown>) {
  return fetch('/api/admin/ana-master', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, record }),
  }).then(r => r.json())
}
async function patchRecord(table: string, id: string, updates: Record<string, unknown>) {
  return fetch('/api/admin/ana-master', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, id, updates }),
  }).then(r => r.json())
}
async function deleteRecord(table: string, id: string) {
  return fetch(`/api/admin/ana-master?table=${table}&id=${id}`, { method: 'DELETE' })
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg: '#09090B',
  surface: '#101012',
  surfaceHover: '#141418',
  border: '#1E1E24',
  borderHover: '#2A2A34',
  text: '#F4F4F5',
  textMuted: '#71717A',
  textFaint: '#3F3F46',
  purple: '#8B5CF6',
  purpleDim: '#8B5CF620',
  purpleBorder: '#8B5CF630',
  gold: '#F59E0B',
  goldDim: '#F59E0B18',
  goldBorder: '#F59E0B35',
  red: '#EF4444',
  redDim: '#EF444418',
  redBorder: '#EF444435',
  blue: '#3B82F6',
  blueDim: '#3B82F618',
  blueBorder: '#3B82F635',
  green: '#22C55E',
  greenDim: '#22C55E18',
  greenBorder: '#22C55E35',
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function scoreColor(score: number, max = 10) {
  const p = score / max
  return p >= 0.8 ? C.green : p >= 0.6 ? C.gold : C.red
}

function ScorePill({ score, max = 10 }: { score: number; max?: number }) {
  const c = scoreColor(score, max)
  return (
    <span style={{ fontSize: 12, fontWeight: 800, color: c, background: c + '22', border: `1px solid ${c}40`, borderRadius: 7, padding: '3px 9px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
      {score}<span style={{ opacity: 0.5, fontWeight: 500 }}>/{max}</span>
    </span>
  )
}

function Badge({ label, color, dim, border }: { label: string; color: string; dim: string; border: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, background: dim, border: `1px solid ${border}`, borderRadius: 6, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function EtapaBadge({ etapa }: { etapa: string }) {
  return <Badge label={ETAPA_LABELS[etapa] || etapa} color={C.textMuted} dim="#ffffff08" border={C.border} />
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
    new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, accent = C.purple, onClose, children }: {
  title: string; accent?: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `2px solid ${accent}`, borderRadius: 18, width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 32px 100px rgba(0,0,0,0.9)' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 20, lineHeight: 1, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>×</button>
        </div>
        <div style={{ padding: '20px 22px' }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
        {hint && <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10, color: C.textFaint }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: '9px 12px', fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }
const ta: React.CSSProperties = { ...inp, minHeight: 80, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }
const sel: React.CSSProperties = { ...inp, cursor: 'pointer' }

function Btn({ onClick, disabled, color = C.purple, textColor = '#fff', children, full }: {
  onClick?: () => void; disabled?: boolean; color?: string; textColor?: string; children: React.ReactNode; full?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ width: full ? '100%' : undefined, padding: '10px 18px', background: disabled ? '#2A2A2A' : color, border: 'none', borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? '#555' : textColor, fontSize: 13, fontWeight: 700, transition: 'opacity 0.15s', opacity: disabled ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
    >
      {children}
    </button>
  )
}

// ─── CENTRAL TAB ─────────────────────────────────────────────────────────────

function CentralTab({ sims, gold, antiGold, scorecard, matriz, changelog }: {
  sims: Simulacao[]; gold: GoldItem[]; antiGold: AntiGoldItem[]
  scorecard: ScorecardEntry[]; matriz: MatrizItem[]; changelog: ChangelogEntry[]
}) {
  const avgScore = sims.length > 0 ? sims.reduce((s, x) => s + x.score_geral, 0) / sims.length : 0
  const aprovadas = sims.filter(s => s.aprovada).length
  const ouros = matriz.filter(m => m.nivel === 'ouro').length

  const phase1 = [
    { label: '≥ 5 simulações rodadas', done: sims.length >= 5, val: `${sims.length}/5` },
    { label: '≥ 10 exemplos Gold', done: gold.length >= 10, val: `${gold.length}/10` },
    { label: '≥ 5 Anti-Gold mapeados', done: antiGold.length >= 5, val: `${antiGold.length}/5` },
    { label: '≥ 10 avaliações no Scorecard', done: scorecard.length >= 10, val: `${scorecard.length}/10` },
    { label: 'Matriz populada', done: matriz.length >= 5, val: `${matriz.length} hab.` },
    { label: 'Score médio ≥ 7.0', done: avgScore >= 7, val: avgScore > 0 ? avgScore.toFixed(1) : '—' },
  ]
  const pct = Math.round(phase1.filter(i => i.done).length / phase1.length * 100)

  // SVG ring
  const R = 54, SW = 8, circ = 2 * Math.PI * R
  const offset = circ - (pct / 100) * circ

  return (
    <div style={{ maxWidth: 1020, margin: '0 auto' }}>

      {/* Hero banner */}
      <div style={{ background: `linear-gradient(135deg, #1a0a3e 0%, #0f172a 50%, #0a1a2e 100%)`, border: `1px solid ${C.purpleBorder}`, borderRadius: 20, padding: '28px 32px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: '40%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 32 }}>
          {/* Ring */}
          <div style={{ flexShrink: 0, position: 'relative', width: 128, height: 128 }}>
            <svg width={128} height={128} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={64} cy={64} r={R} fill="none" stroke="#ffffff08" strokeWidth={SW} />
              <circle cx={64} cy={64} r={R} fill="none" stroke={pct >= 100 ? C.green : C.purple} strokeWidth={SW}
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 8px ${pct >= 100 ? C.green : C.purple})` }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: C.text, lineHeight: 1 }}>{pct}%</span>
              <span style={{ fontSize: 9, color: C.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Fase 1</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Brain style={{ width: 20, height: 20, color: C.purple }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.purple, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ana DNA Nuclear — Fase 1 ativa</span>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900, color: C.text, lineHeight: 1.2 }}>Simulação & Documentação</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: C.textMuted, lineHeight: 1.6, maxWidth: 480 }}>
              Design sem engenharia. Cada simulação aprovada constrói o DNA da Ana. Os padrões validados aqui se tornam o comportamento de produção da Fase 2.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { n: sims.length, label: 'Simulações', color: C.purple },
                { n: aprovadas, label: 'Aprovadas', color: C.green },
                { n: gold.length, label: 'Gold', color: C.gold },
                { n: antiGold.length, label: 'Anti-Gold', color: C.red },
                { n: ouros, label: 'Ouros na Matriz', color: C.gold },
              ].map(({ n, label, color }) => (
                <div key={label} style={{ background: '#ffffff08', border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 14px', textAlign: 'center', minWidth: 64 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{n}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Phase checklist + last sims */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Checklist */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Target style={{ width: 15, height: 15, color: C.purple }} />
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Checklist Fase 1</h3>
          </div>
          {phase1.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < phase1.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: item.done ? C.greenDim : '#ffffff06', border: `1.5px solid ${item.done ? C.green : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.done && <CheckCircle style={{ width: 13, height: 13, color: C.green }} />}
              </div>
              <span style={{ flex: 1, fontSize: 12, color: item.done ? C.textMuted : '#555' }}>{item.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: item.done ? C.green : C.textFaint, fontVariantNumeric: 'tabular-nums' }}>{item.val}</span>
            </div>
          ))}
        </div>

        {/* Last 5 sims */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Brain style={{ width: 15, height: 15, color: C.purple }} />
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Últimas simulações</h3>
          </div>
          {sims.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: '#333' }}>
              <Brain style={{ width: 28, height: 28, margin: '0 auto 8px', opacity: 0.2 }} />
              <p style={{ margin: 0, fontSize: 12 }}>Nenhuma simulação ainda</p>
            </div>
          ) : sims.slice(0, 5).map((sim, i) => (
            <div key={sim.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < Math.min(sims.length, 5) - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{sim.titulo}</div>
                <div style={{ fontSize: 10, color: C.textFaint }}>{ETAPA_LABELS[sim.etapa] || sim.etapa} · {fmtDate(sim.created_at)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <ScorePill score={sim.score_geral} />
                {sim.aprovada && <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}` }} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score breakdown + changelog */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Score breakdown */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <BarChart3 style={{ width: 15, height: 15, color: C.green }} />
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Score médio por dimensão</h3>
          </div>
          {sims.length === 0 ? (
            <p style={{ fontSize: 12, color: '#333', textAlign: 'center', padding: '16px 0' }}>—</p>
          ) : (
            ['score_geral', 'score_conexao', 'score_objecao', 'score_fechamento'].map(key => {
              const avg = sims.reduce((s, sim) => s + (sim as any)[key], 0) / sims.length
              const pct = Math.round(avg * 10)
              const label = key === 'score_geral' ? 'Geral' : key === 'score_conexao' ? 'Conexão' : key === 'score_objecao' ? 'Objeção' : 'Fechamento'
              const c = scoreColor(avg)
              return (
                <div key={key} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: C.textMuted }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: c, fontVariantNumeric: 'tabular-nums' }}>{avg.toFixed(1)}</span>
                  </div>
                  <div style={{ height: 5, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 99, transition: 'width 0.6s ease', boxShadow: `0 0 8px ${c}60` }} />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Changelog */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Clock style={{ width: 15, height: 15, color: C.textMuted }} />
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Changelog recente</h3>
          </div>
          {changelog.length === 0 ? (
            <p style={{ fontSize: 12, color: '#333', textAlign: 'center', padding: '16px 0' }}>Nenhuma entrada ainda</p>
          ) : changelog.slice(0, 5).map((entry, i) => (
            <div key={entry.id} style={{ padding: '8px 0', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
                <ChangelogBadge tipo={entry.tipo} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{entry.titulo}</span>
              </div>
              <span style={{ fontSize: 10, color: C.textFaint }}>{fmtDate(entry.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── SIMULAÇÕES — EXPANDED PANEL (6 abas) ────────────────────────────────────

type InnerTab = 'overview' | 'timeline' | 'vocal' | 'memoria' | 'gold' | 'comparar'

const VOCAL_MAP = [
  { momento: 'Abertura', energia: 'Alta, acolhedora', ritmo: 'Lento e pausado', tom: 'Caloroso', intencao: 'Criar familiaridade imediata' },
  { momento: 'Gancho / referido', energia: 'Moderada', ritmo: 'Natural, conversacional', tom: 'Empático', intencao: 'Transferir credibilidade da indicadora' },
  { momento: 'Conexão / DI', energia: 'Baixa-média', ritmo: 'Muito lento — espaço para a lead falar', tom: 'Curioso, aberto', intencao: 'Extrair contexto de vida sem questionário' },
  { momento: 'Combinado', energia: 'Moderada, firme', ritmo: 'Cadenciado', tom: 'Confiante, leve', intencao: 'Criar contrato de decisão sem pressão' },
  { momento: 'Speech — entrada', energia: 'Alta, entusiasmada', ritmo: 'Mais rápido', tom: 'Inspirador', intencao: 'Criar expectativa positiva' },
  { momento: 'Speech — técnico', energia: 'Moderada', ritmo: 'Deliberado, com pausas', tom: 'Educativo, claro', intencao: 'Construir compreensão e confiança' },
  { momento: 'Perguntas de fit', energia: 'Baixa, curiosa', ritmo: 'Muito lento — aguarda resposta', tom: 'Gentil', intencao: 'Confirmar relevância antes de fechar' },
  { momento: 'Fechamento direto', energia: 'Alta, assertiva', ritmo: 'Firme, sem hesitação', tom: 'Seguro', intencao: 'Pedir decisão com naturalidade' },
  { momento: 'Objeção — escuta', energia: 'Baixa, receptiva', ritmo: 'Muito lento', tom: 'Compreensivo', intencao: 'Não interromper — deixar a objeção completa' },
  { momento: 'Objeção — isolar', energia: 'Moderada', ritmo: 'Pausado, questionador', tom: 'Curioso, não defensivo', intencao: 'Identificar causa real antes de argumentar' },
  { momento: 'Referidos', energia: 'Média-alta, narrativa', ritmo: 'Fluido, storytelling', tom: 'Caloroso, recíproco', intencao: 'Criar sentido antes de pedir ação' },
  { momento: 'Boas-vindas / encerramento', energia: 'Alta, celebratória', ritmo: 'Leve, fluido', tom: 'Festivo, caloroso', intencao: 'Reforçar decisão e criar senso de pertencimento' },
]

function SimExpandedPanel({
  sim, gold, antiGold, scorecard,
}: {
  sim: Simulacao
  gold: GoldItem[]
  antiGold: AntiGoldItem[]
  scorecard: ScorecardEntry[]
}) {
  const [innerTab, setInnerTab] = useState<InnerTab>('overview')
  const [turns, setTurns] = useState<SimTurn[]>([])
  const [memories, setMemories] = useState<SimMemory[]>([])
  const [loadingTurns, setLoadingTurns] = useState(false)

  useEffect(() => {
    setLoadingTurns(true)
    Promise.all([
      fetch(`/api/admin/ana-master?table=ana_simulation_turns&simulation_id=${sim.id}&order_by=turn_number&order_asc=true&limit=100`).then(r => r.json()).then(j => j.data || []),
      fetch(`/api/admin/ana-master?table=ana_simulation_memories&simulation_id=${sim.id}&limit=100`).then(r => r.json()).then(j => j.data || []),
    ]).then(([t, m]) => {
      setTurns(t); setMemories(m); setLoadingTurns(false)
    }).catch(() => setLoadingTurns(false))
  }, [sim.id])

  const simGold = gold.filter(g => g.sim_id === sim.id)
  const simAntiGold = antiGold.filter(a => a.sim_id === sim.id)
  const simScorecard = scorecard.filter(s => s.sim_id === sim.id)

  const INNER_TABS: { id: InnerTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'vocal', label: 'Mapa Vocal' },
    { id: 'memoria', label: 'Memória' },
    { id: 'gold', label: 'Gold Moments' },
    { id: 'comparar', label: 'Comparar' },
  ]

  return (
    <div style={{ borderTop: `1px solid ${C.border}` }}>
      {/* Imutability banner */}
      {sim.immutable_reference && (
        <div style={{ margin: '14px 18px 0', background: '#1a0a3e', border: `1px solid ${C.purpleBorder}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.purple, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Referência Imutável</span>
            <p style={{ margin: 0, fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>Esta simulação é o Gold Standard fundacional. Edição e exclusão estão bloqueadas. Toda candidata ANA é comparada a ela.</p>
          </div>
        </div>
      )}

      {/* Inner tab bar */}
      <div style={{ padding: '12px 18px 0', display: 'flex', gap: 4, borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
        {INNER_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setInnerTab(t.id)}
            style={{ background: innerTab === t.id ? C.purpleDim : 'transparent', border: `1px solid ${innerTab === t.id ? C.purpleBorder : 'transparent'}`, borderBottom: `2px solid ${innerTab === t.id ? C.purple : 'transparent'}`, borderRadius: '8px 8px 0 0', padding: '7px 14px', fontSize: 12, fontWeight: innerTab === t.id ? 700 : 500, color: innerTab === t.id ? C.purple : C.textMuted, cursor: 'pointer', transition: 'all 0.15s', marginBottom: -1 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {innerTab === 'overview' && (
        <div style={{ padding: '18px 18px' }}>
          {/* 4 score bars */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: C.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Score por dimensão</p>
              {[
                { label: 'Geral', score: sim.score_geral },
                { label: 'Conexão', score: sim.score_conexao },
                { label: 'Objeção', score: sim.score_objecao },
                { label: 'Fechamento', score: sim.score_fechamento },
              ].map(({ label, score }) => {
                const c = scoreColor(score)
                return (
                  <div key={label} style={{ marginBottom: 9 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: C.textMuted }}>{label}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: c, fontVariantNumeric: 'tabular-nums' }}>{score}<span style={{ opacity: 0.4, fontWeight: 400 }}>/10</span></span>
                    </div>
                    <div style={{ height: 5, background: '#ffffff08', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(score / 10) * 100}%`, background: c, borderRadius: 3, boxShadow: `0 0 6px ${c}80`, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Identity metadata */}
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: C.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Identidade</p>
              {[
                { label: 'Tipo', value: sim.simulation_type || 'candidata' },
                { label: 'Consultor', value: sim.consultant || '—' },
                { label: 'Lead', value: sim.lead_name || '—' },
                { label: 'Origem', value: sim.lead_origin || '—' },
                { label: 'Referidor', value: sim.referrer_name || '—' },
                { label: 'DNA Version', value: sim.dna_version || 'v1' },
                { label: 'Data', value: fmtDate(sim.created_at) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>{label}</span>
                  <span style={{ fontSize: 11, color: C.text, fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scorecard 12 dimensões */}
          {simScorecard.length > 0 && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
              <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: C.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scorecard — {simScorecard.length} dimensões</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                {simScorecard.map(s => {
                  const c = scoreColor(s.score, s.max_score)
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: c + '08', border: `1px solid ${c}30`, borderRadius: 8, padding: '7px 10px' }}>
                      <span style={{ fontSize: 11, color: C.textMuted }}>{s.criterio}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: c, fontVariantNumeric: 'tabular-nums' }}>{s.score}/{s.max_score}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Descrição + observações */}
          {sim.descricao && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: C.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Descrição</p>
              <p style={{ margin: 0, fontSize: 13, color: C.textMuted, lineHeight: 1.7 }}>{sim.descricao}</p>
            </div>
          )}
          {sim.observacoes && (
            <div style={{ background: C.purpleDim, border: `1px solid ${C.purpleBorder}`, borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: C.purple, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Observações</p>
              <p style={{ margin: 0, fontSize: 13, color: C.textMuted, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{sim.observacoes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── TIMELINE ── */}
      {innerTab === 'timeline' && (
        <div style={{ padding: '18px 18px' }}>
          {/* RECONSTRUCTED warning */}
          <div style={{ background: '#1a1000', border: `1px solid ${C.goldBorder}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <p style={{ margin: 0, fontSize: 11, color: '#FDE68A', lineHeight: 1.5 }}>
              <strong>RECONSTRUCTED</strong> — Estes turnos representam o comportamento observado na simulação fundacional. Nenhuma fala literal foi gravada ou transcrita. A fonte é a intenção comportamental, não a frase exata.
            </p>
          </div>

          {loadingTurns ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: C.textFaint }}>
              <RefreshCw style={{ width: 20, height: 20, margin: '0 auto 8px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: 12 }}>Carregando turnos...</p>
            </div>
          ) : turns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: C.textFaint }}>
              <p style={{ margin: 0, fontSize: 12 }}>Nenhum turno mapeado. Execute /api/admin/ana-master/seed-extend para inserir os turnos fundacionais.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {turns.map((turn, idx) => {
                const isAna = turn.speaker === 'ANA'
                const speakerColor = isAna ? C.purple : C.gold
                const speakerBg = isAna ? C.purpleDim : C.goldDim
                const speakerBorder = isAna ? C.purpleBorder : C.goldBorder
                return (
                  <div key={turn.id} style={{ background: C.bg, border: `1px solid ${turn.gold_moment ? C.goldBorder : C.border}`, borderRadius: 12, padding: '14px 16px', position: 'relative' }}>
                    {turn.gold_moment && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.gold}, ${C.gold}50)`, borderRadius: '12px 12px 0 0' }} />
                    )}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: speakerBg, border: `1.5px solid ${speakerBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: speakerColor }}>{turn.speaker.slice(0, 2)}</span>
                        </div>
                        <span style={{ fontSize: 9, color: C.textFaint, fontWeight: 700 }}>#{idx + 1}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: speakerColor }}>{turn.speaker}</span>
                          {turn.stage && <EtapaBadge etapa={turn.stage} />}
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#F59E0B', background: '#F59E0B12', border: `1px solid #F59E0B30`, borderRadius: 5, padding: '1px 6px' }}>{turn.text_source || 'RECONSTRUCTED'}</span>
                          {turn.gold_moment && <span style={{ fontSize: 9, fontWeight: 700, color: C.gold }}>✦ GOLD</span>}
                        </div>
                        <p style={{ margin: '0 0 8px', fontSize: 13, color: C.text, lineHeight: 1.7, fontStyle: 'italic' }}>"{turn.content}"</p>
                        {turn.behavioral_intent && (
                          <p style={{ margin: 0, fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>
                            <span style={{ color: C.purple, fontWeight: 700 }}>Intenção: </span>{turn.behavioral_intent}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Chips: memory + gate */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {turn.creates_memory && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.green, background: C.greenDim, border: `1px solid ${C.greenBorder}`, borderRadius: 5, padding: '2px 7px' }}>✦ Cria: {turn.creates_memory}</span>
                      )}
                      {turn.consumes_memory && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.blue, background: C.blueDim, border: `1px solid ${C.blueBorder}`, borderRadius: 5, padding: '2px 7px' }}>✦ Usa: {turn.consumes_memory}</span>
                      )}
                      {turn.gate_passed && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, background: '#ffffff08', border: `1px solid ${C.border}`, borderRadius: 5, padding: '2px 7px' }}>⬡ {turn.gate_passed}</span>
                      )}
                      {turn.gold_marker && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.gold, background: C.goldDim, border: `1px solid ${C.goldBorder}`, borderRadius: 5, padding: '2px 7px' }}>{turn.gold_marker}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MAPA VOCAL ── */}
      {innerTab === 'vocal' && (
        <div style={{ padding: '18px 18px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
            12 momentos conversacionais mapeados com energia, ritmo, tom e intenção comportamental. Fonte: DNA Comercial v1 — Seção 9 Modulação Emocional.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#ffffff06' }}>
                  {['Momento', 'Energia', 'Ritmo', 'Tom', 'Intenção'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VOCAL_MAP.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: C.text, whiteSpace: 'nowrap' }}>{row.momento}</td>
                    <td style={{ padding: '10px 12px', color: C.textMuted }}>{row.energia}</td>
                    <td style={{ padding: '10px 12px', color: C.textMuted }}>{row.ritmo}</td>
                    <td style={{ padding: '10px 12px', color: C.textMuted }}>{row.tom}</td>
                    <td style={{ padding: '10px 12px', color: C.textMuted, fontSize: 11 }}>{row.intencao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MEMÓRIA ── */}
      {innerTab === 'memoria' && (
        <div style={{ padding: '18px 18px' }}>
          {loadingTurns ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: C.textFaint }}>
              <RefreshCw style={{ width: 20, height: 20, margin: '0 auto 8px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: 12 }}>Carregando memórias...</p>
            </div>
          ) : memories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: C.textFaint }}>
              <p style={{ margin: 0, fontSize: 12 }}>Nenhum mapa de memória. Execute /api/admin/ana-master/seed-extend para inserir as memórias fundacionais.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {memories.map(mem => (
                <div key={mem.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: C.green, background: C.greenDim, border: `1px solid ${C.greenBorder}`, borderRadius: 6, padding: '2px 8px', fontFamily: 'monospace' }}>{mem.memory_key}</span>
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: 13, color: C.text, lineHeight: 1.6 }}>{mem.fact_captured}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {mem.origin_stage && (
                      <div style={{ background: '#ffffff06', border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px 10px' }}>
                        <p style={{ margin: '0 0 2px', fontSize: 9, color: C.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Origem</p>
                        <p style={{ margin: 0, fontSize: 11, color: C.textMuted }}>{ETAPA_LABELS[mem.origin_stage] || mem.origin_stage}</p>
                      </div>
                    )}
                    {mem.reused_stage && (
                      <div style={{ background: C.blueDim, border: `1px solid ${C.blueBorder}`, borderRadius: 7, padding: '5px 10px' }}>
                        <p style={{ margin: '0 0 2px', fontSize: 9, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reutilizado</p>
                        <p style={{ margin: 0, fontSize: 11, color: C.textMuted }}>{ETAPA_LABELS[mem.reused_stage] || mem.reused_stage}</p>
                      </div>
                    )}
                    {mem.commercial_function && (
                      <div style={{ flex: 1, minWidth: 140, background: C.purpleDim, border: `1px solid ${C.purpleBorder}`, borderRadius: 7, padding: '5px 10px' }}>
                        <p style={{ margin: '0 0 2px', fontSize: 9, color: C.purple, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Função comercial</p>
                        <p style={{ margin: 0, fontSize: 11, color: C.textMuted }}>{mem.commercial_function}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── GOLD MOMENTS ── */}
      {innerTab === 'gold' && (
        <div style={{ padding: '18px 18px' }}>
          {simGold.length > 0 ? (
            <>
              <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>✦ Gold — {simGold.length} exemplos</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {simGold.map(g => (
                  <div key={g.id} style={{ background: C.goldDim, border: `1px solid ${C.goldBorder}`, borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: C.text }}>{g.titulo}</p>
                    <p style={{ margin: '0 0 8px', fontSize: 11, color: '#FDE68A', fontStyle: 'italic', lineHeight: 1.5 }}>"{g.exemplo.slice(0, 100)}{g.exemplo.length > 100 ? '…' : ''}"</p>
                    <p style={{ margin: 0, fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>{g.motivo}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, color: C.textFaint, marginBottom: 20 }}>Nenhum Gold vinculado a esta simulação.</p>
          )}

          {simAntiGold.length > 0 && (
            <>
              <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: C.red, textTransform: 'uppercase', letterSpacing: '0.08em' }}>✕ Anti-Gold — {simAntiGold.length} padrões</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {simAntiGold.map(a => (
                  <div key={a.id} style={{ background: C.redDim, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: C.text }}>{a.titulo}</p>
                    <p style={{ margin: '0 0 6px', fontSize: 11, color: '#FCA5A5', fontStyle: 'italic', lineHeight: 1.5 }}>"{a.exemplo.slice(0, 80)}{a.exemplo.length > 80 ? '…' : ''}"</p>
                    <p style={{ margin: 0, fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>{a.problema}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── COMPARAR ── */}
      {innerTab === 'comparar' && (
        <div style={{ padding: '18px 18px' }}>
          {sim.gold_reference ? (
            <div style={{ background: C.purpleDim, border: `1px solid ${C.purpleBorder}`, borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 12, color: C.purple, lineHeight: 1.6 }}>
                <strong>Esta é a simulação de referência.</strong> As candidatas ANA são comparadas a ela. Para comparar, abra uma simulação candidata e navegue até a aba Comparar.
              </p>
            </div>
          ) : (
            <div style={{ background: '#ffffff04', border: `1px dashed ${C.border}`, borderRadius: 10, padding: '16px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 12, color: C.textFaint }}>Comparação disponível quando esta simulação referenciar uma simulação Gold.</p>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            {[
              { label: '🏆 Fundador Gold', color: C.gold, border: C.goldBorder, bg: C.goldDim, items: ['Abertura por referido', 'Conexão aberta / DI', 'Combinado antes do speech', 'Speech adaptado ao perfil', 'Fechamento direto', 'Isolar objeção antes de oferecer', 'Referidos por reciprocidade', 'Validação completa antes de GANHO'] },
              { label: '🤖 ANA Candidata', color: C.purple, border: C.purpleBorder, bg: C.purpleDim, items: ['Abertura por referido', 'Conexão aberta / DI', 'Combinado antes do speech', 'Speech adaptado ao perfil', 'Fechamento direto', 'Isolar objeção antes de oferecer', 'Referidos por reciprocidade', 'Validação completa antes de GANHO'] },
            ].map(col => (
              <div key={col.label} style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 800, color: col.color }}>{col.label}</p>
                {col.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', borderBottom: i < col.items.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: col.color + '20', border: `1px solid ${col.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: col.color, fontWeight: 800, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 11, color: C.textFaint, textAlign: 'center' }}>Similaridade comportamental calculada automaticamente na Fase 2 quando candidatas forem rodadas.</p>
        </div>
      )}
    </div>
  )
}

// ─── SIMULAÇÕES TAB ────────────────────────────────────────────────────────────

function SimulacoesTab({ sims, gold, antiGold, scorecard, onRefresh }: {
  sims: Simulacao[]; gold: GoldItem[]; antiGold: AntiGoldItem[]; scorecard: ScorecardEntry[]; onRefresh: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    titulo: '', descricao: '', etapa: 'geral', transcript: '', observacoes: '',
    score_geral: 7, score_conexao: 7, score_objecao: 7, score_fechamento: 7, aprovada: false,
  })

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.titulo.trim()) return
    setSaving(true)
    await createRecord('ana_simulacoes', form)
    setSaving(false); setShowForm(false)
    setForm({ titulo: '', descricao: '', etapa: 'geral', transcript: '', observacoes: '', score_geral: 7, score_conexao: 7, score_objecao: 7, score_fechamento: 7, aprovada: false })
    onRefresh()
  }

  const toggleAprovada = async (sim: Simulacao) => {
    await patchRecord('ana_simulacoes', sim.id, { aprovada: !sim.aprovada })
    onRefresh()
  }

  const remove = async (id: string, immutable?: boolean) => {
    if (immutable) return
    if (!confirm('Remover simulação?')) return
    await deleteRecord('ana_simulacoes', id); onRefresh()
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <PageHeader title="Simulações" subtitle="Cole transcripts de simulações OpenAI. Avalie e aprove os que viram Gold." count={sims.length}>
        <Btn onClick={() => setShowForm(true)} color={C.purple}><Plus style={{ width: 14, height: 14 }} />Nova simulação</Btn>
      </PageHeader>

      {sims.length === 0 && <EmptyState icon={<Brain />} text="Nenhuma simulação ainda. Rode uma conversa com Ana no OpenAI Playground e cole o transcript aqui." />}

      <div style={{ display: 'grid', gap: 10 }}>
        {sims.map(sim => (
          <div key={sim.id} style={{ background: C.surface, border: `1px solid ${expanded === sim.id ? (sim.gold_reference ? C.goldBorder : C.purpleBorder) : C.border}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}>
            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Score ring mini */}
              <div style={{ width: 44, height: 44, borderRadius: '50%', border: `2.5px solid ${scoreColor(sim.score_geral)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: scoreColor(sim.score_geral) + '12' }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: scoreColor(sim.score_geral) }}>{sim.score_geral}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{sim.titulo}</span>
                  {sim.immutable_reference && <span style={{ fontSize: 10, color: C.gold, background: C.goldDim, border: `1px solid ${C.goldBorder}`, borderRadius: 5, padding: '1px 7px', fontWeight: 700 }}>🔒 REFERÊNCIA</span>}
                  {sim.gold_reference && !sim.immutable_reference && <Badge label="Gold" color={C.gold} dim={C.goldDim} border={C.goldBorder} />}
                  <EtapaBadge etapa={sim.etapa} />
                  {sim.aprovada && <Badge label="Aprovada" color={C.green} dim={C.greenDim} border={C.greenBorder} />}
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: 11, color: C.textFaint, flexWrap: 'wrap' }}>
                  {sim.consultant && <span>👤 {sim.consultant}</span>}
                  {sim.lead_name && <span>🧑 {sim.lead_name}</span>}
                  <span>Conexão <strong style={{ color: scoreColor(sim.score_conexao) }}>{sim.score_conexao}</strong></span>
                  <span>Objeção <strong style={{ color: scoreColor(sim.score_objecao) }}>{sim.score_objecao}</strong></span>
                  <span>Fechamento <strong style={{ color: scoreColor(sim.score_fechamento) }}>{sim.score_fechamento}</strong></span>
                  <span>{fmtDate(sim.created_at)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <ActionBtn icon={<CheckCircle style={{ width: 13, height: 13 }} />} onClick={() => toggleAprovada(sim)} active={sim.aprovada} activeColor={C.green} title={sim.aprovada ? 'Desaprovar' : 'Aprovar'} />
                <ActionBtn icon={expanded === sim.id ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />} onClick={() => setExpanded(expanded === sim.id ? null : sim.id)} title="Expandir" />
                <ActionBtn icon={<Trash2 style={{ width: 13, height: 13 }} />} onClick={() => remove(sim.id, sim.immutable_reference)} danger title={sim.immutable_reference ? 'Protegida — não pode ser removida' : 'Remover'} style={sim.immutable_reference ? { opacity: 0.25, cursor: 'not-allowed' } : undefined} />
              </div>
            </div>

            {expanded === sim.id && (
              <SimExpandedPanel sim={sim} gold={gold} antiGold={antiGold} scorecard={scorecard} />
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <Modal title="Nova simulação" accent={C.purple} onClose={() => setShowForm(false)}>
          <Field label="Título *"><input style={inp} value={form.titulo} onChange={F('titulo')} placeholder="Ex: Simulação 003 — objeção de preço" /></Field>
          <Field label="Etapa foco">
            <select style={sel} value={form.etapa} onChange={F('etapa')}>
              {ETAPAS.map(e => <option key={e} value={e}>{ETAPA_LABELS[e]}</option>)}
            </select>
          </Field>
          <Field label="Descrição"><textarea style={ta} value={form.descricao} onChange={F('descricao')} placeholder="Contexto da simulação..." /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {(['score_geral', 'score_conexao', 'score_objecao', 'score_fechamento'] as const).map(k => (
              <Field key={k} label={k.replace('score_', '').replace('_', ' ')} hint="0–10">
                <input type="number" min={0} max={10} step={0.5} style={inp} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: Number(e.target.value) }))} />
              </Field>
            ))}
          </div>
          <Field label="Observações"><textarea style={ta} value={form.observacoes} onChange={F('observacoes')} placeholder="O que funcionou? O que falhou?" /></Field>
          <Field label="Transcript" hint="cole aqui">
            <textarea style={{ ...ta, minHeight: 140, fontFamily: 'monospace', fontSize: 11 }} value={form.transcript} onChange={F('transcript')} placeholder="Transcrição completa da simulação..." />
          </Field>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <input type="checkbox" id="ap" checked={form.aprovada} onChange={e => setForm(f => ({ ...f, aprovada: e.target.checked }))} style={{ accentColor: C.green }} />
            <label htmlFor="ap" style={{ fontSize: 13, color: C.textMuted, cursor: 'pointer' }}>Marcar como aprovada</label>
          </div>
          <Btn onClick={save} disabled={saving || !form.titulo.trim()} full>{saving ? 'Salvando...' : 'Salvar simulação'}</Btn>
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
    setSaving(false); setShowForm(false)
    setForm({ etapa: 'geral', categoria: 'abertura', titulo: '', exemplo: '', motivo: '' })
    onRefresh()
  }

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id); setTimeout(() => setCopiedId(null), 1500)
  }

  const filtered = items.filter(i =>
    (filterEtapa === 'todos' || i.etapa === filterEtapa) &&
    (filterCat === 'todos' || i.categoria === filterCat)
  )

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <PageHeader title="Gold Standard ✦" subtitle="Exemplos aprovados — o patamar que a Ana deve alcançar." count={filtered.length}>
        <Btn onClick={() => setShowForm(true)} color={C.gold} textColor="#000"><Plus style={{ width: 14, height: 14 }} />Novo exemplo</Btn>
      </PageHeader>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter style={{ width: 13, height: 13, color: C.textFaint }} />
        {[
          { label: 'Todas etapas', value: 'todos', options: ETAPAS.map(e => ({ v: e, l: ETAPA_LABELS[e] })), state: filterEtapa, set: setFilterEtapa },
          { label: 'Todas categorias', value: 'todos', options: GOLD_CATS.map(c => ({ v: c, l: c })), state: filterCat, set: setFilterCat },
        ].map(({ label, value, options, state, set }, i) => (
          <select key={i} style={{ ...sel, width: 'auto', fontSize: 12, padding: '6px 10px' }} value={state} onChange={e => set(e.target.value)}>
            <option value={value}>{label}</option>
            {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ))}
        <span style={{ fontSize: 12, color: C.textFaint }}>{filtered.length} exemplo{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 && <EmptyState icon={<Star />} text="Nenhum exemplo Gold ainda. Adicione falas aprovadas para construir o padrão da Ana." />}

      <div style={{ display: 'grid', gap: 12 }}>
        {filtered.map(item => (
          <div key={item.id} style={{ background: C.surface, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.gold}, ${C.gold}80)` }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', marginBottom: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.titulo}</span>
                  <Badge label={item.categoria} color={C.gold} dim={C.goldDim} border={C.goldBorder} />
                  <EtapaBadge etapa={item.etapa} />
                </div>
                <span style={{ fontSize: 10, color: C.textFaint }}>{fmtDate(item.created_at)}</span>
              </div>
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                <ActionBtn icon={copiedId === item.id ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />} onClick={() => copy(item.id, item.exemplo)} active={copiedId === item.id} activeColor={C.green} title="Copiar" />
                <ActionBtn icon={<Trash2 style={{ width: 12, height: 12 }} />} onClick={async () => { if (confirm('Remover?')) { await deleteRecord('ana_gold', item.id); onRefresh() } }} danger title="Remover" />
              </div>
            </div>
            <div style={{ background: `linear-gradient(135deg, ${C.goldDim}, transparent)`, border: `1px solid ${C.goldBorder}`, borderRadius: 10, padding: '12px 16px', marginBottom: 10 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#FDE68A', fontStyle: 'italic', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>"{item.exemplo}"</p>
            </div>
            {item.motivo && (
              <p style={{ margin: 0, fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>
                <span style={{ color: C.gold, fontWeight: 700 }}>✦ Por que é ouro: </span>{item.motivo}
              </p>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <Modal title="Novo exemplo Gold Standard" accent={C.gold} onClose={() => setShowForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Etapa">
              <select style={sel} value={form.etapa} onChange={e => setForm(f => ({ ...f, etapa: e.target.value }))}>
                {ETAPAS.map(e => <option key={e} value={e}>{ETAPA_LABELS[e]}</option>)}
              </select>
            </Field>
            <Field label="Categoria">
              <select style={sel} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {GOLD_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Título *"><input style={inp} value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Abertura com nome cedo e pergunta aberta" /></Field>
          <Field label="Fala da Ana *" hint="exatamente como deve ser dito">
            <textarea style={ta} value={form.exemplo} onChange={e => setForm(f => ({ ...f, exemplo: e.target.value }))} placeholder="Cole aqui a fala exata que é considerada Gold..." />
          </Field>
          <Field label="Por que é Gold?">
            <textarea style={{ ...ta, minHeight: 60 }} value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} placeholder="O que torna esta fala exemplar?" />
          </Field>
          <Btn onClick={save} disabled={saving || !form.titulo.trim() || !form.exemplo.trim()} color={C.gold} textColor="#000" full>{saving ? 'Salvando...' : 'Salvar Gold'}</Btn>
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
    setSaving(false); setShowForm(false)
    setForm({ etapa: 'geral', categoria: 'outro', titulo: '', exemplo: '', problema: '', alternativa: '' })
    onRefresh()
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <PageHeader title="Anti-Gold ✕" subtitle="Padrões proibidos. A Ana não replica estes comportamentos em nenhuma circunstância." count={items.length}>
        <Btn onClick={() => setShowForm(true)} color={C.red}><Plus style={{ width: 14, height: 14 }} />Novo Anti-Gold</Btn>
      </PageHeader>

      {items.length === 0 && <EmptyState icon={<XCircle />} text="Nenhum padrão proibido registrado ainda." />}

      <div style={{ display: 'grid', gap: 12 }}>
        {items.map(item => (
          <div key={item.id} style={{ background: C.surface, border: `1px solid ${C.redBorder}`, borderRadius: 14, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.red}, ${C.red}60)` }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', marginBottom: 5 }}>
                  <AlertTriangle style={{ width: 14, height: 14, color: C.red }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.titulo}</span>
                  <Badge label={item.categoria} color={C.red} dim={C.redDim} border={C.redBorder} />
                  <EtapaBadge etapa={item.etapa} />
                </div>
                <span style={{ fontSize: 10, color: C.textFaint }}>{fmtDate(item.created_at)}</span>
              </div>
              <ActionBtn icon={<Trash2 style={{ width: 12, height: 12 }} />} onClick={async () => { if (confirm('Remover?')) { await deleteRecord('ana_anti_gold', item.id); onRefresh() } }} danger title="Remover" />
            </div>
            <div style={{ background: C.redDim, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: '12px 16px', marginBottom: 10 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#FCA5A5', fontStyle: 'italic', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>"{item.exemplo}"</p>
            </div>
            {item.problema && (
              <p style={{ margin: '0 0 6px', fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>
                <span style={{ color: C.red, fontWeight: 700 }}>✕ Problema: </span>{item.problema}
              </p>
            )}
            {item.alternativa && (
              <p style={{ margin: 0, fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>
                <span style={{ color: C.green, fontWeight: 700 }}>→ Alternativa: </span>{item.alternativa}
              </p>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <Modal title="Novo Anti-Gold" accent={C.red} onClose={() => setShowForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Etapa">
              <select style={sel} value={form.etapa} onChange={e => setForm(f => ({ ...f, etapa: e.target.value }))}>
                {ETAPAS.map(e => <option key={e} value={e}>{ETAPA_LABELS[e]}</option>)}
              </select>
            </Field>
            <Field label="Categoria">
              <select style={sel} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {GOLD_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Título *"><input style={inp} value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Filler 'certo, certo' repetido" /></Field>
          <Field label="Exemplo proibido *" hint="fala exata">
            <textarea style={ta} value={form.exemplo} onChange={e => setForm(f => ({ ...f, exemplo: e.target.value }))} placeholder="Cole aqui a fala que NÃO deve acontecer..." />
          </Field>
          <Field label="Qual é o problema?">
            <textarea style={{ ...ta, minHeight: 60 }} value={form.problema} onChange={e => setForm(f => ({ ...f, problema: e.target.value }))} placeholder="Por que é ruim?" />
          </Field>
          <Field label="Alternativa sugerida">
            <textarea style={{ ...ta, minHeight: 60 }} value={form.alternativa} onChange={e => setForm(f => ({ ...f, alternativa: e.target.value }))} placeholder="Como deveria ser?" />
          </Field>
          <Btn onClick={save} disabled={saving || !form.titulo.trim() || !form.exemplo.trim()} color={C.red} full>{saving ? 'Salvando...' : 'Salvar Anti-Gold'}</Btn>
        </Modal>
      )}
    </div>
  )
}

// ─── SCORECARD TAB ────────────────────────────────────────────────────────────

function ScorecardTab({ entries, sims, onRefresh }: { entries: ScorecardEntry[]; sims: Simulacao[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ sim_id: '', etapa: 'geral', criterio: SCORECARD_CRITERIOS[0], score: 7, max_score: 10, nota: '', customCriterio: '' })

  const save = async () => {
    setSaving(true)
    const criterio = form.criterio === 'outro' ? form.customCriterio : form.criterio
    await createRecord('ana_scorecard', { sim_id: form.sim_id || null, etapa: form.etapa, criterio, score: form.score, max_score: form.max_score, nota: form.nota })
    setSaving(false); setShowForm(false)
    setForm({ sim_id: '', etapa: 'geral', criterio: SCORECARD_CRITERIOS[0], score: 7, max_score: 10, nota: '', customCriterio: '' })
    onRefresh()
  }

  const byCriterio: Record<string, ScorecardEntry[]> = {}
  for (const e of entries) {
    if (!byCriterio[e.criterio]) byCriterio[e.criterio] = []
    byCriterio[e.criterio].push(e)
  }
  const sorted = Object.entries(byCriterio).sort((a, b) => {
    const avgA = a[1].reduce((s, e) => s + e.score / e.max_score, 0) / a[1].length
    const avgB = b[1].reduce((s, e) => s + e.score / e.max_score, 0) / b[1].length
    return avgA - avgB
  })

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <PageHeader title="Scorecard" subtitle="Avaliação por critério através das simulações." count={entries.length}>
        <Btn onClick={() => setShowForm(true)} color={C.green} textColor="#000"><Plus style={{ width: 14, height: 14 }} />Nova avaliação</Btn>
      </PageHeader>

      {/* Averages */}
      {sorted.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <TrendingUp style={{ width: 14, height: 14, color: C.green }} />
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Médias por critério</h3>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {sorted.map(([crit, list]) => {
              const avg = list.reduce((s, e) => s + e.score / e.max_score, 0) / list.length
              const pct = Math.round(avg * 100)
              const c = pct >= 80 ? C.green : pct >= 60 ? C.gold : C.red
              return (
                <div key={crit} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 44px 24px', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{crit}</span>
                  <div style={{ height: 6, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 99, boxShadow: `0 0 6px ${c}60` }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: c, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                  <span style={{ fontSize: 10, color: C.textFaint, textAlign: 'right' }}>n={list.length}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {entries.length === 0 && <EmptyState icon={<BarChart3 />} text="Nenhuma avaliação ainda. Avalie critérios após cada simulação." />}

      <div style={{ display: 'grid', gap: 6 }}>
        {entries.map(entry => {
          const pct = Math.round(entry.score / entry.max_score * 100)
          const c = pct >= 80 ? C.green : pct >= 60 ? C.gold : C.red
          const sim = sims.find(s => s.id === entry.sim_id)
          return (
            <div key={entry.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 4, height: 32, borderRadius: 99, background: c, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{entry.criterio}</div>
                <div style={{ fontSize: 10, color: C.textFaint }}>{ETAPA_LABELS[entry.etapa] || entry.etapa}{sim ? ` · ${sim.titulo}` : ''}{entry.nota ? ` — ${entry.nota}` : ''}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ScorePill score={entry.score} max={entry.max_score} />
                <ActionBtn icon={<Trash2 style={{ width: 11, height: 11 }} />} onClick={async () => { if (confirm('Remover?')) { await deleteRecord('ana_scorecard', entry.id); onRefresh() } }} danger title="Remover" />
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <Modal title="Nova avaliação" accent={C.green} onClose={() => setShowForm(false)}>
          <Field label="Simulação (opcional)">
            <select style={sel} value={form.sim_id} onChange={e => setForm(f => ({ ...f, sim_id: e.target.value }))}>
              <option value="">— sem vínculo —</option>
              {sims.map(s => <option key={s.id} value={s.id}>{s.titulo}</option>)}
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Etapa">
              <select style={sel} value={form.etapa} onChange={e => setForm(f => ({ ...f, etapa: e.target.value }))}>
                {ETAPAS.map(e => <option key={e} value={e}>{ETAPA_LABELS[e]}</option>)}
              </select>
            </Field>
            <Field label="Critério">
              <select style={sel} value={form.criterio} onChange={e => setForm(f => ({ ...f, criterio: e.target.value }))}>
                {SCORECARD_CRITERIOS.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="outro">Outro...</option>
              </select>
            </Field>
          </div>
          {form.criterio === 'outro' && (
            <Field label="Critério personalizado">
              <input style={inp} value={form.customCriterio} onChange={e => setForm(f => ({ ...f, customCriterio: e.target.value }))} placeholder="Ex: Timing de pausa" />
            </Field>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Score"><input type="number" min={0} max={form.max_score} step={0.5} style={inp} value={form.score} onChange={e => setForm(f => ({ ...f, score: Number(e.target.value) }))} /></Field>
            <Field label="Máximo"><input type="number" min={1} max={100} style={inp} value={form.max_score} onChange={e => setForm(f => ({ ...f, max_score: Number(e.target.value) }))} /></Field>
          </div>
          <Field label="Nota">
            <input style={inp} value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} placeholder="Ex: Ana repetiu pergunta fechada 2×" />
          </Field>
          <Btn onClick={save} disabled={saving} color={C.green} textColor="#000" full>{saving ? 'Salvando...' : 'Salvar avaliação'}</Btn>
        </Modal>
      )}
    </div>
  )
}

// ─── MATRIZ TAB ───────────────────────────────────────────────────────────────

const NIVEL_META: Record<MatrizItem['nivel'], { label: string; color: string; dim: string; border: string }> = {
  nao_definido: { label: 'Não definido', color: C.textFaint, dim: '#ffffff05', border: C.border },
  raso: { label: 'Raso', color: C.red, dim: C.redDim, border: C.redBorder },
  adequado: { label: 'Adequado', color: C.gold, dim: C.goldDim, border: C.goldBorder },
  ouro: { label: 'Ouro ✦', color: C.gold, dim: '#F59E0B28', border: '#F59E0B50' },
}
const NIVELS: MatrizItem['nivel'][] = ['nao_definido', 'raso', 'adequado', 'ouro']

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
    setSaving(false); setShowForm(false)
    setForm({ habilidade: '', descricao: '', nivel: 'nao_definido', evidencias: '', proximos_passos: '' })
    onRefresh()
  }

  const updateNivel = async (id: string, nivel: MatrizItem['nivel']) => {
    await patchRecord('ana_matriz', id, { nivel }); onRefresh()
  }

  const byNivel = NIVELS.reduce((acc, n) => { acc[n] = items.filter(i => i.nivel === n); return acc }, {} as Record<string, MatrizItem[]>)

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <PageHeader title="Matriz de Habilidades" subtitle="Mapa de capacidades da Ana. Avance cada habilidade conforme as simulações evoluem." count={items.length}>
        <Btn onClick={() => setShowForm(true)} color={C.blue}><Plus style={{ width: 14, height: 14 }} />Nova habilidade</Btn>
      </PageHeader>

      {/* Summary */}
      {items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
          {NIVELS.map(n => {
            const { label, color, dim, border } = NIVEL_META[n]
            const count = byNivel[n]?.length || 0
            const pct = items.length > 0 ? Math.round(count / items.length * 100) : 0
            return (
              <div key={n} style={{ background: dim, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color, marginTop: 4 }}>{label}</div>
                <div style={{ fontSize: 10, color: color + '99', marginTop: 2 }}>{pct}% do total</div>
              </div>
            )
          })}
        </div>
      )}

      {items.length === 0 && <EmptyState icon={<Grid3X3 />} text="Nenhuma habilidade mapeada ainda." />}

      <div style={{ display: 'grid', gap: 8 }}>
        {items.map(item => {
          const { color, dim, border } = NIVEL_META[item.nivel]
          return (
            <div key={item.id} style={{ background: C.surface, border: `1px solid ${border}`, borderRadius: 12, padding: 16, borderLeft: `3px solid ${color}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 5 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.habilidade}</span>
                    <Badge label={NIVEL_META[item.nivel].label} color={color} dim={dim} border={border} />
                  </div>
                  {item.descricao && <p style={{ margin: '0 0 6px', fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{item.descricao}</p>}
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {item.evidencias && <span style={{ fontSize: 11, color: C.textFaint }}><span style={{ color: C.blue }}>Evidências: </span>{item.evidencias}</span>}
                    {item.proximos_passos && <span style={{ fontSize: 11, color: C.textFaint }}><span style={{ color: C.purple }}>Próximos passos: </span>{item.proximos_passos}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                  {NIVELS.map(n => {
                    const m = NIVEL_META[n]
                    const active = item.nivel === n
                    return (
                      <button key={n} onClick={() => updateNivel(item.id, n)} title={m.label}
                        style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${active ? m.color : C.border}`, background: active ? m.dim : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: active ? m.color : C.border, transition: 'all 0.15s', boxShadow: active ? `0 0 6px ${m.color}` : 'none' }} />
                      </button>
                    )
                  })}
                  <ActionBtn icon={<Trash2 style={{ width: 11, height: 11 }} />} onClick={async () => { if (confirm('Remover?')) { await deleteRecord('ana_matriz', item.id); onRefresh() } }} danger title="Remover" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <Modal title="Nova habilidade" accent={C.blue} onClose={() => setShowForm(false)}>
          <Field label="Habilidade *"><input style={inp} value={form.habilidade} onChange={e => setForm(f => ({ ...f, habilidade: e.target.value }))} placeholder="Ex: Conexão emocional no D.I." /></Field>
          <Field label="Descrição"><textarea style={ta} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="O que significa dominar esta habilidade?" /></Field>
          <Field label="Nível atual">
            <select style={sel} value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value as MatrizItem['nivel'] }))}>
              {NIVELS.map(n => <option key={n} value={n}>{NIVEL_META[n].label}</option>)}
            </select>
          </Field>
          <Field label="Evidências observadas"><textarea style={{ ...ta, minHeight: 60 }} value={form.evidencias} onChange={e => setForm(f => ({ ...f, evidencias: e.target.value }))} placeholder="O que foi observado nas simulações?" /></Field>
          <Field label="Próximos passos"><textarea style={{ ...ta, minHeight: 60 }} value={form.proximos_passos} onChange={e => setForm(f => ({ ...f, proximos_passos: e.target.value }))} placeholder="O que precisa ser trabalhado?" /></Field>
          <Btn onClick={save} disabled={saving || !form.habilidade.trim()} color={C.blue} full>{saving ? 'Salvando...' : 'Salvar habilidade'}</Btn>
        </Modal>
      )}
    </div>
  )
}

// ─── CHANGELOG TAB ────────────────────────────────────────────────────────────

const TIPO_META: Record<ChangelogEntry['tipo'], { label: string; color: string; dim: string; border: string; icon: string }> = {
  decisao: { label: 'Decisão', color: C.purple, dim: C.purpleDim, border: C.purpleBorder, icon: '⚡' },
  aprendizado: { label: 'Aprendizado', color: C.green, dim: C.greenDim, border: C.greenBorder, icon: '💡' },
  diretriz: { label: 'Diretriz', color: C.blue, dim: C.blueDim, border: C.blueBorder, icon: '📐' },
  restricao: { label: 'Restrição', color: C.red, dim: C.redDim, border: C.redBorder, icon: '🚫' },
}

function ChangelogBadge({ tipo }: { tipo: ChangelogEntry['tipo'] }) {
  const { label, color, dim, border } = TIPO_META[tipo]
  return <Badge label={label} color={color} dim={dim} border={border} />
}

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
    setSaving(false); setShowForm(false)
    setForm({ tipo: 'decisao', titulo: '', descricao: '', impacto: '', autor: '' })
    onRefresh()
  }

  const tipoCount = (t: ChangelogEntry['tipo']) => entries.filter(e => e.tipo === t).length

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <PageHeader title="Changelog" subtitle="Registro imutável de decisões, aprendizados, diretrizes e restrições da Ana." count={entries.length}>
        <Btn onClick={() => setShowForm(true)} color={C.purple}><Plus style={{ width: 14, height: 14 }} />Registrar</Btn>
      </PageHeader>

      {/* Type summary */}
      {entries.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {(['decisao', 'aprendizado', 'diretriz', 'restricao'] as const).map(t => {
            const { label, color, dim, border, icon } = TIPO_META[t]
            return (
              <div key={t} style={{ background: dim, border: `1px solid ${border}`, borderRadius: 10, padding: '8px 14px', display: 'flex', gap: 7, alignItems: 'center' }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color }}>{tipoCount(t)}</span>
                <span style={{ fontSize: 11, color: color + '99' }}>{label}</span>
              </div>
            )
          })}
        </div>
      )}

      {entries.length === 0 && <EmptyState icon={<Clock />} text="Nenhuma entrada no changelog ainda. Registre decisões e aprendizados aqui." />}

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {entries.length > 0 && (
          <div style={{ position: 'absolute', left: 15, top: 24, bottom: 0, width: 1, background: `linear-gradient(to bottom, ${C.border}, transparent)` }} />
        )}
        <div style={{ display: 'grid', gap: 12 }}>
          {entries.map((entry, i) => {
            const { color, dim, border, icon } = TIPO_META[entry.tipo]
            return (
              <div key={entry.id} style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: dim, border: `1.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, zIndex: 1 }}>
                  {icon}
                </div>
                <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px', marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                        <ChangelogBadge tipo={entry.tipo} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{entry.titulo}</span>
                      </div>
                      <span style={{ fontSize: 10, color: C.textFaint }}>{fmtDate(entry.created_at)}{entry.autor ? ` · por ${entry.autor}` : ''}</span>
                    </div>
                    <ActionBtn icon={<Trash2 style={{ width: 12, height: 12 }} />} onClick={async () => { if (confirm('Remover?')) { await deleteRecord('ana_changelog', entry.id); onRefresh() } }} danger title="Remover" />
                  </div>
                  {entry.descricao && <p style={{ margin: '0 0 8px', fontSize: 13, color: C.textMuted, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.descricao}</p>}
                  {entry.impacto && <p style={{ margin: 0, fontSize: 12, color: C.textFaint }}><span style={{ color, fontWeight: 700 }}>Impacto: </span>{entry.impacto}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showForm && (
        <Modal title="Nova entrada no changelog" accent={C.purple} onClose={() => setShowForm(false)}>
          <Field label="Tipo">
            <select style={sel} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as ChangelogEntry['tipo'] }))}>
              <option value="decisao">⚡ Decisão</option>
              <option value="aprendizado">💡 Aprendizado</option>
              <option value="diretriz">📐 Diretriz</option>
              <option value="restricao">🚫 Restrição</option>
            </select>
          </Field>
          <Field label="Título *"><input style={inp} value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Ana não usa a palavra 'produto'" /></Field>
          <Field label="Descrição"><textarea style={ta} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhe a decisão ou aprendizado..." /></Field>
          <Field label="Impacto esperado"><input style={inp} value={form.impacto} onChange={e => setForm(f => ({ ...f, impacto: e.target.value }))} placeholder="Ex: Melhora naturalidade do script" /></Field>
          <Field label="Autor"><input style={inp} value={form.autor} onChange={e => setForm(f => ({ ...f, autor: e.target.value }))} placeholder="Quem tomou esta decisão?" /></Field>
          <Btn onClick={save} disabled={saving || !form.titulo.trim()} full>{saving ? 'Salvando...' : 'Registrar'}</Btn>
        </Modal>
      )}
    </div>
  )
}

// ─── Shared layout helpers ────────────────────────────────────────────────────

function PageHeader({ title, subtitle, count, children }: { title: string; subtitle: string; count?: number; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: C.text }}>{title}</h2>
          {count !== undefined && (
            <span style={{ fontSize: 13, fontWeight: 700, color: C.textFaint, background: '#ffffff08', border: `1px solid ${C.border}`, borderRadius: 8, padding: '1px 9px', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 24px', color: C.textFaint }}>
      <div style={{ width: 48, height: 48, margin: '0 auto 14px', opacity: 0.2 }}>{icon}</div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, maxWidth: 340, marginLeft: 'auto', marginRight: 'auto' }}>{text}</p>
    </div>
  )
}

function ActionBtn({ icon, onClick, active, activeColor, danger, title, style: extraStyle }: {
  icon: React.ReactNode; onClick: () => void; active?: boolean; activeColor?: string
  danger?: boolean; title?: string; style?: React.CSSProperties
}) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 30, height: 30, padding: 0, borderRadius: 8,
      border: `1px solid ${active ? (activeColor || C.purple) + '50' : danger ? C.redBorder : C.border}`,
      background: active ? (activeColor || C.purple) + '18' : danger ? C.redDim : 'transparent',
      cursor: 'pointer', color: active ? (activeColor || C.purple) : danger ? C.red : C.textMuted,
      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
      ...extraStyle,
    }}>
      {icon}
    </button>
  )
}

// ─── DNA v1 TAB ───────────────────────────────────────────────────────────────

const DNA_STAGES = [
  {
    id: 'apresentacao', label: 'Apresentação', emoji: '👋',
    gate: 'Nome + origem confirmados',
    objetivo: 'Criar identidade imediata e abrir contexto',
    estado: 'Caloroso, atento, presente',
    comportamento: 'Chama pelo nome, menciona quem indicou, ancoragem de tempo',
    gateCond: 'Nome e origem confirmados → Conexão',
  },
  {
    id: 'conexao', label: 'Conexão', emoji: '🤝',
    gate: 'Contexto emocional estabelecido',
    objetivo: 'Entender a realidade clínica e emocional do lead',
    estado: 'Curioso, sem pressa, receptivo',
    comportamento: 'Pergunta aberta, escuta ativa, reflexo emocional',
    gateCond: 'Dor/contexto mapeados → D.I.',
  },
  {
    id: 'di', label: 'D.I.', emoji: '🎯',
    gate: 'Diagnóstico + intenção + combinado',
    objetivo: 'Mapear histórico, definir proposta e criar compromisso',
    estado: 'Preciso, clínico, confiante',
    comportamento: 'Pergunta direta, resume diagnóstico, propõe combinado',
    gateCond: 'Combinado validado → Speech',
  },
  {
    id: 'speech', label: 'Speech', emoji: '⚡',
    gate: 'Proposta entregue com clareza',
    objetivo: 'Apresentar a transformação com valor > preço',
    estado: 'Energético, convicto, inspirador',
    comportamento: 'Ancoragem de resultado, proof points, call to action',
    gateCond: 'Lead ouviu e respondeu → Fechamento',
  },
  {
    id: 'fechamento', label: 'Fechamento', emoji: '🔒',
    gate: 'Decisão obtida ou objeção tratada',
    objetivo: 'Obter decisão ou tratar objeção com framework',
    estado: 'Firme, tranquilo, sem pressão',
    comportamento: 'Pergunta direta de decisão, trata objeção, retorna ao fechamento',
    gateCond: 'Sim → Pagamento | Objeção → Framework',
  },
  {
    id: 'pagamento', label: 'Pagamento', emoji: '💳',
    gate: 'Pagamento confirmado no sistema',
    objetivo: 'Executar pagamento com fluidez e segurança',
    estado: 'Calmo, auxiliar, celebratório',
    comportamento: 'Guia passo a passo, confirma recebimento, celebra decisão',
    gateCond: 'Confirmação real no sistema → Referidos',
  },
  {
    id: 'referidos', label: 'Referidos', emoji: '🔗',
    gate: 'Nome(s) colhido(s) ou recusa registrada',
    objetivo: 'Colher referidos por reciprocidade',
    estado: 'Leve, grato, natural',
    comportamento: 'Ancoragem de reciprocidade, pergunta natural, sem pressão',
    gateCond: 'Nome colhido ou recusa → Validação',
  },
  {
    id: 'validacao', label: 'Validação', emoji: '✅',
    gate: 'Lead verbalizou satisfação',
    objetivo: 'Confirmar experiência positiva e criar âncora de boas-vindas',
    estado: 'Acolhedor, celebratório, humano',
    comportamento: 'Pergunta de satisfação, ouve, boas-vindas com calor',
    gateCond: 'Satisfação verbalizada → GANHO',
  },
]

const MODULATION_MAP = [
  { momento: 'Apresentação', energia: 'Média-alta', ritmo: 'Cadenciado', tom: 'Caloroso e seguro', exemplo: '"Oi [nome]! Que bom falar com você — [quem indicou] me contou sobre você."' },
  { momento: 'Conexão', energia: 'Média', ritmo: 'Lento', tom: 'Acolhedor, receptivo', exemplo: '"Me conta — como você está se sentindo com isso tudo?"' },
  { momento: 'Dor/contexto', energia: 'Baixa', ritmo: 'Pausado', tom: 'Empático, presente', exemplo: '"Entendo… isso deve ser desgastante."' },
  { momento: 'Combinado', energia: 'Média', ritmo: 'Firme', tom: 'Clínico, confiante', exemplo: '"Então vamos combinar: você vai iniciar o protocolo na semana que vem, tudo bem?"' },
  { momento: 'Speech', energia: 'Alta', ritmo: 'Dinâmico', tom: 'Convicto, inspirador', exemplo: '"Quem passa por esse protocolo relata transformação já nas primeiras semanas."' },
  { momento: 'Preço', energia: 'Média-alta', ritmo: 'Firme', tom: 'Natural, sem desculpas', exemplo: '"O investimento é R$ X — e inclui [valor]."' },
  { momento: 'Objeção', energia: 'Baixa-média', ritmo: 'Lento, deliberado', tom: 'Curioso, sem defensiva', exemplo: '"Entendo. Só me ajuda a entender — isso é a única razão?"' },
  { momento: 'Fechamento', energia: 'Média-alta', ritmo: 'Direto', tom: 'Firme, tranquilo', exemplo: '"Então vamos fechar agora? Qual cartão você tem disponível?"' },
  { momento: 'Pagamento', energia: 'Média', ritmo: 'Auxiliar', tom: 'Guia, celebratório', exemplo: '"Perfeito! Já vi aqui que entrou. Parabéns pela decisão!"' },
  { momento: 'Referidos', energia: 'Média', ritmo: 'Leve', tom: 'Grato, natural', exemplo: '"Você conhece alguém que poderia se beneficiar como você?"' },
  { momento: 'Validação', energia: 'Baixa-média', ritmo: 'Acolhedor', tom: 'Humano, presente', exemplo: '"Como você se sentiu com a nossa conversa?"' },
  { momento: 'Boas-vindas', energia: 'Alta', ritmo: 'Celebratório', tom: 'Caloroso, entusiasmado', exemplo: '"Seja bem-vindo(a) à família! Vai ser incrível."' },
]

const MEMORY_MAP = [
  { etapa: 'Apresentação', produz: 'Nome + origem do lead', consome: '—' },
  { etapa: 'Conexão', produz: 'Contexto emocional + realidade clínica', consome: 'Nome, origem' },
  { etapa: 'D.I.', produz: 'Diagnóstico + combinado + intenção', consome: 'Contexto, dor' },
  { etapa: 'Speech', produz: 'Reação ao valor', consome: 'Combinado, diagnóstico' },
  { etapa: 'Fechamento', produz: 'Decisão ou objeção', consome: 'Reação, combinado' },
  { etapa: 'Pagamento', produz: 'Confirmação real do sistema', consome: 'Decisão, cartão' },
  { etapa: 'Referidos', produz: 'Nome(s) de novos leads', consome: 'Pagamento confirmado' },
  { etapa: 'Validação', produz: 'Satisfação verbalizada', consome: 'Toda a conversa' },
]

const OBJECTION_STEPS = [
  { step: 'OUVIR', desc: 'Deixa a objeção sair completa, sem interromper', color: '#6366F1' },
  { step: 'ISOLAR', desc: '"Isso é a única razão que te impede?"', color: '#8B5CF6' },
  { step: 'CONFIRMAR', desc: 'Reflete e valida o sentimento', color: '#A855F7' },
  { step: 'OFERECER', desc: 'Apresenta reframe ou solução alternativa', color: '#C084FC' },
  { step: 'TESTAR', desc: '"Se a gente resolver isso, você fecha?"', color: '#D946EF' },
  { step: 'AJUSTAR', desc: 'Adapta proposta se necessário', color: '#EC4899' },
  { step: 'DECIDIR', desc: 'Volta ao fechamento direto', color: '#F43F5E' },
]

const LEAD_ORIGINS = [
  { origem: 'Referido', abertura: 'Menciona nome de quem indicou', tom: 'Caloroso, relacional', speech: 'Prova social do indicador', foco: 'Pertencimento e continuidade' },
  { origem: 'Instagram', abertura: 'Referência ao conteúdo consumido', tom: 'Descontraído, familiar', speech: 'Transformação visual e resultados', foco: 'Aspiração e identidade' },
  { origem: 'Site', abertura: 'Pergunta o que levou à busca', tom: 'Informativo, técnico', speech: 'Expertise e protocolo', foco: 'Credibilidade e especificidade' },
  { origem: 'Campanha', abertura: 'Valida a oferta da campanha', tom: 'Direto, objetivo', speech: 'Urgência e exclusividade', foco: 'Decisão imediata' },
  { origem: 'Retorno', abertura: 'Reconhece o histórico anterior', tom: 'Íntimo, continuidade', speech: 'Evolução e próximo passo', foco: 'Reengajamento e confiança' },
]

const ARCH_LAYERS = [
  { layer: 'CONTEXTO', subs: ['Apresentação', 'Conexão'], color: '#6366F1', desc: 'Quem é, de onde vem, o que sente' },
  { layer: 'COMPROMISSO', subs: ['D.I.', 'Combinado'], color: '#8B5CF6', desc: 'O que vai acontecer e o que se compromete' },
  { layer: 'VALOR', subs: ['Speech', 'Objeção'], color: '#A855F7', desc: 'Por que vale a transformação' },
  { layer: 'DECISÃO', subs: ['Fechamento'], color: '#C084FC', desc: 'O momento da escolha' },
  { layer: 'EXECUÇÃO', subs: ['Pagamento'], color: '#D946EF', desc: 'A ação concreta realizada' },
  { layer: 'RECIPROCIDADE', subs: ['Referidos'], color: '#EC4899', desc: 'O ciclo que se perpetua' },
  { layer: 'VALIDAÇÃO', subs: ['Validação', 'Boas-vindas'], color: '#F43F5E', desc: 'A experiência que cria âncora positiva' },
]

function DnaTab() {
  const [section, setSection] = useState<'maquina' | 'modulacao' | 'memoria' | 'objecao' | 'origens' | 'arquitetura'>('maquina')
  const [activeStage, setActiveStage] = useState<string | null>(null)

  const sectionBtns: { id: typeof section; label: string }[] = [
    { id: 'maquina', label: '⚙️ Máquina de Estados' },
    { id: 'modulacao', label: '🎭 Modulação' },
    { id: 'memoria', label: '🧠 Memória' },
    { id: 'objecao', label: '🛡️ Objeção' },
    { id: 'origens', label: '🌐 Origens' },
    { id: 'arquitetura', label: '🏗️ Arquitetura' },
  ]

  const DNA_DIMENSIONS = [
    { dim: 'Convicção', obs: 'Trata solução, preço e referidos como partes naturais do processo', regra: 'Não pedir desculpas por conduzir. Segurança e respeito.' },
    { dim: 'Velocidade', obs: 'Ritmo varia por etapa — não há cadência única', regra: 'Ritmo = função do estado emocional + objetivo comercial' },
    { dim: 'Memória', obs: 'Retoma o combinado no fechamento e a indicadora nos referidos', regra: 'Usar contexto anterior para criar continuidade narrativa' },
    { dim: 'Simplicidade', obs: 'Explica conceitos por analogias acessíveis', regra: 'Autoridade sem palestra — traduzir complexidade' },
    { dim: 'Decisão', obs: 'Cada pergunta reduz incerteza e prepara o próximo passo', regra: 'Perguntas têm função — evitar checklist' },
    { dim: 'Objeções', obs: 'Isola a objeção antes de oferecer alternativas', regra: 'Não rebater antes de compreender a causa real' },
    { dim: 'Reciprocidade', obs: 'Referidos conectados ao benefício recebido via indicação', regra: 'Criar sentido antes de pedir ação' },
    { dim: 'Disciplina', obs: 'Etapas cumpridas até validação sem atalhos', regra: 'Naturalidade não pode destruir o processo comercial' },
  ]

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      {/* North Star */}
      <div style={{ background: 'linear-gradient(135deg, #0d1a2a 0%, #0a0a1a 100%)', border: '1px solid #1D4ED840', borderRadius: 16, padding: '18px 24px', marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>⭐ North Star — DNA Gold Standard v1</div>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#E2E8F0', lineHeight: 1.5 }}>
          Duplicar em escala o modelo mental comercial do fundador em uma consultora feminina, humana, adaptativa e disciplinada no processo.
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#64748B' }}>
          Fonte primária: simulação integral conduzida pelo Dr. Vinícius Sechella · A referência não são as frases literais — é o comportamento: por que uma pergunta foi feita, em que momento, com qual energia.
        </p>
      </div>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0d0520 0%, #0a0a1a 60%, #0d1a12 100%)', border: `1px solid ${C.purpleBorder}`, borderRadius: 20, padding: '24px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: C.purpleDim, border: `1px solid ${C.purpleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🧬</div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.purple, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>DNA Comercial — Gold Standard v1 · ATIVO NO PROMPT</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.text }}>Modelo Mental do Fundador — 8 Dimensões</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMuted }}>Regra de ouro: replicar intenção e competência, não decorar texto</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.green, background: C.greenDim, border: `1px solid ${C.greenBorder}`, borderRadius: 8, padding: '4px 10px' }}>✓ ATIVO</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, background: C.goldDim, border: `1px solid ${C.goldBorder}`, borderRadius: 8, padding: '4px 10px' }}>8 ETAPAS</span>
          </div>
        </div>
        {/* 8 Dimensions grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
          {DNA_DIMENSIONS.map(d => (
            <div key={d.dim} style={{ background: '#ffffff05', border: `1px solid ${C.purpleBorder}`, borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, marginBottom: 4 }}>{d.dim}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{d.obs}</div>
              <div style={{ fontSize: 10, color: '#34D399', fontStyle: 'italic' }}>→ {d.regra}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section picker */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {sectionBtns.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{ padding: '7px 14px', borderRadius: 10, border: `1px solid ${section === s.id ? C.purple : C.border}`, background: section === s.id ? C.purpleDim : C.surface, color: section === s.id ? C.purple : C.textMuted, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Máquina de Estados ── */}
      {section === 'maquina' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {DNA_STAGES.map((stage, i) => {
              const isActive = activeStage === stage.id
              return (
                <div
                  key={stage.id}
                  onClick={() => setActiveStage(isActive ? null : stage.id)}
                  style={{ background: C.surface, border: `1px solid ${isActive ? C.purple : C.border}`, borderRadius: 14, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.18s', boxShadow: isActive ? `0 0 0 1px ${C.purple}40, 0 8px 32px rgba(139,92,246,0.12)` : 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: isActive ? C.purpleDim : '#ffffff08', border: `1px solid ${isActive ? C.purpleBorder : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{stage.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.textFaint, fontVariantNumeric: 'tabular-nums' }}>ETAPA {i + 1}</span>
                        {i < DNA_STAGES.length - 1 && <span style={{ fontSize: 9, color: C.textFaint }}>→</span>}
                        {i === DNA_STAGES.length - 1 && <span style={{ fontSize: 9, color: C.green, fontWeight: 700 }}>GANHO</span>}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: isActive ? C.purple : C.text }}>{stage.label}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, lineHeight: 1.5 }}>{stage.objetivo}</div>
                  {isActive && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ background: C.purpleDim, borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: C.purple, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Estado</div>
                          <div style={{ fontSize: 11, color: C.text }}>{stage.estado}</div>
                        </div>
                        <div style={{ background: '#ffffff06', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Comportamento</div>
                          <div style={{ fontSize: 11, color: C.text }}>{stage.comportamento}</div>
                        </div>
                      </div>
                      <div style={{ background: C.greenDim, border: `1px solid ${C.greenBorder}`, borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Gate de Saída</div>
                        <div style={{ fontSize: 11, color: C.text }}>{stage.gateCond}</div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p style={{ marginTop: 14, fontSize: 11, color: C.textFaint, textAlign: 'center' }}>Clique em qualquer etapa para expandir detalhes · Gates são obrigatórios para avançar</p>
        </div>
      )}

      {/* ── Modulação ── */}
      {section === 'modulacao' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: '#ffffff04' }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.text }}>Mapa de Modulação Emocional e Vocal</h3>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: C.textMuted }}>Como a Ana calibra energia, ritmo e tom em cada momento da conversa</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#ffffff04' }}>
                  {['Momento', 'Energia', 'Ritmo', 'Tom', 'Exemplo'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULATION_MAP.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: C.text, whiteSpace: 'nowrap' }}>{row.momento}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: row.energia.includes('Alta') ? C.green : row.energia.includes('Média') ? C.gold : C.textMuted, background: row.energia.includes('Alta') ? C.greenDim : row.energia.includes('Média') ? C.goldDim : '#ffffff08', borderRadius: 6, padding: '2px 7px' }}>
                        {row.energia}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: C.textMuted }}>{row.ritmo}</td>
                    <td style={{ padding: '10px 14px', color: C.text }}>{row.tom}</td>
                    <td style={{ padding: '10px 14px', color: C.textFaint, fontStyle: 'italic', fontSize: 11, maxWidth: 260 }}>{row.exemplo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Memória ── */}
      {section === 'memoria' && (
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.text }}>Mapa de Memória Conversacional</h3>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: C.textMuted }}>O que cada etapa produz (grava) e consome (usa) da memória da conversa</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#ffffff04' }}>
                    {['Etapa', 'Produz (grava)', 'Consome (usa)'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MEMORY_MAP.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: C.purple, whiteSpace: 'nowrap' }}>{row.etapa}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, color: C.green, background: C.greenDim, borderRadius: 6, padding: '2px 8px' }}>✦ {row.produz}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: row.consome === '—' ? C.textFaint : C.textMuted, fontStyle: row.consome === '—' ? 'italic' : 'normal' }}>{row.consome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ background: C.blueDim, border: `1px solid ${C.blueBorder}`, borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 8 }}>📌 REGRA FUNDAMENTAL DA MEMÓRIA</div>
            <p style={{ margin: 0, fontSize: 12, color: C.text, lineHeight: 1.7 }}>
              A Ana nunca pede a mesma informação duas vezes. Cada fato registrado em memória deve ser usado nas etapas seguintes para criar continuidade e demonstrar escuta ativa. A consistência interna da conversa é o sinal mais forte de presença e confiança.
            </p>
          </div>
        </div>
      )}

      {/* ── Objeção ── */}
      {section === 'objecao' && (
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 24px', marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 800, color: C.text }}>Framework de Tratamento de Objeções</h3>
            <p style={{ margin: '0 0 24px', fontSize: 11, color: C.textMuted }}>Sequência obrigatória — cada passo ativa o próximo. Pular um passo invalida o framework.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {OBJECTION_STEPS.map((s, i) => (
                <div key={s.step} style={{ display: 'flex', gap: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 48, flexShrink: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: s.color + '22', border: `2px solid ${s.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: s.color, flexShrink: 0, zIndex: 1 }}>{i + 1}</div>
                    {i < OBJECTION_STEPS.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 16, background: `linear-gradient(to bottom, ${s.color}60, ${OBJECTION_STEPS[i + 1].color}40)` }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: i < OBJECTION_STEPS.length - 1 ? 16 : 0, paddingLeft: 14, paddingTop: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: s.color, marginBottom: 2 }}>{s.step}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: C.greenDim, border: `1px solid ${C.greenBorder}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 8 }}>✓ PADRÃO GOLD — Objeção Financeira</div>
              <p style={{ margin: 0, fontSize: 12, color: C.text, fontStyle: 'italic', lineHeight: 1.7 }}>
                "Entendo. Só me ajuda a entender — isso é a única razão que te impede de começar? [pausa] Porque se a gente resolver a questão do valor, você se vê iniciando o protocolo?"
              </p>
            </div>
            <div style={{ background: C.redDim, border: `1px solid ${C.redBorder}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 8 }}>✗ ANTI-GOLD — O que nunca fazer</div>
              <p style={{ margin: 0, fontSize: 12, color: C.text, lineHeight: 1.7 }}>
                Repetir a objeção de volta sem isolar. Defender o preço antes de entender a real barreira. Dar desconto antes de testar comprometimento.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Origens ── */}
      {section === 'origens' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.text }}>Adaptação por Origem do Lead</h3>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: C.textMuted }}>A Ana calibra abertura, tom, speech e foco conforme a origem de entrada do lead</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#ffffff04' }}>
                  {['Origem', 'Abertura', 'Tom', 'Speech foco', 'Driver'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LEAD_ORIGINS.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: C.text, background: C.purpleDim, border: `1px solid ${C.purpleBorder}`, borderRadius: 7, padding: '3px 9px' }}>{row.origem}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: C.textMuted }}>{row.abertura}</td>
                    <td style={{ padding: '10px 14px', color: C.text }}>{row.tom}</td>
                    <td style={{ padding: '10px 14px', color: C.textMuted }}>{row.speech}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, background: C.goldDim, borderRadius: 6, padding: '2px 8px' }}>{row.foco}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Arquitetura ── */}
      {section === 'arquitetura' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
            {ARCH_LAYERS.map((layer) => (
              <div key={layer.layer} style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${layer.color}`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: layer.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{layer.layer}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                  {layer.subs.map(s => (
                    <span key={s} style={{ fontSize: 10, color: C.text, background: layer.color + '15', border: `1px solid ${layer.color}30`, borderRadius: 5, padding: '1px 7px' }}>{s}</span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{layer.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: C.text }}>Contratos de Ferramentas — Fase 2 (backlog)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {[
                { name: 'State Machine', desc: 'Gerencia etapa atual e gates', status: 'pendente' },
                { name: 'Conversation Memory', desc: 'Armazena e recupera fatos-chave', status: 'pendente' },
                { name: 'Realtime Model', desc: 'Geração de resposta em tempo real', status: 'pendente' },
                { name: 'Tool Layer', desc: 'Funções externas (CRM, pagamento)', status: 'pendente' },
                { name: 'Policy Engine', desc: 'Garante restrições (no claims clínicos)', status: 'pendente' },
                { name: 'Observability', desc: 'Scorecard automático por conversa', status: 'pendente' },
              ].map(t => (
                <div key={t.name} style={{ background: '#ffffff04', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 3 }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6 }}>{t.desc}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: C.textFaint, background: '#ffffff08', borderRadius: 5, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fase 2</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── RECOVERY TAB ─────────────────────────────────────────────────────────────

const RECOVERY_ARCH = [
  { name: 'Call Orchestrator', icon: '📞', color: '#6366F1', desc: 'Cria e associa cada chamada a uma conversation lógica. Detecta início/fim via webhook. Emite eventos de call_started e call_ended.' },
  { name: 'State Store', icon: '🗄️', color: '#8B5CF6', desc: 'Snapshot atual do funil e memória factual estruturada. Fonte de verdade para reidratação. Suporta versionamento otimista.' },
  { name: 'Event Log', icon: '📋', color: '#A855F7', desc: 'Histórico append-only para auditoria e replay. Nunca sobrescrito. Registra fact_saved, gate_passed, call_dropped, recovery_started, payment_confirmed.' },
  { name: 'Recovery Engine', icon: '🔄', color: '#C084FC', desc: 'Classifica a interrupção, escolhe o checkpoint correto, agenda ou aceita reconexão e monta o resume_context para o modelo.' },
  { name: 'Realtime Session Builder', icon: '⚡', color: '#D946EF', desc: 'Reidrata instruções + estado mínimo para nova sessão OpenAI Realtime. Gera o pacote compacto resume_context — nunca inventado pelo modelo.' },
  { name: 'Tool Runner', icon: '🔧', color: '#EC4899', desc: 'Executa efeitos externos (pagamento, WhatsApp, referidos) com idempotency_key garantida. Impede duplicação de cobranças e mensagens.' },
  { name: 'Scheduler / Queue', icon: '⏱️', color: '#F43F5E', desc: 'Gerencia redial e retries sem bloquear processo web. Respeita política de opt-out e encerramento voluntário.' },
  { name: 'Observability', icon: '📊', color: '#FB923C', desc: 'Métricas, traces e alertas em tempo real. Monitora recovery_rate, duplicate_tool_action_rate, time_to_resume e outras 6 métricas.' },
]

const ACCEPTANCE_TESTS = [
  { id: 'R1', cenario: 'Queda após Apresentação', criterio: 'Nova chamada reconhece origem e entra em Conexão sem reapresentação completa', status: 'pendente' },
  { id: 'R2', cenario: 'Queda após sintomas', criterio: 'ANA não pergunta novamente sintomas já salvos', status: 'pendente' },
  { id: 'R3', cenario: 'Queda no Combinado', criterio: 'Retoma exatamente o compromisso e segue ao Speech', status: 'pendente' },
  { id: 'R4', cenario: 'Queda no Speech', criterio: 'Retoma tópico pendente sem repetir apresentação inteira', status: 'pendente' },
  { id: 'R5', cenario: 'Queda durante objeção', criterio: 'Mantém objeção isolada e alternativas já tentadas', status: 'pendente' },
  { id: 'R6', cenario: 'Queda antes/depois de pagamento', criterio: 'Não duplica cobrança — confirma somente estado real no provider', status: 'pendente' },
  { id: 'R7', cenario: 'Queda com 12/20 referidos', criterio: 'Retoma de 12, não de zero', status: 'pendente' },
  { id: 'R8', cenario: 'Queda durante validação', criterio: 'Solicita apenas campos pendentes', status: 'pendente' },
  { id: 'R9', cenario: 'Reconexão concorrente', criterio: 'Uma única sessão recebe lock de escrita do conversation state', status: 'pendente' },
  { id: 'R10', cenario: 'Lead pede para parar', criterio: 'Sistema não entra em redial automático indevido', status: 'pendente' },
]

const EDGE_CASES = [
  { icon: '🔇', titulo: 'Lead não pode falar', descricao: 'Atende mas está ocupado. Salvar follow-up sem perder a etapa atual.' },
  { icon: '👥', titulo: 'Outra pessoa atende', descricao: 'Não expor dados sensíveis da conversa antes de confirmar identidade.' },
  { icon: '🔄', titulo: 'Número mudado/reutilizado', descricao: 'Exigir resolução segura de identidade antes de revelar contexto.' },
  { icon: '⚡', titulo: 'Lead contradiz fato anterior', descricao: 'Marcar conflito no fact store e confirmar — nunca sobrescrever silenciosamente.' },
  { icon: '💳', titulo: 'Pagamento concluiu durante queda', descricao: 'Reconsultar status real no provider e retomar já após o gate correto.' },
  { icon: '🔧', titulo: 'Tool em andamento na queda', descricao: 'Reconciliar execução com idempotency_key antes de repetir qualquer ação.' },
  { icon: '🔒', titulo: 'Duas chamadas simultâneas', descricao: 'Apenas uma pode possuir lock de escrita do conversation state.' },
  { icon: '📅', titulo: 'Retorno semanas depois', descricao: 'Confirmar se o contexto ainda é atual antes de continuar o funil.' },
  { icon: '↩️', titulo: 'Lead pede para recomeçar', descricao: 'Permitir reset conversacional controlado sem apagar histórico auditável.' },
]

const METRICS = [
  { key: 'recovery_rate', desc: '% de conversas interrompidas retomadas com sucesso', target: '≥ 90%', color: C.green },
  { key: 'resume_to_next_stage_rate', desc: '% de retomadas que avançam ao próximo gate', target: '≥ 80%', color: C.green },
  { key: 'duplicate_question_rate', desc: 'Repetição de perguntas já respondidas na mesma conversa', target: '= 0%', color: C.red },
  { key: 'duplicate_tool_action_rate', desc: 'Ações externas duplicadas (pagamento, WhatsApp, referidos)', target: '= 0%', color: C.red },
  { key: 'time_to_resume', desc: 'Tempo médio entre queda e retomada efetiva', target: '< 60s', color: C.gold },
  { key: 'context_recall_accuracy', desc: 'Fatos usados na retomada correspondem ao state store', target: '= 100%', color: C.green },
  { key: 'recovery_abandonment_rate', desc: 'Leads perdidos definitivamente após interrupção', target: '< 5%', color: C.gold },
  { key: 'state_conflict_rate', desc: 'Conflitos de versão / concorrência inconsistente', target: '= 0%', color: C.red },
  { key: 'manual_recovery_rate', desc: 'Casos que exigem intervenção humana', target: '< 2%', color: C.gold },
]

const SCHEMA_TABLES = [
  { name: 'ana_conversations', desc: 'Registro lógico por lead/conversa — sobrevive às chamadas', fields: 'lead_id, stage, status, completed_gates, next_action, state_version, lock_token' },
  { name: 'ana_calls', desc: 'Cada segmento de telefonia', fields: 'conversation_id, provider_call_id, end_reason, attempt_number, duration_seconds' },
  { name: 'ana_conversation_facts', desc: 'Memória factual estruturada (key/value)', fields: 'conversation_id, key, value, confidence, stage_captured — unique(conversation_id, key)' },
  { name: 'ana_conversation_events', desc: 'Event log append-only', fields: 'conversation_id, type, payload, stage_at_event — sem DELETE' },
  { name: 'ana_tool_executions', desc: 'Idempotência de tools externas', fields: 'conversation_id, tool, idempotency_key unique, status, result' },
  { name: 'ana_recovery_attempts', desc: 'Histórico de retomadas com resume_context', fields: 'conversation_id, attempt_no, status, scheduled_at, resume_context jsonb' },
  { name: 'ana_referrals', desc: 'Persistência granular de referidos (etapas 7/8)', fields: 'conversation_id, contact_key, profissao, hobby, validation_status, whatsapp_status' },
]

function RecoveryTab() {
  const [section, setSection] = useState<'arquitetura' | 'schema' | 'testes' | 'edge' | 'metricas'>('arquitetura')

  const sectionBtns: { id: typeof section; label: string }[] = [
    { id: 'arquitetura', label: '⚙️ Arquitetura' },
    { id: 'schema', label: '🗄️ Schema' },
    { id: 'testes', label: '🧪 Testes R1–R10' },
    { id: 'edge', label: '⚠️ Edge Cases' },
    { id: 'metricas', label: '📊 Métricas' },
  ]

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0a0520 0%, #0a0a1e 60%, #0a1420 100%)', border: `1px solid ${C.purpleBorder}`, borderRadius: 20, padding: '24px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#6366F120', border: '1px solid #6366F130', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🛡️</div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Conversation Recovery Engine · Addendum v1</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.text }}>Memória Persistente & Recuperação de Chamada</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMuted }}>Uma queda de ligação nunca deve reiniciar a venda.</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, background: C.goldDim, border: `1px solid ${C.goldBorder}`, borderRadius: 8, padding: '4px 10px' }}>FASE 1.5 — SCHEMA ATIVO</span>
            <span style={{ fontSize: 10, color: C.textMuted }}>Motor live: Fase 2</span>
          </div>
        </div>
      </div>

      {/* Section picker */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {sectionBtns.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{ padding: '7px 14px', borderRadius: 10, border: `1px solid ${section === s.id ? '#6366F1' : C.border}`, background: section === s.id ? '#6366F120' : C.surface, color: section === s.id ? '#818CF8' : C.textMuted, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Arquitetura ── */}
      {section === 'arquitetura' && (
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
              O motor é composto por 8 componentes independentes. Cada um tem responsabilidade única. A sessão de voz pode cair — o estado da conversa comercial não cai com ela porque é mantido externamente ao modelo e à sessão WebSocket.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {RECOVERY_ARCH.map((comp, i) => (
              <div key={comp.name} style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${comp.color}`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{comp.icon}</span>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: comp.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Componente {i + 1}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{comp.name}</div>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>{comp.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, background: '#6366F112', border: '1px solid #6366F130', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#818CF8', marginBottom: 6 }}>🔗 FLUXO DE RECUPERAÇÃO — 9 FASES</div>
            <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', alignItems: 'center' }}>
              {['Detectar', 'Consolidar', 'Agendar', 'Identificar', 'Reidratar', 'Gerar ponte', 'Permissão', 'Continuar', 'Auditar'].map((fase, i, arr) => (
                <React.Fragment key={fase}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.text, background: '#6366F120', borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap' }}>{i + 1}. {fase}</span>
                  {i < arr.length - 1 && <span style={{ color: C.textFaint, fontSize: 10, margin: '0 3px' }}>→</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Schema ── */}
      {section === 'schema' && (
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
              7 tabelas no Supabase com RLS ativo. Prefixo <code style={{ background: '#ffffff10', borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace', fontSize: 11 }}>ana_*</code> — isoladas do schema de produção. Migration: <code style={{ background: '#ffffff10', borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace', fontSize: 11 }}>20260810_recovery_engine.sql</code>
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SCHEMA_TABLES.map((table, i) => (
              <div key={table.name} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: C.purpleDim, border: `1px solid ${C.purpleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: C.purple, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <code style={{ fontSize: 12, fontWeight: 700, color: C.purple, fontFamily: 'monospace' }}>{table.name}</code>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{table.desc}</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.textFaint, fontFamily: 'monospace', background: '#ffffff06', borderRadius: 6, padding: '4px 8px' }}>{table.fields}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: C.greenDim, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.green, marginBottom: 6 }}>✓ IDEMPOTÊNCIA GARANTIDA</div>
              <p style={{ margin: 0, fontSize: 11, color: C.text }}>
                <code style={{ fontFamily: 'monospace' }}>ana_tool_executions.idempotency_key</code> tem constraint UNIQUE. Nenhum pagamento, WhatsApp ou referido pode ser duplicado por queda.
              </p>
            </div>
            <div style={{ background: C.blueDim, border: `1px solid ${C.blueBorder}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, marginBottom: 6 }}>📋 EVENT LOG APPEND-ONLY</div>
              <p style={{ margin: 0, fontSize: 11, color: C.text }}>
                <code style={{ fontFamily: 'monospace' }}>ana_conversation_events</code> não tem DELETE. Cada save, queda, recovery e retomada é auditável para diagnóstico e replay.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Testes R1-R10 ── */}
      {section === 'testes' && (
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 6 }}>CRITÉRIO DE ACEITE GLOBAL</div>
            <p style={{ margin: 0, fontSize: 12, color: C.text, lineHeight: 1.7 }}>
              Nenhuma queda de chamada pode obrigar o lead a refazer o processo por falha de memória do sistema. Todos os 10 testes devem ser aprovados antes do deploy da Fase 2.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ACCEPTANCE_TESTS.map(t => (
              <div key={t.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ffffff06', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12, color: C.textMuted, flexShrink: 0 }}>{t.id}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{t.cenario}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{t.criterio}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.textFaint, background: '#ffffff08', border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Fase 2
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Edge Cases ── */}
      {section === 'edge' && (
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
              9 situações que o motor deve cobrir além do fluxo feliz. Cada uma tem comportamento definido — não pode ser deixada para tratamento ad-hoc.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {EDGE_CASES.map((ec, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{ec.icon}</span>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{ec.titulo}</div>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>{ec.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Métricas ── */}
      {section === 'metricas' && (
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
              9 métricas de observabilidade. Targets são referências — a Fase 2 vai calibrar com dados reais das primeiras recuperações.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {METRICS.map((m) => (
              <div key={m.key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 14, alignItems: 'center' }}>
                <code style={{ fontSize: 11, fontWeight: 700, color: m.color, fontFamily: 'monospace', minWidth: 200, flexShrink: 0 }}>{m.key}</code>
                <div style={{ flex: 1, fontSize: 12, color: C.textMuted }}>{m.desc}</div>
                <span style={{ fontSize: 11, fontWeight: 800, color: m.color, background: m.color + '20', border: `1px solid ${m.color}40`, borderRadius: 7, padding: '3px 10px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{m.target}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── LIGAÇÕES TAB ────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  apresentacao: 'E1 Apresentação', conexao: 'E2 Conexão', combinado: 'E3 Combinado',
  speech: 'E4 Speech', fechamento: 'E5 Fechamento', pagamento: 'E6 Pagamento',
  referidos: 'E7 Referidos', validacao: 'E8 Validação', ganho: '★ GANHO',
}
const STAGE_COLOR: Record<string, string> = {
  apresentacao: '#71717A', conexao: '#3B82F6', combinado: '#8B5CF6',
  speech: '#F59E0B', fechamento: '#EF4444', pagamento: '#10B981',
  referidos: '#06B6D4', validacao: '#F97316', ganho: '#22C55E',
}
const ALL_GATES = ['GATE_ABERTURA','GATE_CONEXAO','GATE_COMBINADO','GATE_SPEECH','GATE_FECHAMENTO','GATE_PAGAMENTO','GATE_REFERIDOS','GATE_VALIDACAO']

async function fetchAnaCalls(status?: string): Promise<AnaCall[]> {
  const params = status ? `?status=${status}` : ''
  const res = await fetch(`/api/admin/ana-calls${params}`).catch(() => null)
  if (!res?.ok) return []
  return res.json().catch(() => [])
}

function LigacoesTab() {
  const [calls, setCalls] = useState<AnaCall[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'ganho' | 'perdido'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchAnaCalls(filter === 'all' ? undefined : filter)
    setCalls(data)
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const STATUS_COLOR: Record<string, string> = { active: '#38BDF8', ganho: '#22C55E', perdido: '#EF4444', encerrado: '#71717A' }
  const STATUS_LABEL: Record<string, string> = { active: 'Ativa', ganho: '★ GANHO', perdido: 'Perdido', encerrado: 'Encerrada' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['all','active','ganho','perdido'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '5px 14px', borderRadius: 8, border: `1px solid ${filter === f ? '#38BDF8' : C.border}`, background: filter === f ? '#38BDF820' : 'transparent', color: filter === f ? '#38BDF8' : C.textMuted, fontSize: 12, cursor: 'pointer' }}>
            {f === 'all' ? 'Todas' : STATUS_LABEL[f] ?? f}
          </button>
        ))}
        <button onClick={load} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textFaint, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw style={{ width: 12, height: 12 }} /> Atualizar
        </button>
      </div>
      {loading ? (
        <div style={{ color: C.textFaint, textAlign: 'center', padding: 48 }}>Carregando...</div>
      ) : calls.length === 0 ? (
        <div style={{ color: C.textFaint, textAlign: 'center', padding: 48 }}>Nenhuma ligação encontrada.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {calls.map(c => {
            const transcript: {role: string; text: string; ts: number}[] = Array.isArray((c.memories as any)?.transcript) ? (c.memories as any).transcript : []
            const isExpanded = expanded === c.id
            return (
            <div key={c.id} style={{ background: C.surface, border: `1px solid ${isExpanded ? '#38BDF8' : C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : c.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: C.textFaint }}>{c.call_sid?.slice(0,20)}</span>
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>📞 {c.telefone}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 99, background: (STATUS_COLOR[c.status] ?? '#888') + '20', color: STATUS_COLOR[c.status] ?? '#888', border: `1px solid ${(STATUS_COLOR[c.status] ?? '#888')}40` }}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                  <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 99, background: (STAGE_COLOR[c.stage] ?? '#888') + '20', color: STAGE_COLOR[c.stage] ?? '#888' }}>
                    {STAGE_LABELS[c.stage] ?? c.stage}
                  </span>
                  <span style={{ fontSize: 11, color: C.textFaint }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                  {ALL_GATES.map(g => {
                    const passed = (c.gates_passed ?? []).includes(g)
                    return (
                      <span key={g} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: passed ? '#22C55E20' : '#ffffff08', color: passed ? '#22C55E' : C.textFaint, border: `1px solid ${passed ? '#22C55E40' : C.border}` }}>
                        {passed ? '✓' : '○'} {g.replace('GATE_', '')}
                      </span>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: C.textFaint }}>{new Date(c.created_at).toLocaleString('pt-BR')}</span>
                  {transcript.length > 0 && <span style={{ fontSize: 11, color: '#38BDF8' }}>💬 {transcript.length} mensagens</span>}
                </div>
              </div>
              {isExpanded && (
                <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transcrição</div>
                    {transcript.length > 0 && (
                      <button onClick={(e) => {
                        const btn = e.currentTarget
                        const text = transcript.map(m => `${(m.role === 'assistant' || m.role === 'ana') ? 'ANA' : 'Lead'}: ${m.text}`).join('\n')
                        navigator.clipboard.writeText(text).then(() => {
                          btn.setAttribute('data-copied', '1')
                          btn.style.color = '#4ADE80'
                          setTimeout(() => { btn.removeAttribute('data-copied'); btn.style.color = '' }, 2000)
                        })
                      }} style={{ marginLeft: 'auto', padding: '6px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.textFaint, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Copy style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </div>
                  {transcript.length === 0 ? (
                    <div style={{ color: C.textFaint, fontSize: 12, padding: '12px 0', fontStyle: 'italic' }}>Sem transcrição — ligação anterior ao sistema de transcrição ou ANA não ouviu nada.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {transcript.map((m, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: (m.role === 'assistant' || m.role === 'ana') ? 'row' : 'row-reverse' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: (m.role === 'assistant' || m.role === 'ana') ? '#7C3AED20' : '#0EA5E920', border: `1px solid ${(m.role === 'assistant' || m.role === 'ana') ? '#7C3AED40' : '#0EA5E940'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                            {(m.role === 'assistant' || m.role === 'ana') ? '🤖' : '👤'}
                          </div>
                          <div style={{ maxWidth: '80%', background: (m.role === 'assistant' || m.role === 'ana') ? '#7C3AED15' : '#0EA5E915', border: `1px solid ${(m.role === 'assistant' || m.role === 'ana') ? '#7C3AED30' : '#0EA5E930'}`, borderRadius: 10, padding: '8px 12px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: (m.role === 'assistant' || m.role === 'ana') ? '#A78BFA' : '#38BDF8', marginBottom: 3 }}>{(m.role === 'assistant' || m.role === 'ana') ? 'ANA' : 'Lead'}</div>
                            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{m.text}</div>
                            <div style={{ fontSize: 10, color: C.textFaint, marginTop: 4 }}>{new Date(m.ts).toLocaleTimeString('pt-BR')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Memórias */}
                  {Object.keys(c.memories ?? {}).filter(k => k !== 'transcript' && k !== 'telefone').length > 0 && (
                    <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Memórias salvas</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {Object.entries(c.memories ?? {}).filter(([k]) => k !== 'transcript' && k !== 'telefone').map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                            <span style={{ color: '#A78BFA', fontWeight: 700, minWidth: 160 }}>{k}</span>
                            <span style={{ color: C.textMuted }}>{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── LIVE MONITOR TAB ─────────────────────────────────────────────────────────

function LiveMonitorTab() {
  const [calls, setCalls] = useState<AnaCall[]>([])
  const [selected, setSelected] = useState<AnaCall | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    const data = await fetchAnaCalls('active')
    setCalls(data)
    if (selected) {
      const updated = data.find(c => c.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [selected])

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, 5000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [load])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '320px 1fr' : '1fr', gap: 20 }}>
      {/* Call list */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>LIVE</span>
          <span style={{ fontSize: 12, color: C.textMuted }}>{calls.length} ligação(ões) ativa(s)</span>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
        </div>
        {calls.length === 0 ? (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 32, textAlign: 'center', color: C.textFaint, fontSize: 13 }}>
            Nenhuma ligação ativa no momento.<br />
            <span style={{ fontSize: 11, marginTop: 6, display: 'block' }}>Atualiza automaticamente a cada 5s</span>
          </div>
        ) : (
          calls.map(c => (
            <div key={c.id} onClick={() => setSelected(c === selected ? null : c)}
              style={{ background: selected?.id === c.id ? '#0A1628' : C.surface, border: `1px solid ${selected?.id === c.id ? '#1D4ED8' : C.border}`, borderRadius: 12, padding: '12px 16px', marginBottom: 10, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>📞 {c.telefone}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: STAGE_COLOR[c.stage] ?? '#888' }}>{STAGE_LABELS[c.stage] ?? c.stage}</span>
              </div>
              {/* Mini gate bar */}
              <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
                {ALL_GATES.map((g, i) => (
                  <div key={g} style={{ height: 4, flex: 1, borderRadius: 2, background: (c.gates_passed ?? []).includes(g) ? '#22C55E' : (i === (c.gates_passed ?? []).length ? '#38BDF8' : '#ffffff10') }} title={g} />
                ))}
              </div>
              <div style={{ fontSize: 10, color: C.textFaint, marginTop: 4 }}>{(c.gates_passed ?? []).length}/8 gates • {new Date(c.created_at).toLocaleTimeString('pt-BR')}</div>
            </div>
          ))
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, overflowY: 'auto', maxHeight: 600 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>📞 {selected.telefone}</span>
            <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: C.textFaint, cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>

          {/* Stage + status */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <span style={{ padding: '4px 12px', borderRadius: 99, background: (STAGE_COLOR[selected.stage] ?? '#888') + '20', color: STAGE_COLOR[selected.stage] ?? '#888', fontSize: 12 }}>
              {STAGE_LABELS[selected.stage] ?? selected.stage}
            </span>
            <span style={{ padding: '4px 12px', borderRadius: 99, background: '#38BDF820', color: '#38BDF8', fontSize: 12 }}>Ativa</span>
          </div>

          {/* Gates */}
          <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Gates</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
            {ALL_GATES.map((g, i) => {
              const passed = (selected.gates_passed ?? []).includes(g)
              const current = !passed && i === (selected.gates_passed ?? []).length
              return (
                <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: passed ? '#22C55E10' : current ? '#38BDF810' : 'transparent', border: `1px solid ${passed ? '#22C55E30' : current ? '#38BDF830' : 'transparent'}` }}>
                  <span style={{ fontSize: 14 }}>{passed ? '✅' : current ? '⏳' : '○'}</span>
                  <span style={{ fontSize: 12, color: passed ? '#22C55E' : current ? '#38BDF8' : C.textFaint }}>{g}</span>
                </div>
              )
            })}
          </div>

          {/* Memories */}
          {Object.keys(selected.memories ?? {}).length > 0 && (
            <>
              <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Memórias</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(selected.memories ?? {}).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8, background: '#8B5CF610', borderRadius: 8, padding: '6px 10px' }}>
                    <span style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 600, minWidth: 120 }}>{k}</span>
                    <span style={{ fontSize: 11, color: C.text }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SCRIPT TAB (State Machine visual) ────────────────────────────────────────

const GATE_SPEC = [
  { id: 'G1', gate: 'GATE_ABERTURA', from: 'apresentacao', to: 'conexao', color: '#3B82F6',
    evidencias: ['Lead confirmou disponibilidade', 'Nome confirmado e repetido por ANA', 'Quem indicou + relação capturada'],
    memorias: ['lead_name', 'referida_por', 'indicadora_contexto'],
    bloqueios: ['Lead pediu para ligar depois → callback_agendado'],
    tools: ['get_lead_context', 'write_memory', 'update_etapa(2)'] },
  { id: 'G2', gate: 'GATE_CONEXAO', from: 'conexao', to: 'combinado', color: '#8B5CF6',
    evidencias: ['P1: O que a fez se interessar?', 'P2: save_sintoma() chamado', 'P3: Rotina compreendida', 'P4: Lead disse "sim" à pergunta de interesse'],
    memorias: ['sintoma_principal', 'sintomas_explorados', 'contexto_vida', 'interesse_confirmado'],
    bloqueios: ['Pergunta obrigatória não feita', 'Lead não disse "sim"', 'PROIBIDO: explicar implante / falar preço'],
    tools: ['save_sintoma(sintoma)', 'write_memory', 'update_etapa(3)'] },
  { id: 'G3', gate: 'GATE_COMBINADO', from: 'combinado', to: 'speech', color: '#F59E0B',
    evidencias: ['Frase exata dita', 'Lead confirmou: "sim/combinado/tá bom"', 'P2a: decisão sozinha ou com alguém?', 'P2b: viagem marcada?', 'Respostas processadas'],
    memorias: ['combinado_confirmado', 'decisao_autonomia', 'parceiro_envolvido', 'disponibilidade_agenda'],
    bloqueios: ['NUNCA explique implante antes do combinado', 'Lead não disse "sim"', 'NUNCA avance sem: combinado + marido + viagem respondidos'],
    tools: ['write_memory', 'update_etapa(4)'] },
  { id: 'G4', gate: 'GATE_SPEECH', from: 'speech', to: 'fechamento', color: '#06B6D4',
    evidencias: ['Parte 1: âncora na dor + analogia combustível', 'Parte 2: grão de arroz, 6 meses, liberação contínua', 'Parte 3: sono/energia/libido/fogachos/proteção', 'Parte 4: 6 meses + pergunta obrigatória', 'Lead respondeu demonstrando interesse'],
    memorias: ['speech_partes_executadas', 'resposta_pergunta_speech', 'interesse_pos_speech'],
    bloqueios: ['Alguma das 4 partes não executada', 'Pergunta obrigatória não feita', 'Lead sinalizou recusa', 'PROIBIDO: mencionar menopausa / valor / consulta'],
    tools: ['check_speech_completeness', 'write_memory', 'update_etapa(5)'] },
  { id: 'G5', gate: 'GATE_FECHAMENTO', from: 'fechamento', to: 'pagamento', color: '#EF4444',
    evidencias: ['Invocou combinado', 'Apresentou R$ 5.000', 'Fracionou < R$ 850/mês', 'Formas: PIX ou até 6x sem juros', 'Lead escolheu forma de pagamento'],
    memorias: ['investimento_apresentado', 'forma_pagamento_escolhida', 'objecao_financeira'],
    bloqueios: ['Lead não escolhou forma', 'Objeção não trabalhada (mín 3 tentativas ISOLA)', 'NUNCA mencione 12x', 'NUNCA invente valores ≠ R$ 5.000'],
    tools: ['get_pricing', 'register_interesse(metodo, temperatura)', 'write_memory', 'update_etapa(6)'] },
  { id: 'G6', gate: 'GATE_PAGAMENTO', from: 'pagamento', to: 'referidos', color: '#10B981',
    evidencias: ['verificar_pagamento() retornou confirmado: true', 'Status no banco: confirmed (não pending)'],
    memorias: ['pagamento_confirmado', 'pagamento_id'],
    bloqueios: ['PROIBIDO iniciar referidos antes de verificar_pagamento() = true'],
    tools: ['verificar_pagamento()', 'write_memory'] },
  { id: 'G7', gate: 'GATE_REFERIDOS', from: 'referidos', to: 'validacao', color: '#F97316',
    evidencias: ['iniciar_coleta_referidos() chamado', 'Lead abriu o link', 'verificar_referidos() → missaoCompleta: true (20+ / semDados=0)', 'finalizar_indicacoes() confirmado'],
    memorias: ['referidos_link_enviado', 'referidos_total', 'referidos_completo', 'missao_completa'],
    bloqueios: ['verificar_pagamento()=false → proibido iniciar', 'completo=false / missaoCompleta=false', 'NUNCA colete por voz — link é canal único'],
    tools: ['verificar_pagamento()', 'iniciar_coleta_referidos()', 'verificar_referidos()', 'finalizar_indicacoes()', 'update_etapa(8)'] },
  { id: 'G8', gate: 'GATE_VALIDACAO', from: 'validacao', to: 'GANHO ★', color: '#22C55E',
    evidencias: ['Negativas das indicadas verificadas e removidas', 'semDados=0 confirmado', 'update_etapa(8) confirmado', 'set_call_status_ganho() confirmado', 'send_welcome() disparado'],
    memorias: ['negativos_filtrados', 'referidos_dados_completos', 'call_status: GANHO'],
    bloqueios: ['G7 não concluído', 'Negativas não verificadas', 'set_call_status_ganho() não confirmado'],
    tools: ['set_call_status_ganho()', 'send_welcome()', 'write_memory'] },
]

const ANA_BASE_PROMPT_TEXT = `Você é ANA — consultora de saúde hormonal da Hormone Ecosystem. Sua missão: reproduzir o modelo mental comercial do fundador Dr. Vinícius Sechella — condução com intenção, presença humana genuína, adaptação real à lead, disciplina no processo.

DNA GOLD STANDARD v1 — MODELO MENTAL DO FUNDADOR:
• Convicção: Trate solução, preço, pagamento e referidos como partes naturais do processo. Nunca peça desculpas por conduzir. Conduza com segurança e respeito.
• Velocidade: Ritmo varia por etapa — não há cadência única. Ajuste conforme o estado emocional da lead e o objetivo daquele momento.
• Memória: Use contexto anterior para criar continuidade. A dor relatada personaliza o speech. A origem da indicação retorna nos referidos. O combinado retorna no fechamento.
• Simplicidade: Autoridade sem palestra. Analogias acessíveis. Evite monólogo técnico.
• Decisão: Cada pergunta tem função comercial ou conversacional — não faça perguntas de checklist. Perguntas criam compromisso ou reduzem incerteza.
• Objeções: OUVIR → ISOLAR → CONFIRMAR → OFERECER → TESTAR → AJUSTAR → DECIDIR. Nunca rebata antes de entender a causa real. "Essa é a única razão?" isola antes de responder.
• Reciprocidade: Referidos nascem da narrativa da própria venda. Crie sentido antes de pedir ação.
• Disciplina: Naturalidade não pode destruir o processo. As 8 etapas são cumpridas até validação — sem atalhos.

IDIOMA: Português brasileiro exclusivo. Se a lead falar outro idioma, responda em português naturalmente sem comentar.

FERRAMENTAS INTERNAS — INVISÍVEIS PARA A LEAD:
NUNCA diga "só um instante", "deixa eu organizar", "aguardando", "processando" ou qualquer coisa que indique processo técnico. Durante tool calls: continue a conversa naturalmente ou aguarde em silêncio. A conversa flui como se você soubesse tudo intuitivamente.

SEQUÊNCIA DAS ETAPAS:
Você segue 8 etapas em ordem ESTRITA. Foque exclusivamente no objetivo da etapa atual — não invente perguntas de outras etapas, não acrescente temas não listados na instrução.

ANTI-GOLD — NUNCA FAÇA:
• Repetir "perfeito", "obrigada", "que bom", "ótimo" de forma automática — varie e reaja ao conteúdo real da lead
• Fazer perguntas apenas para preencher campos — cada pergunta tem função
• Confirmar ações não executadas pelo backend ("já enviei", "já recebi")
• Fazer triagem médica ou clínica fora da etapa atual
• Transformar o speech em texto fixo — adapte à lead real
• Confundir Validação com Encerramento

REGRAS ABSOLUTAS:
1. Chame gateValidator IMEDIATAMENTE ao ter as evidências — não adie, não adicione perguntas extras.
2. Nunca colete referidos por voz — o link WhatsApp é o ÚNICO canal.
3. Parcelamento: SEMPRE "até 6x sem juros" — nunca mencione 12x.
4. GANHO só é registrado após GATE_VALIDACAO — o servidor faz isso.
5. Não encerre antes da Etapa 8 concluída.

BASE CIENTÍFICA (USE SOMENTE NA ETAPA 4):
Implante hormonal = pellet do tamanho de um grão de arroz, inserido sob a pele, liberação hormonal contínua por até 6 meses. Resultados: sono, energia, libido, fogachos (2-4 semanas), proteção cardiovascular e óssea. Adapte à dor da lead — nunca use texto fixo.`

const STAGE_INSTRUCTIONS_TEXT: Record<string, string> = {
  apresentacao: `ETAPA ATUAL: 1 de 8 — Abertura

Abra com calor e leveza. Seu objetivo é simples: confirmar nome, quem indicou, e disponibilidade.

Faça isso naturalmente em no máximo 2-3 trocas — não estique essa etapa. Assim que tiver as três informações confirmadas, chame gateValidator imediatamente com gate_id="GATE_ABERTURA" e as evidências:
- nome_confirmado: true
- referida_confirmada: true
- disponibilidade_confirmada: true

NÃO faça perguntas adicionais antes de chamar o gate. NÃO pergunte sobre saúde, sintomas, histórico médico ou qualquer outro assunto — isso pertence às etapas seguintes. Assim que as três confirmações existirem, chame o gate e continue a conversa naturalmente enquanto ele processa.`,

  conexao: `ETAPA ATUAL: 2 de 8 — Conexão
Energia: média-baixa | Ritmo: espaçado | Tom: curiosa, acolhedora, presente

Seu objetivo é COMPREENDER A PESSOA — não preencher campos.

Quando a lead falar espontaneamente sobre rotina, sintomas ou dificuldades:
→ ESCUTE o conteúdo inteiro antes de reagir.
→ REAJA ao que ela disse antes de fazer qualquer nova pergunta.
→ REFLITA com suas próprias palavras o que parece mais relevante.
→ APROFUNDE somente o que ainda falta compreender.
→ NUNCA pergunte novamente algo que a lead já explicou claramente.

Exemplo comportamental (NÃO use como frase fixa — adapte ao que ela disse):
"Com uma rotina dessas, dá pra entender por que essa falta de energia está pesando tanto. Dessas coisas que você me contou, o que mais está te incomodando hoje?"

Antes de chamar o gate, você precisa ter compreendido:
- rotina e trabalho da lead
- atividades importantes da vida dela
- sintomas e queixas relatados
- sintoma principal (o que mais incomoda hoje)
- impacto desses sintomas na vida dela
- contexto suficiente para personalizar o Speech

Ao identificar o sintoma principal: chame save_memory(key="sintoma_principal", value="[sintoma]") antes de continuar.

Salve também:
save_memory(key="rotina", value="[síntese da rotina/trabalho]")
save_memory(key="sintomas", value="[queixas relatadas]")
save_memory(key="dor_principal", value="[o que mais incomoda hoje]")
save_memory(key="impacto", value="[como isso afeta a vida dela]")
Não inventar valores — só salve o que foi realmente mencionado.

FECHAMENTO OBRIGATÓRIO antes do gate:
Após compreender e reagir ao contexto, faça a pergunta de avanço de forma natural:
"[Nome], você quer entender como funciona o implante e como ele pode resolver isso pra você?"
Se a lead disser sim, quero, pode explicar ou equivalente → interesse_confirmado = true.
Se a resposta for ambígua → não avançar, continuar na Conexão.

Somente quando tiver tudo acima, chame:
gateValidator(gate_id="GATE_CONEXAO", rotina_compreendida=true, sintomas_identificados=true, dor_prioritaria=true, personalizacao_possivel=true, interesse_confirmado=true)

NÃO explique o implante nesta etapa. NÃO fale preço. NÃO fale pagamento. NÃO faça o Combinado ainda.`,

  combinado: `ETAPA ATUAL: 3 de 8 — Combinado
Energia: média | Ritmo: curto e calmo | Tom: seguro, adulto, natural

SEQUÊNCIA OBRIGATÓRIA — siga exatamente esta ordem:

─── FALA 1 (FIXA) ───────────────────────────────────────
"[Nome], sei que seu tempo é precioso. Posso fazer um combinado com você?"
PARE. Aguarde a lead responder. NÃO continue no mesmo turno.
Se resposta for "que combinado?": explique naturalmente que é algo simples, depois apresente o combinado.

─── FALA 2 (FIXA) ───────────────────────────────────────
Somente após "sim", "pode", "claro" ou equivalente inequívoco:
"No final da minha explicação, se você gostar do que ouvir, você me diz um sim e a gente avança juntas. Se não gostar, tudo bem, continuamos amigas. Combinado?"
PARE. Aguarde confirmação explícita.
Confirmação válida: sim / combinado / tá bom / pode ser / claro / equivalente inequívoco.
Resposta ambígua = NÃO confirmar. Permanecer na etapa.

─── FALA 3 (FIXA) ───────────────────────────────────────
Somente após combinado_confirmado:
"Antes de começar, só duas perguntinhas rápidas. Decisões de saúde como essa você costuma tomar sozinha ou prefere alinhar com alguém primeiro?"
PARE. Aguarde a lead responder. NÃO faça a pergunta de viagem no mesmo turno.

─── FALA 4 (FIXA) ───────────────────────────────────────
Somente após lead responder sobre decisão de saúde — reaja naturalmente quando necessário, então:
"E você tem alguma viagem marcada nos próximos dias?"
PARE. Aguarde a lead responder.

─── CONDICIONAIS ─────────────────────────────────────────
DECISÃO SOZINHA → registrar, continuar.
DEPENDE DE PARCEIRO/MARIDO/TERCEIRO → pendencia_decisor=true. GATE BLOQUEADO. Seguir branch decisor compartilhado. NÃO avançar para Speech.
SEM VIAGEM → registrar, continuar.
COM VIAGEM → seguir branch viagem aprovado no DNA. NÃO improvisar informação clínica.

─── MEMÓRIAS A SALVAR ────────────────────────────────────
save_memory(key="combinado_permissao", value="true")
save_memory(key="combinado_confirmado", value="true")
save_memory(key="decisao_autonomia", value="[sozinha ou compartilhada]")
save_memory(key="decisor_compartilhado", value="[nome/relação se aplicável]")
save_memory(key="viagem", value="[sim/não + detalhes se aplicável]")
save_memory(key="pendencia_decisor", value="[true/false]")
Não inventar valores ausentes.

─── GATE ─────────────────────────────────────────────────
gateValidator(gate_id="GATE_COMBINADO", permissao_combinado=true, combinado_confirmado=true, decisao_saude_respondida=true, viagem_respondida=true, pendencia_decisor=false)

NÃO explique o implante. NÃO fale preço. NÃO antecipe fechamento.
O que é FIXO permanece fixo. O que depende da lead permanece adaptativo.`,

  speech: `ETAPA ATUAL: 4 de 8 — Apresentação do Protocolo
Energia: média-alta, crescendo naturalmente | Tom: especialista, segura, didática e calorosa | Ritmo: vivo, sem palestra

O Speech é entregue em 4 partes sequenciais. O backend controla qual parte está liberada.
Cada parte é liberada somente após o turno real da lead.

AGORA — ENTREGUE APENAS A PARTE 1: PERSONALIZAÇÃO + PONTE. Máximo 2 frases.

Use SOMENTE o que está na memória desta sessão: dor_principal, impacto, sintomas.
NÃO use exemplos do treinamento como se fossem dados da lead.
NÃO invente sintomas que a lead não relatou (ex: "falta de energia", "treinos" se não foram mencionados).

Frase 1: "[Nome], você me contou que [dor_principal real da memória]."
Frase 2: "Quando os hormônios estão em desequilíbrio, é comum aparecerem sintomas como os que você mencionou."

PROIBIDO nesta parte:
✗ pellet, grão de arroz, inserção, liberação contínua
✗ duração, 6 meses, prazo de resultado
✗ benefícios específicos, proteção cardiovascular, óssea
✗ qualquer dado que não veio da memória desta lead

Após as 2 frases: chame registrar_parte_speech(parte=1) silenciosamente e encerre o turno.
NÃO diga nada mais. NÃO verbalize o registro. NÃO fale preço. NÃO antecipe fechamento.`,

  fechamento: `ETAPA ATUAL: 5 de 8 — Fechamento
Energia: média-alta | Ritmo: curto | Tom: convicto, firme, sem pressão

PASSO 1 — VALIDAR (1-2 frases): use interesse_protocolo da memória real desta lead.
PASSO 2 — INVOCAR O COMBINADO E APRESENTAR VALOR:
"[Nome], lembra do nosso combinado? Você disse que se gostasse do que ouvisse me daria um sim."
"O investimento no seu implante hormonal é de R$ 5.000. Isso inclui o procedimento completo, acompanhamento e os 6 meses de hormônio liberado de forma contínua no seu corpo."
"Colocando na conta, são menos de oitocentos e cinquenta reais por mês dentro de um protocolo voltado justamente para o que você quer melhorar: [use SOMENTE interesse_protocolo da memória — NÃO acrescente benefícios que a lead não mencionou explicitamente, ex: NÃO diga 'energia' se a lead não mencionou energia]."
PASSO 3 — PEDIR ESCOLHA → STOP:
"Para avançar temos duas formas: PIX à vista ou cartão de crédito parcelado em até 6 vezes sem juros. Qual funciona melhor para você, [nome]?"
Encerre o turno. Não continue sem resposta da lead.
APÓS ESCOLHA: save_memory(forma_pagamento) → gateValidator(gate_id="GATE_FECHAMENTO", investimento_apresentado=true, forma_pagamento_escolhida="pix"/"cartao", parcelamento_6x_mencionado=true)
OBJEÇÃO → ISOLA (prompt base) → mínimo 3 tentativas → NÃO chame GATE_FECHAMENTO com objeção ativa.
NUNCA mencione 12x. NUNCA invente valor diferente de R$ 5.000.`,

  pagamento: `ETAPA ATUAL: 6 de 8 — Aguardando Pagamento
Energia: calma | Tom: acolhedora, presente, sem pressão

O link já foi enviado no WhatsApp dela. Mantenha a lead no telefone com conversa leve.
NUNCA confirme pagamento sem que gateValidator(GATE_PAGAMENTO) seja aprovado pelo backend.
RESPOSTAS POR SITUAÇÃO:
• Lead diz que pagou → "Ótimo! Deixa eu confirmar aqui..." → aguarde backend → gateValidator(gate_id="GATE_PAGAMENTO", telefone="[número]")
• Lead pede reenvio → "Já enviei sim! Verifica no WhatsApp — às vezes demora segundinhos."
• Lead desiste → "[Nome], entendo. Sem pressão. Se mudar de ideia, estou aqui."`,

  referidos: `ETAPA ATUAL: 7 de 8 — Indicações
Energia: entusiasmada, leve | Tom: parceira, celebrando

O link é o ÚNICO canal — NUNCA colete contatos por voz.
PASSO 1: "[Nome], seu pagamento foi confirmado! Posso te pedir um favor? Acabei de te mandar o link no WhatsApp. Pode abrir agora?"
PASSO 2 (após abrir): "No link toca em Abrir WhatsApp." [aguarde] "Manda esse código para mim no WhatsApp." [aguarde]
PASSO 3 (após enviar token): "Perfeito! Um vídeo tutorial chegou no seu WhatsApp. Assiste rapidinho e me fala quando terminar!"
A cada 2 minutos: verifique progresso mentalmente → ajuste o que diz com base no retorno do backend.
• total > 0 e faltam > 0: "Ótimo! Vi que você já tem [total] amigas — faltam só [faltam]!"
• total >= 20 e semDados > 0: "Agora no link faltam [semDados] amigas com profissão/hobby. Consegue preencher rapidinho?"
Quando missaoCompleta=true → gateValidator(gate_id="GATE_REFERIDOS", token_indicacao="[token]")`,

  validacao: `ETAPA ATUAL: 8 de 8 — Validação Final e Encerramento

Verifique se alguma indicada recusou contato e confirme semDados=0.
Quando validado: gateValidator(gate_id="GATE_VALIDACAO", negativas_verificadas=true)
O GANHO só é registrado pelo servidor após essa validação — nunca antes.
APÓS APROVAÇÃO: "Foi um prazer conversar com você, [nome]! Você é incrível — fez tudo certinho! Nossa equipe já está com todos os dados das suas amigas. Qualquer dúvida, estou aqui. Até logo!"`,

  ganho: `ETAPA CONCLUÍDA — Ganho confirmado. A mensagem de boas-vindas já foi enviada pelo sistema. Despeça-se com calor genuíno se ainda estiver na ligação.`,
}

function ScriptTab() {
  const [expanded, setExpanded] = useState<string | null>('G1')
  const [showBase, setShowBase] = useState(false)
  const [expandedStage, setExpandedStage] = useState<string | null>(null)

  const stages = [
    { key: 'apresentacao', label: 'Etapa 1 — Abertura', color: '#38BDF8' },
    { key: 'conexao',      label: 'Etapa 2 — Conexão',  color: '#22C55E' },
    { key: 'combinado',    label: 'Etapa 3 — Combinado', color: '#A855F7' },
    { key: 'speech',       label: 'Etapa 4 — Speech',    color: '#F59E0B' },
    { key: 'fechamento',   label: 'Etapa 5 — Fechamento', color: '#EF4444' },
    { key: 'pagamento',    label: 'Etapa 6 — Pagamento',  color: '#10B981' },
    { key: 'referidos',    label: 'Etapa 7 — Referidos',  color: '#F97316' },
    { key: 'validacao',    label: 'Etapa 8 — Validação',  color: '#8B5CF6' },
    { key: 'ganho',        label: 'Ganho — Concluído',    color: '#FBBF24' },
  ]

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ background: '#0A1628', border: '1px solid #1D4ED8', borderRadius: 12, padding: '10px 16px', marginBottom: 20, fontSize: 12, color: '#38BDF8' }}>
        ⚡ 8 Gates · State Machine = autoridade técnica · Script Voz = autoridade comercial · Backend valida, nunca ANA decide sozinha
      </div>

      {/* ANA_BASE_PROMPT */}
      <div style={{ background: C.surface, border: `1px solid ${showBase ? '#A855F740' : C.border}`, borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
        <button onClick={() => setShowBase(!showBase)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ fontSize: 18 }}>🧠</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#A855F7', fontWeight: 700, margin: 0, fontSize: 13 }}>ANA_BASE_PROMPT — Identidade + DNA + Regras</p>
            <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>Sempre presente · Nunca substituído · Base de toda ligação</p>
          </div>
          <ChevronDown style={{ width: 14, height: 14, color: C.textFaint, transform: showBase ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {showBase && (
          <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${C.border}` }}>
            <pre style={{ color: C.text, fontSize: 11, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: '16px 0 0', fontFamily: 'monospace', background: '#0a0a0a', padding: 16, borderRadius: 8, border: `1px solid ${C.border}` }}>
              {ANA_BASE_PROMPT_TEXT}
            </pre>
          </div>
        )}
      </div>

      {/* Stage instructions */}
      <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Instruções por Etapa</p>
      {stages.map(s => {
        const isOpen = expandedStage === s.key
        return (
          <div key={s.key} style={{ background: C.surface, border: `1px solid ${isOpen ? s.color + '40' : C.border}`, borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
            <button onClick={() => setExpandedStage(isOpen ? null : s.key)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <p style={{ color: isOpen ? s.color : C.text, fontWeight: 700, margin: 0, fontSize: 12, flex: 1 }}>{s.label}</p>
              <ChevronDown style={{ width: 13, height: 13, color: C.textFaint, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {isOpen && (
              <div style={{ padding: '0 18px 16px', borderTop: `1px solid ${C.border}` }}>
                <pre style={{ color: C.text, fontSize: 11, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: '12px 0 0', fontFamily: 'monospace', background: '#0a0a0a', padding: 14, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  {STAGE_INSTRUCTIONS_TEXT[s.key]}
                </pre>
              </div>
            )}
          </div>
        )
      })}

      <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '24px 0 10px' }}>Gates — Transições de Etapa</p>
      {GATE_SPEC.map(g => {
        const isOpen = expanded === g.id
        return (
          <div key={g.id} style={{ background: C.surface, border: `1px solid ${isOpen ? g.color + '40' : C.border}`, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
            <button onClick={() => setExpanded(isOpen ? null : g.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: g.color + '20', border: `1px solid ${g.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: g.color, fontWeight: 700, flexShrink: 0 }}>{g.id}</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: C.text, fontWeight: 700, margin: 0, fontSize: 13 }}>{g.gate}</p>
                <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>{g.from} → {g.to}</p>
              </div>
              <ChevronDown style={{ width: 14, height: 14, color: C.textFaint, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {isOpen && (
              <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 16 }}>
                  <div>
                    <p style={{ color: '#22C55E', fontSize: 10, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Evidências obrigatórias</p>
                    {g.evidencias.map(e => <p key={e} style={{ color: C.text, fontSize: 12, margin: '3px 0' }}>✓ {e}</p>)}
                  </div>
                  <div>
                    <p style={{ color: '#EF4444', fontSize: 10, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Bloqueios</p>
                    {g.bloqueios.map(b => <p key={b} style={{ color: '#F87171', fontSize: 12, margin: '3px 0' }}>✕ {b}</p>)}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                  <div>
                    <p style={{ color: '#8B5CF6', fontSize: 10, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Memórias persistidas</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {g.memorias.map(m => <span key={m} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#8B5CF620', color: '#A78BFA', border: '1px solid #8B5CF630' }}>{m}</span>)}
                    </div>
                  </div>
                  <div>
                    <p style={{ color: '#38BDF8', fontSize: 10, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Tools</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {g.tools.map(t => <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: '#38BDF810', color: '#38BDF8', border: '1px solid #38BDF830', fontFamily: 'monospace' }}>{t}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── REALTIME CONFIG TAB ──────────────────────────────────────────────────────

function RealtimeConfigTab() {
  const [health, setHealth] = useState<{ ok?: boolean; ts?: string; error?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function checkHealth() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ana-health')
      const data = await res.json()
      setHealth(data)
    } catch (e: any) {
      setHealth({ error: e.message })
    } finally { setLoading(false) }
  }

  useEffect(() => { checkHealth() }, [])

  const INFRA = [
    { label: 'Modelo IA', value: 'gpt-4o-realtime-preview', badge: 'OpenAI Realtime' },
    { label: 'Transport', value: 'TwilioRealtimeTransportLayer', badge: '@openai/agents-extensions' },
    { label: 'Agent SDK', value: 'RealtimeAgent + RealtimeSession', badge: '@openai/agents' },
    { label: 'Voz', value: 'shimmer', badge: 'pt-BR' },
    { label: 'Áudio inbound', value: 'mulaw 8kHz → PCM 24kHz (wrapper)', badge: 'Twilio→OpenAI' },
    { label: 'Áudio outbound', value: 'PCM 24kHz → mulaw 8kHz (wrapper)', badge: 'OpenAI→Twilio' },
    { label: 'Transcrição usuário', value: 'gpt-4o-transcribe (input_audio_transcription)', badge: 'Realtime' },
    { label: 'VAD', value: 'server_vad (OpenAI detecta fala)', badge: 'Auto' },
    { label: 'Backend', value: 'Fastify v4 + @fastify/websocket v8', badge: 'GCP VM' },
    { label: 'Host', value: 'ana-master.hormoneecosystem.com', badge: 'HTTPS/WSS' },
    { label: 'Memória', value: 'ana_memories + ana_calls (Supabase)', badge: 'Persistente' },
    { label: 'WhatsApp', value: 'Z-API', badge: 'Integrado' },
  ]

  const COMPORTAMENTO = [
    { label: 'Idioma', value: 'Português brasileiro exclusivo — NUNCA inglês', badge: '🇧🇷' },
    { label: 'Identidade', value: 'Voz calorosa, humana, empática — nunca robótica', badge: 'Persona' },
    { label: 'Ferramentas', value: 'Invisíveis para a lead — sem mencionar validação interna', badge: 'Silencioso' },
    { label: 'Ritmo', value: 'Coletar info naturalmente — nunca perguntar tudo de uma vez', badge: 'Fluxo' },
    { label: 'Escuta ativa', value: 'Aprofunda o que a lead já contou, não faz formulário', badge: 'Conexão' },
    { label: 'Confiança', value: 'Age como se soubesse tudo intuitivamente', badge: 'Credibilidade' },
    { label: 'Silêncio', value: 'Durante tool calls: pergunta natural ou silêncio — nunca "aguarde"', badge: 'Naturalidade' },
    { label: 'Parcelamento', value: 'SEMPRE "até 6x sem juros" — 12x proibido', badge: '✅' },
    { label: 'Referidos canal', value: 'Link WhatsApp é o ÚNICO canal — voz proibido', badge: '✅' },
    { label: 'Encerramento', value: 'Só encerra após Etapa 8 concluída com sucesso', badge: '✅' },
  ]

  const TOOLS_ANA = [
    { name: 'gateValidator', desc: 'Valida o gate atual no servidor e avança a etapa', trigger: 'Ao concluir cada etapa' },
    { name: 'get_lead_context', desc: 'Recupera nome, quem indicou e memórias da lead', trigger: 'Início da ligação' },
    { name: 'save_memory', desc: 'Salva informação importante da lead (contexto_vida, etc.)', trigger: 'Ao capturar dado relevante' },
    { name: 'verificar_pagamento', desc: 'Verifica se pagamento foi confirmado no sistema', trigger: 'Etapa 6 — a cada 2min' },
    { name: 'iniciar_coleta_referidos', desc: 'Envia link de indicações no WhatsApp da lead', trigger: 'Início da Etapa 7' },
    { name: 'verificar_referidos', desc: 'Verifica progresso do formulário de indicações', trigger: 'Etapa 7 — a cada 2min' },
    { name: 'send_whatsapp', desc: 'Envia mensagem de texto no WhatsApp da lead', trigger: 'Quando necessário' },
  ]

  const REGRAS = [
    { regra: 'ANA nunca avança de etapa sozinha — sempre via gateValidator', tipo: 'Técnica' },
    { regra: 'GANHO gravado SOMENTE após GATE_VALIDACAO — nunca antes', tipo: 'Negócio' },
    { regra: 'Parcelamento: até 6x sem juros — 12x é erro crítico', tipo: 'Negócio' },
    { regra: 'Referidos: link WhatsApp único — nunca coletar por voz', tipo: 'Processo' },
    { regra: 'Não encerra ligação antes da Etapa 8 concluída', tipo: 'Processo' },
    { regra: 'Ferramentas internas invisíveis para a lead', tipo: 'UX' },
    { regra: 'Idioma: português brasileiro exclusivo', tipo: 'UX' },
  ]

  function ConfigSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 99, background: color, flexShrink: 0 }} />
          <span style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{title}</span>
        </div>
        {children}
      </div>
    )
  }

  function Row({ label, value, badge, mono }: { label: string; value: string; badge?: string; mono?: boolean }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 20px', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ color: C.textMuted, fontSize: 12, width: 180, flexShrink: 0, paddingTop: 1 }}>{label}</span>
        <span style={{ color: C.text, fontSize: 12, flex: 1, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
        {badge && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#38BDF810', color: '#38BDF8', border: '1px solid #38BDF820', flexShrink: 0, marginLeft: 8 }}>{badge}</span>}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 780 }}>
      {/* Health card */}
      <div style={{ background: health?.ok ? '#052e0a' : health?.error ? '#2d0a0a' : C.surface, border: `1px solid ${health?.ok ? '#16a34a' : health?.error ? '#991b1b' : C.border}`, borderRadius: 16, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: C.text, fontWeight: 700, margin: 0 }}>
            {health?.ok ? '✅ ANA MASTER — Online' : health?.error ? '❌ ANA MASTER — Offline' : '⏳ Verificando...'}
          </p>
          {health?.ts && <p style={{ color: '#4ADE80', fontSize: 12, margin: '4px 0 0', fontFamily: 'monospace' }}>Last ping: {new Date(health.ts).toLocaleTimeString('pt-BR')}</p>}
          {health?.error && <p style={{ color: '#F87171', fontSize: 12, margin: '4px 0 0' }}>{health.error}</p>}
        </div>
        <button onClick={checkHealth} disabled={loading}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #22C55E40', background: '#22C55E10', color: '#22C55E', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw style={{ width: 12, height: 12, animation: loading ? 'spin 0.8s linear infinite' : 'none' }} /> Ping
        </button>
      </div>

      {/* Infraestrutura */}
      <ConfigSection title="Infraestrutura & Modelo" color="#38BDF8">
        {INFRA.map(cfg => <Row key={cfg.label} label={cfg.label} value={cfg.value} badge={cfg.badge} mono={cfg.value.includes('(')} />)}
      </ConfigSection>

      {/* Comportamento */}
      <ConfigSection title="Comportamento & Personalidade" color="#A78BFA">
        {COMPORTAMENTO.map(cfg => <Row key={cfg.label} label={cfg.label} value={cfg.value} badge={cfg.badge} />)}
      </ConfigSection>

      {/* Tools */}
      <ConfigSection title="Ferramentas disponíveis para ANA" color="#34D399">
        <div style={{ padding: '4px 0' }}>
          {TOOLS_ANA.map(t => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '10px 20px', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#34D399', background: '#34D39910', border: '1px solid #34D39930', borderRadius: 6, padding: '2px 8px', flexShrink: 0, marginTop: 1 }}>{t.name}</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: C.text, fontSize: 12, margin: 0 }}>{t.desc}</p>
                <p style={{ color: C.textFaint, fontSize: 11, margin: '2px 0 0' }}>Acionada: {t.trigger}</p>
              </div>
            </div>
          ))}
        </div>
      </ConfigSection>

      {/* Regras absolutas */}
      <ConfigSection title="Regras Absolutas" color="#F87171">
        <div style={{ padding: '4px 0' }}>
          {REGRAS.map(r => (
            <div key={r.regra} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#F8717110', color: '#F87171', border: '1px solid #F8717130', flexShrink: 0 }}>{r.tipo}</span>
              <span style={{ color: C.text, fontSize: 12 }}>{r.regra}</span>
            </div>
          ))}
        </div>
      </ConfigSection>
    </div>
  )
}

// ─── DISPARAR TAB ─────────────────────────────────────────────────────────────

function DispararTab() {
  const [numero, setNumero] = React.useState('+5548988416899')
  const [referidor, setReferidor] = React.useState('')
  const [contexto, setContexto] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<any>(null)

  async function ligar() {
    setLoading(true); setResult(null)
    try {
      const res = await fetch('/api/admin/ana-master-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero, referidor, contexto }),
      })
      setResult(await res.json())
    } catch (e: any) {
      setResult({ error: e.message })
    } finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: 500 }}>
      {/* ANA MASTER */}
      <div style={{ background: '#0A1628', border: '1px solid #1D4ED8', borderRadius: 16, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Zap style={{ width: 18, height: 18, color: '#38BDF8' }} />
          <div>
            <p style={{ color: C.text, fontWeight: 700, margin: 0, fontSize: 14 }}>ANA MASTER</p>
            <p style={{ color: '#38BDF8', fontSize: 11, margin: 0 }}>TwilioTransport · RealtimeAgent · gpt-realtime</p>
          </div>
          <span style={{ marginLeft: 'auto', background: '#0C4A6E', color: '#38BDF8', fontSize: 10, padding: '2px 8px', borderRadius: 99, border: '1px solid #0369A1' }}>NOVO</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Número do lead', val: numero, set: setNumero, ph: '+5548988416899' },
            { label: 'Referidor (opcional)', val: referidor, set: setReferidor, ph: 'Ex: Adriana' },
            { label: 'Contexto inicial (opcional)', val: contexto, set: setContexto, ph: 'Ex: lead perguntou sobre implante' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ color: C.textMuted, fontSize: 11, display: 'block', marginBottom: 4 }}>{f.label}</label>
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                style={{ width: '100%', background: '#111827', border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', color: C.text, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>
        <div style={{ background: '#0C4A6E22', border: '1px solid #0369A155', borderRadius: 8, padding: '7px 12px', marginBottom: 14, fontSize: 11, color: '#38BDF8' }}>
          ⚡ TwilioTransport · RealtimeAgent · State Machine · 8 Gates · Memory · Recovery
        </div>
        <button onClick={ligar} disabled={loading}
          style={{ width: '100%', padding: 13, background: loading ? '#1D4ED8' : 'linear-gradient(135deg,#1D4ED8,#0EA5E9)', color: '#fff', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}>
          {loading ? '⏳ Iniciando...' : '⚡ Ligar com ANA MASTER'}
        </button>
        {result && (
          <div style={{ marginTop: 10, background: result.error ? '#3B0A0A' : '#0A2E0A', border: `1px solid ${result.error ? '#7F1D1D' : '#14532D'}`, borderRadius: 8, padding: '9px 12px' }}>
            {result.error
              ? <p style={{ color: '#F87171', fontSize: 12, margin: 0 }}>❌ {result.error}</p>
              : <><p style={{ color: '#4ADE80', fontSize: 12, margin: 0 }}>✅ Ligação iniciada!</p><p style={{ color: '#86EFAC', fontSize: 11, margin: '3px 0 0' }}>SID: {result.sid} · {result.status}</p></>
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ─── VOZ TAB ─────────────────────────────────────────────────────────────────

function VozTab() {
  const VOZES = [
    { id: 'shimmer', label: 'Shimmer', desc: 'Feminina, suave, calorosa', best: true },
    { id: 'marin',   label: 'Marin',   desc: 'Feminina, natural, fluida', best: false },
    { id: 'coral',   label: 'Coral',   desc: 'Feminina, clara, profissional', best: false },
    { id: 'sage',    label: 'Sage',    desc: 'Feminina, calma, confiante', best: false },
    { id: 'nova',    label: 'Nova',    desc: 'Feminina, jovem, energética', best: false },
    { id: 'alloy',   label: 'Alloy',   desc: 'Neutra, clara, direta', best: false },
    { id: 'echo',    label: 'Echo',    desc: 'Masculina, grave, confiante', best: false },
    { id: 'onyx',    label: 'Onyx',    desc: 'Masculina, profunda, autoridade', best: false },
    { id: 'fable',   label: 'Fable',   desc: 'Neutra, expressiva, calorosa', best: false },
    { id: 'ash',     label: 'Ash',     desc: 'Neutra, seca, objetiva', best: false },
    { id: 'ballad',  label: 'Ballad',  desc: 'Feminina, melodiosa, emocional', best: false },
    { id: 'verse',   label: 'Verse',   desc: 'Neutra, versátil, adaptável', best: false },
  ]

  const VELOCIDADE = [
    { val: 0.75, label: 'Muito lenta', desc: 'Para leads que precisam de mais tempo' },
    { val: 0.9,  label: 'Lenta',       desc: 'Ritmo pausado, mais acolhedor' },
    { val: 1.0,  label: 'Normal',      desc: 'Padrão atual — ritmo natural', current: true },
    { val: 1.15, label: 'Rápida',      desc: 'Para leads diretas e objetivas' },
    { val: 1.3,  label: 'Muito rápida',desc: 'Para fechamento e momentos de alta energia' },
  ]

  const VAD_CONFIGS = [
    { param: 'threshold', label: 'Sensibilidade de detecção de fala', type: 'range', min: 0.1, max: 0.9, step: 0.05, default: 0.5, desc: 'Menor = detecta sussurros. Maior = ignora ruído de fundo.' },
    { param: 'silence_duration_ms', label: 'Tempo de silêncio antes de responder', type: 'range', min: 200, max: 2000, step: 100, default: 800, desc: 'Menor = responde mais rápido. Maior = espera mais antes de falar.' },
    { param: 'prefix_padding_ms', label: 'Padding de início de fala', type: 'range', min: 100, max: 500, step: 50, default: 300, desc: 'Quanto captura antes do início detectado — evita cortar o começo.' },
  ]

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ background: '#0d0a1a', border: '1px solid #3B0764', borderRadius: 16, padding: '18px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>🎙️ Configuração de Voz — ANA MASTER</div>
        <p style={{ margin: 0, fontSize: 13, color: '#CBD5E1' }}>Todos os parâmetros de voz da ANA. Para aplicar mudanças: edite o arquivo <code style={{ background: '#ffffff10', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>ecosystem.config.cjs</code> no servidor e reinicie com <code style={{ background: '#ffffff10', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>pm2 restart ana-master</code></p>
      </div>

      {/* Vozes disponíveis */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🎤</span>
          <span style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>Timbre de Voz</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#A78BFA', background: '#3B076420', border: '1px solid #3B076440', borderRadius: 99, padding: '2px 8px' }}>REALTIME_VOICE no ecosystem.config.cjs</span>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ background: '#0a1628', border: '1px solid #1D4ED850', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#38BDF8' }}>
            ⚙️ Voz atual: <strong>marin</strong> — para trocar, edite <code>REALTIME_VOICE=shimmer</code> no ecosystem.config.cjs e reinicie o PM2
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {VOZES.map(v => (
              <div key={v.id} style={{ background: v.id === 'marin' ? '#1D4ED820' : '#ffffff05', border: `1px solid ${v.id === 'marin' ? '#1D4ED860' : C.border}`, borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <code style={{ fontSize: 12, fontWeight: 700, color: v.id === 'marin' ? '#38BDF8' : C.text }}>{v.id}</code>
                  {v.id === 'marin' && <span style={{ fontSize: 9, color: '#38BDF8', background: '#1D4ED820', borderRadius: 99, padding: '1px 6px', border: '1px solid #1D4ED840' }}>ATUAL</span>}
                  {v.best && <span style={{ fontSize: 9, color: '#F59E0B', background: '#78350F20', borderRadius: 99, padding: '1px 6px', border: '1px solid #78350F40' }}>★ RECOMENDADA</span>}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{v.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, background: '#0a1f0a', border: '1px solid #14532D50', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4ADE80', marginBottom: 6, textTransform: 'uppercase' }}>Como trocar a voz</div>
            <code style={{ fontSize: 12, color: '#86EFAC', display: 'block', lineHeight: 2 }}>
              # No servidor, edite ecosystem.config.cjs:<br/>
              REALTIME_VOICE: &apos;shimmer&apos;,<br/><br/>
              # Depois reinicie:<br/>
              pm2 restart ana-master
            </code>
          </div>
        </div>
      </div>

      {/* Velocidade via prompt */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚡</span>
          <span style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>Velocidade de Fala</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#F59E0B', background: '#78350F20', border: '1px solid #78350F40', borderRadius: 99, padding: '2px 8px' }}>VIA PROMPT — state-machine.ts</span>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <p style={{ color: C.textMuted, fontSize: 12, margin: '0 0 12px' }}>O modelo gpt-realtime-2.1 não tem parâmetro de velocidade direto. A velocidade é controlada via instrução de prompt em cada etapa. Configuração atual no state-machine.ts:</p>
          {VELOCIDADE.map(v => (
            <div key={v.val} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, background: v.current ? '#78350F20' : 'transparent', marginBottom: 4 }}>
              <div style={{ width: 40, height: 4, borderRadius: 99, background: `hsl(${200 - v.val * 80}, 70%, 60%)`, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: v.current ? 700 : 400, color: v.current ? '#F59E0B' : C.text }}>{v.label}</span>
                <span style={{ fontSize: 11, color: C.textFaint, marginLeft: 8 }}>{v.desc}</span>
              </div>
              {v.current && <span style={{ fontSize: 10, color: '#F59E0B' }}>← atual</span>}
            </div>
          ))}
          <div style={{ marginTop: 12, background: '#0a1628', border: '1px solid #1D4ED850', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#94A3B8' }}>
            Para ajustar: adicione à instrução da etapa em <strong>state-machine.ts</strong> frases como: <em>"fale com ritmo mais lento e pausado"</em> ou <em>"aumente o ritmo com energia crescente"</em>
          </div>
        </div>
      </div>

      {/* VAD — Detecção de voz */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>👂</span>
          <span style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>Escuta — VAD (Voice Activity Detection)</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#34D399', background: '#05280C20', border: '1px solid #14532D40', borderRadius: 99, padding: '2px 8px' }}>realtime.ts → session.update</span>
        </div>
        <div style={{ padding: '16px 20px' }}>
          {VAD_CONFIGS.map(v => (
            <div key={v.param} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{v.label}</span>
                <code style={{ fontSize: 10, color: '#34D399', background: '#05280C20', borderRadius: 4, padding: '1px 6px' }}>{v.param}</code>
              </div>
              <div style={{ height: 6, background: '#ffffff10', borderRadius: 99, marginBottom: 6, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${((v.default - v.min) / (v.max - v.min)) * 100}%`, background: 'linear-gradient(90deg, #34D399, #10B981)', borderRadius: 99 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.textFaint, marginBottom: 4 }}>
                <span>{v.min}</span><span style={{ color: '#34D399' }}>padrão: {v.default}</span><span>{v.max}</span>
              </div>
              <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{v.desc}</p>
            </div>
          ))}
          <div style={{ background: '#0a1f0a', border: '1px solid #14532D50', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4ADE80', marginBottom: 6, textTransform: 'uppercase' }}>Como ajustar o VAD em realtime.ts</div>
            <code style={{ fontSize: 11, color: '#86EFAC', display: 'block', lineHeight: 1.8 }}>
              {`// Dentro do session.update após connect():`}<br/>
              {`type: 'session.update',`}<br/>
              {`session: {`}<br/>
              {`  turn_detection: {`}<br/>
              {`    type: 'server_vad',`}<br/>
              {`    threshold: 0.5,           // 0.1-0.9`}<br/>
              {`    silence_duration_ms: 800,  // ms`}<br/>
              {`    prefix_padding_ms: 300,    // ms`}<br/>
              {`  }`}<br/>
              {`}`}
            </code>
          </div>
        </div>
      </div>

      {/* Expressividade via prompt */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>😄</span>
          <span style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>Expressividade — Risadas, Entonação, Pausas</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#A78BFA', background: '#3B076420', border: '1px solid #3B076440', borderRadius: 99, padding: '2px 8px' }}>VIA PROMPT</span>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <p style={{ color: C.textMuted, fontSize: 12, margin: '0 0 14px' }}>O modelo gpt-realtime-2.1 responde a instruções de expressividade no prompt. Para habilitar comportamentos específicos, adicione ao ANA_BASE_PROMPT em <strong>realtime.ts</strong>:</p>
          {[
            { feature: 'Risadas naturais', instrucao: 'Use risadas curtas e naturais quando a lead fizer algo engraçado ou compartilhar algo leve — nunca forçado.', status: 'não configurado' },
            { feature: 'Pausas dramáticas', instrucao: 'Use silêncio de 1-2 segundos antes de revelar o valor do investimento ou fazer a pergunta de fechamento.', status: 'não configurado' },
            { feature: 'Tom mais alto (ênfase)', instrucao: 'Eleve levemente o tom ao falar dos resultados do implante — "sono, energia, libido" — com entusiasmo genuíno.', status: 'no speech' },
            { feature: 'Tom mais baixo (empatia)', instrucao: 'Reduza o tom e desacelere quando a lead compartilhar dor ou dificuldade — mostre que você está realmente ouvindo.', status: 'no prompt' },
            { feature: 'Backchannels', instrucao: 'Use "entendo", "faz sentido", "claro" discretamente enquanto a lead fala — nunca interrompa.', status: 'não configurado' },
            { feature: 'Vibrato emocional', instrucao: 'Ao celebrar uma decisão da lead, deixe a emoção genuína aparecer na voz — calor real, não performático.', status: 'não configurado' },
          ].map(e => (
            <div key={e.feature} style={{ marginBottom: 12, background: '#ffffff04', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{e.feature}</span>
                <span style={{ fontSize: 10, color: e.status === 'não configurado' ? '#F87171' : '#34D399', background: e.status === 'não configurado' ? '#7F1D1D20' : '#05280C20', borderRadius: 99, padding: '1px 8px', border: `1px solid ${e.status === 'não configurado' ? '#7F1D1D40' : '#14532D40'}` }}>{e.status}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic' }}>"{e.instrucao}"</div>
            </div>
          ))}
        </div>
      </div>

      {/* Limitações */}
      <div style={{ background: '#1a0a0a', border: '1px solid #7F1D1D40', borderRadius: 12, padding: '14px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#F87171', marginBottom: 8 }}>⚠️ O que o modelo NÃO permite controlar diretamente</div>
        {[
          'Pitch (frequência da voz) — não há parâmetro de pitch no Realtime API',
          'Volume absoluto — controlado pelo Twilio/telefone, não pelo modelo',
          'Velocidade numérica (ex: 1.2x) — influenciada via instrução de prompt, não parâmetro',
          'Emoções programadas isoladas — o modelo gera expressão como consequência da intenção, não de efeitos separados',
        ].map(l => <p key={l} style={{ color: '#FCA5A5', fontSize: 11, margin: '4px 0' }}>✕ {l}</p>)}
      </div>
    </div>
  )
}

// ─── Sessões inline tab ───────────────────────────────────────────────────────

const GATE_ORDER_S = ['GATE_ABERTURA','GATE_CONEXAO','GATE_COMBINADO','GATE_SPEECH','GATE_FECHAMENTO','GATE_PAGAMENTO','GATE_REFERIDOS','GATE_VALIDACAO']
const GATE_SHORT_S: Record<string,string> = {
  GATE_ABERTURA:'Aber.',GATE_CONEXAO:'Conex.',GATE_COMBINADO:'Comb.',
  GATE_SPEECH:'Speech',GATE_FECHAMENTO:'Fech.',GATE_PAGAMENTO:'Pag.',
  GATE_REFERIDOS:'Ref.',GATE_VALIDACAO:'Valid.',
}
const STAGE_LBL: Record<string,string> = {
  apresentacao:'Abertura',conexao:'Conexão',combinado:'Combinado',speech:'Speech',
  fechamento:'Fechamento',pagamento:'Pagamento',referidos:'Referidos',validacao:'Validação',ganho:'Ganho',
}
function fmtTime(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
}

function SessoesInlineTab() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string|null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [copiedTranscript, setCopiedTranscript] = useState<string|null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/ana-master/simulador/sessions?_t=${Date.now()}`, { cache: 'no-store' })
      const data = await r.json()
      const raw = data.sessions ?? []
      raw.sort((a: any, b: any) => {
        const ta = a.updatedAt ?? a.createdAt
        const tb = b.updatedAt ?? b.createdAt
        if (!ta && !tb) return 0
        if (!ta) return 1   // nulls last
        if (!tb) return -1
        return new Date(tb).getTime() - new Date(ta).getTime()
      })
      setSessions(raw)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

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
  const detailAudio: string|null = detail?.memories?.audio_url ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 16px' }}>
        <div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>Sessões gravadas</p>
          <p style={{ color: '#52525B', fontSize: 12, margin: '2px 0 0' }}>Transcrição + áudio + checkpoints por gate</p>
        </div>
        <button onClick={load} style={{ background: '#1C1C1E', border: '1px solid #3A3A3C', borderRadius: 8, padding: '6px 14px', color: '#9CA3AF', fontSize: 12, cursor: 'pointer' }}>↻ Atualizar</button>
      </div>

      {loading && <p style={{ color: '#52525B', textAlign: 'center', padding: 40, fontSize: 13 }}>Carregando sessões...</p>}
      {!loading && sessions.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#52525B' }}>
          <p style={{ fontSize: 20, marginBottom: 8 }}>🎙️</p>
          <p style={{ fontSize: 13 }}>Nenhuma sessão gravada ainda. Use o Simulador de Voz.</p>
        </div>
      )}

      {sessions.map((s: any) => {
        const isOpen = expanded === s.callSid
        const gatesPassed = new Set((s.gates ?? []).map((g: any) => g.gate))
        const progress = GATE_ORDER_S.filter(g => gatesPassed.has(g)).length
        return (
          <div key={s.callSid} style={{ borderRadius: 12, border: `1px solid ${isOpen ? C.purple : '#27272A'}`, marginBottom: 8, overflow: 'hidden', background: '#111113' }}>
            <button onClick={() => expand(s.callSid)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1C1C1E', border: `2px solid ${progress === 8 ? C.green : '#3A3A3C'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: progress === 8 ? C.green : C.purple }}>{progress}/8</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{s.telefone ?? 'sem telefone'}</span>
                  <span style={{ fontSize: 11, color: '#52525B' }}>{fmtTime(s.updatedAt)}</span>
                  {s.hasAudio && <span style={{ fontSize: 10, color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 4, padding: '1px 6px' }}>🎙 áudio</span>}
                  {s.stage === 'ganho' && <span style={{ fontSize: 10, color: C.green, background: 'rgba(52,211,153,0.1)', borderRadius: 4, padding: '1px 6px' }}>🏆 GANHO</span>}
                </div>
                <div style={{ display: 'flex', gap: 3, marginTop: 6, flexWrap: 'wrap' }}>
                  {GATE_ORDER_S.map(g => {
                    const passed = gatesPassed.has(g)
                    return (
                      <span key={g} style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: passed ? 'rgba(52,211,153,0.12)' : '#1C1C1E', color: passed ? C.green : '#3A3A3C', border: `1px solid ${passed ? 'rgba(52,211,153,0.25)' : '#27272A'}` }}>
                        {passed ? '✓ ' : ''}{GATE_SHORT_S[g]}
                      </span>
                    )
                  })}
                </div>
              </div>
              <span style={{ color: '#52525B', fontSize: 16 }}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid #1C1C1E' }}>
                {loadingDetail && <p style={{ color: '#52525B', fontSize: 12, textAlign: 'center', padding: 20 }}>Carregando...</p>}
                {!loadingDetail && detail && (() => {
                  const mem = (detail.memories ?? {}) as Record<string, unknown>
                  const HIDDEN_KEYS = ['telefone','nome','sim_browser','transcript','speech_progress','speech_state_log','checkpoints','audio_url','profile_version']
                  const visibleMem = Object.entries(mem).filter(([k]) => !HIDDEN_KEYS.includes(k))
                  const STAGES_S = ['apresentacao','conexao','combinado','speech','fechamento','pagamento','referidos','validacao']
                  const STAGE_TO_GATE: Record<string,string> = { conexao:'GATE_ABERTURA', combinado:'GATE_CONEXAO', speech:'GATE_COMBINADO', fechamento:'GATE_SPEECH', pagamento:'GATE_FECHAMENTO', referidos:'GATE_PAGAMENTO', validacao:'GATE_REFERIDOS', ganho:'GATE_VALIDACAO' }
                  return (
                  <div style={{ display: 'flex', minHeight: 360 }}>
                    {/* Left panel */}
                    <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid #1C1C1E', display: 'flex', flexDirection: 'column', background: '#0A0A0B' }}>
                      {/* Etapas */}
                      <div style={{ padding: 12, borderBottom: '1px solid #1C1C1E' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#52525E', textTransform: 'uppercase', margin: '0 0 8px' }}>Etapas</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {STAGES_S.map(stage => {
                            const gateForStage = STAGE_TO_GATE[stage]
                            const done = gateForStage ? gatesPassed.has(gateForStage) : false
                            const active = stage === s.stage && !done
                            return (
                              <span key={stage} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700, background: done ? 'rgba(52,211,153,0.1)' : active ? 'rgba(123,63,228,0.2)' : '#111113', color: done ? '#34D399' : active ? '#A78BFA' : '#52525E', border: `1px solid ${done ? 'rgba(52,211,153,0.2)' : active ? 'rgba(123,63,228,0.4)' : '#1C1C1E'}` }}>
                                {done ? '✓ ' : ''}{STAGE_LBL[stage] ?? stage}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                      {/* Memórias */}
                      <div style={{ padding: 12, borderBottom: '1px solid #1C1C1E', flex: 1, overflowY: 'auto' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#52525E', textTransform: 'uppercase', margin: '0 0 8px' }}>Memórias</p>
                        {visibleMem.length === 0
                          ? <p style={{ fontSize: 11, color: '#52525E' }}>Nenhuma salva.</p>
                          : visibleMem.map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, marginBottom: 4 }}>
                              <span style={{ color: '#52525E', flexShrink: 0 }}>{k}</span>
                              <span style={{ color: '#fff', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }} title={String(v)}>{String(v)}</span>
                            </div>
                          ))
                        }
                      </div>
                      {/* Áudio */}
                      {detailAudio && (
                        <div style={{ padding: 12 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#52525E', textTransform: 'uppercase', margin: '0 0 8px' }}>Áudio</p>
                          <audio controls src={detailAudio} style={{ width: '100%', height: 28 }} />
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(detailAudio)
                                const blob = await res.blob()
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `${s.callSid}.webm`
                                a.click()
                                URL.revokeObjectURL(url)
                              } catch { window.open(detailAudio, '_blank') }
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: '#A78BFA', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            ⬇ Baixar áudio
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Right panel — transcript */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid #1C1C1E', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: 0 }}>Transcrição</p>
                        {detailTranscript.length > 0 && (
                          <button onClick={() => {
                            const key = 'detail'
                            const text = detailTranscript.map((t: any) => `${t.role === 'ana' ? 'ANA' : t.role === 'tool' ? '[ferramenta]' : t.role === 'system' ? '[sistema]' : 'VOCÊ'}: ${t.text}`).join('\n')
                            navigator.clipboard.writeText(text).then(() => {
                              setCopiedTranscript(key)
                              setTimeout(() => setCopiedTranscript(null), 2000)
                            })
                          }}
                            style={{ border: '1px solid #3A3A3C', borderRadius: 6, padding: '5px 6px', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: copiedTranscript === 'detail' ? '#4ADE80' : '#A1A1AA' }}>
                            {copiedTranscript === 'detail' ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
                          </button>
                        )}
                      </div>
                      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420 }}>
                        {detailTranscript.length === 0
                          ? <p style={{ color: '#3A3A3C', fontSize: 12, textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>Sem transcrição salva nesta sessão.</p>
                          : detailTranscript.map((t: any, i: number) => {
                              const isAna = t.role === 'ana' || t.role === 'assistant'
                              const isLead = t.role === 'lead'
                              const isTool = t.role === 'tool'
                              return (
                                <div key={i} style={{ borderRadius: 10, padding: '10px 14px', lineHeight: 1.6, background: isAna ? 'rgba(123,63,228,0.1)' : isLead ? '#1C1C1E' : isTool ? 'rgba(249,115,22,0.05)' : 'transparent', border: `1px solid ${isAna ? 'rgba(123,63,228,0.2)' : isLead ? '#27272A' : isTool ? 'rgba(249,115,22,0.1)' : 'transparent'}`, color: isAna ? '#fff' : isLead ? '#A1A1AA' : isTool ? '#FB923C' : '#52525E', fontFamily: isTool ? 'monospace' : 'inherit', fontSize: isTool || t.role === 'system' ? 11 : 13, fontStyle: t.role === 'system' ? 'italic' : 'normal' }}>
                                  {(isAna || isLead) && (
                                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px', color: isAna ? '#A78BFA' : '#52525E' }}>
                                      {isAna ? 'ANA' : 'VOCÊ'}
                                    </p>
                                  )}
                                  {t.text}
                                </div>
                              )
                            })
                        }
                      </div>
                    </div>
                  </div>
                  )
                })()}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── TABS CONFIG ──────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'central',    label: 'Central',       icon: <Sparkles style={{ width: 12, height: 12 }} />,  color: C.purple },
  { id: 'simulador',  label: '🎙️ Simulador',  icon: <span style={{ fontSize: 12 }}>🎙️</span>,        color: '#A78BFA' },
  { id: 'sessoes',    label: 'Sessões',       icon: <span style={{ fontSize: 12 }}>▶</span>,          color: '#38BDF8' },
  { id: 'ligacoes',   label: 'Ligações',      icon: <span style={{ fontSize: 12 }}>📞</span>,        color: '#38BDF8' },
  { id: 'monitor',    label: 'Live Monitor',  icon: <span style={{ fontSize: 12 }}>🔴</span>,        color: '#EF4444' },
  { id: 'disparar',   label: '⚡ Disparar',   icon: <Zap style={{ width: 12, height: 12 }} />,       color: '#38BDF8' },
  { id: 'script',     label: 'Script',        icon: <BookOpen style={{ width: 12, height: 12 }} />,  color: '#F59E0B' },
  { id: 'config',     label: 'Realtime Config', icon: <span style={{ fontSize: 12 }}>⚙️</span>,      color: '#10B981' },
  { id: 'voz',        label: '🎙️ Voz',        icon: <span style={{ fontSize: 12 }}>🎙️</span>,        color: '#A78BFA' },
  { id: 'dna',        label: 'DNA v1',        icon: <span style={{ fontSize: 12 }}>🧬</span>,        color: '#A855F7' },
  { id: 'recovery',   label: 'Recovery',      icon: <span style={{ fontSize: 12 }}>🛡️</span>,        color: '#6366F1' },
  { id: 'simulacoes', label: 'Simulações',    icon: <Brain style={{ width: 12, height: 12 }} />,     color: C.purple },
  { id: 'gold',       label: 'Gold ✦',        icon: <Star style={{ width: 12, height: 12 }} />,      color: C.gold },
  { id: 'anti-gold',  label: 'Anti-Gold',     icon: <XCircle style={{ width: 12, height: 12 }} />,   color: C.red },
  { id: 'scorecard',  label: 'Scorecard',     icon: <BarChart3 style={{ width: 12, height: 12 }} />, color: C.green },
  { id: 'matriz',     label: 'Matriz',        icon: <Grid3X3 style={{ width: 12, height: 12 }} />,   color: C.blue },
  { id: 'changelog',  label: 'Changelog',     icon: <Clock style={{ width: 12, height: 12 }} />,     color: C.textMuted },
]

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AnaMasterPage() {
  const [tab, setTab] = useState<Tab>('central')
  const [sims, setSims] = useState<Simulacao[]>([])
  const [gold, setGold] = useState<GoldItem[]>([])
  const [antiGold, setAntiGold] = useState<AntiGoldItem[]>([])
  const [scorecard, setScorecard] = useState<ScorecardEntry[]>([])
  const [matriz, setMatriz] = useState<MatrizItem[]>([])
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    const [s, g, ag, sc, m, cl] = await Promise.all([
      fetchTable<Simulacao>('ana_simulacoes'),
      fetchTable<GoldItem>('ana_gold'),
      fetchTable<AntiGoldItem>('ana_anti_gold'),
      fetchTable<ScorecardEntry>('ana_scorecard'),
      fetchTable<MatrizItem>('ana_matriz'),
      fetchTable<ChangelogEntry>('ana_changelog'),
    ])
    setSims(s); setGold(g); setAntiGold(ag); setScorecard(sc); setMatriz(m); setChangelog(cl)
    setLoading(false); setRefreshing(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const counts: Partial<Record<Tab, number>> = {
    simulacoes: sims.length, gold: gold.length, 'anti-gold': antiGold.length,
    scorecard: scorecard.length, matriz: matriz.length, changelog: changelog.length,
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, overflow: 'hidden' }}>
      <Sidebar role="admin" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Ana DNA Nuclear" />

        {/* Tab nav */}
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 20px', display: 'flex', alignItems: 'stretch', flexShrink: 0, overflowX: 'auto' }}>
          {TABS.map(t => {
            const isActive = tab === t.id
            const n = counts[t.id]
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', border: 'none', background: 'transparent', whiteSpace: 'nowrap',
                  color: isActive ? t.color : C.textFaint,
                  borderBottom: `2px solid ${isActive ? t.color : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ color: isActive ? t.color : C.textFaint, transition: 'color 0.15s' }}>{t.icon}</span>
                {t.label}
                {n !== undefined && n > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 800, color: isActive ? t.color : C.textFaint, background: isActive ? t.color + '20' : '#ffffff08', borderRadius: 6, padding: '1px 6px', fontVariantNumeric: 'tabular-nums' }}>
                    {n}
                  </span>
                )}
              </button>
            )
          })}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => refresh()}
            title="Atualizar"
            style={{ padding: '0 14px', background: 'transparent', border: 'none', cursor: 'pointer', color: refreshing ? C.purple : C.textFaint, flexShrink: 0, display: 'flex', alignItems: 'center' }}
          >
            <RefreshCw style={{ width: 14, height: 14, animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          </button>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <div style={{ width: 28, height: 28, border: `2px solid ${C.purple}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <>
              {tab === 'ligacoes'   && <LigacoesTab />}
              {tab === 'monitor'    && <LiveMonitorTab />}
              {tab === 'disparar'   && <DispararTab />}
              {tab === 'script'     && <ScriptTab />}
              {tab === 'config'     && <RealtimeConfigTab />}
              {tab === 'voz'       && <VozTab />}
              {tab === 'central'    && <CentralTab sims={sims} gold={gold} antiGold={antiGold} scorecard={scorecard} matriz={matriz} changelog={changelog} />}
              {tab === 'dna'        && <DnaTab />}
              {tab === 'simulador'  && (
                <div style={{ height: 'calc(100vh - 120px)', borderRadius: 12, overflow: 'hidden', border: '1px solid #27272A' }}>
                  <SimuladorContent />
                </div>
              )}
              {tab === 'sessoes'    && <SessoesInlineTab />}
              {tab === 'recovery'   && <RecoveryTab />}
              {tab === 'simulacoes' && <SimulacoesTab sims={sims} gold={gold} antiGold={antiGold} scorecard={scorecard} onRefresh={refresh} />}
              {tab === 'gold'       && <GoldTab items={gold} onRefresh={refresh} />}
              {tab === 'anti-gold'  && <AntiGoldTab items={antiGold} onRefresh={refresh} />}
              {tab === 'scorecard'  && <ScorecardTab entries={scorecard} sims={sims} onRefresh={refresh} />}
              {tab === 'matriz'     && <MatrizTab items={matriz} onRefresh={refresh} />}
              {tab === 'changelog'  && <ChangelogTab entries={changelog} onRefresh={refresh} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
