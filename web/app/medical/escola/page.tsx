'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  GraduationCap, Play, Lock, CheckCircle2, Clock,
  TrendingUp, Users, Zap, Shield, ChevronRight, Star
} from 'lucide-react'

const modules = [
  {
    num: 1,
    slug: 'vendas',
    title: 'Vendas',
    subtitle: 'Domine o processo consultivo high ticket',
    color: 'from-[#7B3FE4] to-[#4C1B9B]',
    border: 'border-[#7B3FE4]/30',
    icon: <TrendingUp className="w-5 h-5" />,
    unlocked: true,
    lessons: [
      { num: 1, title: 'A mentalidade do médico-vendedor — quebrando o tabu', duration: '1h 08min', done: true },
      { num: 2, title: 'Técnica da Venda Consultiva — SPIN Hormonal adaptado', duration: '1h 19min', done: true },
      { num: 3, title: 'O processo de vendas do implante de R$4.800 ao R$12.000', duration: '1h 05min', done: true },
      { num: 4, title: 'Manejo de objeções: preço, medo, tempo e outros médicos', duration: '1h 10min', done: false },
      { num: 5, title: 'Construindo o pipeline: da consulta inicial ao paciente fidelizado', duration: '1h 04min', done: false },
    ],
  },
  {
    num: 2,
    slug: 'influencia',
    title: 'Influência',
    subtitle: 'Construa autoridade e audiência médica',
    color: 'from-[#3B82F6] to-[#1D4ED8]',
    border: 'border-[#3B82F6]/30',
    icon: <Users className="w-5 h-5" />,
    unlocked: true,
    lessons: [
      { num: 1, title: 'Posicionamento — encontre o nicho que te pagará R$150k/mês', duration: '1h 02min', done: true },
      { num: 2, title: 'Instagram médico de alta conversão — sem dançar reels', duration: '57min', done: false },
      { num: 3, title: 'LinkedIn e autoridade B2B para atrair parceiros estratégicos', duration: '1h 02min', done: false },
      { num: 4, title: 'YouTube e podcast médico — conteúdo evergreen que vende', duration: '1h 01min', done: false },
      { num: 5, title: 'Relações públicas e imprensa — como aparecer nos grandes veículos', duration: '1h 02min', done: false },
    ],
  },
  {
    num: 3,
    slug: 'lideranca',
    title: 'Liderança & Recrutamento',
    subtitle: 'Forme e lidere times de alto desempenho',
    color: 'from-[#F59E0B] to-[#D97706]',
    border: 'border-amber-500/30',
    icon: <Zap className="w-5 h-5" />,
    unlocked: false,
    lessons: [
      { num: 1, title: 'Quando e como contratar o primeiro funcionário do consultório', duration: '1h 01min', done: false },
      { num: 2, title: 'Formação de times de vendas — recrutando e treinando consultores', duration: '56min', done: false },
      { num: 3, title: 'Cultura de alta performance — o playbook do consultório campeão', duration: '1h 03min', done: false },
      { num: 4, title: 'Liderança situacional — gerenciar sem perder tempo clínico', duration: '1h 01min', done: false },
    ],
  },
  {
    num: 4,
    slug: 'modelos',
    title: 'Modelos de Negócio',
    subtitle: 'Estruture sua empresa para escala e lucro',
    color: 'from-[#10B981] to-[#059669]',
    border: 'border-emerald-500/30',
    icon: <Shield className="w-5 h-5" />,
    unlocked: false,
    lessons: [
      { num: 1, title: 'Os 7 modelos de receita para clínicas hormonais', duration: '1h 13min', done: false },
      { num: 2, title: 'Franquia médica — como replicar seu consultório em outras cidades', duration: '1h 07min', done: false },
      { num: 3, title: 'Parcerias estratégicas — academia, estética, nutrição, psicologia', duration: '1h 05min', done: false },
      { num: 4, title: 'Receita recorrente — planos de acompanhamento e assinaturas de saúde', duration: '1h 10min', done: false },
      { num: 5, title: 'Valuation e exit — quanto vale seu consultório e como vendê-lo', duration: '1h 04min', done: false },
    ],
  },
]

export default function EscolaPage() {
  const [expanded, setExpanded] = useState<number | null>(1)

  const totalLessons = modules.flatMap(m => m.lessons).length
  const doneLessons = modules.flatMap(m => m.lessons).filter(l => l.done).length
  const pct = Math.round((doneLessons / totalLessons) * 100)

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Escola de Negócios" />
        <main className="flex-1 overflow-y-auto px-6 py-6">

          {/* Header */}
          <div className="relative bg-gradient-to-r from-amber-500/10 to-[#7B3FE4]/10 border border-amber-500/20 rounded-3xl p-6 mb-6 overflow-hidden">
            <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-amber-500/10 blur-[60px]" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Escola de Negócios Médicos</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">4 Módulos · 19 Aulas · ~19h de conteúdo</h2>
                <p className="text-sm text-[#71717A]">Do zero ao G800 — pilote seu consultório como uma empresa de alto desempenho</p>
              </div>
              <div className="flex gap-3">
                {[
                  { label: 'Concluídas', value: doneLessons },
                  { label: 'Progresso', value: `${pct}%` },
                  { label: 'Módulos', value: `${modules.filter(m => m.unlocked).length}/4` },
                ].map(s => (
                  <div key={s.label} className="bg-[#111113]/80 border border-[#1C1C1E] rounded-2xl px-4 py-3 text-center min-w-[70px]">
                    <p className="text-lg font-bold text-white">{s.value}</p>
                    <p className="text-[10px] text-[#71717A]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative z-10 mt-5">
              <div className="flex justify-between text-xs text-[#71717A] mb-1.5">
                <span>Progresso geral</span>
                <span className="text-amber-400 font-semibold">{pct}%</span>
              </div>
              <div className="h-2 bg-[#1C1C1E] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#7B3FE4] transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          {/* Modules */}
          <div className="space-y-4">
            {modules.map((mod) => {
              const modDone = mod.lessons.filter(l => l.done).length
              const modPct = Math.round((modDone / mod.lessons.length) * 100)
              const isOpen = expanded === mod.num

              return (
                <div key={mod.num} className={`bg-[#111113] border rounded-2xl overflow-hidden transition-all ${mod.unlocked ? mod.border : 'border-[#1C1C1E]'}`}>
                  {/* Module header */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : mod.num)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-[#18181A]/50 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center flex-shrink-0 text-white shadow-lg ${!mod.unlocked ? 'opacity-40' : ''}`}>
                      {mod.unlocked ? mod.icon : <Lock className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-[10px] font-semibold text-[#52525B] uppercase tracking-wider">Módulo {mod.num}</span>
                        {!mod.unlocked && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Bloqueado — Plano Pro+</span>
                        )}
                        {modPct === 100 && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Concluído</span>
                        )}
                      </div>
                      <h3 className={`font-bold text-base ${mod.unlocked ? 'text-white' : 'text-[#52525B]'}`}>{mod.title}</h3>
                      <p className={`text-xs mt-0.5 ${mod.unlocked ? 'text-[#71717A]' : 'text-[#3F3F46]'}`}>{mod.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="hidden md:block text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-24 h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full bg-gradient-to-r ${mod.color} ${!mod.unlocked ? 'opacity-30' : ''}`} style={{ width: `${modPct || 2}%` }} />
                          </div>
                          <span className="text-xs text-[#71717A]">{modPct}%</span>
                        </div>
                        <p className="text-[10px] text-[#52525B]">{modDone}/{mod.lessons.length} aulas</p>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-[#52525B] transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {/* Lessons list */}
                  {isOpen && (
                    <div className="border-t border-[#1C1C1E]">
                      {mod.lessons.map((lesson, li) => (
                        <a
                          key={lesson.num}
                          href={mod.unlocked ? `/medical/escola/${mod.slug}/${lesson.num}` : '#'}
                          className={`flex items-center gap-4 px-5 py-3.5 border-b border-[#1C1C1E] last:border-0 transition-all group ${
                            mod.unlocked ? 'hover:bg-[#18181A]/60 cursor-pointer' : 'cursor-not-allowed opacity-50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            lesson.done ? 'bg-emerald-500/15' : 'bg-[#18181A] border border-[#27272A]'
                          }`}>
                            {lesson.done
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              : mod.unlocked
                                ? <Play className="w-3.5 h-3.5 text-[#71717A] group-hover:text-[#7B3FE4] transition-colors" />
                                : <Lock className="w-3.5 h-3.5 text-[#52525B]" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${lesson.done ? 'text-[#71717A]' : 'text-[#A1A1AA] group-hover:text-white transition-colors'}`}>
                              <span className="text-[#52525B] mr-2">Aula {String(lesson.num).padStart(2, '0')}</span>
                              {lesson.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Clock className="w-3 h-3 text-[#52525B]" />
                            <span className="text-xs text-[#52525B]">{lesson.duration}</span>
                            {lesson.done && (
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Assistida</span>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Locked modules CTA */}
          <div className="mt-6 bg-gradient-to-r from-amber-500/10 to-[#F59E0B]/5 border border-amber-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">Desbloqueie os Módulos 3 e 4</p>
                <p className="text-xs text-[#71717A] mt-0.5">Liderança & Recrutamento e Modelos de Negócio estão disponíveis no Plano Pro ou superior.</p>
              </div>
              <a href="/medical/assinatura" className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                Fazer Upgrade <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
