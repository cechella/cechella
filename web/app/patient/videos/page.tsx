'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { SecureVideoPlayer } from '@/components/ui/SecureVideoPlayer'
import { Play, Search, Film } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface Video {
  id: string
  title: string
  description: string | null
  category: string
  duration_seconds: number | null
  thumbnail_path: string | null
  is_published: boolean
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const GRADIENTS = [
  ['#7B3FE4', '#3B82F6'],
  ['#EC4899', '#7B3FE4'],
  ['#3B82F6', '#06B6D4'],
  ['#F59E0B', '#EF4444'],
  ['#10B981', '#3B82F6'],
  ['#6325C8', '#7B3FE4'],
]

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [userEmail, setUserEmail] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) setUserEmail(user.email)

      const { data } = await supabase
        .from('videos')
        .select('*')
        .eq('is_published', true)
        .neq('category', 'Treinamento Médico')
        .order('created_at', { ascending: false })
      setVideos(data ?? [])
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  const filtered = videos.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.category.toLowerCase().includes(search.toLowerCase())
  )

  const byCategory = filtered.reduce<Record<string, Video[]>>((acc, v) => {
    if (!acc[v.category]) acc[v.category] = []
    acc[v.category].push(v)
    return acc
  }, {})

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="patient" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Paciente', role: 'patient' }} title="Biblioteca de Vídeos" />
        <main className="flex-1 overflow-y-auto">

          {/* Search */}
          <div className="px-8 pt-6 pb-4">
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

          <div className="px-8 space-y-10 pb-10">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Film className="w-12 h-12 text-[#3F3F46] mb-4" />
                <p className="text-[#71717A]">Nenhum vídeo disponível ainda.</p>
              </div>
            ) : (
              Object.entries(byCategory).map(([category, vids]) => (
                <section key={category}>
                  <h3 className="font-semibold text-white mb-4 text-base">{category}</h3>

                  {/* Dynamic grid: portrait cards when thumbnail, landscape when gradient */}
                  <div className="grid gap-4"
                    style={{
                      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    }}
                  >
                    {vids.map((v, i) => {
                      const [from, to] = GRADIENTS[i % GRADIENTS.length]
                      const hasThumb = !!v.thumbnail_path

                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVideo(v)}
                          className="group text-left bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden hover:border-[#7B3FE4]/50 hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-[#7B3FE4]/10"
                        >
                          {/* Thumbnail — aspect ratio adapts: 9:16 if portrait photo, 16:9 if gradient */}
                          <div
                            className="relative w-full overflow-hidden"
                            style={{ aspectRatio: hasThumb ? '9/16' : '16/9' }}
                          >
                            {hasThumb ? (
                              <img
                                src={`/api/video/thumbnail?key=${encodeURIComponent(v.thumbnail_path!)}`}
                                alt={v.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                              >
                                <span className="text-5xl font-bold text-white/30">{v.title[0]}</span>
                              </div>
                            )}

                            {/* Hover overlay with play button */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-200 flex items-center justify-center">
                                <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                              </div>
                            </div>

                            {/* Duration badge */}
                            {v.duration_seconds && (
                              <span className="absolute bottom-2 right-2 text-xs text-white bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-md font-mono">
                                {formatDuration(v.duration_seconds)}
                              </span>
                            )}
                          </div>

                          {/* Info */}
                          <div className="p-3">
                            <p className="text-[10px] text-[#7B3FE4] font-semibold mb-1 tracking-wider uppercase">{v.category}</p>
                            <p className="text-sm font-medium text-white line-clamp-2 leading-snug">{v.title}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        </main>
      </div>

      {selectedVideo && (
        <SecureVideoPlayer
          videoId={selectedVideo.id}
          title={selectedVideo.title}
          userEmail={userEmail}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  )
}
