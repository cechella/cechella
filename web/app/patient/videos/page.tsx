'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { VideoCard } from '@/components/ui/VideoCard'
import { Play, ChevronRight, Search, Heart, Bookmark } from 'lucide-react'

const categories = [
  'Implantes Hormonais', 'Menopausa', 'Andropausa', 'Performance',
  'Libido', 'Saúde Feminina', 'Saúde Masculina', 'Tireóide', 'Cortisol',
]

const videoData: Record<string, { title: string; duration: string; category: string; gradientFrom: string; gradientTo: string; isNew?: boolean; rating?: number }[]> = {
  'Implantes Hormonais': [
    { title: 'O que são Implantes Hormonais?', duration: '15:22', category: 'Implantes Hormonais', gradientFrom: '#7B3FE4', gradientTo: '#9558EE', isNew: true, rating: 4.9 },
    { title: 'Procedimento de Inserção Explicado', duration: '28:40', category: 'Implantes Hormonais', gradientFrom: '#7B3FE4', gradientTo: '#3B82F6', rating: 4.8 },
    { title: 'Benefícios a Longo Prazo', duration: '22:15', category: 'Implantes Hormonais', gradientFrom: '#6325C8', gradientTo: '#7B3FE4', rating: 4.7 },
    { title: 'Cuidados Pós-Implante', duration: '18:30', category: 'Implantes Hormonais', gradientFrom: '#7B3FE4', gradientTo: '#4C1B9B', rating: 4.9 },
    { title: 'Dúvidas Frequentes', duration: '32:10', category: 'Implantes Hormonais', gradientFrom: '#7B3FE4', gradientTo: '#3B82F6' },
  ],
  'Menopausa': [
    { title: 'Sintomas e Tratamentos da Menopausa', duration: '24:15', category: 'Menopausa', gradientFrom: '#EC4899', gradientTo: '#7B3FE4', isNew: true, rating: 4.8 },
    { title: 'Menopausa Precoce: O que Fazer', duration: '19:45', category: 'Menopausa', gradientFrom: '#F43F5E', gradientTo: '#EC4899', rating: 4.6 },
    { title: 'TRH na Menopausa: Guia Completo', duration: '35:00', category: 'Menopausa', gradientFrom: '#EC4899', gradientTo: '#F43F5E', rating: 4.9 },
    { title: 'Qualidade de Vida na Menopausa', duration: '21:30', category: 'Menopausa', gradientFrom: '#DB2777', gradientTo: '#7B3FE4' },
    { title: 'Fogacho: Causas e Soluções', duration: '16:20', category: 'Menopausa', gradientFrom: '#EC4899', gradientTo: '#3B82F6' },
  ],
  'Andropausa': [
    { title: 'Andropausa: Entendendo o Processo', duration: '20:45', category: 'Andropausa', gradientFrom: '#3B82F6', gradientTo: '#06B6D4', isNew: true, rating: 4.7 },
    { title: 'Testosterona Baixa: Sinais e Sintomas', duration: '25:30', category: 'Andropausa', gradientFrom: '#2563EB', gradientTo: '#3B82F6', rating: 4.8 },
    { title: 'TRT: Terapia de Reposição de Testosterona', duration: '40:00', category: 'Andropausa', gradientFrom: '#1D4ED8', gradientTo: '#06B6D4', rating: 4.9 },
    { title: 'Humor, Memória e Testosterona', duration: '18:15', category: 'Andropausa', gradientFrom: '#3B82F6', gradientTo: '#7B3FE4' },
    { title: 'Exercício e Hormônios Masculinos', duration: '29:50', category: 'Andropausa', gradientFrom: '#06B6D4', gradientTo: '#3B82F6' },
  ],
  'Performance': [
    { title: 'Hormônios e Performance Esportiva', duration: '33:20', category: 'Performance', gradientFrom: '#F59E0B', gradientTo: '#EF4444', isNew: true, rating: 4.8 },
    { title: 'Recuperação Muscular e Hormônios', duration: '22:10', category: 'Performance', gradientFrom: '#EF4444', gradientTo: '#F59E0B', rating: 4.7 },
    { title: 'GH e IGF-1: O Que Você Precisa Saber', duration: '28:45', category: 'Performance', gradientFrom: '#F97316', gradientTo: '#EF4444' },
    { title: 'Sono e Hormônios de Crescimento', duration: '19:30', category: 'Performance', gradientFrom: '#F59E0B', gradientTo: '#7B3FE4' },
  ],
  'Libido': [
    { title: 'Libido e Equilíbrio Hormonal', duration: '20:33', category: 'Libido', gradientFrom: '#EC4899', gradientTo: '#7B3FE4', isNew: true, rating: 4.9 },
    { title: 'DHEA: O Hormônio da Vitalidade', duration: '24:00', category: 'Libido', gradientFrom: '#BE185D', gradientTo: '#EC4899', rating: 4.7 },
    { title: 'Impacto do Estresse na Libido', duration: '18:45', category: 'Libido', gradientFrom: '#7B3FE4', gradientTo: '#EC4899' },
    { title: 'Comunicação e Saúde Sexual', duration: '15:20', category: 'Libido', gradientFrom: '#EC4899', gradientTo: '#3B82F6' },
  ],
}

const continueWatching = [
  { title: 'Implantes Hormonais: Guia Completo', duration: '45:20', category: 'Implantes Hormonais', gradientFrom: '#7B3FE4', gradientTo: '#3B82F6', progress: 65 },
  { title: 'Perguntas Frequentes sobre TRH', duration: '32:10', category: 'TRH', gradientFrom: '#06B6D4', gradientTo: '#7B3FE4', progress: 30 },
  { title: 'Qualidade de Vida pós-implante', duration: '19:45', category: 'Saúde', gradientFrom: '#10B981', gradientTo: '#3B82F6', progress: 82 },
]

const favorites = [
  { title: 'Menopausa: Guia Definitivo', duration: '48:00', category: 'Menopausa', gradientFrom: '#EC4899', gradientTo: '#7B3FE4' },
  { title: 'Implantes Hormonais na Prática', duration: '36:20', category: 'Implantes Hormonais', gradientFrom: '#7B3FE4', gradientTo: '#3B82F6' },
  { title: 'Testosterona Feminina', duration: '22:15', category: 'Saúde Feminina', gradientFrom: '#7B3FE4', gradientTo: '#EC4899' },
]

export default function VideosPage() {
  const [search, setSearch] = useState('')

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="patient" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Maria Silva', role: 'patient' }} title="Biblioteca de Vídeos" />
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
              <h2 className="text-3xl font-bold text-white mb-2">Implantes Hormonais: O Futuro da Medicina Regenerativa</h2>
              <p className="text-[#A1A1AA] text-sm mb-4 max-w-xl">
                Entenda como os implantes hormonais estão revolucionando o tratamento de distúrbios hormonais e melhorando a qualidade de vida de milhares de pacientes.
              </p>
              <div className="flex items-center gap-3">
                <button className="bg-white text-[#0A0A0B] font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/90 transition-all">
                  <Play className="w-4 h-4" fill="currentColor" /> Assistir agora
                </button>
                <button className="bg-white/10 border border-white/20 text-white font-medium px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all">
                  <Heart className="w-4 h-4" /> Favoritar
                </button>
                <span className="text-[#A1A1AA] text-sm">• 1h 12min</span>
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
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-[#7B3FE4]" /> Continuar Assistindo
                </h3>
                <button className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1 transition-colors">
                  Ver tudo <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {continueWatching.map((v, i) => (
                  <VideoCard key={i} {...v} />
                ))}
              </div>
            </section>

            {/* Favorites */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-amber-400" /> Meus Favoritos
                </h3>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {favorites.map((v, i) => (
                  <VideoCard key={i} {...v} />
                ))}
              </div>
            </section>

            {/* Categories */}
            {Object.entries(videoData).map(([category, videos]) => (
              <section key={category}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">{category}</h3>
                  <button className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1 transition-colors">
                    Ver tudo <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {videos.map((v, i) => (
                    <VideoCard key={i} {...v} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
