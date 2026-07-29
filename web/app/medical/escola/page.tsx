'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  GraduationCap, Play, Lock, CheckCircle2, Clock,
  TrendingUp, Users, Zap, Shield, ChevronRight, ChevronDown, Star,
} from 'lucide-react'

const modules = [
  {
    num: 1,
    slug: 'vendas',
    title: 'Vendas',
    subtitle: 'Domine o processo consultivo high ticket',
    color: 'from-[#7B3FE4] to-[#4C1B9B]',
    border: 'border-[#7B3FE4]/30',
    icon: TrendingUp,
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
    icon: Users,
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
    icon: Zap,
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
    icon: Shield,
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
  const [expanded, setExpanded] = useState<number | null>(null)

  const totalLessons = modules.flatMap(m => m.lessons).length
  const doneLessons = modules.flatMap(m => m.lessons).filter(l => l.done).length
  const pct = Math.round((doneLessons / totalLessons) * 100)
  const totalHours = '~19h'

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Escola de Negócios" />
        <main className="flex-1 overflow-y-auto px-6 py-5">

          {/* Header */}
          <div className="relative bg-[#111113] border border-amber-500/20 rounded-2xl p-5 mb-5 overflow-hidden">
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-amber-500/8 blur-[80px]" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Escola de Negócios Médicos</span>
                </div>
                <h2 className="text-xl font-bold text-white">4 Módulos · 19 Aulas · {totalHours} de conteúdo</h2>
                <p className="text-xs text-[#71717A] mt-0.5">Do zero ao G800 — pilote seu consultório como uma empresa de alto desempenho</p>
              </div>
              <div className="flex gap-2">
                {[
                  { label: 'Concluídas', value: doneLessons },
                  { label: 'Progresso', value: `${pct}%` },
                  { label: 'Módulos', value: `${modules.filter(m => m.unlocked).length}/4` },
                ].map(s => (
                  <div key={s.label} className="bg-[#18181A] border border-[#1C1C1E] rounded-xl px-4 py-2.5 text-center min-w-[66px]">
                    <p className="text-lg font-bold text-white">{s.value}</p>
                    <p className="text-[10px] text-[#71717A]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative z-10 mt-4">
              <div className="flex justify-between text-xs text-[#71717A] mb-1">
                <span>Progresso geral</span>
                <span className="text-amber-400 font-semibold">{pct}%</span>
              </div>
              <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#7B3FE4] transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          {/* Module cards 2×2 grid */}
          <div className="grid md:grid-cols-2 gap-4 mb-5">
            {modules.map((mod) => {
              const modDone = mod.lessons.filter(l => l.done).length
              const modPct = Math.round((modDone / mod.lessons.length) * 100)
              const isOpen = expanded === mod.num
              const Icon = mod.icon

              return (
                <div key={mod.num} className={`bg-[#111113] border rounded-2xl overflow-hidden ${mod.unlocked ? mod.border : 'border-[#1C1C1E]'}`}>
                  <div className="p-5">
                    {/* Module header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center flex-shrink-0 text-white shadow-lg ${!mod.unlocked ? 'opacity-40' : ''}`}>
                        {mod.unlocked ? <Icon className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-[10px] font-semibold text-[#52525B] uppercase tracking-wider">Módulo {mod.num}</span>
                          {!mod.unlocked && (
                            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Bloqueado</span>
                          )}
                          {modPct === 100 && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Concluído</span>
                          )}
                        </div>
                        <h3 className={`font-bold text-base ${mod.unlocked ? 'text-white' : 'text-[#52525B]'}`}>{mod.title}</h3>
                        <p className={`text-xs mt-0.5 ${mod.unlocked ? 'text-[#71717A]' : 'text-[#3F3F46]'}`}>{mod.subtitle}</p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#52525B]">{modDone}/{mod.lessons.length} aulas</span>
                        <span className={mod.unlocked ? 'text-white font-semibold' : 'text-[#52525B]'}>{modPct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${mod.color} ${!mod.unlocked ? 'opacity-30' : ''} transition-all`} style={{ width: `${modPct || 2}%` }} />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#52525B]">
                        <Clock className="w-3 h-3" />
                        {mod.lessons.length} aulas
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpanded(isOpen ? null : mod.num)}
                          className="flex items-center gap-1 text-xs text-[#71717A] hover:text-white transition-colors"
                        >
                          Aulas <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {mod.unlocked ? (
                          <a
                            href={`/medical/escola/${mod.slug}/1`}
                            className={`flex items-center gap-1.5 bg-gradient-to-r ${mod.color} text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity`}
                          >
                            <Play className="w-3 h-3" />
                            {modDone > 0 ? 'Continuar' : 'Iniciar'}
                          </a>
                        ) : (
                          <a
                            href="/medical/assinatura"
                            className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                          >
                            <Lock className="w-3 h-3" /> Desbloquear
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lessons list (collapsible) */}
                  {isOpen && (
                    <div className="border-t border-[#1C1C1E]">
                      {mod.lessons.map((lesson) => (
                        <a
                          key={lesson.num}
                          href={mod.unlocked ? `/medical/escola/${mod.slug}/${lesson.num}` : '#'}
                          className={`flex items-center gap-3 px-5 py-3 border-b border-[#1C1C1E] last:border-0 transition-all group ${
                            mod.unlocked ? 'hover:bg-[#18181A]/60 cursor-pointer' : 'cursor-not-allowed opacity-50'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            lesson.done ? 'bg-emerald-500/15' : 'bg-[#18181A] border border-[#27272A]'
                          }`}>
                            {lesson.done
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              : mod.unlocked
                                ? <Play className="w-3 h-3 text-[#71717A] group-hover:text-[#7B3FE4] transition-colors" />
                                : <Lock className="w-3 h-3 text-[#52525B]" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${lesson.done ? 'text-[#71717A]' : 'text-[#A1A1AA] group-hover:text-white transition-colors'}`}>
                              <span className="text-[#52525B] mr-1.5">Aula {String(lesson.num).padStart(2, '0')}</span>
                              {lesson.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Clock className="w-3 h-3 text-[#52525B]" />
                            <span className="text-[10px] text-[#52525B]">{lesson.duration}</span>
                            {lesson.done && (
                              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Assistida</span>
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

          {/* Upgrade CTA */}
          <div className="bg-gradient-to-r from-amber-500/10 to-[#F59E0B]/5 border border-amber-500/20 rounded-2xl p-4">
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
