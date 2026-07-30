'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { VideoCard } from '@/components/ui/VideoCard'
import { SecureVideoPlayer } from '@/components/ui/SecureVideoPlayer'
import { Play, ChevronRight, Search, Heart, Bookmark, Clock } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface Video {
  id: string
  title: string
  category: string
  duration_seconds: number | null
  is_published: boolean
}

interface WatchHistoryEntry {
  video_id: string
  progress_seconds: number
  completed: boolean
  videos: Video
}

const CATEGORY_GRADIENTS: Record<string, { from: string; to: string }> = {
  'Implantes Hormonais': { from: '#7B3FE4', to: '#9558EE' },
  'Menopausa': { from: '#EC4899', to: '#7B3FE4' },
  'Andropausa': { from: '#3B82F6', to: '#06B6D4' },
  'Performance': { from: '#F59E0B', to: '#EF4444' },
  'Libido': { from: '#EC4899', to: '#7B3FE4' },
  'Saúde Feminina': { from: '#10B981', to: '#3B82F6' },
  'Saúde Masculina': { from: '#06B6D4', to: '#3B82F6' },
  'TRH': { from: '#06B6D4', to: '#7B3FE4' },
}

function getGradient(category: string) {
  return CATEGORY_GRADIENTS[category] ?? { from: '#7B3FE4', to: '#3B82F6' }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VideosPage() {
  const [search, setSearch] = useState('')
  const [videos, setVideos] = useState<Video[]>([])
  const [watchHistory, setWatchHistory] = useState<WatchHistoryEntry[]>([])
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('Paciente')
  const [activePlayer, setActivePlayer] = useState<{ videoId: string; title: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserEmail(user.email ?? '')
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single()
          setUserName(profile?.name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Paciente')
        }

        const { data: vids } = await supabase
          .from('videos')
          .select('id, title, category, duration_seconds, is_published')
          .eq('is_published', true)
          .neq('category', 'Treinamento Médico')
          .order('created_at', { ascending: false })

        setVideos(vids ?? [])

        if (user) {
          const { data: wh } = await supabase
            .from('watch_history')
            .select('video_id, progress_seconds, completed, videos(id, title, category, duration_seconds)')
            .eq('patient_id', user.id)
            .order('last_watched_at', { ascending: false })
            .limit(10)
          setWatchHistory((wh ?? []) as unknown as WatchHistoryEntry[])
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const continueWatching = watchHistory
    .filter((wh) => wh.videos && !wh.completed)
    .map((wh) => {
      const grad = getGradient(wh.videos.category)
      const progress = wh.videos.duration_seconds
        ? Math.round((wh.progress_seconds / wh.videos.duration_seconds) * 100)
        : 0
      return {
        id: wh.videos.id,
        title: wh.videos.title,
        duration: formatDuration(wh.videos.duration_seconds),
        category: wh.videos.category,
        gradientFrom: grad.from,
        gradientTo: grad.to,
        progress,
      }
    })

  // Group videos by category
  const byCategory = videos.reduce<Record<string, Video[]>>((acc, v) => {
    if (!acc[v.category]) acc[v.category] = []
    acc[v.category].push(v)
    return acc
  }, {})

  // Filter by search
  const filteredCategories = Object.entries(byCategory).reduce<Record<string, Video[]>>((acc, [cat, vids]) => {
    const filtered = search
      ? vids.filter((v) => v.title.toLowerCase().includes(search.toLowerCase()) || cat.toLowerCase().includes(search.toLowerCase()))
      : vids
    if (filtered.length > 0) acc[cat] = filtered
    return acc
  }, {})

  const featuredVideo = videos[0] ?? null

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="patient" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: userName, role: 'patient' }} title="Biblioteca de Vídeos" />
        <main className="flex-1 overflow-y-auto">
          {/* Hero Banner */}
          <div className="relative h-[300px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#7B3FE4] via-[#4C1B9B] to-[#0A0A0B]" />
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(ellipse at 30% 50%, rgba(59,130,246,0.3) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(123,63,228,0.4) 0%, transparent 60%)',
            }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-transparent to-transparent" />
            <div className="relative z-10 h-full flex flex-col justify-end px-8 pb-8">
              <span className="text-xs font-bold text-[#7B3FE4] bg-[#7B3FE4]/20 px-3 py-1 rounded-full inline-block mb-3 w-fit border border-[#7B3FE4]/30">
                DESTAQUE DA SEMANA
              </span>
              <h2 className="text-3xl font-bold text-white mb-2">
                {featuredVideo?.title ?? 'Implantes Hormonais: O Futuro da Medicina Regenerativa'}
              </h2>
              <p className="text-[#A1A1AA] text-sm mb-4 max-w-xl">
                Entenda como os implantes hormonais estão revolucionando o tratamento de distúrbios hormonais e melhorando a qualidade de vida de milhares de pacientes.
              </p>
              <div className="flex items-center gap-3">
                {featuredVideo ? (
                  <button
                    onClick={() => setActivePlayer({ videoId: featuredVideo.id, title: featuredVideo.title })}
                    className="bg-white text-[#0A0A0B] font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/90 transition-all"
                  >
                    <Play className="w-4 h-4" fill="currentColor" /> Assistir agora
                  </button>
                ) : (
                  <button className="bg-white text-[#0A0A0B] font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 opacity-50 cursor-not-allowed">
                    <Play className="w-4 h-4" fill="currentColor" /> Assistir agora
                  </button>
                )}
                <button className="bg-white/10 border border-white/20 text-white font-medium px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all">
                  <Heart className="w-4 h-4" /> Favoritar
                </button>
                {featuredVideo?.duration_seconds && (
                  <span className="text-[#A1A1AA] text-sm flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatDuration(featuredVideo.duration_seconds)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-8 py-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
              <input
                type="text"
                placeholder="Buscar vídeos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#111113] border border-[#1C1C1E] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
              />
            </div>
          </div>

          <div className="px-8 space-y-8 pb-8">
            {/* Continue Watching */}
            {continueWatching.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Play className="w-4 h-4 text-[#7B3FE4]" /> Continuar Assistindo
                  </h3>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {continueWatching.map((v) => (
                    <div key={v.id} onClick={() => setActivePlayer({ videoId: v.id, title: v.title })} className="cursor-pointer">
                      <VideoCard {...v} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-[#7B3FE4] border-t-transparent animate-spin" />
              </div>
            )}

            {/* Categories */}
            {!isLoading && Object.entries(filteredCategories).map(([category, vids]) => (
              <section key={category}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">{category}</h3>
                  <button className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1 transition-colors">
                    Ver tudo <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {vids.map((v) => {
                    const grad = getGradient(v.category)
                    const wh = watchHistory.find((w) => w.video_id === v.id)
                    const progress = wh && v.duration_seconds
                      ? Math.round((wh.progress_seconds / v.duration_seconds) * 100)
                      : undefined
                    return (
                      <div key={v.id} onClick={() => setActivePlayer({ videoId: v.id, title: v.title })} className="cursor-pointer">
                        <VideoCard
                          title={v.title}
                          duration={formatDuration(v.duration_seconds)}
                          category={v.category}
                          gradientFrom={grad.from}
                          gradientTo={grad.to}
                          progress={progress}
                        />
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}

            {/* Empty state */}
            {!isLoading && Object.keys(filteredCategories).length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Bookmark className="w-10 h-10 text-[#3A3A3E] mb-3" />
                <p className="text-[#71717A]">
                  {search ? `Nenhum vídeo encontrado para "${search}"` : 'Nenhum vídeo disponível no momento'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Secure Video Player Modal */}
      {activePlayer && (
        <SecureVideoPlayer
          videoId={activePlayer.videoId}
          title={activePlayer.title}
          userEmail={userEmail}
          onClose={() => setActivePlayer(null)}
        />
      )}
    </div>
  )
}
