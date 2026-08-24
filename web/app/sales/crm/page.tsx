'use client'

import { useEffect, useState } from 'react'

type AnaCall = {
  id: string; call_sid: string; telefone: string; stage: string
  status: string; em_ligacao: boolean; nome: string | null
  created_at: string; updated_at: string
}

type CRMStage = { key: string; label: string; dot: string; calls: AnaCall[] }

function timeAgo(date: string) {
  const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

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

const COLUMNS: Omit<CRMStage, 'calls'>[] = [
  { key: 'novo',      label: 'Novo Contato', dot: 'bg-[#3B82F6]' },
  { key: 'contato',   label: 'Em Contato',   dot: 'bg-[#F59E0B]' },
  { key: 'proposta',  label: 'Proposta',      dot: 'bg-[#8B5CF6]' },
  { key: 'fechamento',label: 'Fechamento',    dot: 'bg-[#10B981]' },
]

export default function SalesCRM() {
  const [calls, setCalls] = useState<AnaCall[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sales/referidos')
      .then(r => r.json())
      .then(data => { setCalls(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  const stages: CRMStage[] = COLUMNS.map(s => ({
    ...s,
    calls: calls.filter(c => stageToColumn(c.stage) === s.key),
  }))

  if (!loading && calls.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm font-medium text-[#A1A1AA]">Nenhum lead no CRM ainda</p>
          <p className="text-xs text-[#52525B] mt-1">O admin atribui leads para você direto do Pipeline</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-3 h-full">
      {stages.map(col => (
        <div key={col.key} className="bg-[#111113] border border-[#27272A] rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#27272A] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <span className="text-[12px] font-semibold text-[#FAFAFA]">{col.label}</span>
            </div>
            <span className="text-[11px] font-bold bg-[#18181B] border border-[#27272A] rounded-full px-2 py-0.5 text-[#71717A]">
              {loading ? '…' : col.calls.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2 min-h-24">
            {loading
              ? [0, 1].map(i => <div key={i} className="bg-[#18181B] border border-[#27272A] rounded-[9px] h-16 animate-pulse" />)
              : col.calls.map(c => (
                <div key={c.id}
                  className="bg-[#18181B] border border-[#27272A] rounded-[9px] p-3 hover:border-[#3F3F46] transition-colors cursor-pointer">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-semibold text-[#FAFAFA] truncate">{c.nome ?? '(sem cadastro)'}</span>
                    {c.em_ligacao && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] flex-shrink-0 animate-pulse" title="Ao vivo" />
                    )}
                  </div>
                  <div className="text-[10px] text-[#71717A] font-mono mb-1.5">{c.telefone}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-[#52525B]">via ANA</span>
                    <span className="text-[9px] text-[#52525B]">{timeAgo(c.updated_at)}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
