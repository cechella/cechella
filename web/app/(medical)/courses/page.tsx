import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { CourseCard } from '@/components/ui/CourseCard'
import {
  Zap, FlaskConical, Heart, Activity, Scissors, AlertTriangle,
  Building2, TrendingUp, GraduationCap
} from 'lucide-react'

const trails = [
  {
    title: 'Fundamentos da Endocrinologia Funcional',
    description: 'Base científica sólida em fisiologia hormonal, eixos endócrinos e medicina funcional aplicada. Pré-requisito para todos os módulos.',
    icon: <FlaskConical className="w-4 h-4" />,
    lessons: 32,
    duration: '16h 00min',
    progress: 100,
    category: 'Fundamentos',
  },
  {
    title: 'Reposição Hormonal Masculina',
    description: 'Diagnóstico e tratamento da andropausa. Protocolos TRT, monitoramento laboratorial e manejo de efeitos adversos.',
    icon: <Activity className="w-4 h-4" />,
    lessons: 28,
    duration: '14h 30min',
    progress: 75,
    category: 'Clínica',
  },
  {
    title: 'Reposição Hormonal Feminina',
    description: 'TRH completa para menopausa e perimenopausa. Estradiol, progesterona, testosterona feminina e DHEA.',
    icon: <Heart className="w-4 h-4" />,
    lessons: 30,
    duration: '15h 00min',
    progress: 40,
    category: 'Clínica',
  },
  {
    title: 'Implantes Hormonais',
    description: 'Ciência dos pellets hormonais biodegradáveis, farmacologia, biodisponibilidade e protocolos de dosagem.',
    icon: <Zap className="w-4 h-4" />,
    lessons: 24,
    duration: '12h 30min',
    progress: 65,
    category: 'Especialização',
  },
  {
    title: 'Técnicas de Inserção',
    description: 'Treinamento prático nas técnicas de inserção subcutânea. Anatomia aplicada, antissepsia, instrumentação e fixação.',
    icon: <Scissors className="w-4 h-4" />,
    lessons: 16,
    duration: '8h 00min',
    progress: 20,
    category: 'Procedimento',
  },
  {
    title: 'Complicações e Manejo',
    description: 'Identificação, prevenção e tratamento das complicações dos implantes hormonais. Casos clínicos e protocolos de emergência.',
    icon: <AlertTriangle className="w-4 h-4" />,
    lessons: 14,
    duration: '7h 00min',
    progress: 0,
    category: 'Segurança',
  },
  {
    title: 'Gestão de Consultório',
    description: 'Administração de clínicas de medicina hormonal, marketing médico, compliance e construção de equipes.',
    icon: <Building2 className="w-4 h-4" />,
    lessons: 12,
    duration: '6h 00min',
    progress: 0,
    category: 'Gestão',
  },
  {
    title: 'Escala Comercial',
    description: 'Estratégias para crescimento de clínicas, franquias médicas, parcerias estratégicas e modelos de receita recorrente.',
    icon: <TrendingUp className="w-4 h-4" />,
    lessons: 10,
    duration: '5h 00min',
    progress: 0,
    category: 'Negócios',
  },
]

const categoryColors: Record<string, string> = {
  'Fundamentos': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  'Clínica': 'bg-[#3B82F6]/10 text-[#60A5FA] border border-[#3B82F6]/20',
  'Especialização': 'bg-[#7B3FE4]/10 text-[#9558EE] border border-[#7B3FE4]/20',
  'Procedimento': 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  'Segurança': 'bg-red-500/10 text-red-400 border border-red-500/20',
  'Gestão': 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  'Negócios': 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
}

export default function CoursesPage() {
  const completed = trails.filter(t => t.progress === 100).length
  const inProgress = trails.filter(t => t.progress > 0 && t.progress < 100).length
  const totalHours = trails.reduce((acc, t) => acc + parseFloat(t.duration), 0)

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Trilhas de Formação" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-[#3B82F6]/10 to-[#7B3FE4]/10 border border-[#3B82F6]/20 rounded-3xl p-6 mb-6 overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#3B82F6]/10 blur-[60px]" />
            <div className="relative z-10 flex items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-5 h-5 text-[#60A5FA]" />
                  <span className="text-sm font-semibold text-[#60A5FA] uppercase tracking-wider">Hormone Academy</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">8 Trilhas de Formação Especializada</h2>
                <p className="text-sm text-[#71717A]">Do fundamento à excelência clínica em medicina hormonal</p>
              </div>
              <div className="hidden md:flex gap-4">
                {[
                  { label: 'Concluídas', value: completed },
                  { label: 'Em progresso', value: inProgress },
                  { label: 'Total de horas', value: `~${Math.round(totalHours)}h` },
                ].map((stat) => (
                  <div key={stat.label} className="bg-[#111113]/80 rounded-2xl px-4 py-3 text-center border border-[#1C1C1E]">
                    <p className="text-xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-[#71717A]">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Overall progress */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#A1A1AA]">Progresso Geral da Formação</span>
              <span className="text-sm font-bold text-[#7B3FE4]">
                {Math.round(trails.reduce((acc, t) => acc + t.progress, 0) / trails.length)}%
              </span>
            </div>
            <div className="h-3 bg-[#1C1C1E] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] transition-all duration-700"
                style={{ width: `${Math.round(trails.reduce((acc, t) => acc + t.progress, 0) / trails.length)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-[#71717A] mt-2">
              <span>{completed} trilhas concluídas</span>
              <span>{trails.length - completed} trilhas restantes</span>
            </div>
          </div>

          {/* Category legend */}
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.entries(categoryColors).map(([cat, cls]) => (
              <span key={cat} className={`text-xs px-2.5 py-1 rounded-full font-medium ${cls}`}>{cat}</span>
            ))}
          </div>

          {/* Trails grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {trails.map((trail, i) => (
              <div key={i} className="relative">
                {trail.progress === 100 && (
                  <div className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
                <CourseCard {...trail} />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
