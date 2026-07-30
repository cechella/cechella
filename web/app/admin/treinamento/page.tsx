'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import {
  GraduationCap, Plus, Trash2, Save, ChevronDown, ChevronRight,
  BookOpen, Play, Edit2, CheckCircle, AlertCircle, Eye, EyeOff, Clock,
} from 'lucide-react'

interface Lesson {
  id?: string
  module_id?: string
  num: number
  title: string
  duration: string
  video_url: string
  is_free: boolean
}

interface Module {
  id?: string
  num: number
  title: string
  subtitle: string
  color: string
  unlocked: boolean
  published: boolean
  lessons?: Lesson[]
  expanded?: boolean
}

const COLOR_OPTIONS = [
  { label: 'Roxo', value: 'from-[#7B3FE4] to-[#4C1B9B]' },
  { label: 'Azul', value: 'from-[#3B82F6] to-[#1D4ED8]' },
  { label: 'Âmbar', value: 'from-[#F59E0B] to-[#D97706]' },
  { label: 'Verde', value: 'from-[#10B981] to-[#059669]' },
  { label: 'Rosa', value: 'from-[#EC4899] to-[#BE185D]' },
]

export default function TreinamentoPage() {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingModule, setEditingModule] = useState<string | null>(null)
  const [editingLesson, setEditingLesson] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => { load() }, []) // eslint-disable-line

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data: mods, error: e1 } = await supabase
        .from('training_modules')
        .select('*')
        .order('num')
      if (e1) throw e1

      const { data: lessons, error: e2 } = await supabase
        .from('training_lessons')
        .select('*')
        .order('num')
      if (e2) throw e2

      const withLessons: Module[] = (mods ?? []).map((m) => ({
        ...m,
        lessons: (lessons ?? []).filter((l) => l.module_id === m.id),
        expanded: false,
      }))
      setModules(withLessons)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  async function addModule() {
    const num = modules.length + 1
    try {
      const { data, error: e } = await supabase
        .from('training_modules')
        .insert({ num, title: `Módulo ${num}`, subtitle: '', color: COLOR_OPTIONS[0].value, unlocked: true, published: false })
        .select()
        .single()
      if (e) throw e
      setModules((prev) => [...prev, { ...data, lessons: [], expanded: true }])
      setEditingModule(data.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar módulo')
    }
  }

  async function saveModule(mod: Module) {
    if (!mod.id) return
    setSaving(true)
    try {
      const { error: e } = await supabase
        .from('training_modules')
        .update({ title: mod.title, subtitle: mod.subtitle, color: mod.color, unlocked: mod.unlocked, published: mod.published, num: mod.num })
        .eq('id', mod.id)
      if (e) throw e
      setEditingModule(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function deleteModule(id: string) {
    if (!confirm('Excluir este módulo e todas as suas aulas?')) return
    const { error: e } = await supabase.from('training_modules').delete().eq('id', id)
    if (e) { setError(e.message); return }
    setModules((prev) => prev.filter((m) => m.id !== id))
  }

  async function addLesson(moduleId: string) {
    const mod = modules.find((m) => m.id === moduleId)
    if (!mod) return
    const num = (mod.lessons?.length ?? 0) + 1
    try {
      const { data, error: e } = await supabase
        .from('training_lessons')
        .insert({ module_id: moduleId, num, title: `Aula ${num}`, duration: '', video_url: '', is_free: false })
        .select()
        .single()
      if (e) throw e
      setModules((prev) => prev.map((m) =>
        m.id === moduleId ? { ...m, lessons: [...(m.lessons ?? []), data] } : m
      ))
      setEditingLesson(data.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar aula')
    }
  }

  async function saveLesson(lesson: Lesson) {
    if (!lesson.id) return
    setSaving(true)
    try {
      const { error: e } = await supabase
        .from('training_lessons')
        .update({ title: lesson.title, duration: lesson.duration, video_url: lesson.video_url, is_free: lesson.is_free, num: lesson.num })
        .eq('id', lesson.id)
      if (e) throw e
      setEditingLesson(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar aula')
    } finally {
      setSaving(false)
    }
  }

  async function deleteLesson(moduleId: string, lessonId: string) {
    if (!confirm('Excluir esta aula?')) return
    const { error: e } = await supabase.from('training_lessons').delete().eq('id', lessonId)
    if (e) { setError(e.message); return }
    setModules((prev) => prev.map((m) =>
      m.id === moduleId ? { ...m, lessons: (m.lessons ?? []).filter((l) => l.id !== lessonId) } : m
    ))
  }

  function updateModule(id: string, key: keyof Module, value: unknown) {
    setModules((prev) => prev.map((m) => m.id === id ? { ...m, [key]: value } : m))
  }

  function updateLesson(moduleId: string, lessonId: string, key: keyof Lesson, value: unknown) {
    setModules((prev) => prev.map((m) =>
      m.id === moduleId
        ? { ...m, lessons: (m.lessons ?? []).map((l) => l.id === lessonId ? { ...l, [key]: value } : l) }
        : m
    ))
  }

  function toggleModule(id: string) {
    setModules((prev) => prev.map((m) => m.id === id ? { ...m, expanded: !m.expanded } : m))
  }

  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length ?? 0), 0)
  const publishedModules = modules.filter((m) => m.published).length

  if (loading) {
    return (
      <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
        <Sidebar role="admin" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#7B3FE4] border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin', role: 'admin' }} title="Ger. Treinamento" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-3xl space-y-5">

            {/* Header stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Módulos', value: modules.length, color: 'text-[#7B3FE4]' },
                { label: 'Aulas', value: totalLessons, color: 'text-[#3B82F6]' },
                { label: 'Publicados', value: publishedModules, color: 'text-[#22C55E]' },
              ].map((s) => (
                <div key={s.label} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-[#71717A] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {saved && (
              <div className="flex items-center gap-2 text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                <CheckCircle className="w-4 h-4" /> Salvo com sucesso
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            {/* Modules list */}
            {modules.map((mod) => (
              <div key={mod.id} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <button onClick={() => toggleModule(mod.id!)} className="text-[#71717A] hover:text-white transition-colors flex-shrink-0">
                    {mod.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center flex-shrink-0`}>
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {editingModule === mod.id ? (
                      <div className="space-y-2">
                        <input
                          autoFocus
                          value={mod.title}
                          onChange={(e) => updateModule(mod.id!, 'title', e.target.value)}
                          placeholder="Título do módulo"
                          className="w-full bg-[#18181A] border border-[#7B3FE4]/40 rounded-lg px-2 py-1 text-white text-sm focus:outline-none"
                        />
                        <input
                          value={mod.subtitle}
                          onChange={(e) => updateModule(mod.id!, 'subtitle', e.target.value)}
                          placeholder="Subtítulo (ex: Domine o processo consultivo high ticket)"
                          className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#7B3FE4]"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#71717A]">Cor:</span>
                          {COLOR_OPTIONS.map((c) => (
                            <button
                              key={c.value}
                              onClick={() => updateModule(mod.id!, 'color', c.value)}
                              className={`w-6 h-6 rounded-lg bg-gradient-to-br ${c.value} border-2 transition-all ${mod.color === c.value ? 'border-white scale-110' : 'border-transparent'}`}
                              title={c.label}
                            />
                          ))}
                          <label className="flex items-center gap-1.5 text-xs text-[#A1A1AA] cursor-pointer ml-2">
                            <input type="checkbox" checked={mod.unlocked} onChange={(e) => updateModule(mod.id!, 'unlocked', e.target.checked)} className="accent-[#7B3FE4]" />
                            Desbloqueado
                          </label>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-white truncate">{mod.title}</p>
                        <p className="text-xs text-[#71717A] truncate">{mod.subtitle || 'Sem subtítulo'} · {mod.lessons?.length ?? 0} aulas</p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => { updateModule(mod.id!, 'published', !mod.published); setTimeout(() => saveModule({ ...mod, published: !mod.published }), 0) }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${mod.published ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-[#18181A] text-[#71717A] border border-[#1C1C1E]'}`}
                    >
                      {mod.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {mod.published ? 'Publicado' : 'Rascunho'}
                    </button>
                    {editingModule === mod.id ? (
                      <button onClick={() => saveModule(mod)} disabled={saving} className="text-[#7B3FE4] hover:text-[#9D6BF0] transition-colors">
                        <Save className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={() => setEditingModule(mod.id!)} className="text-[#71717A] hover:text-white transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => deleteModule(mod.id!)} className="text-[#71717A] hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {mod.expanded && (
                  <div className="border-t border-[#1C1C1E]">
                    {(mod.lessons ?? []).map((lesson) => (
                      <div key={lesson.id} className="border-b border-[#1C1C1E] last:border-b-0">
                        <div className="flex items-center gap-3 px-4 py-3 pl-14">
                          <div className="w-6 h-6 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/20 flex items-center justify-center flex-shrink-0">
                            <Play className="w-3 h-3 text-[#3B82F6]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {editingLesson === lesson.id ? (
                              <div className="space-y-2">
                                <input
                                  autoFocus
                                  value={lesson.title}
                                  onChange={(e) => updateLesson(mod.id!, lesson.id!, 'title', e.target.value)}
                                  placeholder="Título da aula"
                                  className="w-full bg-[#18181A] border border-[#7B3FE4]/40 rounded-lg px-2 py-1 text-white text-sm focus:outline-none"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    value={lesson.duration}
                                    onChange={(e) => updateLesson(mod.id!, lesson.id!, 'duration', e.target.value)}
                                    placeholder="Duração (ex: 1h 08min)"
                                    className="bg-[#18181A] border border-[#1C1C1E] rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#7B3FE4]"
                                  />
                                  <input
                                    value={lesson.video_url}
                                    onChange={(e) => updateLesson(mod.id!, lesson.id!, 'video_url', e.target.value)}
                                    placeholder="URL do vídeo"
                                    className="bg-[#18181A] border border-[#1C1C1E] rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#7B3FE4] font-mono"
                                  />
                                </div>
                                <label className="flex items-center gap-2 text-xs text-[#A1A1AA] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={lesson.is_free}
                                    onChange={(e) => updateLesson(mod.id!, lesson.id!, 'is_free', e.target.checked)}
                                    className="accent-[#7B3FE4]"
                                  />
                                  Aula gratuita (preview)
                                </label>
                              </div>
                            ) : (
                              <>
                                <p className="text-xs font-medium text-white">
                                  <span className="text-[#52525B] mr-1.5">Aula {String(lesson.num).padStart(2, '0')}</span>
                                  {lesson.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {lesson.duration && (
                                    <span className="flex items-center gap-1 text-[10px] text-[#71717A]">
                                      <Clock className="w-3 h-3" />{lesson.duration}
                                    </span>
                                  )}
                                  {lesson.is_free && (
                                    <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded">Grátis</span>
                                  )}
                                  {lesson.video_url && (
                                    <span className="text-[10px] text-[#7B3FE4]">✓ vídeo</span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {editingLesson === lesson.id ? (
                              <button onClick={() => saveLesson(lesson)} disabled={saving} className="text-[#7B3FE4] hover:text-[#9D6BF0] transition-colors">
                                <Save className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button onClick={() => setEditingLesson(lesson.id!)} className="text-[#71717A] hover:text-white transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => deleteLesson(mod.id!, lesson.id!)} className="text-[#71717A] hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => addLesson(mod.id!)}
                      className="w-full flex items-center gap-2 px-4 py-3 pl-14 text-xs text-[#71717A] hover:text-[#7B3FE4] hover:bg-[#7B3FE4]/5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar aula
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={addModule}
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-[#1C1C1E] rounded-2xl text-sm text-[#71717A] hover:text-[#7B3FE4] hover:border-[#7B3FE4]/40 transition-all"
            >
              <GraduationCap className="w-4 h-4" />
              Adicionar módulo
            </button>

          </div>
        </main>
      </div>
    </div>
  )
}
