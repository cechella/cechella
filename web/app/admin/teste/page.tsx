'use client'

import { useState } from 'react'
import { TestTube2, Search, RotateCcw, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'

interface Lead {
  id: string
  nome: string | null
  telefone: string
  etapa_agente: number
  status?: string
  created_at?: string
}

export default function TestePage() {
  const [telefone, setTelefone] = useState('5548988416899')
  const [loading, setLoading] = useState<string | null>(null)
  const [resultado, setResultado] = useState<any>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function executar(action: string) {
    setLoading(action)
    setErro(null)
    setResultado(null)
    try {
      const res = await fetch('/api/admin/dev-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, telefone }),
      })
      const json = await res.json()
      if (json.error) setErro(json.error)
      else setResultado(json)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(null)
    }
  }

  const acoes = [
    {
      action: 'ver_estado_banco',
      label: 'Ver estado do banco',
      desc: 'Conta registros em todas as tabelas antes de apagar',
      icon: <Search className="w-4 h-4" />,
      cor: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
      semTelefone: true,
    },
    {
      action: 'listar_leads',
      label: 'Ver últimos 10 leads',
      desc: 'Lista os leads mais recentes do banco',
      icon: <Search className="w-4 h-4" />,
      cor: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
      semTelefone: true,
    },
    {
      action: 'resetar_lead',
      label: 'Resetar lead',
      desc: 'Zera completamente o lead: etapa, histórico, nome, dor, pagamento e método',
      icon: <RotateCcw className="w-4 h-4" />,
      cor: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400',
      semTelefone: false,
    },
    {
      action: 'deletar_lead',
      label: 'Deletar lead',
      desc: 'Remove o lead completamente do banco',
      icon: <Trash2 className="w-4 h-4" />,
      cor: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
      semTelefone: false,
    },
    {
      action: 'resetar_referidos',
      label: 'Resetar status referidos',
      desc: 'Volta os referidos desse telefone para "aguardando"',
      icon: <RefreshCw className="w-4 h-4" />,
      cor: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
      semTelefone: false,
    },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
          <TestTube2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Ferramentas de Teste</h1>
          <p className="text-sm text-[#71717A]">Operações de banco para ambiente de testes</p>
        </div>
      </div>

      {/* Telefone input */}
      <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 mb-6">
        <label className="block text-xs text-[#71717A] uppercase tracking-wider mb-2">Telefone do lead (para filtrar)</label>
        <input
          type="text"
          value={telefone}
          onChange={e => setTelefone(e.target.value)}
          placeholder="5548988416899"
          className="w-full bg-[#0A0A0B] border border-[#2C2C2E] rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-[#7B3FE4] transition-colors"
        />
        <p className="text-xs text-[#52525B] mt-2">Busca por qualquer formato que contenha os últimos 9 dígitos</p>
      </div>

      {/* Ações */}
      <div className="grid grid-cols-1 gap-3 mb-6">
        {acoes.map((a) => (
          <button
            key={a.action}
            onClick={() => executar(a.action)}
            disabled={!!loading}
            className={`flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-r ${a.cor} hover:opacity-90 transition-all text-left disabled:opacity-50`}
          >
            <div className="flex-shrink-0">{a.icon}</div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{a.label}</p>
              <p className="text-xs opacity-70">{a.desc}</p>
            </div>
            {loading === a.action && (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
          </button>
        ))}
      </div>

      {/* Ações nucleares — apagar tudo */}
      <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-5 mb-6">
        <p className="text-xs text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> Ações nucleares — apaga TUDO
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => executar('limpar_todos_leads')}
            disabled={!!loading}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:opacity-90 transition-all disabled:opacity-50 text-sm font-semibold"
          >
            <Trash2 className="w-4 h-4" />
            {loading === 'limpar_todos_leads' ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Apagar todos os leads'}
          </button>
          <button
            onClick={() => executar('limpar_todos_referidos')}
            disabled={!!loading}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:opacity-90 transition-all disabled:opacity-50 text-sm font-semibold"
          >
            <Trash2 className="w-4 h-4" />
            {loading === 'limpar_todos_referidos' ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Apagar todos os referidos'}
          </button>
          <button
            onClick={() => executar('limpar_memoria_ana')}
            disabled={!!loading}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:opacity-90 transition-all disabled:opacity-50 text-sm font-semibold"
          >
            <Trash2 className="w-4 h-4" />
            {loading === 'limpar_memoria_ana' ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Apagar memória da Ana'}
          </button>
          <button
            onClick={() => executar('limpar_pagamentos')}
            disabled={!!loading}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:opacity-90 transition-all disabled:opacity-50 text-sm font-semibold"
          >
            <Trash2 className="w-4 h-4" />
            {loading === 'limpar_pagamentos' ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Apagar pagamentos'}
          </button>
        </div>
        <div className="mt-3">
          <button
            onClick={() => executar('reset_total')}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-red-600/50 bg-red-600/20 text-red-300 hover:opacity-90 transition-all disabled:opacity-50 text-sm font-bold"
          >
            <AlertTriangle className="w-4 h-4" />
            {loading === 'reset_total' ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : '⚠️ RESET TOTAL — Zerar banco inteiro'}
          </button>
        </div>
      </div>

      {/* Resultado */}
      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          <strong>Erro:</strong> {erro}
        </div>
      )}

      {resultado && (
        <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#71717A] uppercase tracking-wider">Resultado</p>
            {resultado.rows !== undefined && (
              <span className="text-xs bg-[#7B3FE4]/20 text-[#A78BFA] px-2 py-1 rounded-full">
                {resultado.rows} {resultado.rows === 1 ? 'registro' : 'registros'} afetados
              </span>
            )}
            {resultado.total !== undefined && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                {resultado.total} registros no banco
              </span>
            )}
          </div>

          {/* Estado do banco — tabela de contagens */}
          {resultado.contagens && (
            <div className="space-y-1">
              {Object.entries(resultado.contagens as Record<string, number>).map(([tabela, count]) => (
                <div key={tabela} className="flex items-center justify-between bg-[#0A0A0B] rounded-xl px-4 py-2.5">
                  <span className="text-[#A1A1AA] text-sm font-mono">{tabela}</span>
                  <span className={`text-sm font-bold tabular-nums ${count > 0 ? 'text-yellow-400' : 'text-[#52525B]'}`}>
                    {count} {count === 1 ? 'registro' : 'registros'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Detalhes do reset total */}
          {resultado.detalhes && (
            <div className="space-y-1">
              {Object.entries(resultado.detalhes as Record<string, number>).map(([tabela, count]) => (
                <div key={tabela} className="flex items-center justify-between bg-[#0A0A0B] rounded-xl px-4 py-2.5">
                  <span className="text-[#A1A1AA] text-sm font-mono">{tabela}</span>
                  <span className={`text-sm font-bold tabular-nums ${count > 0 ? 'text-red-400' : 'text-[#52525B]'}`}>
                    {count} apagados
                  </span>
                </div>
              ))}
            </div>
          )}

          {resultado.data && resultado.data.length > 0 ? (
            <div className="space-y-2 mt-2">
              {resultado.data.map((lead: Lead, i: number) => (
                <div key={i} className="bg-[#0A0A0B] rounded-xl p-3 font-mono text-xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-[#71717A]">{lead.id?.slice(0, 8)}…</span>
                    <span className="text-white font-bold">{lead.nome || <span className="text-[#52525B]">null</span>}</span>
                    <span className="text-[#A1A1AA]">{lead.telefone}</span>
                    {lead.etapa_agente !== undefined && (
                      <span className="bg-[#7B3FE4]/20 text-[#A78BFA] px-2 py-0.5 rounded">etapa {lead.etapa_agente}</span>
                    )}
                    {lead.status !== undefined && (
                      <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded">{(lead as any).status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : !resultado.contagens && !resultado.detalhes && (
            <p className="text-[#52525B] text-sm">Nenhum registro encontrado / afetado.</p>
          )}
        </div>
      )}
    </div>
  )
}
