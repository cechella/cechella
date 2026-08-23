'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

let sb: ReturnType<typeof createBrowserClient> | null = null
function getSupabase() {
  if (!sb) sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return sb
}

type Comercial = {
  id: string
  nome: string
  email: string
  cargo?: string
  telefone?: string
}

type AnaCall = {
  id: string
  call_sid: string
  telefone: string
  stage: string
  status: string
  em_ligacao: boolean
  nome: string | null
  created_at: string
  updated_at: string
}

const STAGE_LABELS: Record<string, string> = {
  apresentacao: 'Apresentação', abertura: 'Apresentação',
  conexao: 'Conexão',
  combinado: 'D.I.', di: 'D.I.',
  speech: 'Speech',
  fechamento: 'Fechamento',
  pagamento: 'Pagamento',
  referidos: 'Referidos',
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

  async function logout() {
    await getSupabase().auth.signOut()
    router.replace('/sales/login')
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pendentes = referidos.filter(r => !r.em_ligacao)
  const aoVivo = referidos.filter(r => r.em_ligacao)
  const firstName = me?.nome?.split(' ')[0] ?? 'Consultor'

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Topbar */}
      <header className="bg-[#111113] border-b border-[#27272A] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
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
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#A1A1AA] hover:text-white hover:bg-[#18181B] transition-colors">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#71717A]">{me?.nome ?? '…'}</span>
          <button onClick={logout} className="text-xs text-[#52525B] hover:text-white transition-colors">Sair</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-xl font-bold">Olá, {firstName} 👋</h1>
          <p className="text-sm text-[#71717A] mt-1">
            {loading ? 'Carregando seus referidos…' :
              referidos.length === 0 ? 'Nenhum referido atribuído ainda. O admin te atribui leads direto do pipeline da ANA.' :
              `${referidos.length} referido${referidos.length !== 1 ? 's' : ''} atribuído${referidos.length !== 1 ? 's' : ''} — entre em contato`}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#111113] border border-[#27272A] rounded-xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#71717A] mb-2">Aguardando</div>
            <div className="text-3xl font-bold text-[#F59E0B]">{loading ? '…' : pendentes.length}</div>
            <div className="text-xs text-[#52525B] mt-1">precisam de contato</div>
          </div>
          <div className="bg-[#111113] border border-[#27272A] rounded-xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#71717A] mb-2">Ao Vivo</div>
            <div className="text-3xl font-bold text-[#10B981]">{loading ? '…' : aoVivo.length}</div>
            <div className="text-xs text-[#52525B] mt-1">em ligação agora</div>
          </div>
          <div className="bg-[#111113] border border-[#27272A] rounded-xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#71717A] mb-2">Total</div>
            <div className="text-3xl font-bold">{loading ? '…' : referidos.length}</div>
            <div className="text-xs text-[#52525B] mt-1">atribuídos a você</div>
          </div>
        </div>

        {/* Referidos list */}
        {!loading && referidos.length === 0 && (
          <div className="bg-[#111113] border border-[#27272A] rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-sm font-medium text-[#A1A1AA]">Nenhum referido ainda</div>
            <div className="text-xs text-[#52525B] mt-1">O admin atribui leads para você direto do Pipeline ao Vivo</div>
          </div>
        )}

        {!loading && referidos.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#A1A1AA]">Seus Referidos</h2>
            {referidos.map(r => (
              <div key={r.id}
                className={`bg-[#111113] border rounded-xl p-4 ${r.em_ligacao ? 'border-[#10B981]/40' : 'border-[#27272A]'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: r.em_ligacao ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.15)',
                             color: r.em_ligacao ? '#10B981' : '#8B5CF6' }}>
                    {initials(r.nome, r.telefone)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{r.nome ?? '(sem cadastro)'}</span>
                      {r.em_ligacao
                        ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981]">● AO VIVO</span>
                        : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#F59E0B]">⏳ PENDENTE</span>
                      }
                      <span className="text-xs text-[#52525B]">{timeAgo(r.updated_at)}</span>
                    </div>
                    <div className="text-xs text-[#A1A1AA] font-mono mt-0.5">{r.telefone}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-[#7C3AED]/15 text-[#8B5CF6] font-medium">
                        {STAGE_LABELS[r.stage] ?? r.stage ?? '—'}
                      </span>
                      {!r.em_ligacao && (
                        <span className="text-xs text-[#F59E0B]">
                          Ligação encerrada — entre em contato agora
                        </span>
                      )}
                      {r.em_ligacao && (
                        <span className="text-xs text-[#71717A]">
                          ANA ainda em ligação — prepare-se
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={`tel:+55${r.telefone?.replace(/\D/g, '')}`}
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                        r.em_ligacao ? 'opacity-40 cursor-not-allowed pointer-events-none border-[#27272A] text-[#52525B]'
                          : 'border-[#27272A] text-[#A1A1AA] hover:border-[#10B981] hover:text-[#10B981] hover:bg-[#10B981]/10'
                      }`}
                      title="Ligar">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.69A16 16 0 0 0 13 13.73l1.08-.85a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 15.1z"/>
                      </svg>
                    </a>
                    <a href={`https://wa.me/55${r.telefone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg border border-[#27272A] text-[#A1A1AA] hover:border-[#10B981] hover:text-[#10B981] hover:bg-[#10B981]/10 flex items-center justify-center transition-colors"
                      title="WhatsApp">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.122 1.528 5.85L.057 23.158a.5.5 0 0 0 .61.61l5.308-1.47A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.935 0-3.74-.523-5.29-1.434l-.378-.214-3.92 1.085 1.085-3.92-.214-.378A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                      </svg>
                    </a>
                    <button onClick={() => resolve(r)}
                      className="w-9 h-9 rounded-lg border border-[#27272A] text-[#A1A1AA] hover:border-[#8B5CF6] hover:text-[#8B5CF6] hover:bg-[#7C3AED]/10 flex items-center justify-center transition-colors"
                      title="Marcar como atendido">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Links rápidos */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'CRM', desc: 'Organize seus leads', href: '/sales/crm', color: '#3B82F6' },
            { label: 'Ranking', desc: 'Sua posição', href: '/sales/ranking', color: '#F59E0B' },
            { label: 'Treinamento', desc: 'Módulos e XP', href: '/sales/training', color: '#10B981' },
          ].map(l => (
            <Link key={l.href} href={l.href}
              className="bg-[#111113] border border-[#27272A] rounded-xl p-4 hover:border-[#3F3F46] transition-colors">
              <div className="text-sm font-semibold" style={{ color: l.color }}>{l.label}</div>
              <div className="text-xs text-[#52525B] mt-1">{l.desc}</div>
            </Link>
          ))}
        </div>
      </main>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111113] border border-[#10B981]/40 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-2xl">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
