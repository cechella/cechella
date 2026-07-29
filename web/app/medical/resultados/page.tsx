import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  TrendingUp, DollarSign, Users, Star, Trophy,
  ChevronRight, CheckCircle2, ArrowUpRight, Calendar,
} from 'lucide-react'

const milestones = [
  { label: 'Primeiro implante premium', value: 'R$ 12.000', date: 'Mar 2026', done: true },
  { label: 'Faturamento R$ 50k/mês', value: 'R$ 52.000', date: 'Fev 2026', done: true },
  { label: 'Faturamento R$ 70k/mês', value: 'R$ 74.000', date: 'Jul 2026', done: true },
  { label: 'Faturamento R$ 100k/mês', value: 'Meta', date: 'Set 2026', done: false },
  { label: 'Abrir segunda unidade', value: 'Planejando', date: 'Jan 2027', done: false },
]

const wins = [
  { title: 'Ticket médio acima de R$ 8k', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { title: '142 pacientes ativos', icon: Users, color: 'text-[#60A5FA]', bg: 'bg-[#3B82F6]/10 border-[#3B82F6]/20' },
  { title: 'NPS 9.4 — promotores', icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { title: 'ANA com score 100 Excelente', icon: Trophy, color: 'text-[#9558EE]', bg: 'bg-[#7B3FE4]/10 border-[#7B3FE4]/20' },
]

const roiItems = [
  { label: 'Investimento (plano Elite/ano)', value: 'R$ 18.000', type: 'cost' },
  { label: 'Aumento faturamento (vs pré-mentoria)', value: '+R$ 384.000/ano', type: 'gain' },
  { label: 'Leads gerados pela ANA/mês', value: '74 leads', type: 'gain' },
  { label: 'Pacientes adicionados', value: '+142', type: 'gain' },
  { label: 'ROI da Mentoria', value: '21x', type: 'roi' },
]

export default function ResultadosPage() {
  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Resultados" />
        <main className="flex-1 overflow-y-auto px-6 py-5">

          {/* Hero */}
          <div className="relative bg-gradient-to-br from-[#7B3FE4]/15 to-[#3B82F6]/5 border border-[#7B3FE4]/25 rounded-2xl p-5 mb-5 overflow-hidden">
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#7B3FE4]/8 blur-[80px]" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Painel de Resultados</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Dr. Ricardo Lima · G800 Progress</h2>
              <p className="text-sm text-[#71717A]">Acompanhe sua evolução rumo a R$ 100k/mês e a construção do seu negócio médico de alto desempenho.</p>
              <div className="mt-4 flex gap-4">
                {[
                  { label: 'Faturamento atual', value: 'R$ 74k/mês' },
                  { label: 'Meta', value: 'R$ 100k/mês' },
                  { label: 'Progresso', value: '74%' },
                ].map((s, i) => (
                  <div key={i} className="bg-[#18181A]/60 border border-[#1C1C1E] rounded-xl px-4 py-2.5">
                    <p className="text-base font-bold text-white">{s.value}</p>
                    <p className="text-[10px] text-[#52525B]">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="h-2 bg-[#1C1C1E] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#7B3FE4] to-amber-400 transition-all" style={{ width: '74%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5 mb-5">
            {/* Milestones */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#7B3FE4]" /> Marcos da Jornada
              </h3>
              <div className="space-y-3">
                {milestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      m.done ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-[#18181A] border border-[#27272A]'
                    }`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${m.done ? 'text-emerald-400' : 'text-[#3F3F46]'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${m.done ? 'text-white' : 'text-[#52525B]'}`}>{m.label}</p>
                      <p className={`text-[10px] ${m.done ? 'text-[#71717A]' : 'text-[#3F3F46]'}`}>{m.date}</p>
                    </div>
                    <span className={`text-xs font-bold flex-shrink-0 ${m.done ? 'text-emerald-400' : 'text-[#3F3F46]'}`}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Wins */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" /> Conquistas Desbloqueadas
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {wins.map((w, i) => (
                  <div key={i} className={`bg-[#111113] border ${w.bg} rounded-xl p-3`}>
                    <w.icon className={`w-5 h-5 ${w.color} mb-2`} />
                    <p className="text-xs font-medium text-white leading-snug">{w.title}</p>
                  </div>
                ))}
              </div>

              {/* ROI */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" /> ROI da Mentoria Hormone
                </h3>
                <div className="space-y-2">
                  {roiItems.map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-[#71717A]">{r.label}</span>
                      <span className={`text-xs font-bold ${
                        r.type === 'gain' ? 'text-emerald-400' :
                        r.type === 'roi' ? 'text-amber-400 text-base' : 'text-red-400'
                      }`}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CTA next milestone */}
          <div className="bg-gradient-to-r from-amber-500/10 to-[#F59E0B]/5 border border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">Próximo marco: R$ 100k/mês</p>
                <p className="text-xs text-[#71717A] mt-0.5">Você está a R$ 26k da meta. Continue no módulo de Vendas para fechar mais implantes premium.</p>
              </div>
              <a href="/medical/escola" className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                Ir ao Treinamento <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
