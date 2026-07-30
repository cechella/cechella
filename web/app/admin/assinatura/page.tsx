import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  CreditCard, CheckCircle2, Clock, MessageSquare,
  ChevronRight, Star, Shield,
} from 'lucide-react'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'R$ 60k/ano',
    current: false,
    features: [
      { label: 'Escola de Negócios (2 módulos)', included: true },
      { label: 'Agente ANA', included: true },
      { label: 'Dashboard Business OS', included: true },
      { label: 'Mentoria em grupo mensal', included: true },
      { label: 'Escola completa (4 módulos)', included: false },
      { label: 'Mentoria individual', included: false },
      { label: 'Agente Gustavo (Tráfego)', included: false },
      { label: 'Agente Lucas (Financeiro)', included: false },
      { label: 'Agente Rafael (Jurídico)', included: false },
      { label: 'CRM Avançado', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 120k/ano',
    current: false,
    features: [
      { label: 'Escola de Negócios (2 módulos)', included: true },
      { label: 'Agente ANA', included: true },
      { label: 'Dashboard Business OS', included: true },
      { label: 'Mentoria em grupo mensal', included: true },
      { label: 'Escola completa (4 módulos)', included: true },
      { label: 'Mentoria individual', included: false },
      { label: 'Agente Gustavo (Tráfego)', included: true },
      { label: 'Agente Lucas (Financeiro)', included: false },
      { label: 'Agente Rafael (Jurídico)', included: false },
      { label: 'CRM Avançado', included: true },
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 'R$ 220k/ano',
    current: true,
    features: [
      { label: 'Escola de Negócios (2 módulos)', included: true },
      { label: 'Agente ANA', included: true },
      { label: 'Dashboard Business OS', included: true },
      { label: 'Mentoria em grupo mensal', included: true },
      { label: 'Escola completa (4 módulos)', included: true },
      { label: 'Mentoria individual', included: true },
      { label: 'Agente Gustavo (Tráfego)', included: true },
      { label: 'Agente Lucas (Financeiro)', included: true },
      { label: 'Agente Rafael (Jurídico)', included: true },
      { label: 'CRM Avançado', included: true },
    ],
  },
  {
    id: 'founder',
    name: 'Founder',
    price: 'Sob consulta',
    current: false,
    features: [
      { label: 'Escola de Negócios (2 módulos)', included: true },
      { label: 'Agente ANA', included: true },
      { label: 'Dashboard Business OS', included: true },
      { label: 'Mentoria em grupo mensal', included: true },
      { label: 'Escola completa (4 módulos)', included: true },
      { label: 'Mentoria individual', included: true },
      { label: 'Agente Gustavo (Tráfego)', included: true },
      { label: 'Agente Lucas (Financeiro)', included: true },
      { label: 'Agente Rafael (Jurídico)', included: true },
      { label: 'CRM Avançado', included: true },
    ],
  },
]

const invoices = [
  { id: 'INV-2026-007', date: '01 Jul 2026', amount: 'R$ 18.333', status: 'Pago' },
  { id: 'INV-2026-006', date: '01 Jun 2026', amount: 'R$ 18.333', status: 'Pago' },
  { id: 'INV-2026-005', date: '01 Mai 2026', amount: 'R$ 18.333', status: 'Pago' },
]

export default function AssinaturaPage() {
  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin', role: 'admin' }} title="Assinatura" />
        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Current plan card */}
          <div className="relative bg-gradient-to-r from-[#7B3FE4]/15 to-[#3B82F6]/10 border border-[#7B3FE4]/30 rounded-2xl p-6 overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#7B3FE4]/10 blur-[80px]" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-[#7B3FE4]" />
                  <span className="text-xs font-semibold text-[#7B3FE4] uppercase tracking-wider">Plano Atual</span>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">ATIVO</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Plano Elite</h2>
                <p className="text-sm text-[#71717A] mt-0.5">Acesso completo a todos os recursos · Todos os 4 Agentes IA · Mentoria individual</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-[#111113]/80 border border-[#1C1C1E] rounded-2xl px-5 py-3 text-center">
                  <p className="text-xl font-bold text-white">R$ 220k</p>
                  <p className="text-[10px] text-[#71717A]">por ano</p>
                </div>
                <div className="bg-[#111113]/80 border border-[#1C1C1E] rounded-2xl px-5 py-3 text-center">
                  <p className="text-sm font-bold text-white">Jan 2027</p>
                  <p className="text-[10px] text-[#71717A]">Renova em</p>
                </div>
              </div>
            </div>
          </div>

          {/* Plan comparison */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#1C1C1E]">
              <h3 className="text-sm font-semibold text-white">Comparativo de Planos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1C1C1E]">
                    <th className="text-left text-[10px] font-semibold text-[#52525B] uppercase tracking-wider px-5 py-3 min-w-[200px]">Recurso</th>
                    {plans.map(p => (
                      <th key={p.id} className={`text-center px-4 py-3 min-w-[120px] ${p.current ? 'bg-[#7B3FE4]/10' : ''}`}>
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm font-bold ${p.current ? 'text-[#9558EE]' : 'text-[#A1A1AA]'}`}>{p.name}</span>
                          {p.current && (
                            <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 uppercase">Atual</span>
                          )}
                          <span className="text-[10px] text-[#52525B]">{p.price}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plans[0].features.map((_, fi) => (
                    <tr key={fi} className="border-b border-[#1C1C1E] last:border-0 hover:bg-[#18181A]/30 transition-colors">
                      <td className="px-5 py-2.5 text-xs text-[#A1A1AA]">{plans[0].features[fi].label}</td>
                      {plans.map(p => (
                        <td key={p.id} className={`px-4 py-2.5 text-center ${p.current ? 'bg-[#7B3FE4]/5' : ''}`}>
                          {p.features[fi].included
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                            : <span className="text-[#3F3F46] text-lg">—</span>
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t border-[#1C1C1E]">
                    <td className="px-5 py-3" />
                    {plans.map(p => (
                      <td key={p.id} className={`px-4 py-3 text-center ${p.current ? 'bg-[#7B3FE4]/5' : ''}`}>
                        {p.current ? (
                          <span className="text-xs font-semibold text-[#52525B]">Plano atual</span>
                        ) : (
                          <button className="text-xs font-semibold text-[#7B3FE4] hover:text-[#9558EE] transition-colors flex items-center gap-1 mx-auto">
                            Falar com equipe <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment history */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#1C1C1E] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#52525B]" /> Histórico de Pagamentos
              </h3>
              <span className="text-xs text-[#52525B]">Últimas faturas</span>
            </div>
            <div className="divide-y divide-[#1C1C1E]">
              {invoices.map((inv, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#18181A]/50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{inv.id}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#52525B] mt-0.5">
                      <Clock className="w-3 h-3" /> {inv.date}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white">{inv.amount}</span>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{inv.status}</span>
                  <button className="text-xs text-[#52525B] hover:text-white transition-colors flex items-center gap-1">
                    PDF <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Support CTA */}
          <div className="flex items-center gap-4 bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-[#7B3FE4]/15 border border-[#7B3FE4]/25 flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-[#7B3FE4]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Dúvidas sobre sua assinatura?</p>
              <p className="text-xs text-[#71717A] mt-0.5">Nossa equipe de sucesso do cliente está disponível de seg–sex, 9h–18h.</p>
            </div>
            <a
              href="https://wa.me/5547988507977"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity flex-shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Falar com suporte
            </a>
          </div>

        </main>
      </div>
    </div>
  )
}
