'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  GraduationCap, Play, Lock, CheckCircle2, Clock,
  TrendingUp, ChevronRight, ChevronDown, Star,
} from 'lucide-react'

interface Lesson {
  id: string
  num: number
  title: string
  duration: string
  video_url: string
  is_free: boolean
  done?: boolean
}

interface Module {
  id: string
  num: number
  title: string
  subtitle: string
  color: string
  unlocked: boolean
  published: boolean
  lessons: Lesson[]
}

const FALLBACK_MODULES: Module[] = [
  {
    id: '1', num: 1, title: 'Técnica de Vendas', subtitle: 'Modelo mental, cultura, canais e técnicas de vendas',
    color: 'from-[#7B3FE4] to-[#4C1B9B]', unlocked: true, published: true,
    lessons: [
      { id: '1', num: 1, title: 'Módulo 01 — Aula Modelo Mental / Comportamento', duration: '1h 08min', video_url: '', is_free: false, done: true },
      { id: '2', num: 2, title: 'Módulo 02 — Cultura de Vendas', duration: '1h 19min', video_url: '', is_free: false, done: true },
      { id: '3', num: 3, title: 'Módulo 03 — Canais de Vendas', duration: '1h 05min', video_url: '', is_free: false, done: true },
      { id: '4', num: 4, title: 'Módulo 04 — Técnicas de Fechamento', duration: '1h 10min', video_url: '', is_free: false, done: false },
      { id: '5', num: 5, title: 'Módulo 05 — Resumo', duration: '1h 04min', video_url: '', is_free: false, done: false },
    ],
  },
  {
    id: '2', num: 2, title: 'Influência & Persuasão', subtitle: 'Construa autoridade e converta com inteligência emocional',
    color: 'from-[#3B82F6] to-[#1D4ED8]', unlocked: true, published: true,
    lessons: [
      { id: '6', num: 1, title: 'Posicionamento — encontre o nicho que te pagará mais', duration: '1h 02min', video_url: '', is_free: false, done: true },
      { id: '7', num: 2, title: 'Os 6 princípios de Cialdini aplicados a vendas', duration: '57min', video_url: '', is_free: false, done: false },
      { id: '8', num: 3, title: 'Storytelling que converte', duration: '1h 02min', video_url: '', is_free: false, done: false },
      { id: '9', num: 4, title: 'Ancoragem e enquadramento de preço', duration: '1h 01min', video_url: '', is_free: false, done: false },
      { id: '10', num: 5, title: 'Contorno de objeções com empatia', duration: '1h 02min', video_url: '', is_free: false, done: false },
    ],
  },
  {
    id: '3', num: 3, title: 'Liderança & Recrutamento', subtitle: 'Forme e lidere times de alto desempenho',
    color: 'from-[#F59E0B] to-[#D97706]', unlocked: false, published: true,
    lessons: [
      { id: '11', num: 1, title: 'O perfil do consultor recrutável', duration: '1h 01min', video_url: '', is_free: false },
      { id: '12', num: 2, title: 'Onboarding e primeiros 30 dias', duration: '56min', video_url: '', is_free: false },
      { id: '13', num: 3, title: 'Cultura de alta performance — o playbook do consultor campeão', duration: '1h 03min', video_url: '', is_free: false },
      { id: '14', num: 4, title: 'Liderança situacional — gerenciar sem perder tempo de vendas', duration: '1h 01min', video_url: '', is_free: false },
    ],
  },
  {
    id: '4', num: 4, title: 'Modelos de Negócio', subtitle: 'Estruture sua carreira para escala e lucro',
    color: 'from-[#10B981] to-[#059669]', unlocked: false, published: true,
    lessons: [
      { id: '15', num: 1, title: 'Como funciona o programa Gold', duration: '1h 13min', video_url: '', is_free: false },
      { id: '16', num: 2, title: 'Tabela de comissões e bônus', duration: '1h 07min', video_url: '', is_free: false },
      { id: '17', num: 3, title: 'Parcelamento — até 6x sem juros', duration: '1h 05min', video_url: '', is_free: false },
      { id: '18', num: 4, title: 'Compliance, ética e boas práticas', duration: '1h 10min', video_url: '', is_free: false },
      { id: '19', num: 5, title: 'Valuation e próximos passos na carreira', duration: '1h 04min', video_url: '', is_free: false },
    ],
  },
]

export default function SalesTrainingPage() {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => { load() }, []) // eslint-disable-line

  async function load() {
    try {
      const { data: mods, error: e1 } = await supabase
        .from('training_modules')
        .select('*')
        .eq('published', true)
        .eq('role', 'sales')
        .order('num')

      const { data: lessons, error: e2 } = await supabase
        .from('training_lessons')
        .select('*')
        .order('num')

      if (e1 || e2 || !mods?.length) {
        setModules(FALLBACK_MODULES)
      } else {
        setModules(mods.map((m) => ({
          ...m,
          lessons: (lessons ?? []).filter((l: any) => l.module_id === m.id),
        })))
      }
    } catch {
      setModules(FALLBACK_MODULES)
    } finally {
      setLoading(false)
    }
  }

  const allLessons = modules.flatMap((m) => m.lessons)
  const doneLessons = allLessons.filter((l) => l.done).length
  const pct = allLessons.length ? Math.round((doneLessons / allLessons.length) * 100) : 0
  const totalHours = `~${Math.round(allLessons.length * 1.05)}h`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-[#7B3FE4] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="relative bg-[#111113] border border-amber-500/20 rounded-2xl p-5 mb-5 overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-amber-500/8 blur-[80px]" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Escola de Vendas</span>
            </div>
            <h2 className="text-xl font-bold text-white">{modules.length} Módulos · {allLessons.length} Aulas · {totalHours} de conteúdo</h2>
            <p className="text-xs text-[#71717A] mt-0.5">Do primeiro contato ao fechamento — torne-se o consultor que fecha mais.</p>
          </div>
          <div className="flex gap-2">
            {[
              { label: 'Concluídas', value: doneLessons },
              { label: 'Progresso', value: `${pct}%` },
              { label: 'Módulos', value: `${modules.filter((m) => m.unlocked).length}/${modules.length}` },
            ].map((s) => (
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

      {/* Module cards */}
      <div className="grid md:grid-cols-2 gap-4 mb-5">
        {modules.map((mod) => {
          const modDone = mod.lessons.filter((l) => l.done).length
          const modPct = mod.lessons.length ? Math.round((modDone / mod.lessons.length) * 100) : 0
          const isOpen = expanded === mod.id

          return (
            <div key={mod.id} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center flex-shrink-0 text-white shadow-lg ${!mod.unlocked ? 'opacity-40' : ''}`}>
                    {mod.unlocked ? <TrendingUp className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-[#52525B] uppercase tracking-wider">Módulo {mod.num}</span>
                      {!mod.unlocked && <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Bloqueado</span>}
                      {modPct === 100 && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Concluído</span>}
                    </div>
                    <h3 className={`font-bold text-base ${mod.unlocked ? 'text-white' : 'text-[#52525B]'}`}>{mod.title}</h3>
                    <p className={`text-xs mt-0.5 ${mod.unlocked ? 'text-[#71717A]' : 'text-[#3F3F46]'}`}>{mod.subtitle}</p>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#52525B]">{modDone}/{mod.lessons.length} aulas</span>
                    <span className={mod.unlocked ? 'text-white font-semibold' : 'text-[#52525B]'}>{modPct}%</span>
                  </div>
                  <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${mod.color} ${!mod.unlocked ? 'opacity-30' : ''} transition-all`} style={{ width: `${modPct || 2}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#52525B]">
                    <Clock className="w-3 h-3" />{mod.lessons.length} aulas
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setExpanded(isOpen ? null : mod.id)} className="flex items-center gap-1 text-xs text-[#71717A] hover:text-white transition-colors">
                      Aulas <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {mod.unlocked ? (
                      <a href={`/sales/training/${mod.num}/1`} className={`flex items-center gap-1.5 bg-gradient-to-r ${mod.color} text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity`}>
                        <Play className="w-3 h-3" />{modDone > 0 ? 'Continuar' : 'Iniciar'}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-lg opacity-70">
                        <Lock className="w-3 h-3" /> Bloqueado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-[#1C1C1E]">
                  {mod.lessons.map((lesson) => (
                    <a
                      key={lesson.id}
                      href={mod.unlocked && lesson.video_url ? lesson.video_url : '#'}
                      className={`flex items-center gap-3 px-5 py-3 border-b border-[#1C1C1E] last:border-0 transition-all group ${mod.unlocked ? 'hover:bg-[#18181A]/60 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${lesson.done ? 'bg-emerald-500/15' : 'bg-[#18181A] border border-[#27272A]'}`}>
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
                        {lesson.done && <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Assistida</span>}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-amber-500/10 to-[#F59E0B]/5 border border-amber-500/20 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-white text-sm">Desbloqueie mais módulos</p>
            <p className="text-xs text-[#71717A] mt-0.5">Módulos avançados disponíveis para consultores habilitados.</p>
          </div>
          <a href="/sales/perfil" className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
            Fazer Upgrade <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      </div>

    </div>
  )
}
