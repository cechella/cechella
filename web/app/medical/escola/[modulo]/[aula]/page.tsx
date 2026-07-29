'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Play, ChevronLeft, ChevronRight, CheckCircle2, Clock,
  Download, MessageSquare, ThumbsUp, BookOpen, Share2, List
} from 'lucide-react'

const moduleData: Record<string, {
  title: string
  color: string
  lessons: { num: number; title: string; duration: string; done: boolean }[]
}> = {
  vendas: {
    title: 'Vendas',
    color: 'from-[#7B3FE4] to-[#4C1B9B]',
    lessons: [
      { num: 1, title: 'A mentalidade do médico-vendedor — quebrando o tabu', duration: '1h 08min', done: true },
      { num: 2, title: 'Técnica da Venda Consultiva — SPIN Hormonal adaptado', duration: '1h 19min', done: true },
      { num: 3, title: 'O processo de vendas do implante de R$4.800 ao R$12.000', duration: '1h 05min', done: true },
      { num: 4, title: 'Manejo de objeções: preço, medo, tempo e outros médicos', duration: '1h 10min', done: false },
      { num: 5, title: 'Construindo o pipeline: da consulta inicial ao paciente fidelizado', duration: '1h 04min', done: false },
    ],
  },
  influencia: {
    title: 'Influência',
    color: 'from-[#3B82F6] to-[#1D4ED8]',
    lessons: [
      { num: 1, title: 'Posicionamento — encontre o nicho que te pagará R$150k/mês', duration: '1h 02min', done: true },
      { num: 2, title: 'Instagram médico de alta conversão — sem dançar reels', duration: '57min', done: false },
      { num: 3, title: 'LinkedIn e autoridade B2B para atrair parceiros estratégicos', duration: '1h 02min', done: false },
      { num: 4, title: 'YouTube e podcast médico — conteúdo evergreen que vende', duration: '1h 01min', done: false },
      { num: 5, title: 'Relações públicas e imprensa — como aparecer nos grandes veículos', duration: '1h 02min', done: false },
    ],
  },
  lideranca: {
    title: 'Liderança & Recrutamento',
    color: 'from-[#F59E0B] to-[#D97706]',
    lessons: [
      { num: 1, title: 'Quando e como contratar o primeiro funcionário do consultório', duration: '1h 01min', done: false },
      { num: 2, title: 'Formação de times de vendas — recrutando e treinando consultores', duration: '56min', done: false },
      { num: 3, title: 'Cultura de alta performance — o playbook do consultório campeão', duration: '1h 03min', done: false },
      { num: 4, title: 'Liderança situacional — gerenciar sem perder tempo clínico', duration: '1h 01min', done: false },
    ],
  },
  modelos: {
    title: 'Modelos de Negócio',
    color: 'from-[#10B981] to-[#059669]',
    lessons: [
      { num: 1, title: 'Os 7 modelos de receita para clínicas hormonais', duration: '1h 13min', done: false },
      { num: 2, title: 'Franquia médica — como replicar seu consultório em outras cidades', duration: '1h 07min', done: false },
      { num: 3, title: 'Parcerias estratégicas — academia, estética, nutrição, psicologia', duration: '1h 05min', done: false },
      { num: 4, title: 'Receita recorrente — planos de acompanhamento e assinaturas de saúde', duration: '1h 10min', done: false },
      { num: 5, title: 'Valuation e exit — quanto vale seu consultório e como vendê-lo', duration: '1h 04min', done: false },
    ],
  },
}

const moduloNums: Record<string, number> = { vendas: 1, influencia: 2, lideranca: 3, modelos: 4 }

export default function AulaPage() {
  const params = useParams()
  const moduloSlug = params?.modulo as string ?? 'vendas'
  const aulaNum = parseInt(params?.aula as string ?? '1')
  const [showList, setShowList] = useState(false)
  const [completed, setCompleted] = useState(false)

  const mod = moduleData[moduloSlug] ?? moduleData.vendas
  const lesson = mod.lessons.find(l => l.num === aulaNum) ?? mod.lessons[0]
  const prev = mod.lessons.find(l => l.num === aulaNum - 1)
  const next = mod.lessons.find(l => l.num === aulaNum + 1)
  const modNum = moduloNums[moduloSlug] ?? 1

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title={`Módulo ${modNum} — ${mod.title}`} />
        <main className="flex-1 overflow-y-auto">
          <div className="flex h-full">

            {/* Video + content area */}
            <div className="flex-1 flex flex-col overflow-y-auto">

              {/* Breadcrumb */}
              <div className="flex items-center gap-2 px-6 pt-5 pb-3 text-xs text-[#52525B]">
                <a href="/medical/escola" className="hover:text-[#A1A1AA] transition-colors">Escola de Negócios</a>
                <ChevronRight className="w-3 h-3" />
                <span className="text-[#71717A]">Módulo {modNum}: {mod.title}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-[#A1A1AA]">Aula {String(aulaNum).padStart(2, '0')}</span>
              </div>

              {/* Video player */}
              <div className="mx-6 mb-5">
                <div className="relative bg-[#0A0A0B] rounded-2xl overflow-hidden border border-[#1C1C1E]" style={{ aspectRatio: '16/9' }}>
                  {/* Placeholder — substitua pela URL real do vídeo */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#111113] to-[#0A0A0B]">
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(123,63,228,0.3)]`}>
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                    <p className="text-white font-semibold text-center px-8 mb-2">{lesson.title}</p>
                    <p className="text-[#71717A] text-sm flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />{lesson.duration}
                    </p>
                    <p className="text-[#52525B] text-xs mt-4">Integre a URL do vídeo no painel admin para reprodução</p>
                  </div>
                </div>
              </div>

              {/* Title + actions */}
              <div className="px-6 pb-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-wider mb-1">
                      Módulo {modNum} · Aula {String(aulaNum).padStart(2, '0')}
                    </p>
                    <h1 className="text-xl font-bold text-white leading-snug">{lesson.title}</h1>
                    <p className="text-sm text-[#71717A] mt-1">Dr. Vinícius Cechella · {lesson.duration}</p>
                  </div>
                  <button
                    onClick={() => setCompleted(!completed)}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      completed || lesson.done
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        : 'bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white shadow-[0_0_15px_rgba(123,63,228,0.3)]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {completed || lesson.done ? 'Concluída' : 'Marcar como concluída'}
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { icon: <ThumbsUp className="w-3.5 h-3.5" />, label: 'Gostei' },
                    { icon: <Download className="w-3.5 h-3.5" />, label: 'Material da aula' },
                    { icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Comentários' },
                    { icon: <Share2 className="w-3.5 h-3.5" />, label: 'Compartilhar' },
                  ].map((btn, i) => (
                    <button key={i} className="flex items-center gap-1.5 text-xs text-[#71717A] bg-[#111113] border border-[#1C1C1E] px-3 py-2 rounded-xl hover:text-white hover:border-[#27272A] transition-colors">
                      {btn.icon}{btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="px-6 pb-6 flex items-center justify-between gap-3">
                {prev ? (
                  <a href={`/medical/escola/${moduloSlug}/${prev.num}`}
                    className="flex items-center gap-2 text-sm text-[#71717A] bg-[#111113] border border-[#1C1C1E] px-4 py-2.5 rounded-xl hover:text-white hover:border-[#27272A] transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden md:inline">Aula anterior</span>
                  </a>
                ) : <div />}

                <a href="/medical/escola"
                  className="flex items-center gap-1.5 text-xs text-[#7B3FE4] hover:text-[#9558EE] transition-colors">
                  <List className="w-3.5 h-3.5" /> Ver todas as aulas
                </a>

                {next ? (
                  <a href={`/medical/escola/${moduloSlug}/${next.num}`}
                    className="flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-[0_0_10px_rgba(123,63,228,0.2)]">
                    <span className="hidden md:inline">Próxima aula</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>
                ) : (
                  <a href="/medical/escola"
                    className="flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                    Módulo concluído <CheckCircle2 className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Sidebar — lesson list */}
            <div className="hidden lg:flex flex-col w-80 border-l border-[#1C1C1E] overflow-y-auto">
              <div className="px-4 py-4 border-b border-[#1C1C1E]">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${mod.color} flex items-center justify-center text-white text-xs font-bold`}>{modNum}</div>
                  <p className="font-semibold text-white text-sm">{mod.title}</p>
                </div>
                <p className="text-[10px] text-[#52525B]">{mod.lessons.filter(l => l.done).length}/{mod.lessons.length} aulas concluídas</p>
                <div className="mt-2 h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${mod.color}`}
                    style={{ width: `${Math.round((mod.lessons.filter(l => l.done).length / mod.lessons.length) * 100)}%` }} />
                </div>
              </div>
              <div className="flex-1">
                {mod.lessons.map((l) => (
                  <a
                    key={l.num}
                    href={`/medical/escola/${moduloSlug}/${l.num}`}
                    className={`flex items-center gap-3 px-4 py-3.5 border-b border-[#1C1C1E] transition-all hover:bg-[#18181A]/60 ${
                      l.num === aulaNum ? 'bg-[#7B3FE4]/10 border-l-2 border-l-[#7B3FE4]' : ''
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      l.done ? 'bg-emerald-500/15' : l.num === aulaNum ? 'bg-[#7B3FE4]/20' : 'bg-[#18181A] border border-[#27272A]'
                    }`}>
                      {l.done
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        : l.num === aulaNum
                          ? <Play className="w-3 h-3 text-[#7B3FE4]" />
                          : <span className="text-[10px] text-[#52525B] font-medium">{l.num}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${l.num === aulaNum ? 'text-white font-medium' : l.done ? 'text-[#52525B]' : 'text-[#71717A]'}`}>
                        {l.title}
                      </p>
                      <p className="text-[10px] text-[#3F3F46] mt-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />{l.duration}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
