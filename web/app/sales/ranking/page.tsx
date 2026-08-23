'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Comercial = {
  id: string
  nome: string
  cargo?: string
  disponivel: boolean
  conversoes?: number
}

function getInitials(nome: string) {
  return nome.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const COLORS = ['#7C3AED','#06B6D4','#10B981','#F59E0B','#EF4444','#3B82F6','#EC4899']

export default function SalesRanking() {
  const [me, setMe] = useState<Comercial | null>(null)
  const [comerciais, setComerciais] = useState<Comercial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/sales/me').then(r => r.ok ? r.json() : null),
      fetch('/api/admin/comerciais').then(r => r.ok ? r.json() : []),
    ]).then(([meData, comData]) => {
      setMe(meData)
      // Sort by disponivel (ativos first), then by nome
      const sorted = (Array.isArray(comData) ? comData : [])
        .sort((a: Comercial, b: Comercial) => a.nome.localeCompare(b.nome))
      setComerciais(sorted)
      setLoading(false)
    })
  }, [])

  const myRank = me ? comerciais.findIndex(c => c.id === me.id) + 1 : 0

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <header className="bg-[#111113] border-b border-[#27272A] px-6 py-3 flex items-center gap-6">
        <span className="text-base font-bold bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] bg-clip-text text-transparent">
          Cechella
        </span>
        <nav className="flex items-center gap-1">
          {[
            { label: 'Referidos', href: '/sales/dashboard' },
            { label: 'CRM', href: '/sales/crm' },
            { label: 'Ranking', href: '/sales/ranking' },
            { label: 'Treinamento', href: '/sales/training' },
          ].map(n => (
            <Link key={n.href} href={n.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                n.href === '/sales/ranking' ? 'text-white bg-[#18181B]' : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
              }`}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <h1 className="text-xl font-bold">Ranking de Consultores</h1>

        {me && myRank > 0 && (
          <div className="bg-[#7C3AED]/10 border border-[#7C3AED]/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#8B5CF6] uppercase tracking-wider">Sua posição</div>
              <div className="text-sm text-[#A1A1AA] mt-0.5">{me.nome}</div>
            </div>
            <div className="text-4xl font-black text-[#8B5CF6]">#{myRank}</div>
          </div>
        )}

        {loading ? (
          <div className="text-center text-sm text-[#52525B] py-12">Carregando…</div>
        ) : (
          <div className="bg-[#111113] border border-[#27272A] rounded-xl overflow-hidden">
            {comerciais.map((c, i) => {
              const isMe = me?.id === c.id
              const color = COLORS[i % COLORS.length]
              return (
                <div key={c.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-[#27272A] last:border-b-0 ${isMe ? 'bg-[#7C3AED]/08' : ''}`}>
                  <div className="w-6 text-xs font-bold text-[#52525B] tabular-nums">{i + 1}</div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: color + '25', color }}>
                    {getInitials(c.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${isMe ? 'text-[#8B5CF6]' : 'text-white'}`}>
                      {c.nome}{isMe ? ' (você)' : ''}
                    </div>
                    {c.cargo && <div className="text-xs text-[#71717A]">{c.cargo}</div>}
                  </div>
                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                    c.disponivel ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-[#71717A]/15 text-[#71717A]'
                  }`}>
                    {c.disponivel ? 'Disponível' : 'Indisponível'}
                  </div>
                </div>
              )
            })}
            {comerciais.length === 0 && (
              <div className="text-center py-12 text-sm text-[#52525B]">Nenhum consultor cadastrado</div>
            )}
          </div>
        )}

        <p className="text-xs text-[#52525B] text-center">
          Ranking de conversões será exibido em breve
        </p>
      </main>
    </div>
  )
}
