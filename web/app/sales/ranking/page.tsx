'use client'

import { useEffect, useState } from 'react'

type Comercial = { id: string; nome: string; cargo?: string; disponivel: boolean }
type Me = { id: string; nome: string; cargo?: string }

function getInitials(nome: string) {
  return nome.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const AVATAR_GRADIENTS = [
  'from-[#F59E0B] to-[#EF4444]',
  'from-[#A1A1AA] to-[#71717A]',
  'from-[#7C3AED] to-[#A78BFA]',
  'from-[#92400E] to-[#B45309]',
  'from-[#0EA5E9] to-[#06B6D4]',
  'from-[#10B981] to-[#06B6D4]',
  'from-[#EC4899] to-[#F43F5E]',
]

const RANK_LABELS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function SalesRanking() {
  const [me, setMe] = useState<Me | null>(null)
  const [comerciais, setComerciais] = useState<Comercial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/sales/me').then(r => r.ok ? r.json() : null),
      fetch('/api/admin/comerciais').then(r => r.ok ? r.json() : []),
    ]).then(([meData, comData]) => {
      setMe(meData)
      setComerciais(Array.isArray(comData) ? comData.sort((a: Comercial, b: Comercial) => a.nome.localeCompare(b.nome)) : [])
      setLoading(false)
    })
  }, [])

  const myRank = me ? comerciais.findIndex(c => c.id === me.id) + 1 : 0

  return (
    <>
      {/* Minha posição */}
      {me && myRank > 0 && (
        <div className="bg-gradient-to-r from-[#7C3AED]/10 to-[#06B6D4]/06 border border-[#7C3AED]/20 rounded-2xl p-4 flex items-center gap-4 mb-5">
          <div className="text-[32px] font-black text-[#7C3AED] font-variant-numeric tabular-nums leading-none w-10 text-center">
            {myRank}<sup className="text-sm text-[#71717A] font-semibold">º</sup>
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#FAFAFA]">{me.nome}</p>
            <p className="text-[11px] text-[#71717A] mt-0.5">Sua posição este mês</p>
          </div>
          <div className="ml-auto flex gap-5">
            <div className="text-right">
              <p className="text-[18px] font-bold text-[#FAFAFA] tabular-nums">8</p>
              <p className="text-[10px] text-[#71717A]">Conversões</p>
            </div>
            <div className="text-right">
              <p className="text-[18px] font-bold text-[#FAFAFA] tabular-nums">950</p>
              <p className="text-[10px] text-[#71717A]">XP</p>
            </div>
            <div className="text-right">
              <p className="text-[16px] font-bold text-[#10B981] tabular-nums">R$ 4.800</p>
              <p className="text-[10px] text-[#71717A]">Comissão</p>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="bg-[#111113] border border-[#27272A] rounded-xl overflow-hidden">
        {loading
          ? [0, 1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#27272A] last:border-0">
              <div className="w-6 h-3 bg-[#27272A] rounded animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-[#27272A] animate-pulse" />
              <div className="flex-1 h-4 bg-[#27272A] rounded animate-pulse" />
            </div>
          ))
          : comerciais.map((c, i) => {
            const rank = i + 1
            const isMe = me?.id === c.id
            const grad = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]
            return (
              <div key={c.id}
                className={`flex items-center gap-3 px-4 py-3 border-b border-[#27272A] last:border-0 transition-colors ${isMe ? 'bg-[#7C3AED]/06' : 'hover:bg-[#18181B]'}`}>
                <span className={`w-7 text-center text-[13px] font-bold tabular-nums flex-shrink-0 ${
                  rank === 1 ? 'text-[#F59E0B]' : rank === 2 ? 'text-[#A1A1AA]' : rank === 3 ? 'text-[#92400E]' : 'text-[#52525B]'
                }`}>
                  {RANK_LABELS[rank] ?? rank}
                </span>
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0`}>
                  {getInitials(c.nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold truncate ${isMe ? 'text-[#A78BFA]' : 'text-[#FAFAFA]'}`}>
                    {c.nome}{isMe ? ' (você)' : ''}
                  </p>
                  {c.cargo && <p className="text-[11px] text-[#71717A]">{c.cargo}</p>}
                </div>
                <div className="flex gap-5 ml-auto">
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-[#FAFAFA] tabular-nums">—</p>
                    <p className="text-[10px] text-[#71717A]">conversões</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-[#FAFAFA] tabular-nums">—</p>
                    <p className="text-[10px] text-[#71717A]">XP</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-[#10B981] tabular-nums">—</p>
                    <p className="text-[10px] text-[#71717A]">comissão</p>
                  </div>
                </div>
              </div>
            )
          })}
        {!loading && comerciais.length === 0 && (
          <div className="text-center py-12 text-sm text-[#52525B]">Nenhum consultor cadastrado</div>
        )}
      </div>
      <p className="text-[11px] text-[#52525B] text-center mt-3">Dados de conversão e comissão em breve</p>
    </>
  )
}
