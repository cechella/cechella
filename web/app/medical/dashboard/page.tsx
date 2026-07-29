import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  DollarSign, MessageSquare, Users, Star, Calendar,
  TrendingUp, BarChart3, Bot, GraduationCap,
  ArrowUpRight, ArrowDownRight, RefreshCw, Kanban, Play,
  CheckCircle2, Clock, ChevronRight, Activity, Share2,
} from 'lucide-react'

const kpi1 = [
  {
    label: 'FATURAMENTO MÊS',
    value: 'R$ 74k',
    sub: '+21% vs mês ant',
    up: true,
    icon: DollarSign,
    color: 'from-emerald-500/15 to-emerald-600/5',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    accent: 'text-emerald-400',
  },
  {
    label: 'LEADS ANA HOJE',
    value: '+23',
    sub: 'média 7d: 18/dia',
    up: true,
    icon: MessageSquare,
    color: 'from-[#7B3FE4]/15 to-[#3B82F6]/5',
    border: 'border-[#7B3FE4]/25',
    text: 'text-[#9558EE]',
    accent: 'text-[#9558EE]',
  },
  {
    label: 'PIPELINE ANA',
    value: '7 leads',
    sub: 'ativos em funil',
    up: true,
    icon: Kanban,
    color: 'from-[#3B82F6]/15 to-[#3B82F6]/5',
    border: 'border-[#3B82F6]/20',
    text: 'text-[#60A5FA]',
    accent: 'text-[#60A5FA]',
  },
  {
    label: 'SCORE DO NEGÓCIO',
    value: '87/100',
    sub: 'Excelente',
    up: true,
    icon: Star,
    color: 'from-amber-500/15 to-amber-600/5',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    accent: 'text-amber-400',
  },
  {
    label: 'PRÓXIMA SESSÃO',
    value: '26 Fev',
    sub: '19h00 · ao vivo',
    up: null,
    icon: Calendar,
    color: 'from-[#EC4899]/15 to-[#EC4899]/5',
    border: 'border-[#EC4899]/20',
    text: 'text-[#F472B6]',
    accent: 'text-[#F472B6]',
  },
]

const kpi2 = [
  { label: 'Total Pacientes', value: '142', trend: '+4 mês', up: true },
  { label: 'Ticket Médio', value: 'R$ 8.4k', trend: '+12%', up: true },
  { label: 'Taxa Conversão ANA', value: '34%', trend: '+6pp', up: true },
  { label: 'Consultas este mês', value: '18', trend: '+3 vs mês ant', up: true },
  { label: 'MRR Estimado', value: 'R$ 22k', trend: 'recorrente', up: null },
  { label: 'Meta Julho', value: '68%', trend: 'R$ 50k / R$ 74k', up: true },
]

const pipeline = [
  { stage: 'Novo', count: 12, color: 'bg-[#52525B]' },
  { stage: 'Qualificado', count: 7, color: 'bg-[#3B82F6]' },
  { stage: 'Educação', count: 5, color: 'bg-[#7B3FE4]' },
  { stage: 'Proposta', count: 4, color: 'bg-amber-500' },
  { stage: 'Fechado', count: 9, color: 'bg-emerald-500' },
]

const modules = [
  { num: 1, title: 'Vendas', progress: 60, color: 'from-[#7B3FE4] to-[#4C1B9B]', slug: 'vendas' },
  { num: 2, title: 'Influência', progress: 20, color: 'from-[#3B82F6] to-[#1D4ED8]', slug: 'influencia' },
  { num: 3, title: 'Liderança', progress: 0, color: 'from-amber-500 to-amber-600', slug: 'lideranca' },
  { num: 4, title: 'Modelos', progress: 0, color: 'from-emerald-500 to-emerald-600', slug: 'modelos' },
]

const recentActivity = [
  { text: 'ANA agendou: Marina Souza — Implante Testosterona', time: '3h atrás', type: 'bot' },
  { text: 'Lucas identificou R$3.200 em despesas categorizáveis', time: '1 dia atrás', type: 'finance' },
  { text: 'Assistiu: "SPIN Hormonal — Vendas Consultivas"', time: '2 dias atrás', type: 'escola' },
  { text: 'Rafael: nova resolução CFM — checklist atualizado', time: '3 dias atrás', type: 'legal' },
]

const financeMonths = [
  { month: 'Fev', value: 52000 },
  { month: 'Mar', value: 61000 },
  { month: 'Abr', value: 58000 },
  { month: 'Mai', value: 67000 },
  { month: 'Jun', value: 71000 },
  { month: 'Jul', value: 74000 },
]
const maxVal = Math.max(...financeMonths.map(m => m.value))

const referidos = [
  { name: 'Dr. Carlos Mendes', status: 'Ativo', value: 'R$ 48k', commission: 'R$ 4.8k' },
  { name: 'Dra. Fernanda Alves', status: 'Trial', value: '—', commission: '—' },
  { name: 'Dr. Paulo Saito', status: 'Lead', value: '—', commission: '—' },
]

export default function MedicalDashboard() {
  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Business OS" />
        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Top greeting bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Bom dia, Dr. Ricardo</h2>
              <p className="text-xs text-[#52525B]">quarta-feira, 29 julho 2026 · Atualizado 20:14</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 bg-[#111113] border border-[#1C1C1E] text-[#A1A1AA] hover:text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar
              </button>
              <a href="/medical/crm" className="flex items-center gap-1.5 bg-[#111113] border border-[#1C1C1E] text-[#A1A1AA] hover:text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
                <Kanban className="w-3.5 h-3.5" /> CRM
              </a>
              <a href="/medical/financeiro" className="flex items-center gap-1.5 bg-[#111113] border border-[#1C1C1E] text-[#A1A1AA] hover:text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
                <DollarSign className="w-3.5 h-3.5" /> Financeiro
              </a>
              <a href="/medical/escola" className="flex items-center gap-1.5 bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 transition-opacity">
                <GraduationCap className="w-3.5 h-3.5" /> Treinamento
              </a>
            </div>
          </div>

          {/* Row 1: 5 KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {kpi1.map((k, i) => (
              <div key={i} className={`bg-gradient-to-br ${k.color} border ${k.border} rounded-2xl p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <k.icon className={`w-4 h-4 ${k.text}`} />
                  {k.up !== null && (
                    k.up
                      ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                      : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                  )}
                </div>
                <p className="text-xl font-bold text-white leading-none">{k.value}</p>
                <p className="text-[10px] text-[#71717A] mt-1">{k.sub}</p>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#52525B] mt-2">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Row 2: 6 secondary KPIs */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {kpi2.map((k, i) => (
              <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-3">
                <p className="text-base font-bold text-white leading-none">{k.value}</p>
                <p className="text-[10px] text-[#52525B] mt-0.5">{k.trend}</p>
                <p className="text-[9px] text-[#3F3F46] mt-1.5 uppercase tracking-wide">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Main 2-col layout */}
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">

              {/* Agentes Trabalhando Agora */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#7B3FE4]" /> Agentes Trabalhando Agora
                  </h3>
                  <a href="/medical/negocio?tab=agentes" className="text-xs text-[#52525B] hover:text-[#7B3FE4] flex items-center gap-1 transition-colors">
                    Ver todos <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
                {/* ANA big card */}
                <div className="bg-[#111113] border border-[#7B3FE4]/25 rounded-2xl p-5 mb-3">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(123,63,228,0.3)]">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base font-bold text-white">ANA</span>
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">Ativa</span>
                        <span className="text-[10px] text-[#7B3FE4] bg-[#7B3FE4]/10 px-2 py-0.5 rounded-full border border-[#7B3FE4]/20">Score 100 · Excelente</span>
                      </div>
                      <p className="text-xs text-[#71717A]">Vendas & Qualificação · IA de atendimento e funil</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {[
                      { label: 'Atendimentos hoje', value: '23' },
                      { label: 'Taxa resposta', value: '107%' },
                      { label: 'Leads no funil', value: '7' },
                    ].map((s, i) => (
                      <div key={i} className="bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-center">
                        <p className="text-lg font-bold text-white">{s.value}</p>
                        <p className="text-[10px] text-[#52525B]">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Mini agent cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: 'Gustavo', role: 'Tráfego & Mídias', metric: '3 sugestões', active: true, color: 'from-[#3B82F6] to-[#06B6D4]' },
                    { name: 'Lucas', role: 'Administrativo', metric: 'Configuração pendente', active: false, color: 'from-amber-500 to-amber-600' },
                    { name: 'Rafael', role: 'Jurídico', metric: 'Plano Elite', active: false, color: 'from-emerald-500 to-emerald-600' },
                  ].map((a, i) => (
                    <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {a.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-white">{a.name}</p>
                            <div className={`w-1.5 h-1.5 rounded-full ${a.active ? 'bg-emerald-400' : 'bg-[#52525B]'}`} />
                          </div>
                          <p className="text-[9px] text-[#52525B] truncate">{a.role}</p>
                        </div>
                      </div>
                      <p className={`text-[10px] ${a.active ? 'text-[#A1A1AA]' : 'text-[#52525B]'}`}>{a.metric}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financeiro */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" /> Financeiro — Faturamento 2026
                  </h3>
                  <a href="/medical/financeiro" className="text-xs text-[#52525B] hover:text-emerald-400 transition-colors">Ver DRE →</a>
                </div>
                <div className="flex items-end gap-2 h-20 mb-3">
                  {financeMonths.map((m, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-md ${i === financeMonths.length - 1 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-[#27272A]'}`}
                        style={{ height: `${Math.round((m.value / maxVal) * 72)}px` }}
                      />
                      <span className="text-[9px] text-[#52525B]">{m.month}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Receita Bruta', value: 'R$ 74k', color: 'text-emerald-400' },
                    { label: 'Despesas', value: 'R$ 28k', color: 'text-red-400' },
                    { label: 'Lucro Líquido', value: 'R$ 46k', color: 'text-white' },
                  ].map((s, i) => (
                    <div key={i} className="bg-[#18181A] border border-[#1C1C1E] rounded-xl p-2.5 text-center">
                      <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[9px] text-[#52525B] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pipeline ao Vivo */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#3B82F6]" /> Pipeline ao Vivo
                  </h3>
                  <a href="/medical/crm" className="text-xs text-[#52525B] hover:text-[#7B3FE4] transition-colors">Gerenciar →</a>
                </div>
                <div className="flex items-stretch gap-2">
                  {pipeline.map((p, i) => (
                    <div key={i} className="flex-1">
                      <div className="text-center mb-2">
                        <div className={`w-8 h-8 rounded-lg ${p.color} flex items-center justify-center text-white font-bold text-sm mx-auto mb-1`}>
                          {p.count}
                        </div>
                        <p className="text-[10px] text-[#71717A]">{p.stage}</p>
                      </div>
                      <div className="h-1 rounded-full bg-[#1C1C1E] overflow-hidden">
                        <div className={`h-full ${p.color} rounded-full`} style={{ width: `${Math.min(100, p.count * 8)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#52525B] mt-3">Total: {pipeline.reduce((a, p) => a + p.count, 0)} leads · Novo → Qualificado → Educação → Proposta → Fechado</p>
              </div>

            </div>

            {/* Right column */}
            <div className="space-y-4">

              {/* Treinamento progress */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-amber-400" /> Treinamento
                  </h3>
                  <a href="/medical/escola" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1">
                    Ver <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
                <div className="space-y-2">
                  {modules.map((m) => (
                    <a key={m.num} href={`/medical/escola`} className="flex items-center gap-3 group">
                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                        {m.num}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-[#A1A1AA] group-hover:text-white transition-colors">{m.title}</span>
                          <span className="text-[#52525B]">{m.progress}%</span>
                        </div>
                        <div className="h-1 bg-[#1C1C1E] rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${m.color} rounded-full`} style={{ width: `${m.progress || 2}%` }} />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Atividade Recente */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Atividade Recente</h3>
                <div className="space-y-3">
                  {recentActivity.map((a, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        a.type === 'bot' ? 'bg-[#7B3FE4]/20' :
                        a.type === 'finance' ? 'bg-amber-500/20' :
                        a.type === 'escola' ? 'bg-[#3B82F6]/20' : 'bg-emerald-500/20'
                      }`}>
                        {a.type === 'bot' && <Bot className="w-2.5 h-2.5 text-[#9558EE]" />}
                        {a.type === 'finance' && <BarChart3 className="w-2.5 h-2.5 text-amber-400" />}
                        {a.type === 'escola' && <Play className="w-2.5 h-2.5 text-[#60A5FA]" />}
                        {a.type === 'legal' && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
                      </div>
                      <div>
                        <p className="text-[11px] text-[#A1A1AA] leading-relaxed">{a.text}</p>
                        <p className="text-[10px] text-[#52525B] mt-0.5">{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Referidos */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-[#3B82F6]" /> Referidos
                  </h3>
                  <a href="/medical/referidos" className="text-xs text-[#52525B] hover:text-[#7B3FE4] flex items-center gap-1 transition-colors">
                    Ver todos <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
                <div className="space-y-2">
                  {referidos.map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                          {r.name.split(' ').map(w => w[0]).slice(1, 3).join('')}
                        </div>
                        <p className="text-[11px] text-[#A1A1AA] truncate">{r.name}</p>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        r.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        r.status === 'Trial' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-[#1C1C1E] text-[#52525B] border border-[#27272A]'
                      }`}>{r.status}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[#1C1C1E] flex justify-between text-[10px]">
                  <span className="text-[#52525B]">Comissão acumulada</span>
                  <span className="text-emerald-400 font-semibold">R$ 4.8k</span>
                </div>
              </div>

              {/* Próxima Mentoria */}
              <div className="bg-gradient-to-br from-[#7B3FE4]/10 to-[#3B82F6]/10 border border-[#7B3FE4]/25 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-[#7B3FE4]" />
                  <span className="text-xs font-semibold text-[#7B3FE4] uppercase tracking-wider">Próxima Mentoria</span>
                </div>
                <p className="text-sm font-semibold text-white mb-0.5">Implantes Pellet: técnica e dosimetria ao vivo</p>
                <div className="flex items-center gap-1.5 text-[10px] text-[#71717A] mb-3">
                  <Clock className="w-3 h-3" /> 26 Fev · 19h00 · Dr. Vinícius Cechella
                </div>
                <a href="/medical/mentoria" className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white text-xs font-semibold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity w-full">
                  Entrar na Sessão <ChevronRight className="w-3 h-3" />
                </a>
              </div>

            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
