'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import Link from 'next/link'
import {
  GraduationCap, Play, Globe, FlaskConical,
  Edit2, Eye, Zap, Trophy, AlertTriangle,
} from 'lucide-react'

// ── Stats ──────────────────────────────────────────────────────────────────
const STATS = [
  { label: 'Módulos Médico',      value: 4,  color: '#7C5CFC', bg: '#7C5CFC18', icon: '🎓' },
  { label: 'Módulos Consultor',   value: 0,  color: '#F59E0B', bg: '#F59E0B18', icon: '🏆' },
  { label: 'Vídeos Paciente',     value: 8,  color: '#3B82F6', bg: '#3B82F618', icon: '▶' },
  { label: 'Números Landing',     value: 6,  color: '#22C55E', bg: '#22C55E18', icon: '🌐' },
  { label: 'Estudos Científicos', value: 8,  color: '#F59E0B', bg: '#F59E0B18', icon: '🔬' },
]

// ── Content cards ──────────────────────────────────────────────────────────
interface ContentCard {
  eyebrow: string
  eyebrowColor: string
  iconBg: string
  icon: React.ReactNode
  title: string
  sub: string
  status: 'live' | 'empty' | 'partial'
  metrics: { label: string; value: string | number; highlight?: boolean }[]
  progress?: { value: number; color: string }
  destinations: { path: string; status: 'live' | 'empty' }[]
  manageHref: string
  manageLabel: string
  previewHref?: string
  subCode?: boolean
}

const CARDS: ContentCard[] = [
  {
    eyebrow: 'Escola de Negócios',
    eyebrowColor: '#7C5CFC',
    iconBg: '#7C5CFC18',
    icon: <GraduationCap className="w-5 h-5" style={{ color: '#7C5CFC' }} />,
    title: 'Módulos para Médicos',
    sub: 'role: medical',
    subCode: true,
    status: 'live',
    metrics: [
      { label: 'módulos', value: 4 },
      { label: 'aulas', value: 19 },
      { label: '2 publicados', value: '', highlight: true },
    ],
    progress: { value: 50, color: '#7C5CFC' },
    destinations: [{ path: '/medical/escola', status: 'live' }],
    manageHref: '/admin/treinamento',
    manageLabel: 'Gerenciar',
    previewHref: '/admin/escola',
  },
  {
    eyebrow: 'Escola de Vendas',
    eyebrowColor: '#F59E0B',
    iconBg: '#F59E0B18',
    icon: <Trophy className="w-5 h-5" style={{ color: '#F59E0B' }} />,
    title: 'Módulos para Consultores',
    sub: 'role: sales',
    subCode: true,
    status: 'empty',
    metrics: [
      { label: 'módulos', value: 0 },
      { label: 'aulas', value: 0 },
    ],
    progress: { value: 0, color: '#F59E0B' },
    destinations: [{ path: '/sales/training', status: 'empty' }],
    manageHref: '/admin/treinamento',
    manageLabel: 'Adicionar módulos',
    previewHref: '/admin/escola-vendas',
  },
  {
    eyebrow: 'Vídeos · Destino Médico',
    eyebrowColor: '#3B82F6',
    iconBg: '#3B82F618',
    icon: <Play className="w-5 h-5" style={{ color: '#3B82F6' }} />,
    title: 'Vídeos da Área do Médico',
    sub: 'destino = medical',
    subCode: true,
    status: 'live',
    metrics: [
      { label: 'vídeos', value: 12 },
      { label: 'categorias', value: 3 },
    ],
    destinations: [{ path: '/medical/videos', status: 'live' }],
    manageHref: '/admin/videos',
    manageLabel: 'Gerenciar Vídeos',
  },
  {
    eyebrow: 'Vídeos · Destino Paciente',
    eyebrowColor: '#22C55E',
    iconBg: '#22C55E18',
    icon: <Play className="w-5 h-5" style={{ color: '#22C55E' }} />,
    title: 'Vídeos da Área do Paciente',
    sub: 'destino = patient',
    subCode: true,
    status: 'live',
    metrics: [
      { label: 'vídeos', value: 8 },
      { label: 'categorias', value: 2 },
    ],
    destinations: [{ path: '/patient/videos', status: 'live' }],
    manageHref: '/admin/videos',
    manageLabel: 'Gerenciar Vídeos',
  },
  {
    eyebrow: 'Landing Page',
    eyebrowColor: '#22C55E',
    iconBg: '#22C55E18',
    icon: <Globe className="w-5 h-5" style={{ color: '#22C55E' }} />,
    title: 'Página Pública Principal',
    sub: 'Hero, números, benefícios, depoimentos',
    status: 'live',
    metrics: [
      { label: 'números', value: 6 },
      { label: 'benefícios', value: 6 },
      { label: 'depoimentos', value: 2 },
    ],
    destinations: [{ path: 'hormoneecosystem.com/', status: 'live' }],
    manageHref: '/admin/landing',
    manageLabel: 'Editar Landing',
    previewHref: '/',
  },
  {
    eyebrow: 'Evidência Científica',
    eyebrowColor: '#F59E0B',
    iconBg: '#F59E0B18',
    icon: <FlaskConical className="w-5 h-5" style={{ color: '#F59E0B' }} />,
    title: 'Estudos — Área do Paciente',
    sub: 'Estudos em destaque + evidências mundiais',
    status: 'live',
    metrics: [
      { label: 'em destaque', value: 2 },
      { label: 'mundiais', value: 6 },
    ],
    destinations: [{ path: '/patient/evidencia', status: 'live' }],
    manageHref: '/admin/evidencia',
    manageLabel: 'Editar Estudos',
    previewHref: '/patient/evidencia',
  },
]

const QUICK = [
  { icon: '🎓', name: 'Novo módulo — Médico',    desc: 'Adicionar na Escola de Negócios', href: '/admin/treinamento' },
  { icon: '🏆', name: 'Novo módulo — Consultor',  desc: 'Adicionar na Escola de Vendas',   href: '/admin/treinamento' },
  { icon: '▶',  name: 'Novo vídeo',              desc: 'Escolher destino: médico ou paciente', href: '/admin/videos' },
]

// ── Badge ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'live' | 'empty' | 'partial' }) {
  const map = {
    live:    { label: '● Ao vivo',     cls: 'bg-green-500/10 text-green-400 border border-green-500/20' },
    empty:   { label: '⚠ Sem conteúdo', cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
    partial: { label: '◑ Parcial',     cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-full whitespace-nowrap ${cls}`}>
      {label}
    </span>
  )
}

function DestBadge({ status }: { status: 'live' | 'empty' }) {
  return status === 'live'
    ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">● ao vivo</span>
    : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">vazio</span>
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function ConteudoPage() {
  const sections = [
    { label: '🎓 Treinamento — Módulos e aulas das escolas', cards: CARDS.slice(0, 2) },
    { label: '▶ Vídeos — Gerenciados pelo campo destino',    cards: CARDS.slice(2, 4) },
    { label: '🌐 Conteúdo Público — Editável via painel admin', cards: CARDS.slice(4, 6) },
  ]

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin', role: 'admin' }} title="Central de Conteúdo" />
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-5xl mx-auto space-y-10">

            {/* Header */}
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Central de Conteúdo</h1>
              <p className="text-sm text-[#71717A] mt-1">Mapa de todo conteúdo gerenciado — o que existe, onde aparece e o status de cada fluxo</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-5 gap-3">
              {STATS.map((s) => (
                <div key={s.label} className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: s.bg }}>
                    {s.icon}
                  </div>
                  <div>
                    <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[11px] text-[#52525B] mt-0.5">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Alert */}
            <div className="flex items-center gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3.5 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="flex-1 text-amber-300">
                <strong className="font-semibold">Escola de Vendas sem conteúdo</strong>
                {' '}— A área do consultor ainda não tem módulos. Adicione aulas em Treinamento → Escola de Vendas.
              </div>
              <Link href="/admin/treinamento" className="text-[12px] font-semibold text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg hover:bg-amber-500/10 transition-colors whitespace-nowrap">
                Adicionar agora →
              </Link>
            </div>

            {/* Sections */}
            {sections.map((section) => (
              <div key={section.label} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#52525B]">{section.label}</span>
                  <div className="flex-1 h-px bg-[#1C1C1E]" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {section.cards.map((card) => (
                    <div key={card.title} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6 hover:border-[#2C2C2E] transition-colors">

                      {/* Top */}
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: card.iconBg }}>
                            {card.icon}
                          </div>
                          <div>
                            <div className="text-[10px] font-bold tracking-wide uppercase mb-0.5" style={{ color: card.eyebrowColor }}>
                              {card.eyebrow}
                            </div>
                            <div className="text-[15px] font-bold text-white leading-snug">{card.title}</div>
                            <div className="text-[11px] text-[#52525B] mt-0.5">
                              {card.subCode
                                ? <><code className="font-mono" style={{ color: card.eyebrowColor }}>{card.sub.split('=')[0].trim()}</code>{' '}<code className="font-mono" style={{ color: card.eyebrowColor }}>{card.sub.includes('=') ? `= ${card.sub.split('=')[1].trim()}` : ''}</code></>
                                : card.sub}
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={card.status} />
                      </div>

                      {/* Metrics */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {card.metrics.map((m, i) => (
                          <div key={i} className="bg-[#18181A] border border-[#1C1C1E] rounded-md px-2.5 py-1 text-[12px]">
                            {m.highlight
                              ? <span className="text-green-400 font-semibold">✓ {m.label}</span>
                              : <><strong className="text-white font-semibold">{m.value}</strong> <span className="text-[#52525B]">{m.label}</span></>}
                          </div>
                        ))}
                      </div>

                      {/* Progress */}
                      {card.progress && (
                        <div className="mb-4">
                          <div className="flex justify-between text-[11px] text-[#52525B] mb-1.5">
                            <span>Publicação</span><span>{card.progress.value}%</span>
                          </div>
                          <div className="h-1 bg-[#1C1C1E] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${card.progress.value}%`, background: card.progress.color }} />
                          </div>
                        </div>
                      )}

                      {/* Destinations */}
                      <div className="mb-5">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#52525B] mb-2">Aparece em</div>
                        <div className="space-y-1.5">
                          {card.destinations.map((d) => (
                            <div key={d.path} className="flex items-center justify-between bg-[#18181A] border border-[#1C1C1E] rounded-lg px-3 py-2">
                              <span className="text-[12px] font-mono text-[#71717A]">{d.path}</span>
                              <DestBadge status={d.status} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex gap-2">
                        <Link href={card.manageHref} className="inline-flex items-center gap-1.5 bg-[#7C5CFC] hover:bg-[#6D4FE0] text-white text-[12px] font-semibold px-4 py-2 rounded-lg transition-colors">
                          <Edit2 className="w-3 h-3" />{card.manageLabel}
                        </Link>
                        {card.previewHref && (
                          <Link href={card.previewHref} className="inline-flex items-center gap-1.5 bg-transparent border border-[#1C1C1E] hover:border-[#3F3F46] text-[#71717A] hover:text-white text-[12px] font-semibold px-4 py-2 rounded-lg transition-colors">
                            <Eye className="w-3 h-3" />Preview
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Quick actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#52525B] flex items-center gap-1.5">
                  <Zap className="w-3 h-3" />Ações rápidas
                </span>
                <div className="flex-1 h-px bg-[#1C1C1E]" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {QUICK.map((q) => (
                  <Link key={q.name} href={q.href} className="bg-[#111113] border border-dashed border-[#2C2C2E] rounded-xl p-5 flex items-center gap-4 hover:border-[#7C5CFC] hover:bg-[#7C5CFC10] transition-all group">
                    <div className="w-9 h-9 rounded-lg bg-[#18181A] flex items-center justify-center text-base flex-shrink-0">
                      {q.icon}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-white group-hover:text-[#A78BFA]">{q.name}</div>
                      <div className="text-[11px] text-[#52525B] mt-0.5">{q.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
