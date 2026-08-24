'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import Link from 'next/link'
import {
  GraduationCap, Play, Globe, FlaskConical,
  ArrowRight, Eye, Edit2,
} from 'lucide-react'

interface FlowItem {
  sourceType: string
  sourceColor: string
  sourceName: string
  sourceDesc: string
  manageHref: string
  manageLabel: string
  destinations: { name: string; path: string; color: string; previewHref?: string }[]
}

const FLOWS: FlowItem[] = [
  {
    sourceType: 'Treinamento · Escola de Negócios',
    sourceColor: '#3B82F6',
    sourceName: 'Módulos para Médicos',
    sourceDesc: 'Aulas e progresso da escola médica (role: medical)',
    manageHref: '/admin/treinamento',
    manageLabel: 'Gerenciar Treinamento',
    destinations: [
      { name: 'Área do Médico — Escola', path: '/medical/escola', color: '#3B82F6', previewHref: '/admin/escola' },
    ],
  },
  {
    sourceType: 'Treinamento · Escola de Vendas',
    sourceColor: '#06B6D4',
    sourceName: 'Módulos para Consultores',
    sourceDesc: 'Aulas e progresso da escola de vendas (role: sales)',
    manageHref: '/admin/treinamento',
    manageLabel: 'Gerenciar Treinamento',
    destinations: [
      { name: 'Área do Consultor — Treinamentos', path: '/sales/training', color: '#06B6D4', previewHref: '/admin/escola-vendas' },
    ],
  },
  {
    sourceType: 'Vídeos · destino médico',
    sourceColor: '#3B82F6',
    sourceName: 'Vídeos da Área do Médico',
    sourceDesc: 'Vídeos com destino = medical em /admin/videos',
    manageHref: '/admin/videos',
    manageLabel: 'Gerenciar Vídeos',
    destinations: [
      { name: 'Área do Médico — Vídeos', path: '/medical/...', color: '#3B82F6' },
    ],
  },
  {
    sourceType: 'Vídeos · destino paciente',
    sourceColor: '#EC4899',
    sourceName: 'Vídeos da Área do Paciente & Landing',
    sourceDesc: 'Vídeos com destino = patient em /admin/videos',
    manageHref: '/admin/videos',
    manageLabel: 'Gerenciar Vídeos',
    destinations: [
      { name: 'Área do Paciente — Vídeos', path: '/patient/videos', color: '#EC4899' },
      { name: 'Landing Page — Seção de Vídeos', path: 'hormoneecosystem.com', color: '#F59E0B' },
    ],
  },
  {
    sourceType: 'Landing Page — Textos & Números',
    sourceColor: '#F59E0B',
    sourceName: 'Hero, Benefícios, Depoimentos',
    sourceDesc: 'Textos, estatísticas e depoimentos da página principal',
    manageHref: '/admin/landing',
    manageLabel: 'Editar Landing Page',
    destinations: [
      { name: 'Landing Page pública', path: '/', color: '#F59E0B' },
    ],
  },
  {
    sourceType: 'Evidência Científica',
    sourceColor: '#7B3FE4',
    sourceName: 'Estudos e Literatura Científica',
    sourceDesc: 'Estudos em destaque e literatura mundial',
    manageHref: '/admin/evidencia',
    manageLabel: 'Editar Evidência',
    destinations: [
      { name: 'Área do Paciente — Evidência', path: '/patient/evidencia', color: '#7B3FE4' },
    ],
  },
]

const dot = (color: string) => (
  <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
)

export default function ConteudoPage() {
  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin', role: 'admin' }} title="Central de Conteúdo" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-4xl space-y-4">

            {/* Legend */}
            <div className="flex flex-wrap gap-4 bg-[#111113] border border-[#1C1C1E] rounded-2xl px-5 py-3 text-xs text-[#71717A]">
              <span className="font-semibold text-[#A1A1AA] mr-2">Audiências:</span>
              {[['#3B82F6','Médico'],['#06B6D4','Consultor'],['#EC4899','Paciente'],['#F59E0B','Landing'],['#7B3FE4','Científico']].map(([c,l]) => (
                <span key={l} className="flex items-center gap-1.5">{dot(c)}{l}</span>
              ))}
            </div>

            {/* Flow rows */}
            {FLOWS.map((f) => (
              <div key={f.sourceName} className="grid gap-3" style={{ gridTemplateColumns: '1fr 32px 1fr' }}>

                {/* Source */}
                <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl" style={{ background: f.sourceColor }} />
                  <p className="text-[9px] font-bold tracking-[0.1em] uppercase mb-1.5 flex items-center gap-1.5" style={{ color: f.sourceColor }}>
                    {dot(f.sourceColor)}{f.sourceType}
                  </p>
                  <p className="text-sm font-bold text-white mb-1">{f.sourceName}</p>
                  <p className="text-[11px] text-[#71717A] mb-3 leading-relaxed">{f.sourceDesc}</p>
                  <Link
                    href={f.manageHref}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[#18181A] border border-[#1C1C1E] text-[#A1A1AA] hover:text-white hover:border-[#3F3F46] transition-all"
                  >
                    <Edit2 className="w-3 h-3" />{f.manageLabel}
                  </Link>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center text-[#3F3F46]">
                  <ArrowRight className="w-4 h-4" />
                </div>

                {/* Destinations */}
                <div className="flex flex-col gap-2 justify-center">
                  {f.destinations.map((d) => (
                    <div key={d.path} className="bg-[#111113] border border-[#1C1C1E] rounded-xl px-4 py-3 flex items-center gap-3">
                      <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{d.name}</p>
                        <p className="text-[10px] text-[#52525B] font-mono">{d.path}</p>
                      </div>
                      {d.previewHref && (
                        <Link href={d.previewHref} className="flex items-center gap-1 text-[10px] text-[#71717A] border border-[#1C1C1E] rounded-lg px-2 py-1 hover:text-white hover:border-[#3F3F46] transition-all flex-shrink-0">
                          <Eye className="w-3 h-3" />preview
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

          </div>
        </main>
      </div>
    </div>
  )
}
