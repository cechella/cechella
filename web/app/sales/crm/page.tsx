'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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

type CRMStage = {
  key: string
  label: string
  color: string
  calls: AnaCall[]
}

function timeAgo(date: string) {
  const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// Maps ana_calls.stage to CRM column
function stageToColumn(stage: string): string {
  const map: Record<string, string> = {
    apresentacao: 'novo', abertura: 'novo',
    conexao: 'contato', combinado: 'contato', di: 'contato',
    speech: 'proposta', fechamento: 'proposta',
    pagamento: 'fechamento', referidos: 'fechamento',
    encerramento: 'fechamento', encerrado: 'fechamento',
    validacao: 'fechamento', ganho: 'fechamento',
  }
  return map[stage] ?? 'novo'
}

const CRM_STAGES: Omit<CRMStage, 'calls'>[] = [
  { key: 'novo', label: 'Novo Contato', color: '#3B82F6' },
  { key: 'contato', label: 'Em Contato', color: '#F59E0B' },
  { key: 'proposta', label: 'Proposta', color: '#8B5CF6' },
  { key: 'fechamento', label: 'Fechamento', color: '#10B981' },
]

export default function SalesCRM() {
  const [calls, setCalls] = useState<AnaCall[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sales/referidos')
      .then(r => r.json())
      .then(data => {
        setCalls(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [])

  const stages: CRMStage[] = CRM_STAGES.map(s => ({
    ...s,
    calls: calls.filter(c => stageToColumn(c.stage) === s.key),
  }))

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
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
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  n.href === '/sales/crm' ? 'text-white bg-[#18181B]' : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
                }`}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold">CRM</h1>
          <p className="text-sm text-[#71717A] mt-1">
            {loading ? 'Carregando…' : `${calls.length} referido${calls.length !== 1 ? 's' : ''} — organizados por etapa`}
          </p>
        </div>

        {!loading && calls.length === 0 && (
          <div className="bg-[#111113] border border-[#27272A] rounded-xl p-12 text-center max-w-md mx-auto">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-sm font-medium text-[#A1A1AA]">Nenhum referido no CRM ainda</div>
            <div className="text-xs text-[#52525B] mt-1">Quando o admin atribuir leads para você, aparecerão aqui</div>
          </div>
        )}

        {!loading && calls.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {stages.map(stage => (
              <div key={stage.key}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold" style={{ color: stage.color }}>{stage.label}</span>
                  <span className="text-xs bg-[#18181B] border border-[#27272A] px-2 py-0.5 rounded-full text-[#71717A]">
                    {stage.calls.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-24">
                  {stage.calls.map(c => (
                    <div key={c.id} className="bg-[#111113] border border-[#27272A] rounded-xl p-3 hover:border-[#3F3F46] transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-white truncate">{c.nome ?? '(sem cadastro)'}</span>
                        {c.em_ligacao && (
                          <span className="w-2 h-2 rounded-full bg-[#10B981] flex-shrink-0 animate-pulse" title="Ao vivo" />
                        )}
                      </div>
                      <div className="text-xs text-[#71717A] font-mono">{c.telefone}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-[#52525B]">via ANA</span>
                        <span className="text-[10px] text-[#52525B]">{timeAgo(c.updated_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
