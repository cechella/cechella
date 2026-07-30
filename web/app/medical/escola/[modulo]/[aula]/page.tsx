'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { SecureVideoPlayer } from '@/components/ui/SecureVideoPlayer'
import {
  Play, ChevronLeft, ChevronRight, CheckCircle2, Clock,
  Download, MessageSquare, ThumbsUp, Share2, List, Loader2,
  X, Maximize,
} from 'lucide-react'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─── Types ───────────────────────────────────────────────────────────────────

interface LessonData {
  id: string
  num: number
  title: string
  duration: string
  video_url: string | null
  is_free: boolean
}

interface ModuleData {
  id: string
  num: number
  title: string
  color: string
  lessons: LessonData[]
}

// ─── Fallback data ────────────────────────────────────────────────────────────

const FALLBACK: Record<number, { title: string; color: string; lessons: Omit<LessonData, 'id' | 'is_free' | 'video_url'>[] }> = {
  1: {
    title: 'Técnica de Vendas', color: 'from-[#7B3FE4] to-[#4C1B9B]',
    lessons: [
      { num: 1, title: 'Módulo 01 — Aula Modelo Mental / Comportamento', duration: '1h 08min' },
      { num: 2, title: 'Módulo 02 — Cultura de Vendas', duration: '1h 19min' },
      { num: 3, title: 'Módulo 03 — Canais de Vendas', duration: '1h 05min' },
      { num: 4, title: 'Módulo 04 — Técnicas de Vendas', duration: '1h 10min' },
      { num: 5, title: 'Módulo 05 — Resumo', duration: '1h 04min' },
    ],
  },
  2: {
    title: 'Influência', color: 'from-[#3B82F6] to-[#1D4ED8]',
    lessons: [
      { num: 1, title: 'Posicionamento — encontre o nicho que te pagará R$150k/mês', duration: '1h 02min' },
      { num: 2, title: 'Instagram médico de alta conversão — sem dançar reels', duration: '57min' },
      { num: 3, title: 'LinkedIn e autoridade B2B para atrair parceiros estratégicos', duration: '1h 02min' },
      { num: 4, title: 'YouTube e podcast médico — conteúdo evergreen que vende', duration: '1h 01min' },
      { num: 5, title: 'Relações públicas e imprensa — como aparecer nos grandes veículos', duration: '1h 02min' },
    ],
  },
  3: {
    title: 'Liderança & Recrutamento', color: 'from-[#F59E0B] to-[#D97706]',
    lessons: [
      { num: 1, title: 'Quando e como contratar o primeiro funcionário do consultório', duration: '1h 01min' },
      { num: 2, title: 'Formação de times de vendas — recrutando e treinando consultores', duration: '56min' },
      { num: 3, title: 'Cultura de alta performance — o playbook do consultório campeão', duration: '1h 03min' },
      { num: 4, title: 'Liderança situacional — gerenciar sem perder tempo clínico', duration: '1h 01min' },
    ],
  },
  4: {
    title: 'Modelos de Negócio', color: 'from-[#10B981] to-[#059669]',
    lessons: [
      { num: 1, title: 'Os 7 modelos de receita para clínicas hormonais', duration: '1h 13min' },
      { num: 2, title: 'Franquia médica — como replicar seu consultório em outras cidades', duration: '1h 07min' },
      { num: 3, title: 'Parcerias estratégicas — academia, estética, nutrição, psicologia', duration: '1h 05min' },
      { num: 4, title: 'Receita recorrente — planos de acompanhamento e assinaturas de saúde', duration: '1h 10min' },
      { num: 5, title: 'Valuation e exit — quanto vale seu consultório e como vendê-lo', duration: '1h 04min' },
    ],
  },
}

// ─── Embed URL helper ─────────────────────────────────────────────────────────

function getEmbedUrl(url: string): string | null {
  if (!url) return null
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&title=0&byline=0&portrait=0&color=7B3FE4`
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`
  if (url.includes('player.') || url.includes('/embed/')) return url
  return null
}

// ─── Fullscreen Video Modal ───────────────────────────────────────────────────

function VideoModal({ embedUrl, title, onClose }: { embedUrl: string; title: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: 'rgba(0,0,0,0.97)' }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-5 flex-shrink-0"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)' }}
      >
        <h2 className="text-white font-semibold text-lg tracking-wide truncate max-w-[80%]">{title}</h2>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Video */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-6xl" style={{ aspectRatio: '16/9' }}>
          <iframe
            src={embedUrl}
            className="w-full h-full rounded-xl"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      {/* Click outside overlay to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AulaPage() {
  const params = useParams()
  const modNum = parseInt(params?.modulo as string ?? '1')
  const aulaNum = parseInt(params?.aula as string ?? '1')

  const [mod, setMod] = useState<ModuleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [showPlayer, setShowPlayer] = useState(false)
  const [userEmail, setUserEmail] = useState('médico@hormoneecosystem.com')

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const [apiRes, userRes] = await Promise.all([
          fetch(`/api/training/module?num=${modNum}`),
          supabase.auth.getUser(),
        ])
        if (userRes.data?.user?.email) setUserEmail(userRes.data.user.email)
        if (apiRes.ok) {
          const { mod: modData, lessons } = await apiRes.json()
          if (modData) setMod({ ...modData, lessons: lessons ?? [] })
        }
      } catch { /* use fallback */ } finally { setLoading(false) }
    }
    load()
  }, [modNum])

  const close = useCallback(() => setShowPlayer(false), [])

  const fb = FALLBACK[modNum] ?? FALLBACK[1]
  const title = mod?.title ?? fb.title
  const color = mod?.color ?? fb.color
  const lessons: LessonData[] = mod?.lessons?.length
    ? mod.lessons
    : fb.lessons.map((l, i) => ({ ...l, id: String(i), video_url: null, is_free: false }))

  const lesson = lessons.find(l => l.num === aulaNum) ?? lessons[0]
  const prev = lessons.find(l => l.num === aulaNum - 1)
  const next = lessons.find(l => l.num === aulaNum + 1)
  const videoUrl = lesson?.video_url ?? null
  const isUploadedVideo = videoUrl ? UUID_RE.test(videoUrl) : false
  const embedUrl = (!isUploadedVideo && videoUrl) ? getEmbedUrl(videoUrl) : null
  const hasVideo = isUploadedVideo || !!embedUrl

  return (
    <>
      <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
        <Sidebar role="medical" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title={`Módulo ${modNum} — ${title}`} />
          <main className="flex-1 overflow-y-auto">
            <div className="flex h-full">

              {/* Video + content area */}
              <div className="flex-1 flex flex-col overflow-y-auto">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 px-6 pt-5 pb-3 text-xs text-[#52525B]">
                  <a href="/medical/escola" className="hover:text-[#A1A1AA] transition-colors">Escola de Negócios</a>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-[#71717A]">Módulo {modNum}: {title}</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-[#A1A1AA]">Aula {String(aulaNum).padStart(2, '0')}</span>
                </div>

                {/* Video thumbnail / player trigger */}
                <div className="mx-6 mb-5">
                  <div
                    className="relative bg-[#0A0A0B] rounded-2xl overflow-hidden border border-[#1C1C1E] group"
                    style={{ aspectRatio: '16/9' }}
                  >
                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#111113]">
                        <Loader2 className="w-8 h-8 text-[#7B3FE4] animate-spin" />
                      </div>
                    ) : hasVideo ? (
                      /* Clickable thumbnail → fullscreen player */
                      <button
                        onClick={() => setShowPlayer(true)}
                        className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#111113] to-[#0A0A0B] hover:from-[#18181A] transition-all duration-300"
                      >
                        <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${color} flex items-center justify-center mb-5 shadow-[0_0_60px_rgba(123,63,228,0.4)] group-hover:scale-110 transition-transform duration-300`}>
                          <Play className="w-10 h-10 text-white ml-1.5" />
                        </div>
                        <p className="text-white font-semibold text-center px-8 mb-2 text-lg">{lesson?.title}</p>
                        <p className="text-[#71717A] text-sm flex items-center gap-1.5 mb-4">
                          <Clock className="w-3.5 h-3.5" />{lesson?.duration}
                        </p>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold backdrop-blur-sm">
                          <Maximize className="w-4 h-4" />
                          Assistir em tela cheia
                        </div>
                      </button>
                    ) : (
                      /* No video configured */
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#111113] to-[#0A0A0B]">
                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(123,63,228,0.3)]`}>
                          <Play className="w-8 h-8 text-white ml-1" />
                        </div>
                        <p className="text-white font-semibold text-center px-8 mb-2">{lesson?.title}</p>
                        <p className="text-[#71717A] text-sm flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />{lesson?.duration}
                        </p>
                        <p className="text-[#52525B] text-xs mt-4">Vídeo será exibido assim que enviado em Admin → Vídeos</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title + actions */}
                <div className="px-6 pb-4">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-wider mb-1">
                        Módulo {modNum} · Aula {String(aulaNum).padStart(2, '0')}
                      </p>
                      <h1 className="text-xl font-bold text-white leading-snug">{lesson?.title}</h1>
                      <p className="text-sm text-[#71717A] mt-1">Dr. Vinícius Cechella · {lesson?.duration}</p>
                    </div>
                    <button
                      onClick={() => setCompleted(!completed)}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        completed
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : 'bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white shadow-[0_0_15px_rgba(123,63,228,0.3)]'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {completed ? 'Concluída' : 'Marcar como concluída'}
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
                    {hasVideo && (
                      <button
                        onClick={() => setShowPlayer(true)}
                        className="flex items-center gap-1.5 text-xs text-[#7B3FE4] bg-[#7B3FE4]/10 border border-[#7B3FE4]/30 px-3 py-2 rounded-xl hover:bg-[#7B3FE4]/20 transition-colors font-semibold"
                      >
                        <Play className="w-3.5 h-3.5" />Assistir
                      </button>
                    )}
                  </div>
                </div>

                {/* Navigation */}
                <div className="px-6 pb-6 flex items-center justify-between gap-3">
                  {prev ? (
                    <a href={`/medical/escola/${modNum}/${prev.num}`}
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
                    <a href={`/medical/escola/${modNum}/${next.num}`}
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
                    <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold`}>{modNum}</div>
                    <p className="font-semibold text-white text-sm">{title}</p>
                  </div>
                  <p className="text-[10px] text-[#52525B]">{lessons.length} aulas</p>
                  <div className="mt-2 h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${Math.round((aulaNum / lessons.length) * 100)}%` }} />
                  </div>
                </div>
                <div className="flex-1">
                  {lessons.map((l) => (
                    <a
                      key={l.num}
                      href={`/medical/escola/${modNum}/${l.num}`}
                      className={`flex items-center gap-3 px-4 py-3.5 border-b border-[#1C1C1E] transition-all hover:bg-[#18181A]/60 ${
                        l.num === aulaNum ? 'bg-[#7B3FE4]/10 border-l-2 border-l-[#7B3FE4]' : ''
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        l.num < aulaNum ? 'bg-emerald-500/15' : l.num === aulaNum ? 'bg-[#7B3FE4]/20' : 'bg-[#18181A] border border-[#27272A]'
                      }`}>
                        {l.num < aulaNum
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          : l.num === aulaNum
                            ? <Play className="w-3 h-3 text-[#7B3FE4]" />
                            : <span className="text-[10px] text-[#52525B] font-medium">{l.num}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-snug truncate ${l.num === aulaNum ? 'text-white font-medium' : l.num < aulaNum ? 'text-[#52525B]' : 'text-[#71717A]'}`}>
                          {l.title}
                        </p>
                        <p className="text-[10px] text-[#3F3F46] mt-0.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />{l.duration}
                          {l.video_url && <span className="ml-1 text-[#7B3FE4]">●</span>}
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

      {/* Fullscreen player: SecureVideoPlayer for uploaded videos, iframe modal for external URLs */}
      {showPlayer && isUploadedVideo && videoUrl && (
        <SecureVideoPlayer videoId={videoUrl} title={lesson?.title ?? ''} userEmail={userEmail} onClose={close} />
      )}
      {showPlayer && !isUploadedVideo && embedUrl && (
        <VideoModal embedUrl={embedUrl} title={lesson?.title ?? ''} onClose={close} />
      )}
    </>
  )
}
