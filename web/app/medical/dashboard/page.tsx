import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  GraduationCap, Bot, Building2, DollarSign, Users,
  ChevronRight, Star, MessageSquare, Play, ArrowUpRight,
  Shield, Briefcase, Library, Award
} from 'lucide-react'

const kpis = [
  { label: 'Faturamento Mês', value: 'R$ 74k', trend: '+21%', up: true, icon: <DollarSign className="w-5 h-5" />, color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  { label: 'Leads ANA (hoje)', value: '23', trend: '+8', up: true, icon: <MessageSquare className="w-5 h-5" />, color: 'from-[#7B3FE4]/20 to-[#3B82F6]/10', border: 'border-[#7B3FE4]/20', text: 'text-[#9558EE]' },
  { label: 'Consultas Agendadas', value: '7', trend: '+3', up: true, icon: <Users className="w-5 h-5" />, color: 'from-[#3B82F6]/20 to-[#3B82F6]/5', border: 'border-[#3B82F6]/20', text: 'text-[#60A5FA]' },
  { label: 'Progresso Escola', value: '37%', trend: '+12%', up: true, icon: <GraduationCap className="w-5 h-5" />, color: 'from-amber-500/20 to-amber-600/5', border: 'border-amber-500/20', text: 'text-amber-400' },
]

const agents = [
  { name: 'ANA', role: 'Vendas & Qualificação', active: true, metric: '23 atendimentos hoje', color: 'from-[#7B3FE4] to-[#3B82F6]', href: '/medical/ana-consultorio' },
  { name: 'Gustavo', role: 'Tráfego & Mídias Digitais', active: true, metric: '3 sugestões de conteúdo', color: 'from-[#3B82F6] to-[#06B6D4]', href: '#' },
  { name: 'Lucas', role: 'Administrativo & Financeiro', active: false, metric: 'Configuração pendente', color: 'from-[#F59E0B] to-[#D97706]', href: '#' },
  { name: 'Rafael', role: 'Jurídico & Compliance', active: false, metric: 'Disponível no Plano Elite', color: 'from-[#10B981] to-[#059669]', href: '#' },
]

const modules = [
  { num: 1, title: 'Vendas', lessons: 5, progress: 60, color: 'from-[#7B3FE4] to-[#4C1B9B]', href: '/medical/escola/vendas' },
  { num: 2, title: 'Influência', lessons: 5, progress: 20, color: 'from-[#3B82F6] to-[#1D4ED8]', href: '/medical/escola/influencia' },
  { num: 3, title: 'Liderança', lessons: 4, progress: 0, color: 'from-[#F59E0B] to-[#D97706]', href: '/medical/escola/lideranca' },
  { num: 4, title: 'Modelos de Negócio', lessons: 5, progress: 0, color: 'from-[#10B981] to-[#059669]', href: '/medical/escola/modelos' },
]

const recentActivity = [
  { icon: '▶️', text: 'Assistiu: "SPIN Hormonal — Vendas Consultivas"', time: '2h atrás' },
  { icon: '🤖', text: 'ANA agendou: Marina Souza — Implante Testosterona', time: '3h atrás' },
  { icon: '📊', text: 'Lucas identificou R$3.200 em despesas categorizáveis', time: '1 dia atrás' },
  { icon: '✅', text: 'Completou: Módulo 1 — Aula 3 (60% do módulo)', time: '2 dias atrás' },
  { icon: '📄', text: 'Rafael: nova resolução CFM — checklist atualizado', time: '3 dias atrás' },
]

export default function MedicalDashboard() {
  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Hormone Business OS" />
        <main className="flex-1 overflow-y-auto px-6 py-6">

          {/* Welcome hero */}
          <div className="relative bg-[#111113] border border-[#1C1C1E] rounded-3xl p-6 mb-6 overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#7B3FE4]/8 blur-[80px]" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Plano Elite — Ativo</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Olá, Dr. Ricardo</h2>
                <p className="text-sm text-[#71717A] mt-0.5">Seu consultório está no piloto automático. Foque em medicina de excelência.</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { label: 'Nível 4', sub: 'Especialista', color: 'text-[#7B3FE4]' },
                  { label: '2.450', sub: 'pontos XP', color: 'text-amber-400' },
                  { label: 'Mês 7', sub: 'de mentoria', color: 'text-white' },
                ].map((s, i) => (
                  <div key={i} className="bg-[#18181A] border border-[#1C1C1E] rounded-xl px-4 py-3 text-center">
                    <p className={`text-lg font-bold ${s.color}`}>{s.label}</p>
                    <p className="text-[10px] text-[#71717A]">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {kpis.map((k, i) => (
              <div key={i} className={`bg-gradient-to-br ${k.color} border ${k.border} rounded-2xl p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={k.text}>{k.icon}</span>
                  <span className="text-xs font-semibold flex items-center gap-0.5 text-emerald-400">
                    <ArrowUpRight className="w-3 h-3" />{k.trend}
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">{k.value}</p>
                <p className="text-xs text-[#A1A1AA] mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">

              {/* Agents */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#7B3FE4]" /> Seus 4 Agentes IA
                  </h3>
                  <span className="text-xs text-[#52525B]">2 ativos · 2 pendentes</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {agents.map((a, i) => (
                    <a key={i} href={a.href} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 hover:border-[#7B3FE4]/30 transition-all group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-lg`}>
                          {a.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-white text-sm">{a.name}</p>
                            <div className={`w-1.5 h-1.5 rounded-full ${a.active ? 'bg-emerald-400' : 'bg-[#52525B]'}`} />
                          </div>
                          <p className="text-[10px] text-[#71717A] truncate">{a.role}</p>
                        </div>
                      </div>
                      <p className={`text-xs ${a.active ? 'text-[#A1A1AA]' : 'text-[#52525B]'}`}>{a.metric}</p>
                    </a>
                  ))}
                </div>
              </div>

              {/* Escola de Negócios */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-amber-400" /> Escola de Negócios
                  </h3>
                  <a href="/medical/escola" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1">
                    Ver todos <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {modules.map((m) => (
                    <a key={m.num} href={m.href} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 hover:border-[#7B3FE4]/30 transition-all group">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center mb-3 text-white font-bold text-sm shadow-lg`}>
                        {m.num}
                      </div>
                      <p className="text-xs font-semibold text-white group-hover:text-[#9558EE] transition-colors leading-tight mb-2">{m.title}</p>
                      <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden mb-1">
                        <div className={`h-full rounded-full bg-gradient-to-r ${m.color}`} style={{ width: `${m.progress || 2}%` }} />
                      </div>
                      <p className="text-[10px] text-[#52525B]">{m.progress}% · {m.lessons} aulas</p>
                    </a>
                  ))}
                </div>
              </div>

              {/* Next session */}
              <div className="bg-gradient-to-r from-[#7B3FE4]/10 to-[#3B82F6]/10 border border-[#7B3FE4]/25 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(123,63,228,0.3)]">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[#7B3FE4] uppercase tracking-wider">Próxima Sessão ao Vivo</span>
                      <p className="text-sm font-semibold text-white">Implantes Pellet: técnica e dosimetria ao vivo</p>
                      <p className="text-xs text-[#71717A]">Ter, 26 Fev · 19h00 · Dr. Vinícius Cechella</p>
                    </div>
                  </div>
                  <a href="/medical/mentoria" className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity">
                    Entrar <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-3 text-[#A1A1AA] uppercase tracking-wider">Navegar</h3>
                <div className="space-y-1.5">
                  {[
                    { label: 'Meu Consultório', icon: <Building2 className="w-4 h-4" />, href: '/medical/consultorio', desc: 'Financeiro, CRM, métricas' },
                    { label: 'ANA no Consultório', icon: <Bot className="w-4 h-4" />, href: '/medical/ana-consultorio', desc: 'Leads e funil hoje' },
                    { label: 'Minha Mentoria', icon: <Star className="w-4 h-4" />, href: '/medical/mentoria', desc: 'Sessões e materiais' },
                    { label: 'Escola de Negócios', icon: <GraduationCap className="w-4 h-4" />, href: '/medical/escola', desc: '4 módulos · 19 aulas' },
                    { label: 'Biblioteca Científica', icon: <Library className="w-4 h-4" />, href: '/medical/library', desc: 'Guidelines e artigos' },
                    { label: 'Certificados', icon: <Award className="w-4 h-4" />, href: '/medical/certificates', desc: 'Seus certificados' },
                  ].map((item, i) => (
                    <a key={i} href={item.href} className="flex items-center gap-3 px-3 py-2.5 bg-[#111113] border border-[#1C1C1E] rounded-xl hover:border-[#7B3FE4]/30 transition-all group">
                      <span className="text-[#52525B] group-hover:text-[#7B3FE4] transition-colors">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#A1A1AA] group-hover:text-white transition-colors">{item.label}</p>
                        <p className="text-[10px] text-[#52525B]">{item.desc}</p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-[#52525B] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>

              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <h3 className="font-semibold text-white text-sm mb-3">Atividade Recente</h3>
                <div className="space-y-3">
                  {recentActivity.map((a, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-base flex-shrink-0">{a.icon}</span>
                      <div>
                        <p className="text-xs text-[#A1A1AA] leading-relaxed">{a.text}</p>
                        <p className="text-[10px] text-[#52525B] mt-0.5">{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#7B3FE4]/10 to-[#3B82F6]/10 border border-[#7B3FE4]/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-[#7B3FE4]" />
                  <p className="text-xs font-semibold text-white">Plano Elite</p>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">Ativo</span>
                </div>
                <p className="text-[10px] text-[#71717A] mb-3">Renova em 15 Jan 2027 · R$220k/ano</p>
                <a href="/medical/assinatura" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1">
                  Gerenciar assinatura <ChevronRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
