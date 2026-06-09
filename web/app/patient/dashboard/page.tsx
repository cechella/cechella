import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { StatsCard } from '@/components/ui/StatsCard'
import { VideoCard } from '@/components/ui/VideoCard'
import { createClient } from '@/lib/supabase/server'
import {
  Play, Calendar, BookOpen, Video, Heart, ChevronRight,
  Clock, Zap, Star
} from 'lucide-react'

const CATEGORY_GRADIENTS: Record<string, { from: string; to: string }> = {
  'Implantes Hormonais': { from: '#7B3FE4', to: '#9558EE' },
  'Menopausa': { from: '#EC4899', to: '#7B3FE4' },
  'Andropausa': { from: '#3B82F6', to: '#06B6D4' },
  'Performance': { from: '#F59E0B', to: '#EF4444' },
  'Libido': { from: '#EC4899', to: '#7B3FE4' },
  'Saúde Feminina': { from: '#10B981', to: '#3B82F6' },
  'Saúde Masculina': { from: '#06B6D4', to: '#3B82F6' },
  'TRH': { from: '#06B6D4', to: '#7B3FE4' },
  'Cortisol': { from: '#F97316', to: '#EF4444' },
  'Tireóide': { from: '#8B5CF6', to: '#3B82F6' },
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

function formatAppointmentDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    day: d.getDate().toString(),
    month: d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', ''),
  }
}

export default async function PatientDashboard() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch profile for display name
  const { data: profile } = user
    ? await supabase.from('profiles').select('name, role').eq('id', user.id).single()
    : { data: null }

  const displayName = profile?.name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'Paciente'

  // Fetch next appointment
  const { data: appointments } = user
    ? await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', user.id)
        .eq('status', 'scheduled')
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(5)
    : { data: [] }

  const nextAppointment = appointments?.[0] ?? null

  // Fetch watch history with video info
  const { data: watchHistory } = user
    ? await supabase
        .from('watch_history')
        .select('*, videos(id, title, category, duration_seconds)')
        .eq('patient_id', user.id)
        .order('last_watched_at', { ascending: false })
        .limit(6)
    : { data: [] }

  const continueWatching = (watchHistory ?? [])
    .filter((wh: any) => wh.videos && !wh.completed)
    .map((wh: any) => {
      const grad = getGradient(wh.videos.category)
      return {
        id: wh.videos.id,
        title: wh.videos.title,
        duration: formatDuration(wh.videos.duration_seconds),
        category: wh.videos.category,
        gradientFrom: grad.from,
        gradientTo: grad.to,
        progress: wh.videos.duration_seconds
          ? Math.round((wh.progress_seconds / wh.videos.duration_seconds) * 100)
          : 0,
      }
    })

  // Fetch patient journey
  const { data: journey } = user
    ? await supabase
        .from('patient_journey')
        .select('*')
        .eq('patient_id', user.id)
        .order('step_number', { ascending: true })
    : { data: [] }

  const journeySteps = journey ?? []
  const completedSteps = journeySteps.filter((s: any) => s.completed).length
  const totalSteps = journeySteps.length || 6
  const journeyPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  // Fetch recommended videos
  const { data: recommendedVideos } = await supabase
    .from('videos')
    .select('id, title, category, duration_seconds')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(6)

  const recommended = (recommendedVideos ?? []).map((v: any) => {
    const grad = getGradient(v.category)
    return {
      id: v.id,
      title: v.title,
      duration: formatDuration(v.duration_seconds),
      category: v.category,
      gradientFrom: grad.from,
      gradientTo: grad.to,
    }
  })

  // Stats
  const watchedCount = (watchHistory ?? []).filter((wh: any) => wh.completed).length
  const appointmentsCount = (appointments ?? []).length

  // Days until next appointment
  let daysUntilNext: string | null = null
  if (nextAppointment) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const apptDate = new Date(nextAppointment.appointment_date + 'T00:00:00')
    const diff = Math.ceil((apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    daysUntilNext = diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : `${diff} dias`
  }

  const apptDateDisplay = nextAppointment
    ? formatAppointmentDate(nextAppointment.appointment_date)
    : null

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="patient" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          user={{ name: displayName, role: 'patient' }}
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
                  <p className="text-[#A1A1AA] text-sm mb-1">Bem-vindo(a) de volta,</p>
                  <h2 className="text-2xl font-bold text-white mb-1">{displayName} 👋</h2>
                  {daysUntilNext ? (
                    <p className="text-sm text-[#71717A]">
                      Sua próxima consulta é{' '}
                      <span className="text-[#9558EE] font-medium">
                        {daysUntilNext === 'hoje' || daysUntilNext === 'amanhã' ? daysUntilNext : `em ${daysUntilNext}`}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-[#71717A]">Nenhuma consulta agendada</p>
                  )}
                </div>

                {/* Journey progress */}
                <div className="bg-[#18181A] rounded-2xl p-4 min-w-[240px]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Sua Jornada Hormonal</p>
                    <span className="text-xs font-bold text-[#7B3FE4]">{journeyPct}%</span>
                  </div>
                  <div className="h-2 bg-[#1C1C1E] rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] transition-all duration-700"
                      style={{ width: `${journeyPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#71717A]">{completedSteps} de {totalSteps} etapas concluídas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatsCard title="Vídeos Assistidos" value={String(watchedCount || 0)} icon={<Video className="w-5 h-5" />} trend={{ value: 0, label: 'concluídos' }} />
            <StatsCard title="Em Andamento" value={String(continueWatching.length)} icon={<Play className="w-5 h-5" />} />
            <StatsCard title="Jornada" value={`${journeyPct}%`} icon={<Heart className="w-5 h-5" />} trend={{ value: completedSteps, label: 'etapas' }} />
            <StatsCard title="Consultas" value={String(appointmentsCount)} icon={<Calendar className="w-5 h-5" />} subtitle={daysUntilNext ? `próxima ${daysUntilNext}` : 'nenhuma agendada'} />
          </div>

          {/* Continue Watching */}
          {continueWatching.length > 0 && (
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
                {continueWatching.map((v) => (
                  <VideoCard key={v.id} {...v} />
                ))}
              </div>
            </div>
          )}

          {/* Next appointment + Quick access */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {/* Next appointment */}
            <div className="md:col-span-2 bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-[#7B3FE4]" />
                <h3 className="font-semibold text-white text-sm">Próxima Consulta</h3>
              </div>
              {nextAppointment && apptDateDisplay ? (
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B3FE4]/20 to-[#3B82F6]/20 border border-[#7B3FE4]/20 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-white">{apptDateDisplay.day}</span>
                    <span className="text-[10px] text-[#7B3FE4] font-medium">{apptDateDisplay.month}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">{nextAppointment.specialty ?? 'Consulta'}</p>
                    <p className="text-sm text-[#71717A]">{nextAppointment.doctor_name}</p>
                    <p className="text-xs text-[#52525B] mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {nextAppointment.appointment_time?.slice(0, 5)} • {nextAppointment.type === 'telemedicina' ? 'Telemedicina' : 'Presencial'}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <a
                      href="/patient/schedule"
                      className="bg-[#7B3FE4]/10 border border-[#7B3FE4]/20 text-[#7B3FE4] text-xs font-medium px-3 py-2 rounded-xl hover:bg-[#7B3FE4]/20 transition-colors"
                    >
                      Ver detalhes
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Calendar className="w-8 h-8 text-[#3A3A3E] mb-2" />
                  <p className="text-sm text-[#71717A]">Nenhuma consulta agendada</p>
                  <a href="/patient/schedule" className="mt-2 text-xs text-[#7B3FE4] hover:underline">Agendar agora</a>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <Zap className="w-6 h-6 text-white/80 mb-2" />
                <h3 className="font-bold text-white mb-1">Agendar Consulta</h3>
                <p className="text-xs text-white/70">Fale com um especialista em hormônios</p>
              </div>
              <a
                href="/patient/schedule"
                className="mt-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold py-2 px-4 rounded-xl transition-all flex items-center gap-2"
              >
                Agendar agora <ChevronRight className="w-4 h-4" />
              </a>
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
            {recommended.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {recommended.map((v) => (
                  <VideoCard key={v.id} {...v} />
                ))}
              </div>
            ) : (
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-8 text-center">
                <Play className="w-8 h-8 text-[#3A3A3E] mx-auto mb-2" />
                <p className="text-sm text-[#71717A]">Nenhum vídeo disponível no momento</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
