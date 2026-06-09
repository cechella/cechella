'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { SecureVideoPlayer } from '@/components/ui/SecureVideoPlayer'
import {
  Play, ChevronRight, Star, Shield, Users, Award,
  Calendar, CheckCircle, ArrowRight, Zap, Clock
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface Video {
  id: string
  title: string
  category: string
  duration_seconds: number | null
  thumbnail_path: string | null
  is_published: boolean
}

function formatDuration(s: number | null) {
  if (!s) return ''
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const BENEFITS = [
  { icon: '⚡', title: 'Energia de volta', desc: 'Recupere sua disposição e vitalidade em semanas' },
  { icon: '😴', title: 'Sono reparador', desc: 'Durma profundamente e acorde renovada' },
  { icon: '🔥', title: 'Libido restaurada', desc: 'Reconecte-se com seu corpo e prazer' },
  { icon: '💪', title: 'Força e músculo', desc: 'Mantenha massa muscular e reduza gordura' },
  { icon: '🧠', title: 'Foco e memória', desc: 'Clareza mental e concentração no dia a dia' },
  { icon: '❤️', title: 'Humor estável', desc: 'Adeus ansiedade, irritabilidade e tristeza' },
]

const SOCIAL_PROOF = [
  { value: '2.847', label: 'Pacientes transformados' },
  { value: '98%', label: 'Satisfação comprovada' },
  { value: '6 meses', label: 'de proteção por implante' },
  { value: '15 anos', label: 'de experiência clínica' },
]

export default function PatientDashboard() {
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        const name = user.user_metadata?.name || user.email.split('@')[0]
        setUserName(name.charAt(0).toUpperCase() + name.slice(1))
      }
      const { data } = await supabase
        .from('videos')
        .select('id, title, category, duration_seconds, thumbnail_path, is_published')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(6)
      setVideos(data ?? [])
    }
    load()
  }, []) // eslint-disable-line

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="patient" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: userName || 'Paciente', role: 'patient' }} title="Início" />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">

          {/* HERO */}
          <div className="relative px-6 pt-6">
            <div className="relative rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0533 0%, #0d1a3a 50%, #0A0A0B 100%)' }}>
              <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[#7B3FE4]/20 blur-[100px] pointer-events-none" />
              <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-[#3B82F6]/15 blur-[80px] pointer-events-none" />
              <div className="relative z-10 px-8 py-10 md:py-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="max-w-xl">
                    <div className="inline-flex items-center gap-2 bg-[#7B3FE4]/20 border border-[#7B3FE4]/30 rounded-full px-4 py-1.5 mb-4">
                      <span className="w-2 h-2 rounded-full bg-[#7B3FE4] animate-pulse" />
                      <span className="text-xs font-semibold text-[#9558EE] tracking-wide uppercase">Bem-vindo(a) à sua transformação</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-3">
                      Recupere sua energia,<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6]">libido e qualidade de vida</span>
                    </h1>
                    <p className="text-[#A1A1AA] text-base mb-6 leading-relaxed">
                      O implante hormonal é a solução definitiva para quem quer resultados reais e duradouros. Veja os depoimentos, tire suas dúvidas e dê o primeiro passo.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <a href="https://wa.me/5547988507977?text=Olá%2C%20tenho%20interesse%20no%20implante%20hormonal%21%20Podem%20me%20ajudar%3F" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#7B3FE4] to-[#6325C8] hover:from-[#6325C8] hover:to-[#5020A0] text-white font-bold px-6 py-3.5 rounded-2xl transition-all duration-200 shadow-lg shadow-[#7B3FE4]/30 hover:scale-[1.02]">
                        <Zap className="w-5 h-5" />
                        QUERO MEU IMPLANTE
                        <ArrowRight className="w-4 h-4" />
                      </a>
                      <a href="/patient/videos" className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-6 py-3.5 rounded-2xl transition-all duration-200">
                        <Play className="w-4 h-4" />
                        Ver depoimentos
                      </a>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 min-w-[280px]">
                    {SOCIAL_PROOF.map((item, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                        <p className="text-2xl font-bold text-white mb-0.5">{item.value}</p>
                        <p className="text-[10px] text-[#71717A] leading-tight">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 space-y-8 py-8">

            {/* DEPOIMENTOS */}
            {videos.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-white text-lg flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-400" fill="currentColor" />
                      Depoimentos Reais
                    </h2>
                    <p className="text-xs text-[#71717A] mt-0.5">Pacientes que já transformaram suas vidas</p>
                  </div>
                  <a href="/patient/videos" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1 transition-colors">
                    Ver todos <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                  {videos.map((v) => (
                    <button key={v.id} onClick={() => setSelectedVideo(v)} className="group text-left bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden hover:border-[#7B3FE4]/50 hover:scale-[1.02] transition-all duration-200">
                      <div className="relative w-full overflow-hidden" style={{ aspectRatio: v.thumbnail_path ? '9/16' : '16/9' }}>
                        {v.thumbnail_path ? (
                          <img src={`/api/video/thumbnail?key=${encodeURIComponent(v.thumbnail_path)}`} alt={v.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center">
                            <span className="text-4xl font-bold text-white/30">{v.title[0]}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all flex items-center justify-center">
                            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                          </div>
                        </div>
                        {v.duration_seconds && (
                          <span className="absolute bottom-2 right-2 text-xs text-white bg-black/70 px-1.5 py-0.5 rounded-md font-mono">{formatDuration(v.duration_seconds)}</span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-[#7B3FE4] font-semibold mb-1 uppercase tracking-wider">{v.category}</p>
                        <p className="text-sm font-medium text-white line-clamp-2 leading-snug">{v.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* BENEFICIOS */}
            <section>
              <div className="mb-4">
                <h2 className="font-bold text-white text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  O que você vai sentir
                </h2>
                <p className="text-xs text-[#71717A] mt-0.5">Resultados comprovados por milhares de pacientes</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {BENEFITS.map((b, i) => (
                  <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 hover:border-[#7B3FE4]/30 transition-colors">
                    <span className="text-2xl mb-2 block">{b.icon}</span>
                    <p className="text-sm font-semibold text-white mb-1">{b.title}</p>
                    <p className="text-xs text-[#71717A] leading-relaxed">{b.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA PRINCIPAL */}
            <section>
              <div className="relative rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #7B3FE4 0%, #3B82F6 100%)' }}>
                <div className="relative z-10 px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-white/80" />
                      <span className="text-white/80 text-sm font-medium">Procedimento 100% seguro e minimamente invasivo</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">Pronto para se transformar?</h3>
                    <p className="text-white/70 text-sm">Agende sua consulta hoje e comece sua jornada hormonal.</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-white/60" />
                        <span className="text-white/60 text-xs">Consulta em até 48h</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-white/60" />
                        <span className="text-white/60 text-xs">+2.847 pacientes atendidos</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-3 flex-shrink-0">
                    <div className="text-center mb-1">
                      
                      
                      
                    </div>
                    <a href="https://wa.me/5547988507977?text=Olá%2C%20tenho%20interesse%20no%20implante%20hormonal%21%20Podem%20me%20ajudar%3F" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white text-[#7B3FE4] font-bold px-8 py-3.5 rounded-2xl hover:bg-white/90 transition-all duration-200 shadow-xl hover:scale-[1.02] whitespace-nowrap">
                      <Calendar className="w-5 h-5" />
                      AGENDAR AGORA
                    </a>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 text-amber-300" fill="currentColor" />
                      ))}
                      <span className="text-white/60 text-xs ml-1">4.9/5 — 847 avaliações</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* CREDIBILIDADE */}
            <section>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#7B3FE4]/10 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-[#7B3FE4]" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">Médico Especialista</p>
                    <p className="text-xs text-[#71717A] leading-relaxed">Formado e certificado em terapia hormonal com implantes. Membro da SBEM.</p>
                  </div>
                </div>
                <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">Aprovado pela ANVISA</p>
                    <p className="text-xs text-[#71717A] leading-relaxed">Implantes certificados, procedimento regulamentado e seguro para aplicação.</p>
                  </div>
                </div>
                <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">Comunidade Ativa</p>
                    <p className="text-xs text-[#71717A] leading-relaxed">Mais de 2.800 pacientes tratados com acompanhamento completo pós-implante.</p>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </main>
      </div>

      {/* Fixed CTA — mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
        <div className="bg-[#0A0A0B]/95 backdrop-blur-md border-t border-[#1C1C1E] px-4 py-3">
          <a href="https://wa.me/5547988507977?text=Olá%2C%20tenho%20interesse%20no%20implante%20hormonal%21%20Podem%20me%20ajudar%3F" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#7B3FE4] to-[#6325C8] text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-[#7B3FE4]/30">
            <Zap className="w-5 h-5" />
            QUERO MEU IMPLANTE
          </a>
        </div>
      </div>

      {selectedVideo && (
        <SecureVideoPlayer videoId={selectedVideo.id} title={selectedVideo.title} userEmail={userEmail} onClose={() => setSelectedVideo(null)} />
      )}
    </div>
  )
}
