'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { GraduationCap, Play, Lock, CheckCircle2, Clock, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react'

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
      { id: '1', num: 1, title: 'Módulo 01 — Aula Modelo Mental / Comportamento', duration: '1h 08min', video_url: '', is_free: false, done: false },
      { id: '2', num: 2, title: 'Módulo 02 — Cultura de Vendas', duration: '1h 19min', video_url: '', is_free: false, done: false },
      { id: '3', num: 3, title: 'Módulo 03 — Canais de Vendas', duration: '1h 05min', video_url: '', is_free: false, done: false },
      { id: '4', num: 4, title: 'Módulo 04 — Técnicas de Vendas', duration: '1h 10min', video_url: '', is_free: false, done: false },
      { id: '5', num: 5, title: 'Módulo 05 — Resumo', duration: '1h 04min', video_url: '', is_free: false, done: false },
    ],
  },
  {
    id: '2', num: 2, title: 'Influência', subtitle: 'Construa autoridade e audiência médica',
    color: 'from-[#3B82F6] to-[#1D4ED8]', unlocked: true, published: true,
    lessons: [
      { id: '6', num: 1, title: 'Posicionamento — encontre o nicho que te pagará R$150k/mês', duration: '1h 02min', video_url: '', is_free: false, done: false },
      { id: '7', num: 2, title: 'Instagram médico de alta conversão — sem dançar reels', duration: '57min', video_url: '', is_free: false, done: false },
      { id: '8', num: 3, title: 'LinkedIn e autoridade B2B para atrair parceiros estratégicos', duration: '1h 02min', video_url: '', is_free: false, done: false },
      { id: '9', num: 4, title: 'YouTube e podcast médico — conteúdo evergreen que vende', duration: '1h 01min', video_url: '', is_free: false, done: false },
      { id: '10', num: 5, title: 'Relações públicas e imprensa — como aparecer nos grandes veículos', duration: '1h 02min', video_url: '', is_free: false, done: false },
    ],
  },
  {
    id: '3', num: 3, title: 'Liderança & Recrutamento', subtitle: 'Forme e lidere times de alto desempenho',
    color: 'from-[#F59E0B] to-[#D97706]', unlocked: false, published: true,
    lessons: [
      { id: '11', num: 1, title: 'Quando e como contratar o primeiro funcionário do consultório', duration: '1h 01min', video_url: '', is_free: false },
      { id: '12', num: 2, title: 'Formação de times de vendas — recrutando e treinando consultores', duration: '56min', video_url: '', is_free: false },
      { id: '13', num: 3, title: 'Cultura de alta performance — o playbook do consultório campeão', duration: '1h 03min', video_url: '', is_free: false },
      { id: '14', num: 4, title: 'Liderança situacional — gerenciar sem perder tempo clínico', duration: '1h 01min', video_url: '', is_free: false },
    ],
  },
  {
    id: '4', num: 4, title: 'Modelos de Negócio', subtitle: 'Estruture sua empresa para escala e lucro',
    color: 'from-[#10B981] to-[#059669]', unlocked: false, published: true,
    lessons: [
      { id: '15', num: 1, title: 'Os 7 modelos de receita para clínicas hormonais', duration: '1h 13min', video_url: '', is_free: false },
      { id: '16', num: 2, title: 'Franquia médica — como replicar seu consultório em outras cidades', duration: '1h 07min', video_url: '', is_free: false },
      { id: '17', num: 3, title: 'Parcerias estratégicas — academia, estética, nutrição, psicologia', duration: '1h 05min', video_url: '', is_free: false },
      { id: '18', num: 4, title: 'Receita recorrente — planos de acompanhamento e assinaturas de saúde', duration: '1h 10min', video_url: '', is_free: false },
      { id: '19', num: 5, title: 'Valuation e exit — quanto vale seu consultório e como vendê-lo', duration: '1h 04min', video_url: '', is_free: false },
    ],
  },
]

let sb: ReturnType<typeof createBrowserClient> | null = null
function getSupabase() {
  if (!sb) sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return sb
}

export default function SalesTrainingPage() {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { load() }, []) // eslint-disable-line

  async function load() {
    try {
      const supabase = getSupabase()
      const { data: mods, error: e1 } = await supabase
        .from('training_modules')
        .select('*')
        .eq('published', true)
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
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-[#7B3FE4] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <div className="relative bg-[#111113] border border-amber-500/20 rounded-2xl p-5 overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-amber-500/8 blur-[80px]" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Escola de Vendas</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              {modules.length} Módulos · {allLessons.length} Aulas · {totalHours} de conteúdo
            </h2>
            <p className="text-xs text-[#71717A] mt-0.5">Técnicas e estratégias para consultores de alta performance</p>
          </div>
          <div className="flex gap-2">
            {[
              { label: 'Concluídas', value: doneLessons },
              { label: 'Progresso',  value: `${pct}%` },
              { label: 'Módulos',    value: `${modules.filter((m) => m.unlocked).length}/${modules.length}` },
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
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#7B3FE4] transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Module cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {modules.map((mod) => {
          const modDone = mod.lessons.filter((l) => l.done).length
          const modPct = mod.lessons.length ? Math.round((modDone / mod.lessons.length) * 100) : 0
          const isOpen = expanded === mod.id
          const gradientFrom = mod.color.split(' ')[0].replace('from-[', '').replace(']', '')

          return (
            <div
              key={mod.id}
              className={`bg-[#111113] border rounded-2xl overflow-hidden transition-all ${
                mod.unlocked ? 'border-[#27272A] hover:border-[#3F3F46]' : 'border-[#1C1C1E] opacity-60'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center flex-shrink-0 text-white shadow-lg ${!mod.unlocked ? 'opacity-40' : ''}`}>
                    {mod.unlocked ? <TrendingUp className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
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
                    <h3 className={`font-bold text-base leading-tight ${mod.unlocked ? 'text-white' : 'text-[#52525B]'}`}>{mod.title}</h3>
                    <p className="text-xs text-[#71717A] mt-0.5">{mod.subtitle}</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-center justify-between text-[10px] text-[#71717A] mb-1.5">
                  <span>{mod.lessons.length} aulas</span>
                  <span>{modPct}%</span>
                </div>
                <div className="h-[3px] bg-[#1C1C1E] rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full ${modPct === 100 ? 'bg-emerald-400' : `bg-gradient-to-r ${mod.color}`}`}
                    style={{ width: `${modPct}%` }}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <button
                    disabled={!mod.unlocked}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      !mod.unlocked
                        ? 'text-[#52525B] cursor-not-allowed'
                        : modPct === 100
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        : modPct > 0
                        ? 'text-[#A78BFA] bg-[#7C3AED]/10 border border-[#7C3AED]/20 hover:bg-[#7C3AED]/20'
                        : 'bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white hover:opacity-90'
                    }`}
                  >
                    {modPct === 100 ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Concluído</>
                    ) : modPct > 0 ? (
                      <><Play className="w-3 h-3" /> Continuar</>
                    ) : mod.unlocked ? (
                      <><Play className="w-3 h-3" /> Iniciar</>
                    ) : (
                      '🔒 Bloqueado'
                    )}
                  </button>

                  {mod.lessons.length > 0 && (
                    <button
                      onClick={() => setExpanded(isOpen ? null : mod.id)}
                      className="flex items-center gap-1 text-[11px] text-[#71717A] hover:text-white transition-colors"
                    >
                      Aulas
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Lesson list */}
              {isOpen && (
                <div className="border-t border-[#1C1C1E]">
                  {mod.lessons.map((lesson, idx) => (
                    <div
                      key={lesson.id}
                      className={`flex items-center gap-3 px-5 py-3 border-b border-[#1C1C1E] last:border-b-0 transition-colors ${
                        mod.unlocked ? 'hover:bg-[#18181A] cursor-pointer' : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${
                        lesson.done
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-[#1C1C1E] text-[#52525B]'
                      }`}>
                        {lesson.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-medium truncate ${lesson.done ? 'text-[#71717A]' : 'text-white'}`}>
                          {lesson.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="flex items-center gap-1 text-[10px] text-[#52525B]">
                          <Clock className="w-3 h-3" />{lesson.duration}
                        </span>
                        {mod.unlocked && !lesson.done && (
                          <div className="w-6 h-6 rounded-full bg-[#7C3AED]/15 flex items-center justify-center">
                            <Play className="w-3 h-3 text-[#A78BFA]" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
