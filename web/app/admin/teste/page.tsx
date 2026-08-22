'use client'

import { useState } from 'react'
import { TestTube2, Search, RotateCcw, Trash2, RefreshCw, AlertTriangle, PhoneOff, Radio, Users, CheckSquare, Square } from 'lucide-react'

interface Lead {
  id: string
  nome: string | null
  telefone: string
  etapa_agente: number
  status_pagamento: string | null
  metodo_pagamento: string | null
  created_at?: string
  referidos_count?: number
}

export default function TestePage() {
  const [telefone, setTelefone] = useState('5548988416899')
  const [loading, setLoading] = useState<string | null>(null)
  const [resultado, setResultado] = useState<any>(null)
  const [erro, setErro] = useState<string | null>(null)

  // lead selector state
  const [leads, setLeads] = useState<Lead[]>([])
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [deletandoSelecionados, setDeletandoSelecionados] = useState(false)

  // referido selector state
  type Referido = { id: string; nome: string | null; telefone: string; status: string; indicado_por_nome: string | null; created_at?: string }
  const [referidos, setReferidos] = useState<Referido[]>([])
  const [selecionadosRef, setSelecionadosRef] = useState<Set<string>>(new Set())
  const [loadingRef, setLoadingRef] = useState(false)
  const [deletandoRef, setDeletandoRef] = useState(false)

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

  async function carregarLeads() {
    setLoadingLeads(true)
    setErro(null)
    try {
      const res = await fetch('/api/admin/dev-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listar_todos_leads' }),
      })
      const json = await res.json()
      if (json.error) setErro(json.error)
      else { setLeads(json.data || []); setSelecionados(new Set()) }
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoadingLeads(false)
    }
  }

  async function deletarSelecionados() {
    if (selecionados.size === 0) return
    if (!confirm(`Apagar ${selecionados.size} lead(s) e todos os seus registros? Esta ação é irreversível.`)) return
    setDeletandoSelecionados(true)
    setErro(null)
    try {
      const res = await fetch('/api/admin/dev-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deletar_leads_selecionados', telefones: Array.from(selecionados) }),
      })
      const json = await res.json()
      if (json.error) setErro(json.error)
      else {
        setResultado({ ...json, msg: `${json.apagados} lead(s) apagados com todos os registros` })
        // reload list
        await carregarLeads()
      }
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setDeletandoSelecionados(false)
    }
  }

  function toggleLead(telefone: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(telefone)) next.delete(telefone)
      else next.add(telefone)
      return next
    })
  }

  function toggleTodos() {
    if (selecionados.size === leads.length) setSelecionados(new Set())
    else setSelecionados(new Set(leads.map(l => l.telefone)))
  }

  async function carregarReferidos() {
    setLoadingRef(true)
    setErro(null)
    try {
      const res = await fetch('/api/admin/dev-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listar_todos_referidos' }),
      })
      const json = await res.json()
      if (json.error) setErro(json.error)
      else { setReferidos(json.data || []); setSelecionadosRef(new Set()) }
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoadingRef(false)
    }
  }

  async function deletarReferidosSelecionados() {
    if (selecionadosRef.size === 0) return
    if (!confirm(`Apagar ${selecionadosRef.size} referido(s)? Esta ação é irreversível.`)) return
    setDeletandoRef(true)
    setErro(null)
    try {
      const res = await fetch('/api/admin/dev-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deletar_referidos_selecionados', ids: Array.from(selecionadosRef) }),
      })
      const json = await res.json()
      if (json.error) setErro(json.error)
      else {
        setResultado({ msg: `${json.apagados} referido(s) apagados` })
        await carregarReferidos()
      }
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setDeletandoRef(false)
    }
  }

  function toggleRef(id: string) {
    setSelecionadosRef(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleTodosRef() {
    if (selecionadosRef.size === referidos.length) setSelecionadosRef(new Set())
    else setSelecionadosRef(new Set(referidos.map(r => r.id)))
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
      action: 'resetar_lead',
      label: 'Resetar lead',
      desc: 'Zera completamente o lead: etapa, histórico, nome, dor, pagamento e método',
      icon: <RotateCcw className="w-4 h-4" />,
      cor: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400',
      semTelefone: false,
    },
    {
      action: 'deletar_lead',
      label: 'Deletar lead (por telefone)',
      desc: 'Remove o lead completamente do banco pelo telefone acima',
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
    {
      action: 'zerar_historico_voz',
      label: 'Zerar histórico de voz',
      desc: 'Apaga registros de historico_voz desse telefone (para novo teste PTL)',
      icon: <Radio className="w-4 h-4" />,
      cor: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400',
      semTelefone: false,
    },
    {
      action: 'resetar_em_ligacao',
      label: 'Resetar flag em_ligacao',
      desc: 'Força em_ligacao = false — corrige trava se ligação caiu sem cleanup',
      icon: <PhoneOff className="w-4 h-4" />,
      cor: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400',
      semTelefone: false,
    },
  ]

  const todosMarc = leads.length > 0 && selecionados.size === leads.length
  const algumMarc = selecionados.size > 0 && selecionados.size < leads.length

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

      {/* ── SELETOR DE LEADS ── */}
      <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#7B3FE4]" />
            <p className="text-sm font-semibold text-white">Selecionar leads para apagar</p>
          </div>
          <button
            onClick={carregarLeads}
            disabled={loadingLeads}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#7B3FE4]/20 text-[#A78BFA] text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loadingLeads
              ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            {leads.length > 0 ? 'Recarregar' : 'Carregar leads'}
          </button>
        </div>

        {leads.length > 0 && (
          <>
            {/* header row */}
            <div className="flex items-center gap-3 px-3 py-2 mb-1">
              <button onClick={toggleTodos} className="flex-shrink-0 text-[#7B3FE4]">
                {todosMarc ? <CheckSquare className="w-4 h-4" /> : algumMarc ? <CheckSquare className="w-4 h-4 opacity-50" /> : <Square className="w-4 h-4" />}
              </button>
              <span className="text-xs text-[#71717A] uppercase tracking-wider flex-1">
                {selecionados.size > 0 ? `${selecionados.size} de ${leads.length} selecionados` : `${leads.length} leads`}
              </span>
              {selecionados.size > 0 && (
                <button
                  onClick={() => setSelecionados(new Set())}
                  className="text-xs text-[#71717A] hover:text-white transition-colors"
                >
                  Desmarcar todos
                </button>
              )}
            </div>

            {/* lead list */}
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {leads.map((lead) => {
                const sel = selecionados.has(lead.telefone)
                return (
                  <div
                    key={lead.id}
                    onClick={() => toggleLead(lead.telefone)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${sel ? 'bg-red-500/10 border border-red-500/30' : 'bg-[#0A0A0B] border border-transparent hover:border-[#2C2C2E]'}`}
                  >
                    <div className={`flex-shrink-0 ${sel ? 'text-red-400' : 'text-[#52525B]'}`}>
                      {sel ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white truncate">{lead.nome || <span className="text-[#52525B] font-normal italic">sem nome</span>}</span>
                        {lead.status_pagamento && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                            {lead.status_pagamento}
                          </span>
                        )}
                        {(lead.referidos_count ?? 0) > 0 && (
                          <span className="text-xs bg-[#7B3FE4]/20 text-[#A78BFA] px-1.5 py-0.5 rounded">
                            {lead.referidos_count} referidos
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-[#71717A] font-mono">{lead.telefone}</span>
                        <span className="text-xs text-[#52525B]">etapa {lead.etapa_agente}</span>
                        {lead.created_at && (
                          <span className="text-xs text-[#52525B]">
                            {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* delete button */}
            <div className="mt-3 pt-3 border-t border-[#1C1C1E]">
              <button
                onClick={deletarSelecionados}
                disabled={selecionados.size === 0 || deletandoSelecionados}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-red-500/40 bg-red-500/15 text-red-400 hover:opacity-90 transition-all disabled:opacity-30 text-sm font-bold"
              >
                {deletandoSelecionados
                  ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
                {selecionados.size === 0
                  ? 'Selecione leads para apagar'
                  : `Apagar ${selecionados.size} lead${selecionados.size > 1 ? 's' : ''} selecionado${selecionados.size > 1 ? 's' : ''} + todos os registros`}
              </button>
            </div>
          </>
        )}

        {leads.length === 0 && !loadingLeads && (
          <p className="text-xs text-[#52525B] text-center py-4">Clique em "Carregar leads" para ver todos os leads do banco</p>
        )}
      </div>

      {/* ── SELETOR DE REFERIDOS ── */}
      <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#A78BFA]" />
            <p className="text-sm font-semibold text-white">Selecionar referidos para apagar</p>
          </div>
          <button
            onClick={carregarReferidos}
            disabled={loadingRef}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#A78BFA]/20 text-[#A78BFA] text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loadingRef
              ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            {referidos.length > 0 ? 'Recarregar' : 'Carregar referidos'}
          </button>
        </div>

        {referidos.length > 0 && (
          <>
            <div className="flex items-center gap-3 px-3 py-2 mb-1">
              <button onClick={toggleTodosRef} className="flex-shrink-0 text-[#A78BFA]">
                {selecionadosRef.size === referidos.length ? <CheckSquare className="w-4 h-4" /> : selecionadosRef.size > 0 ? <CheckSquare className="w-4 h-4 opacity-50" /> : <Square className="w-4 h-4" />}
              </button>
              <span className="text-xs text-[#71717A] uppercase tracking-wider flex-1">
                {selecionadosRef.size > 0 ? `${selecionadosRef.size} de ${referidos.length} selecionados` : `${referidos.length} referidos`}
              </span>
              {selecionadosRef.size > 0 && (
                <button onClick={() => setSelecionadosRef(new Set())} className="text-xs text-[#71717A] hover:text-white transition-colors">
                  Desmarcar todos
                </button>
              )}
            </div>

            <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
              {referidos.map((ref) => {
                const sel = selecionadosRef.has(ref.id)
                const statusColor = ref.status === 'vendido' ? 'bg-green-500/20 text-green-400' : ref.status === 'aguardando' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-[#2C2C2E] text-[#71717A]'
                return (
                  <div
                    key={ref.id}
                    onClick={() => toggleRef(ref.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${sel ? 'bg-red-500/10 border border-red-500/30' : 'bg-[#0A0A0B] border border-transparent hover:border-[#2C2C2E]'}`}
                  >
                    <div className={`flex-shrink-0 ${sel ? 'text-red-400' : 'text-[#52525B]'}`}>
                      {sel ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white truncate">{ref.nome || <span className="text-[#52525B] font-normal italic">sem nome</span>}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor}`}>{ref.status}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-[#71717A] font-mono">{ref.telefone}</span>
                        {ref.indicado_por_nome && <span className="text-xs text-[#52525B]">indicado por {ref.indicado_por_nome}</span>}
                        {ref.created_at && <span className="text-xs text-[#52525B]">{new Date(ref.created_at).toLocaleDateString('pt-BR')}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-[#1C1C1E]">
              <button
                onClick={deletarReferidosSelecionados}
                disabled={selecionadosRef.size === 0 || deletandoRef}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-red-500/40 bg-red-500/15 text-red-400 hover:opacity-90 transition-all disabled:opacity-30 text-sm font-bold"
              >
                {deletandoRef
                  ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
                {selecionadosRef.size === 0
                  ? 'Selecione referidos para apagar'
                  : `Apagar ${selecionadosRef.size} referido${selecionadosRef.size > 1 ? 's' : ''} selecionado${selecionadosRef.size > 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}

        {referidos.length === 0 && !loadingRef && (
          <p className="text-xs text-[#52525B] text-center py-4">Clique em "Carregar referidos" para ver todos os referidos do banco</p>
        )}
      </div>

      {/* Telefone input (para ações individuais) */}
      <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 mb-6">
        <label className="block text-xs text-[#71717A] uppercase tracking-wider mb-2">Telefone do lead (para ações abaixo)</label>
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
            onClick={() => executar('limpar_ana_master')}
            disabled={!!loading}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:opacity-90 transition-all disabled:opacity-50 text-sm font-semibold"
          >
            <Trash2 className="w-4 h-4" />
            {loading === 'limpar_ana_master' ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Apagar ANA MASTER (calls + memories)'}
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

          {resultado.msg && (
            <p className="text-sm text-green-400 mb-3">{resultado.msg}</p>
          )}

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
                  </div>
                </div>
              ))}
            </div>
          ) : !resultado.contagens && !resultado.detalhes && !resultado.msg && (
            <p className="text-[#52525B] text-sm">Nenhum registro encontrado / afetado.</p>
          )}
        </div>
      )}
    </div>
  )
}
