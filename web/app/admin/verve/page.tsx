'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Calendar,
  CheckCircle2,
  Target,
  BarChart3,
  Clock,
  Instagram,
  Film,
  Image,
  Circle,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'

type Tab = 'calendario' | 'aprovacao' | 'metas' | 'metricas'

type PostType = 'reel' | 'carrossel' | 'story'
type PostStatus = 'rascunho' | 'aguardando' | 'aprovado' | 'publicado' | 'recusado'

interface Post {
  id: string
  tipo: PostType
  titulo: string
  pilar: 'familia' | 'autoridade' | 'lifestyle'
  data: string
  hora: string
  status: PostStatus
  slides?: number
}

const POSTS_SEMANA: Post[] = [
  { id: '1', tipo: 'reel',      titulo: 'Por que seus hormônios mudam tudo', pilar: 'autoridade', data: '2026-10-22', hora: '08:00', status: 'aguardando' },
  { id: '2', tipo: 'carrossel', titulo: 'Pai da Maria — 15 anos', pilar: 'familia',    data: '2026-10-22', hora: '18:00', status: 'aguardando', slides: 8 },
  { id: '3', tipo: 'reel',      titulo: 'Bastidores do mercado de Itajaí', pilar: 'autoridade', data: '2026-10-23', hora: '12:00', status: 'rascunho' },
  { id: '4', tipo: 'carrossel', titulo: '3 sinais de que seus hormônios estão errados', pilar: 'autoridade', data: '2026-10-24', hora: '09:00', status: 'aguardando', slides: 12 },
  { id: '5', tipo: 'carrossel', titulo: 'Rotina de segunda: planejamento semanal', pilar: 'lifestyle', data: '2026-10-25', hora: '07:00', status: 'rascunho', slides: 6 },
  { id: '6', tipo: 'reel',      titulo: 'Longevidade não é luxo — é escolha', pilar: 'autoridade', data: '2026-10-26', hora: '10:00', status: 'rascunho' },
]

const DIAS = ['Seg 20', 'Ter 21', 'Qua 22', 'Qui 23', 'Sex 24', 'Sáb 25', 'Dom 26']
const DATAS = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26']

const pilarColor: Record<string, string> = {
  familia:    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  autoridade: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  lifestyle:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

const tipoIcon: Record<PostType, React.ReactNode> = {
  reel:      <Film className="w-3 h-3" />,
  carrossel: <Image className="w-3 h-3" />,
  story:     <Circle className="w-3 h-3" />,
}

const tipoColor: Record<PostType, string> = {
  reel:      'bg-purple-500/15 text-purple-300 border-purple-500/25',
  carrossel: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  story:     'bg-orange-500/15 text-orange-300 border-orange-500/25',
}

const statusColor: Record<PostStatus, string> = {
  rascunho:   'text-[#71717A]',
  aguardando: 'text-yellow-400',
  aprovado:   'text-green-400',
  publicado:  'text-blue-400',
  recusado:   'text-red-400',
}

export default function VervePage() {
  const [tab, setTab] = useState<Tab>('calendario')
  const [posts, setPosts] = useState<Post[]>(POSTS_SEMANA)

  const pendentes = posts.filter(p => p.status === 'aguardando')

  async function aprovar(id: string) {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'aprovado' } : p))
    await fetch('/api/admin/verve/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'aprovado' }),
    })
  }
  async function recusar(id: string) {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'recusado' } : p))
    await fetch('/api/admin/verve/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'recusado' }),
    })
  }

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}>
                📱
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[22px] font-bold text-white">VERVE</h1>
                  <span className="flex items-center gap-1.5 bg-[#22c55e]/10 border border-[#22c55e]/25 text-[#22c55e] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-sm text-[#71717A] mt-0.5">Diretor Autônomo de Mídia · @viniciuscechella · Meta: 1M seguidores / ano</p>
              </div>
            </div>
            <a
              href="https://www.instagram.com/viniciuscechella"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#131720] border border-[#252d42] rounded-xl px-4 py-2 text-xs font-semibold text-[#71717A] hover:text-white hover:border-[#7B3FE4]/40 transition-all"
            >
              <Instagram className="w-3.5 h-3.5" />
              @viniciuscechella
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Meta mensal', value: '83.333', sub: 'seguidores', color: '#a855f7', icon: <Target className="w-4 h-4" /> },
              { label: 'Posts esta semana', value: String(posts.filter(p => p.status !== 'recusado').length), sub: 'planejados', color: '#3b82f6', icon: <Calendar className="w-4 h-4" /> },
              { label: 'Aguardando aprovação', value: String(pendentes.length), sub: 'posts pendentes', color: '#eab308', icon: <Clock className="w-4 h-4" /> },
              { label: 'Aprovados', value: String(posts.filter(p => p.status === 'aprovado').length), sub: 'prontos p/ publicar', color: '#22c55e', icon: <CheckCircle2 className="w-4 h-4" /> },
            ].map(s => (
              <div key={s.label} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>
                  {s.icon}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">{s.label}</span>
                </div>
                <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] text-[#3F3F46] mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#111113] border border-[#1C1C1E] rounded-xl p-1 mb-6 w-fit">
            {([
              { key: 'calendario', label: 'Calendário', icon: <Calendar className="w-3.5 h-3.5" /> },
              { key: 'aprovacao',  label: `Aprovação${pendentes.length ? ` (${pendentes.length})` : ''}`, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
              { key: 'metas',      label: 'Metas',       icon: <Target className="w-3.5 h-3.5" /> },
              { key: 'metricas',   label: 'Métricas',    icon: <BarChart3 className="w-3.5 h-3.5" /> },
            ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-[#18181A] text-white border border-[#252d42]'
                    : 'text-[#71717A] hover:text-white'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* ── TAB: CALENDÁRIO ── */}
          {tab === 'calendario' && (
            <div>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {DIAS.map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-[#3F3F46] uppercase tracking-wider py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {DATAS.map(data => {
                  const dayPosts = posts.filter(p => p.data === data)
                  const isToday = data === '2026-10-22'
                  return (
                    <div
                      key={data}
                      className={`bg-[#111113] rounded-xl p-2.5 min-h-[100px] border transition-all ${
                        isToday ? 'border-purple-500/40' : 'border-[#1C1C1E]'
                      }`}
                    >
                      {isToday && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                          <span className="text-[9px] text-purple-400 font-bold">HOJE</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        {dayPosts.map(p => (
                          <div
                            key={p.id}
                            className={`flex items-center gap-1 rounded px-1.5 py-0.5 border text-[9px] font-semibold ${tipoColor[p.tipo]}`}
                          >
                            {tipoIcon[p.tipo]}
                            <span className="truncate leading-tight">{p.titulo}</span>
                          </div>
                        ))}
                        {/* Stories placeholder */}
                        <div className="flex items-center gap-1 rounded px-1.5 py-0.5 border text-[9px] font-semibold bg-orange-500/10 text-orange-300 border-orange-500/20">
                          <Circle className="w-2.5 h-2.5" />
                          <span>7–10 stories</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-[11px] text-[#3F3F46] mt-3 text-center">
                Semana de 20–26 out · Stories automáticos gerados pelo VERVE diariamente
              </p>
            </div>
          )}

          {/* ── TAB: APROVAÇÃO ── */}
          {tab === 'aprovacao' && (
            <div>
              {pendentes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <CheckCircle2 className="w-12 h-12 text-[#22c55e] mb-3 opacity-40" />
                  <p className="text-[#71717A] font-medium">Nenhum post aguardando aprovação</p>
                  <p className="text-[#3F3F46] text-sm mt-1">O VERVE vai gerar novos conteúdos automaticamente</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-[#71717A] mb-1">{pendentes.length} post{pendentes.length > 1 ? 's' : ''} aguardando sua aprovação para publicar</p>
                  {pendentes.map(p => (
                    <div key={p.id} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                        style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                        {p.tipo === 'reel' ? '🎬' : p.tipo === 'carrossel' ? '📷' : '⭕'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{p.titulo}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold border ${tipoColor[p.tipo]}`}>
                            {tipoIcon[p.tipo]}
                            {p.tipo}{p.slides ? ` · ${p.slides} slides` : ''}
                          </span>
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold border ${pilarColor[p.pilar]}`}>
                            {p.pilar}
                          </span>
                          <span className="text-[11px] text-[#71717A]">{p.data.slice(5).replace('-', '/')} às {p.hora}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => recusar(p.id)}
                          className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                        >
                          ✕ Recusar
                        </button>
                        <button
                          onClick={() => aprovar(p.id)}
                          className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#22c55e] text-black hover:bg-[#16a34a] transition-all"
                        >
                          ✓ Autorizar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: METAS ── */}
          {tab === 'metas' && (
            <div>
              {/* Meta principal */}
              <div className="bg-[#111113] border border-purple-500/20 rounded-2xl p-5 mb-5"
                style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(236,72,153,0.05) 100%)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <Target className="w-5 h-5 text-purple-400" />
                  <h2 className="text-base font-bold text-white">Meta Oficial — 1 MILHÃO / ANO</h2>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { n: '1.000.000', l: 'seguidores / ano' },
                    { n: '83.333',    l: 'por mês' },
                    { n: '2.976',     l: 'por dia' },
                  ].map(m => (
                    <div key={m.l} className="text-center">
                      <p className="text-2xl font-bold font-mono text-purple-400">{m.n}</p>
                      <p className="text-[11px] text-[#71717A] mt-0.5">{m.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pilares */}
              <h3 className="text-[10px] font-bold tracking-[0.1em] text-[#3F3F46] uppercase mb-3 flex items-center gap-2">
                3 Pilares de Conteúdo
                <span className="flex-1 h-px bg-[#1C1C1E]" />
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { pct: '40%', nome: 'Família', desc: 'Série Pai da Maria, paternidade, valores', color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
                  { pct: '40%', nome: 'Autoridade', desc: 'Imóveis, medicina, negócios, Itajaí', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
                  { pct: '20%', nome: 'Lifestyle', desc: 'Rotina, eventos, networking, prova social', color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
                ].map(p => (
                  <div key={p.nome} className="rounded-xl p-4 border" style={{ background: p.bg, borderColor: p.border }}>
                    <p className="text-2xl font-bold" style={{ color: p.color }}>{p.pct}</p>
                    <p className="text-sm font-semibold text-white mt-1">{p.nome}</p>
                    <p className="text-[11px] text-[#71717A] mt-1 leading-relaxed">{p.desc}</p>
                  </div>
                ))}
              </div>

              {/* Volume semanal */}
              <h3 className="text-[10px] font-bold tracking-[0.1em] text-[#3F3F46] uppercase mb-3 flex items-center gap-2">
                Volume Semanal Necessário
                <span className="flex-1 h-px bg-[#1C1C1E]" />
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: '🎬', label: 'Reels / semana', meta: 5, atual: 0, color: '#a855f7' },
                  { icon: '📷', label: 'Carrosséis / dia', meta: 2, atual: 0, color: '#3b82f6' },
                  { icon: '⭕', label: 'Stories / dia', meta: 8, atual: 0, color: '#f97316' },
                ].map(g => (
                  <div key={g.label} className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{g.icon}</span>
                      <p className="text-[11px] text-[#71717A] font-medium">{g.label}</p>
                    </div>
                    <p className="text-2xl font-bold font-mono mb-2" style={{ color: g.color }}>{g.atual}</p>
                    <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(g.atual / g.meta) * 100}%`, background: g.color }} />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] text-[#3F3F46]">Meta: {g.meta}</span>
                      <span className="text-[10px] text-[#3F3F46]">{Math.round((g.atual / g.meta) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: MÉTRICAS ── */}
          {tab === 'metricas' && (
            <div>
              <div className="flex items-center gap-2 mb-5 bg-[#111113] border border-[#1C1C1E] rounded-xl px-4 py-3">
                <Instagram className="w-4 h-4 text-[#71717A]" />
                <p className="text-xs text-[#71717A]">
                  Dados via Meta Graph API · <span className="font-mono text-[#3F3F46]">instagram_basic + pages_read_engagement</span>
                </p>
                <span className="ml-auto text-[10px] text-[#3F3F46] bg-[#18181A] px-2 py-0.5 rounded font-mono">Atualização em tempo real</span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Seguidores ganhos', value: '—', sub: 'esta semana', color: '#a855f7', icon: <Users className="w-4 h-4" /> },
                  { label: 'Alcance total',      value: '—', sub: 'impressões únicas', color: '#3b82f6', icon: <TrendingUp className="w-4 h-4" /> },
                  { label: 'Sends / Reach',       value: '—', sub: 'meta: > 5%', color: '#22c55e', icon: <BarChart3 className="w-4 h-4" /> },
                  { label: 'Saves',               value: '—', sub: 'conteúdo salvo', color: '#f97316', icon: <Sparkles className="w-4 h-4" /> },
                ].map(m => (
                  <div key={m.label} className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2" style={{ color: m.color }}>
                      {m.icon}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">{m.label}</span>
                    </div>
                    <p className="text-2xl font-bold font-mono" style={{ color: m.color }}>{m.value}</p>
                    <p className="text-[11px] text-[#3F3F46] mt-0.5">{m.sub}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[#111113] border border-dashed border-[#1C1C1E] rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <BarChart3 className="w-10 h-10 text-[#3F3F46] mb-3" />
                <p className="text-sm font-semibold text-[#3F3F46]">Métricas em tempo real</p>
                <p className="text-xs text-[#2D2D32] mt-1 max-w-xs">
                  Conecte o token do Instagram Graph API nas variáveis de ambiente para ativar o dashboard de métricas em tempo real.
                </p>
                <code className="mt-3 text-[10px] font-mono text-[#3F3F46] bg-[#18181A] px-3 py-1.5 rounded">
                  INSTAGRAM_ACCESS_TOKEN=...
                </code>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
