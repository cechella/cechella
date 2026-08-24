'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

let sb: ReturnType<typeof createBrowserClient> | null = null
function getSupabase() {
  if (!sb) sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return sb
}

type Comercial = { id: string; nome: string; email: string; cargo?: string }
type AnaCall = {
  id: string; call_sid: string; telefone: string; stage: string
  status: string; em_ligacao: boolean; nome: string | null
  created_at: string; updated_at: string
}

const STAGE_LABELS: Record<string, string> = {
  apresentacao: 'Apresentação', abertura: 'Apresentação',
  conexao: 'Conexão', combinado: 'D.I.', di: 'D.I.',
  speech: 'Speech', fechamento: 'Fechamento',
  pagamento: 'Pagamento', referidos: 'Referidos',
  encerramento: 'Encerramento', encerrado: 'Encerramento',
  validacao: 'Validação', ganho: 'Validação',
}

function timeAgo(date: string) {
  const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

function initials(nome: string | null, telefone: string) {
  if (nome) return nome.slice(0, 2).toUpperCase()
  return (telefone || '??').slice(-2)
}

const AVATAR_COLORS = [
  'from-[#7C3AED] to-[#A78BFA]',
  'from-[#06B6D4] to-[#3B82F6]',
  'from-[#10B981] to-[#06B6D4]',
  'from-[#F59E0B] to-[#EF4444]',
]

export default function SalesDashboard() {
  const [me, setMe] = useState<Comercial | null>(null)
  const [referidos, setReferidos] = useState<AnaCall[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  function showToast(msg: string) {
    setToastMsg(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(null), 3000)
  }

  async function load() {
    const [meRes, refRes] = await Promise.all([
      fetch('/api/sales/me'),
      fetch('/api/sales/referidos'),
    ])
    if (meRes.status === 401 || meRes.status === 404) {
      await getSupabase().auth.signOut()
      router.replace('/sales/login')
      return
    }
    const meData = await meRes.json()
    const refData = await refRes.json()
    setMe(meData)
    setReferidos(Array.isArray(refData) ? refData : [])
    setLoading(false)
  }

  async function resolve(call: AnaCall) {
    await fetch('/api/sales/referidos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ call_sid: call.call_sid, status: 'encerrado' }),
    })
    setReferidos(prev => prev.filter(r => r.id !== call.id))
    showToast('Marcado como atendido ✓')
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pendentes = referidos.filter(r => !r.em_ligacao)
  const aoVivo = referidos.filter(r => r.em_ligacao)

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          {
            icon: (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="9" cy="9" r="7.5"/><circle cx="9" cy="9" r="3" fill="currentColor" stroke="none"/>
              </svg>
            ),
            bg: 'bg-[#06B6D4]/10', color: 'text-[#06B6D4]',
            value: loading ? '…' : String(aoVivo.length),
            label: 'Ao Vivo agora',
          },
          {
            icon: (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="9" cy="9" r="7.5"/><polyline points="9,5 9,9 12,11" strokeLinecap="round"/>
              </svg>
            ),
            bg: 'bg-[#F59E0B]/10', color: 'text-[#F59E0B]',
            value: loading ? '…' : String(pendentes.length),
            label: 'Pendentes',
          },
          {
            icon: (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="3,10 7,6 10,9 15,4" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="11,4 15,4 15,8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
            bg: 'bg-[#10B981]/10', color: 'text-[#10B981]',
            value: loading ? '…' : '8',
            label: 'Convertidos mês',
          },
          {
            icon: (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="1.5" y="4.5" width="15" height="10" rx="2"/>
                <path d="M9 8v3m0 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" strokeLinecap="round"/>
                <path d="M1.5 7.5h15" strokeLinecap="round"/>
              </svg>
            ),
            bg: 'bg-[#10B981]/08', color: 'text-[#10B981]',
            value: loading ? '…' : 'R$ 4.800',
            label: 'Comissão do mês',
            small: true,
          },
        ].map((k, i) => (
          <div key={i} className="bg-[#111113] border border-[#27272A] rounded-xl px-4 py-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-[9px] ${k.bg} ${k.color} flex items-center justify-center flex-shrink-0`}>
              {k.icon}
            </div>
            <div>
              <p className={`font-extrabold text-[#FAFAFA] leading-none mb-0.5 ${k.small ? 'text-base' : 'text-[22px]'}`}>
                {k.value}
              </p>
              <p className="text-[11px] text-[#71717A]">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Ao vivo */}
      {(loading || aoVivo.length > 0) && (
        <>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#71717A] uppercase tracking-[.6px] mb-3">
            <span className="relative flex w-[7px] h-[7px]">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#06B6D4] opacity-60" />
              <span className="relative inline-flex w-[7px] h-[7px] rounded-full bg-[#06B6D4]" />
            </span>
            Leads ao vivo
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {loading
              ? [0, 1].map(i => <div key={i} className="bg-[#111113] border border-[#27272A] rounded-2xl p-4 h-28 animate-pulse" />)
              : aoVivo.map((r, i) => (
                <LeadCard key={r.id} r={r} type="live" colorIdx={i} onResolve={resolve} />
              ))}
          </div>
        </>
      )}

      {/* Pendentes */}
      {(loading || pendentes.length > 0) && (
        <>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#71717A] uppercase tracking-[.6px] mb-3">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#F59E0B" strokeWidth="1.5">
              <circle cx="6" cy="6" r="5"/><polyline points="6,3.5 6,6 8,7.5"/>
            </svg>
            Pendentes — aguardando contato
          </div>
          <div className="grid grid-cols-2 gap-3">
            {loading
              ? [0, 1].map(i => <div key={i} className="bg-[#111113] border border-[#27272A] rounded-2xl p-4 h-28 animate-pulse" />)
              : pendentes.map((r, i) => (
                <LeadCard key={r.id} r={r} type="pend" colorIdx={i + 2} onResolve={resolve} />
              ))}
          </div>
        </>
      )}

      {!loading && referidos.length === 0 && (
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-sm font-medium text-[#A1A1AA]">Nenhum referido ainda</div>
          <div className="text-xs text-[#52525B] mt-1">O admin atribui leads para você direto do Pipeline ao Vivo</div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111113] border border-[#10B981]/40 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toastMsg}
        </div>
      )}
    </>
  )
}

function LeadCard({
  r, type, colorIdx, onResolve,
}: {
  r: AnaCall; type: 'live' | 'pend'; colorIdx: number; onResolve: (r: AnaCall) => void
}) {
  const COLORS = [
    'from-[#7C3AED] to-[#A78BFA]',
    'from-[#06B6D4] to-[#3B82F6]',
    'from-[#10B981] to-[#06B6D4]',
    'from-[#F59E0B] to-[#EF4444]',
  ]
  const color = COLORS[colorIdx % COLORS.length]
  const isLive = type === 'live'

  return (
    <div className={`bg-[#111113] rounded-2xl p-4 transition-colors hover:border-[#3F3F46] border ${isLive ? 'border-l-[3px] border-l-[#06B6D4] border-[#27272A]' : 'border-l-[3px] border-l-[#F59E0B] border-[#27272A]'}`}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0`}>
          {initials(r.nome, r.telefone)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#FAFAFA] truncate">{r.nome ?? '(sem cadastro)'}</p>
          <p className="text-[11px] text-[#71717A] font-mono">{r.telefone}</p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
          isLive
            ? 'bg-[#06B6D4]/12 text-[#06B6D4] border-[#06B6D4]/20'
            : 'bg-[#F59E0B]/12 text-[#F59E0B] border-[#F59E0B]/20'
        }`}>
          {isLive ? '● AO VIVO' : '⏳ Pendente'}
        </span>
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#7C3AED]/10 text-[#A78BFA] border border-[#7C3AED]/20">
          {STAGE_LABELS[r.stage] ?? r.stage ?? '—'}
        </span>
        <span className="text-[10px] text-[#52525B]">{timeAgo(r.updated_at)}</span>
      </div>
      <div className="flex gap-1.5">
        <a
          href={isLive ? undefined : `tel:+55${r.telefone?.replace(/\D/g, '')}`}
          className={`flex-1 py-1.5 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 transition-all ${
            isLive
              ? 'opacity-35 cursor-not-allowed border-[#27272A] text-[#52525B]'
              : 'border-[#27272A] text-[#A1A1AA] hover:border-[#A78BFA]/40 hover:text-[#A78BFA] hover:bg-[#7C3AED]/06'
          }`}
        >
          📞 Ligar
        </a>
        <a
          href={`https://wa.me/55${r.telefone?.replace(/\D/g, '')}`}
          target="_blank" rel="noopener noreferrer"
          className="flex-1 py-1.5 rounded-lg border border-[#27272A] text-[#A1A1AA] hover:border-[#06B6D4]/40 hover:text-[#06B6D4] hover:bg-[#06B6D4]/06 text-[11px] font-medium flex items-center justify-center gap-1 transition-all"
        >
          💬 WhatsApp
        </a>
        <button
          onClick={() => onResolve(r)}
          className="flex-1 py-1.5 rounded-lg border border-[#27272A] text-[#A1A1AA] hover:border-[#10B981]/40 hover:text-[#10B981] hover:bg-[#10B981]/06 text-[11px] font-medium flex items-center justify-center gap-1 transition-all"
        >
          ✓ Resolver
        </button>
      </div>
    </div>
  )
}
