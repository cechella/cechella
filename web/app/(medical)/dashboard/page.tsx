import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { StatsCard } from '@/components/ui/StatsCard'
import { CourseCard } from '@/components/ui/CourseCard'
import {
  GraduationCap, BookOpen, Award, Clock, ChevronRight,
  Zap, FlaskConical, BookMarked, TrendingUp, Users, Star
} from 'lucide-react'

const activeTrails = [
  {
    title: 'Implantes Hormonais',
    description: 'Técnicas avançadas de inserção e manejo de implantes hormonais biodegradáveis.',
    icon: <Zap className="w-4 h-4" />,
    lessons: 24,
    duration: '12h 30min',
    progress: 65,
    category: 'Procedimento',
  },
  {
    title: 'Reposição Hormonal Feminina',
    description: 'Protocolo completo de TRH para mulheres na menopausa e perimenopausa.',
    icon: <FlaskConical className="w-4 h-4" />,
    lessons: 18,
    duration: '9h 15min',
    progress: 40,
    category: 'Clínica',
  },
  {
    title: 'Gestão de Consultório',
    description: 'Administração, marketing médico e escala de clínicas de medicina hormonal.',
    icon: <TrendingUp className="w-4 h-4" />,
    lessons: 12,
    duration: '6h 00min',
    progress: 20,
    category: 'Gestão',
  },
]

const recentActivity = [
  { type: 'video', text: 'Assistiu: "Técnica de Inserção do Implante Femoral"', time: '2h atrás', icon: '▶️' },
  { type: 'quiz', text: 'Completou quiz: Endocrinologia Funcional — Módulo 3', time: '1 dia atrás', icon: '✅' },
  { type: 'pdf', text: 'Baixou: Guideline TRT 2024 — ISSM', time: '2 dias atrás', icon: '📄' },
  { type: 'forum', text: 'Respondeu discussão: "Manejo de efeitos adversos"', time: '3 dias atrás', icon: '💬' },
  { type: 'cert', text: 'Conquistou certificado: Fundamentos da Endocrinologia', time: '1 semana atrás', icon: '🏆' },
]

const quickAccess = [
  { label: 'Biblioteca Científica', icon: <BookMarked className="w-5 h-5" />, href: '/medical/library', color: 'from-[#7B3FE4] to-[#4C1B9B]' },
  { label: 'Comunidade Médica', icon: <Users className="w-5 h-5" />, href: '/medical/community', color: 'from-[#3B82F6] to-[#1D4ED8]' },
  { label: 'Meus Certificados', icon: <Award className="w-5 h-5" />, href: '/medical/certificates', color: 'from-[#F59E0B] to-[#D97706]' },
  { label: 'Todas as Trilhas', icon: <GraduationCap className="w-5 h-5" />, href: '/medical/courses', color: 'from-[#10B981] to-[#059669]' },
]

export default function MedicalDashboard() {
  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Hormone Academy" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Header */}
          <div className="relative bg-[#111113] border border-[#1C1C1E] rounded-3xl p-6 mb-6 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#3B82F6]/10 blur-[80px]" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#7B3FE4] flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Olá, Dr. Ricardo!</h2>
                    <p className="text-sm text-[#71717A]">Continue sua formação em medicina hormonal</p>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-3">
                <div className="bg-[#18181A] border border-[#1C1C1E] rounded-xl px-4 py-3 text-center">
                  <p className="text-lg font-bold text-[#7B3FE4]">Nível 4</p>
                  <p className="text-xs text-[#71717A]">Especialista</p>
                </div>
                <div className="bg-[#18181A] border border-[#1C1C1E] rounded-xl px-4 py-3 text-center">
                  <p className="text-lg font-bold text-amber-400">2.450</p>
                  <p className="text-xs text-[#71717A]">pontos XP</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatsCard title="Cursos Iniciados" value="8" icon={<BookOpen className="w-5 h-5" />} trend={{ value: 2 }} />
            <StatsCard title="Cursos Concluídos" value="3" icon={<GraduationCap className="w-5 h-5" />} trend={{ value: 1 }} />
            <StatsCard title="Certificados" value="3" icon={<Award className="w-5 h-5" />} trend={{ value: 50 }} />
            <StatsCard title="Horas de Estudo" value="47h" icon={<Clock className="w-5 h-5" />} trend={{ value: 15 }} />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Active trails */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" /> Trilhas em Andamento
                  </h3>
                  <a href="/medical/courses" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1 transition-colors">
                    Ver todas <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
                <div className="space-y-3">
                  {activeTrails.map((trail, i) => (
                    <CourseCard key={i} {...trail} isStarted />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Quick access */}
              <div>
                <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider text-[#A1A1AA]">Acesso Rápido</h3>
                <div className="grid grid-cols-2 gap-3">
                  {quickAccess.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 hover:border-[#7B3FE4]/30 transition-all hover:-translate-y-0.5 group"
                    >
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 shadow-lg`}>
                        <span className="text-white">{item.icon}</span>
                      </div>
                      <p className="text-xs font-medium text-[#A1A1AA] group-hover:text-white transition-colors leading-tight">{item.label}</p>
                    </a>
                  ))}
                </div>
              </div>

              {/* Recent activity */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <h3 className="font-semibold text-white mb-3 text-sm">Atividade Recente</h3>
                <div className="space-y-3">
                  {recentActivity.map((activity, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-base">{activity.icon}</span>
                      <div>
                        <p className="text-xs text-[#A1A1AA] leading-relaxed">{activity.text}</p>
                        <p className="text-[10px] text-[#52525B] mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
