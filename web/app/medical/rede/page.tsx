import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Network, Users, MapPin, TrendingUp, Star,
  ChevronRight, Share2, ArrowUpRight, MessageSquare,
} from 'lucide-react'

const networkDoctors = [
  { name: 'Dr. Carlos Mendes', specialty: 'Clínica Geral', city: 'São Paulo, SP', patients: 89, status: 'Ativo', plan: 'Starter', avatar: 'CM' },
  { name: 'Dra. Fernanda Alves', specialty: 'Endocrinologia', city: 'Rio de Janeiro, RJ', patients: 0, status: 'Trial', plan: '30 dias', avatar: 'FA' },
  { name: 'Dr. Paulo Saito', specialty: 'Nutrologia', city: 'Curitiba, PR', patients: 0, status: 'Lead', plan: '—', avatar: 'PS' },
]

const kpis = [
  { label: 'Médicos na Rede', value: '3', sub: 'indicados por você', icon: Users, color: 'text-white' },
  { label: 'Pacientes na Rede', value: '89', sub: 'atendidos pela rede', icon: TrendingUp, color: 'text-emerald-400' },
  { label: 'Comissão Ativa', value: 'R$ 4.8k', sub: 'anual recorrente', icon: Share2, color: 'text-[#7B3FE4]' },
  { label: 'Pot. da Rede', value: 'R$ 14.4k', sub: 'se todos ativos', icon: ArrowUpRight, color: 'text-amber-400' },
]

export default function RedePage() {
  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Rede de Médicos" />
        <main className="flex-1 overflow-y-auto px-6 py-5">

          {/* Header */}
          <div className="relative bg-[#111113] border border-[#7B3FE4]/20 rounded-2xl p-5 mb-5 overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#7B3FE4]/8 blur-[60px]" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Network className="w-4 h-4 text-[#7B3FE4]" />
                  <span className="text-xs font-semibold text-[#7B3FE4] uppercase tracking-wider">Hormone Ecosystem · Rede Médica</span>
                </div>
                <h2 className="text-xl font-bold text-white">Sua rede de médicos mentorados</h2>
                <p className="text-xs text-[#71717A] mt-0.5">Médicos que você indicou para o Hormone Ecosystem. Gere renda recorrente expandindo a rede.</p>
              </div>
              <a
                href="/medical/referidos"
                className="flex items-center gap-1.5 bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity flex-shrink-0"
              >
                <Share2 className="w-3.5 h-3.5" /> Indicar médico
              </a>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {kpis.map((k, i) => (
              <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-3">
                <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-[#52525B] mt-0.5">{k.sub}</p>
                <p className="text-[9px] text-[#3F3F46] mt-1.5 uppercase tracking-wide">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Network list */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-[#1C1C1E]">
              <h3 className="text-sm font-semibold text-white">Médicos Indicados</h3>
            </div>
            {networkDoctors.map((d, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#1C1C1E] last:border-0 hover:bg-[#18181A]/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7B3FE4]/40 to-[#3B82F6]/40 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {d.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{d.name}</p>
                  <p className="text-xs text-[#52525B]">{d.specialty}</p>
                </div>
                <div className="hidden md:flex items-center gap-1.5 text-xs text-[#71717A]">
                  <MapPin className="w-3 h-3" /> {d.city}
                </div>
                <div className="hidden md:block text-center min-w-[60px]">
                  <p className="text-sm font-bold text-white">{d.patients}</p>
                  <p className="text-[10px] text-[#52525B]">pacientes</p>
                </div>
                <div className="hidden md:block text-center min-w-[60px]">
                  <p className="text-xs text-[#A1A1AA]">{d.plan}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full border flex-shrink-0 ${
                  d.status === 'Ativo' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                  d.status === 'Trial' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                  'text-[#52525B] bg-[#18181A] border-[#27272A]'
                }`}>{d.status}</span>
              </div>
            ))}
          </div>

          {/* Grow CTA */}
          <div className="bg-gradient-to-r from-[#7B3FE4]/10 to-[#3B82F6]/5 border border-[#7B3FE4]/20 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">Expanda sua rede e gere renda passiva</p>
                <p className="text-xs text-[#71717A] mt-0.5">Com 10 médicos ativos você gera R$ 48k/ano em comissões. Cada médico ganha acesso à mesma plataforma que você usa.</p>
              </div>
              <a href="/medical/referidos" className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                Indicar agora <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
