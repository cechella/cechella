import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Award, Download, Share2, Clock, BookOpen, Lock, CheckCircle } from 'lucide-react'

const earned = [
  {
    id: 1,
    title: 'Fundamentos da Endocrinologia Funcional',
    issueDate: '15 Mar 2024',
    hours: 16,
    lessons: 32,
    score: 94,
    certId: 'HE-2024-001-FUND',
  },
  {
    id: 2,
    title: 'Reposição Hormonal Masculina — Módulo I',
    issueDate: '2 Abr 2024',
    hours: 8,
    lessons: 14,
    score: 88,
    certId: 'HE-2024-002-RHM1',
  },
  {
    id: 3,
    title: 'Técnicas Básicas de Inserção de Implantes',
    issueDate: '20 Mai 2024',
    hours: 6,
    lessons: 12,
    score: 96,
    certId: 'HE-2024-003-TINS',
  },
]

const inProgress = [
  {
    id: 4,
    title: 'Reposição Hormonal Feminina',
    progress: 40,
    lessonsComplete: 12,
    totalLessons: 30,
    exam: false,
  },
  {
    id: 5,
    title: 'Implantes Hormonais — Especialização',
    progress: 65,
    lessonsComplete: 15,
    totalLessons: 24,
    exam: false,
  },
]

const upcoming = [
  { id: 6, title: 'Complicações e Manejo', date: 'Jul 2024', locked: true },
  { id: 7, title: 'Gestão de Consultório', date: 'Ago 2024', locked: true },
  { id: 8, title: 'Escala Comercial', date: 'Set 2024', locked: true },
]

export default function CertificatesPage() {
  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Certificados" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/20 rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-amber-400">{earned.length}</p>
              <p className="text-sm text-[#71717A] mt-1">Certificados Obtidos</p>
            </div>
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-[#7B3FE4]">{inProgress.length}</p>
              <p className="text-sm text-[#71717A] mt-1">Em Andamento</p>
            </div>
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-[#52525B]">{upcoming.length}</p>
              <p className="text-sm text-[#71717A] mt-1">Próximos</p>
            </div>
          </div>

          {/* Earned certificates */}
          <div className="mb-8">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" /> Certificados Conquistados
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {earned.map((cert) => (
                <div
                  key={cert.id}
                  className="relative bg-gradient-to-br from-[#18180F] to-[#111113] border rounded-2xl p-5 overflow-hidden group"
                  style={{ borderColor: 'rgba(245,158,11,0.3)' }}
                >
                  {/* Gold shimmer */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-amber-400/5 blur-[30px]" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-400/15 border border-amber-400/20 flex items-center justify-center">
                        <Award className="w-6 h-6 text-amber-400" />
                      </div>
                      <div className="flex items-center gap-1 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-1">
                        <CheckCircle className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] font-bold text-amber-400">VERIFICADO</span>
                      </div>
                    </div>

                    <h4 className="font-bold text-white text-sm mb-1 leading-snug">{cert.title}</h4>
                    <p className="text-xs text-amber-400/70 mb-3">Emitido em {cert.issueDate}</p>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center bg-[#111113] rounded-lg p-2">
                        <p className="text-sm font-bold text-white">{cert.score}%</p>
                        <p className="text-[9px] text-[#71717A]">Nota</p>
                      </div>
                      <div className="text-center bg-[#111113] rounded-lg p-2">
                        <p className="text-sm font-bold text-white">{cert.hours}h</p>
                        <p className="text-[9px] text-[#71717A]">Carga</p>
                      </div>
                      <div className="text-center bg-[#111113] rounded-lg p-2">
                        <p className="text-sm font-bold text-white">{cert.lessons}</p>
                        <p className="text-[9px] text-[#71717A]">Aulas</p>
                      </div>
                    </div>

                    <p className="text-[10px] font-mono text-[#52525B] mb-3">{cert.certId}</p>

                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-amber-400/10 border border-amber-400/20 text-amber-400 py-2 rounded-xl hover:bg-amber-400/20 transition-colors">
                        <Download className="w-3.5 h-3.5" /> Baixar
                      </button>
                      <button className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-[#18181A] border border-[#1C1C1E] text-[#71717A] py-2 px-3 rounded-xl hover:text-white transition-colors">
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* In progress */}
          <div className="mb-8">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#7B3FE4]" /> Avaliações em Andamento
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {inProgress.map((cert) => (
                <div key={cert.id} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 hover:border-[#7B3FE4]/30 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#7B3FE4]/10 border border-[#7B3FE4]/20 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-[#7B3FE4]" />
                    </div>
                    <span className="text-xs font-bold text-[#7B3FE4]">{cert.progress}%</span>
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-3">{cert.title}</h4>
                  <div className="h-2 bg-[#1C1C1E] rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6]"
                      style={{ width: `${cert.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#71717A] mb-4">
                    <span>{cert.lessonsComplete}/{cert.totalLessons} aulas</span>
                    <span>{cert.totalLessons - cert.lessonsComplete} restantes</span>
                  </div>
                  <button className="w-full text-xs font-semibold bg-[#7B3FE4]/10 border border-[#7B3FE4]/20 text-[#7B3FE4] py-2 rounded-xl hover:bg-[#7B3FE4]/20 transition-colors">
                    Continuar Trilha
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming */}
          <div>
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#52525B]" /> Próximas Avaliações
            </h3>
            <div className="space-y-2">
              {upcoming.map((cert) => (
                <div key={cert.id} className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-4 flex items-center justify-between opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#18181A] border border-[#1C1C1E] flex items-center justify-center">
                      <Lock className="w-4 h-4 text-[#52525B]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#71717A]">{cert.title}</p>
                      <p className="text-xs text-[#52525B]">Disponível em {cert.date}</p>
                    </div>
                  </div>
                  <span className="text-xs text-[#52525B] bg-[#18181A] border border-[#1C1C1E] px-2.5 py-1 rounded-full">Bloqueado</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
