import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { StatsCard } from '@/components/ui/StatsCard'
import { Badge } from '@/components/ui/Badge'
import {
  Users, TrendingUp, Calendar, DollarSign, ChevronRight,
  Trophy, Target, Clock, ArrowRight, Flame
} from 'lucide-react'

const recentLeads = [
  { name: 'Ana Paula M.', source: 'Instagram', date: 'Hoje, 14:22', stage: 'Lead', stageVariant: 'yellow' as const, value: 'R$ 4.800' },
  { name: 'Carlos Eduardo S.', source: 'Indicação', date: 'Hoje, 11:05', stage: 'Qualificado', stageVariant: 'blue' as const, value: 'R$ 6.200' },
  { name: 'Marcia Lima', source: 'Google Ads', date: 'Ontem, 16:40', stage: 'Consulta', stageVariant: 'purple' as const, value: 'R$ 4.800' },
  { name: 'Roberto Farias', source: 'WhatsApp', date: 'Ontem, 09:15', stage: 'Tratamento', stageVariant: 'green' as const, value: 'R$ 9.600' },
  { name: 'Patrícia Gomes', source: 'Indicação', date: '2 dias atrás', stage: 'Renovação', stageVariant: 'green' as const, value: 'R$ 4.800' },
]

const funnelData = [
  { stage: 'Leads', count: 84, width: 100, color: 'from-[#7B3FE4] to-[#9558EE]' },
  { stage: 'Qualificados', count: 52, width: 62, color: 'from-[#3B82F6] to-[#7B3FE4]' },
  { stage: 'Consultas', count: 31, width: 37, color: 'from-[#06B6D4] to-[#3B82F6]' },
  { stage: 'Tratamento', count: 18, width: 21, color: 'from-[#10B981] to-[#06B6D4]' },
  { stage: 'Renovação', count: 12, width: 14, color: 'from-[#F59E0B] to-[#10B981]' },
]

export default function SalesDashboard() {
  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="sales" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Juliana Martins', role: 'sales' }} title="Sales Academy" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-[#06B6D4]/10 to-[#3B82F6]/10 border border-[#06B6D4]/20 rounded-3xl p-6 mb-6 overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#06B6D4]/8 blur-[60px]" />
            <div className="relative z-10 flex items-center justify-between gap-6">
              <div>
                <p className="text-sm text-[#71717A] mb-1">Bem-vinda,</p>
                <h2 className="text-xl font-bold text-white mb-1">Juliana Martins 🚀</h2>
                <p className="text-sm text-[#71717A]">
                  Você está no <span className="text-[#F59E0B] font-bold">#4º lugar</span> do ranking este mês
                </p>
              </div>
              <div className="hidden md:flex items-center gap-3">
                <div className="bg-[#111113]/80 border border-[#1C1C1E] rounded-2xl px-5 py-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <p className="text-lg font-bold text-white">12</p>
                  </div>
                  <p className="text-xs text-[#71717A]">dias streak</p>
                </div>
                <div className="bg-[#111113]/80 border border-[#1C1C1E] rounded-2xl px-5 py-3 text-center">
                  <p className="text-lg font-bold text-amber-400">3.240</p>
                  <p className="text-xs text-[#71717A]">pontos XP</p>
                </div>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatsCard title="Leads este Mês" value="84" icon={<Users className="w-5 h-5" />} trend={{ value: 18, label: 'vs mês anterior' }} />
            <StatsCard title="Taxa de Conversão" value="21.4%" icon={<Target className="w-5 h-5" />} trend={{ value: 3.2 }} />
            <StatsCard title="Consultas Agendadas" value="31" icon={<Calendar className="w-5 h-5" />} trend={{ value: 10 }} />
            <StatsCard title="Receita Gerada" value="R$ 86k" icon={<DollarSign className="w-5 h-5" />} trend={{ value: 24 }} gradient />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Funnel */}
            <div className="lg:col-span-2 bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#7B3FE4]" /> Funil de Conversão
                </h3>
                <a href="/sales/crm" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1 transition-colors">
                  Ver CRM <ChevronRight className="w-3 h-3" />
                </a>
              </div>
              <div className="space-y-3">
                {funnelData.map((item) => (
                  <div key={item.stage}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-[#A1A1AA]">{item.stage}</span>
                      <span className="font-bold text-white">{item.count}</span>
                    </div>
                    <div className="h-8 bg-[#18181A] rounded-xl overflow-hidden">
                      <div
                        className={`h-full rounded-xl bg-gradient-to-r ${item.color} transition-all duration-700 flex items-center px-3`}
                        style={{ width: `${item.width}%` }}
                      >
                        <span className="text-xs font-bold text-white">{item.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ranking position */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold text-white text-sm">Posição no Ranking</h3>
                </div>
                <div className="text-center py-3">
                  <p className="text-5xl font-black text-amber-400">#4</p>
                  <p className="text-sm text-[#71717A] mt-1">de 28 consultores</p>
                </div>
                <div className="bg-[#111113]/60 rounded-xl p-3 mt-3">
                  <p className="text-xs text-[#71717A] mb-1">Para subir ao #3</p>
                  <p className="text-sm font-bold text-white">+3 conversões ou R$ 14.400</p>
                </div>
                <a href="/sales/ranking" className="flex items-center justify-center gap-2 mt-3 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors">
                  Ver ranking completo <ArrowRight className="w-3 h-3" />
                </a>
              </div>

              {/* Goals */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#7B3FE4]" /> Metas do Mês
                </h3>
                {[
                  { label: 'Leads', current: 84, goal: 100, color: '#7B3FE4' },
                  { label: 'Conversões', current: 18, goal: 25, color: '#3B82F6' },
                  { label: 'Receita', current: 86, goal: 120, color: '#10B981', suffix: 'k' },
                ].map((goal) => (
                  <div key={goal.label} className="mb-3">
                    <div className="flex justify-between text-xs text-[#71717A] mb-1">
                      <span>{goal.label}</span>
                      <span className="text-white font-medium">{goal.current}{goal.suffix || ''} / {goal.goal}{goal.suffix || ''}</span>
                    </div>
                    <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min((goal.current / goal.goal) * 100, 100)}%`, background: goal.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent leads */}
          <div className="mt-6 bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#7B3FE4]" /> Leads Recentes
              </h3>
              <a href="/sales/crm" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1 transition-colors">
                Ver CRM <ChevronRight className="w-3 h-3" />
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1C1C1E]">
                    {['Lead', 'Origem', 'Data', 'Etapa', 'Valor Potencial'].map(h => (
                      <th key={h} className="pb-3 text-left text-xs font-medium text-[#52525B] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead, i) => (
                    <tr key={i} className="border-b border-[#1C1C1E]/50 last:border-0 hover:bg-[#18181A] transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7B3FE4]/20 to-[#3B82F6]/20 flex items-center justify-center text-xs font-bold text-[#7B3FE4]">
                            {lead.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-white">{lead.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-[#71717A]">{lead.source}</td>
                      <td className="py-3 pr-4 text-xs text-[#52525B] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {lead.date}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={lead.stageVariant} size="sm">{lead.stage}</Badge>
                      </td>
                      <td className="py-3 text-sm font-semibold text-emerald-400">{lead.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
