'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Share2, Users, DollarSign, TrendingUp, Copy,
  CheckCircle2, Clock, ChevronRight, Plus, ArrowUpRight,
} from 'lucide-react'

const referidos = [
  {
    name: 'Dr. Carlos Mendes',
    specialty: 'Clínica Geral · SP',
    status: 'Ativo',
    plan: 'Starter',
    value: 'R$ 48k/ano',
    commission: 'R$ 4.800',
    joined: 'Jan 2026',
    avatar: 'CM',
  },
  {
    name: 'Dra. Fernanda Alves',
    specialty: 'Endocrinologista · RJ',
    status: 'Trial',
    plan: 'Trial 30d',
    value: '—',
    commission: '—',
    joined: 'Jul 2026',
    avatar: 'FA',
  },
  {
    name: 'Dr. Paulo Saito',
    specialty: 'Nutrólogo · PR',
    status: 'Lead',
    plan: '—',
    value: '—',
    commission: '—',
    joined: 'Jul 2026',
    avatar: 'PS',
  },
]

const kpis = [
  { label: 'Total Referidos', value: '3', sub: '1 ativo, 1 trial', icon: Users, color: 'text-white', border: 'border-[#1C1C1E]', bg: 'bg-[#111113]' },
  { label: 'Comissão Acumulada', value: 'R$ 4.8k', sub: '+R$ 4.8k/ano', icon: DollarSign, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
  { label: 'Conversão', value: '33%', sub: '1 de 3 ativos', icon: TrendingUp, color: 'text-[#7B3FE4]', border: 'border-[#7B3FE4]/20', bg: 'bg-[#7B3FE4]/5' },
  { label: 'Potencial Mensal', value: 'R$ 800', sub: 'se todos ativos', icon: ArrowUpRight, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
]

const steps = [
  { num: 1, title: 'Compartilhe seu link', desc: 'Envie seu link personalizado para médicos da sua rede' },
  { num: 2, title: 'Eles se cadastram', desc: 'O médico inicia o trial de 30 dias na plataforma' },
  { num: 3, title: 'Você ganha comissão', desc: 'R$ 4.800 anuais para cada médico que assinar o Plano Starter ou superior' },
]

export default function ReferidosPage() {
  const refLink = 'hormone.eco/r/dricardo'

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Referidos" />
        <main className="flex-1 overflow-y-auto px-6 py-5">

          {/* Header */}
          <div className="relative bg-[#111113] border border-[#7B3FE4]/20 rounded-2xl p-5 mb-5 overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#7B3FE4]/8 blur-[60px]" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Share2 className="w-4 h-4 text-[#7B3FE4]" />
                  <span className="text-xs font-semibold text-[#7B3FE4] uppercase tracking-wider">Programa de Referidos</span>
                </div>
                <h2 className="text-xl font-bold text-white">Indique médicos e ganhe comissão</h2>
                <p className="text-xs text-[#71717A] mt-0.5">R$ 4.800 por médico que assinar + 10% recorrente enquanto ele permanecer ativo</p>
              </div>
              {/* Link copy */}
              <div className="flex items-center gap-2 bg-[#18181A] border border-[#7B3FE4]/30 rounded-xl px-4 py-2.5">
                <span className="text-xs text-[#7B3FE4] font-mono">{refLink}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(`https://${refLink}`)}
                  className="flex items-center gap-1 text-[10px] text-[#52525B] hover:text-white transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copiar
                </button>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {kpis.map((k, i) => (
              <div key={i} className={`${k.bg} border ${k.border} rounded-xl p-3`}>
                <div className="flex items-center justify-between mb-2">
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                </div>
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-[#52525B] mt-0.5">{k.sub}</p>
                <p className="text-[9px] text-[#3F3F46] mt-1.5 uppercase tracking-wide">{k.label}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {/* Referidos list */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Seus Referidos</h3>
                <button className="flex items-center gap-1.5 bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white text-xs font-semibold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity">
                  <Plus className="w-3.5 h-3.5" /> Convidar médico
                </button>
              </div>
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
                {referidos.map((r, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#1C1C1E] last:border-0 hover:bg-[#18181A]/40 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7B3FE4]/40 to-[#3B82F6]/40 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {r.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{r.name}</p>
                      <p className="text-xs text-[#52525B]">{r.specialty}</p>
                    </div>
                    <div className="hidden md:block text-center">
                      <p className="text-xs font-semibold text-white">{r.plan}</p>
                      <p className="text-[10px] text-[#52525B]">{r.value}</p>
                    </div>
                    <div className="hidden md:block text-center min-w-[70px]">
                      <p className="text-sm font-bold text-emerald-400">{r.commission}</p>
                      <p className="text-[10px] text-[#52525B]">comissão</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full border flex-shrink-0 ${
                      r.status === 'Ativo' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                      r.status === 'Trial' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                      'text-[#52525B] bg-[#18181A] border-[#27272A]'
                    }`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Como funciona</h3>
              <div className="space-y-3">
                {steps.map((s, i) => (
                  <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {s.num}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{s.title}</p>
                        <p className="text-[11px] text-[#71717A] mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-4 bg-gradient-to-br from-[#7B3FE4]/10 to-[#3B82F6]/5 border border-[#7B3FE4]/20 rounded-2xl p-4">
                <p className="text-xs font-semibold text-white mb-1">Aumente sua renda passiva</p>
                <p className="text-[11px] text-[#71717A] mb-3">Com 10 médicos ativos você gera R$ 48k/ano em comissões adicionais.</p>
                <a
                  href={`https://wa.me/?text=Olá! Você conhece a Hormone Ecosystem? A plataforma que estou usando para escalar meu consultório. Acesse: https://${refLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white text-xs font-semibold px-3 py-2.5 rounded-xl hover:opacity-90 transition-opacity w-full"
                >
                  Compartilhar via WhatsApp <ChevronRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
