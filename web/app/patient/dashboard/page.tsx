import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { StatsCard } from '@/components/ui/StatsCard'
import { VideoCard } from '@/components/ui/VideoCard'
import {
  Play, Calendar, BookOpen, Video, Heart, ChevronRight,
  Clock, Bell, TrendingUp, Zap, Star
} from 'lucide-react'

const recommended = [
  { title: 'Entendendo os Implantes Hormonais', duration: '18:42', category: 'Implantes', gradientFrom: '#7B3FE4', gradientTo: '#9558EE', isNew: true },
  { title: 'Menopausa: Sintomas e Tratamentos', duration: '24:15', category: 'Menopausa', gradientFrom: '#3B82F6', gradientTo: '#7B3FE4' },
  { title: 'Testosterona e Saúde Masculina', duration: '31:08', category: 'Andropausa', gradientFrom: '#06B6D4', gradientTo: '#3B82F6' },
  { title: 'Libido e Hormônios: A Conexão', duration: '20:33', category: 'Libido', gradientFrom: '#EC4899', gradientTo: '#7B3FE4' },
  { title: 'Performance e Hormônios', duration: '27:50', category: 'Performance', gradientFrom: '#F59E0B', gradientTo: '#EF4444' },
  { title: 'Saúde Óssea na Menopausa', duration: '22:14', category: 'Saúde Feminina', gradientFrom: '#10B981', gradientTo: '#3B82F6' },
]

const continueWatching = [
  { title: 'Implantes Hormonais: Guia Completo', duration: '45:20', category: 'Implantes', gradientFrom: '#7B3FE4', gradientTo: '#3B82F6', progress: 65 },
  { title: 'Perguntas Frequentes sobre TRH', duration: '32:10', category: 'TRH', gradientFrom: '#06B6D4', gradientTo: '#7B3FE4', progress: 30 },
  { title: 'Qualidade de Vida pós-implante', duration: '19:45', category: 'Saúde', gradientFrom: '#10B981', gradientTo: '#3B82F6', progress: 82 },
]

export default function PatientDashboard() {
  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="patient" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          user={{ name: 'Maria Silva', role: 'patient' }}
          title="Dashboard"
        />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Welcome */}
          <div className="mb-8">
            <div className="relative bg-[#111113] border border-[#1C1C1E] rounded-3xl p-6 overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM3QjNGRTQiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMCAwdjZoNnYtNmgtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#7B3FE4]/10 blur-[60px]" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <p className="text-[#A1A1AA] text-sm mb-1">Bem-vinda de volta,</p>
                  <h2 className="text-2xl font-bold text-white mb-1">Maria Silva 👋</h2>
                  <p className="text-sm text-[#71717A]">Sua próxima consulta é em <span className="text-[#9558EE] font-medium">3 dias</span></p>
                </div>

                {/* Journey progress */}
                <div className="bg-[#18181A] rounded-2xl p-4 min-w-[240px]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Sua Jornada Hormonal</p>
                    <span className="text-xs font-bold text-[#7B3FE4]">68%</span>
                  </div>
                  <div className="h-2 bg-[#1C1C1E] rounded-full overflow-hidden mb-2">
                    <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] transition-all duration-700" />
                  </div>
                  <p className="text-xs text-[#71717A]">4 de 6 etapas concluídas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatsCard title="Vídeos Assistidos" value="24" icon={<Video className="w-5 h-5" />} trend={{ value: 12, label: 'este mês' }} />
            <StatsCard title="Artigos Lidos" value="18" icon={<BookOpen className="w-5 h-5" />} trend={{ value: 8 }} />
            <StatsCard title="Dias de Tratamento" value="47" icon={<Heart className="w-5 h-5" />} trend={{ value: 5, label: 'em progresso' }} />
            <StatsCard title="Consultas" value="3" icon={<Calendar className="w-5 h-5" />} subtitle="próxima em 3 dias" />
          </div>

          {/* Continue Watching */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-[#7B3FE4]" />
                Continuar Assistindo
              </h3>
              <a href="/patient/videos" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1 transition-colors">
                Ver tudo <ChevronRight className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {continueWatching.map((v, i) => (
                <VideoCard key={i} {...v} />
              ))}
            </div>
          </div>

          {/* Next appointment + Quick access */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {/* Next appointment */}
            <div className="md:col-span-2 bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-[#7B3FE4]" />
                <h3 className="font-semibold text-white text-sm">Próxima Consulta</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B3FE4]/20 to-[#3B82F6]/20 border border-[#7B3FE4]/20 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-white">18</span>
                  <span className="text-[10px] text-[#7B3FE4] font-medium">JUN</span>
                </div>
                <div>
                  <p className="font-semibold text-white">Consulta de Acompanhamento</p>
                  <p className="text-sm text-[#71717A]">Dr. Carlos Mendes • Endocrinologista</p>
                  <p className="text-xs text-[#52525B] mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Terça-feira, 14:30 • Telemedicina
                  </p>
                </div>
                <div className="ml-auto">
                  <button className="bg-[#7B3FE4]/10 border border-[#7B3FE4]/20 text-[#7B3FE4] text-xs font-medium px-3 py-2 rounded-xl hover:bg-[#7B3FE4]/20 transition-colors">
                    Ver detalhes
                  </button>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <Zap className="w-6 h-6 text-white/80 mb-2" />
                <h3 className="font-bold text-white mb-1">Agendar Consulta</h3>
                <p className="text-xs text-white/70">Fale com um especialista em hormônios</p>
              </div>
              <button className="mt-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold py-2 px-4 rounded-xl transition-all flex items-center gap-2">
                Agendar agora <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Recommended */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                Recomendado para você
              </h3>
              <a href="/patient/videos" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1 transition-colors">
                Ver tudo <ChevronRight className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {recommended.map((v, i) => (
                <VideoCard key={i} {...v} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
