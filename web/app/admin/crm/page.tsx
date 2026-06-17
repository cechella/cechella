'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import {
  MessageSquare, Phone, Filter, Search, RefreshCw,
  Flame, Minus, Snowflake, ChevronDown, X, Plus, Eye
} from 'lucide-react'

type Etapa = 'instagram' | 'site' | 'whatsapp' | 'apresentacao' | 'conexao' | 'di' | 'speech' | 'fechamento' | 'ganho' | 'perdido'
type Temperatura = 'quente' | 'morno' | 'frio'

interface Lead {
  id: string
  nome: string
  email: string
  telefone: string | null
  whatsapp: string | null
  origem: string
  etapa: Etapa
  temperatura: Temperatura
  ultimo_contato: string | null
  notas: string | null
  created_at: string
}

const etapaLabels: Record<Etapa, string> = {
  instagram: 'Instagram',
  site: 'Site',
  whatsapp: 'WhatsApp',
  apresentacao: 'Apresentação',
  conexao: 'Conexão',
  di: 'D.I.',
  speech: 'Speech',
  fechamento: 'Fechamento',
  ganho: 'Ganho',
  perdido: 'Perdido',
}

const etapaColors: Record<Etapa, string> = {
  instagram: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  site: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  whatsapp: 'bg-green-500/20 text-green-400 border-green-500/30',
  apresentacao: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  conexao: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  di: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  speech: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  fechamento: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  ganho: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  perdido: 'bg-red-500/20 text-red-400 border-red-500/30',
}

function TemperaturaIcon({ t }: { t: Temperatura }) {
  if (t === 'quente') return <Flame className="w-4 h-4 text-red-400" />
  if (t === 'morno') return <Minus className="w-4 h-4 text-yellow-400" />
  return <Snowflake className="w-4 h-4 text-blue-400" />
}

function tempoRelativo(data: string | null) {
  if (!data) return '—'
  const diff = Date.now() - new Date(data).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d}d`
}

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState<Etapa | 'todas'>('todas')
  const [filtroTemp, setFiltroTemp] = useState<Temperatura | 'todas'>('todas')
  const [showModal, setShowModal] = useState(false)
  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null)
  const [showNovoLead, setShowNovoLead] = useState(false)
  const [novoLead, setNovoLead] = useState({ nome: '', email: '', telefone: '', whatsapp: '', origem: 'manual', etapa: 'site' as Etapa, temperatura: 'frio' as Temperatura })
  const [salvando, setSalvando] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const carregarLeads = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setLeads(data as Lead[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregarLeads() }, [carregarLeads])

  const leadsFiltrados = leads.filter(l => {
    const matchSearch = l.nome.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      (l.telefone || '').includes(search)
    const matchEtapa = filtroEtapa === 'todas' || l.etapa === filtroEtapa
    const matchTemp = filtroTemp === 'todas' || l.temperatura === filtroTemp
    return matchSearch && matchEtapa && matchTemp
  })

  const atualizarEtapa = async (id: string, etapa: Etapa) => {
    await supabase.from('leads').update({ etapa, updated_at: new Date().toISOString() }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, etapa } : l))
  }

  const atualizarTemperatura = async (id: string, temperatura: Temperatura) => {
    await supabase.from('leads').update({ temperatura, updated_at: new Date().toISOString() }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, temperatura } : l))
  }

  const criarLead = async () => {
    if (!novoLead.nome || !novoLead.email) return
    setSalvando(true)
    const { error } = await supabase.from('leads').insert({
      ...novoLead,
      ultimo_contato: new Date().toISOString(),
    })
    if (!error) {
      setShowNovoLead(false)
      setNovoLead({ nome: '', email: '', telefone: '', whatsapp: '', origem: 'manual', etapa: 'site', temperatura: 'frio' })
      carregarLeads()
    }
    setSalvando(false)
  }

  // Métricas do funil
  const funil = (['instagram', 'site', 'whatsapp', 'apresentacao', 'conexao', 'di', 'speech', 'fechamento', 'ganho'] as Etapa[]).map(etapa => ({
    etapa,
    label: etapaLabels[etapa],
    count: leads.filter(l => l.etapa === etapa).length,
  }))

  const totalAtivos = leads.filter(l => l.etapa !== 'perdido').length

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="CRM" subtitle="Gestão de Leads" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Funil resumido */}
          <div className="grid grid-cols-9 gap-2">
            {funil.map((f, i) => (
              <button
                key={f.etapa}
                onClick={() => setFiltroEtapa(f.etapa === filtroEtapa ? 'todas' : f.etapa)}
                className={`rounded-xl p-3 border text-center transition-all ${
                  filtroEtapa === f.etapa
                    ? 'border-[#7B3FE4] bg-[#7B3FE4]/20'
                    : 'border-[#1C1C1E] bg-[#111113] hover:border-[#7B3FE4]/50'
                }`}
              >
                <p className="text-2xl font-bold text-white">{f.count}</p>
                <p className="text-[10px] text-[#71717A] mt-0.5 leading-tight">{f.label}</p>
                {i < funil.length - 1 && f.count > 0 && (
                  <p className="text-[10px] text-[#3B82F6] mt-1">
                    {funil[i + 1].count > 0 ? `${Math.round((funil[i + 1].count / f.count) * 100)}%` : ''}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Filtros e busca */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, email ou telefone..."
                className="w-full bg-[#111113] border border-[#1C1C1E] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#7B3FE4]"
              />
            </div>

            <select
              value={filtroTemp}
              onChange={e => setFiltroTemp(e.target.value as Temperatura | 'todas')}
              className="bg-[#111113] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]"
            >
              <option value="todas">🌡️ Temperatura</option>
              <option value="quente">🔥 Quente</option>
              <option value="morno">🟡 Morno</option>
              <option value="frio">❄️ Frio</option>
            </select>

            <button
              onClick={carregarLeads}
              className="p-2.5 bg-[#111113] border border-[#1C1C1E] rounded-xl text-[#71717A] hover:text-white hover:border-[#7B3FE4] transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowNovoLead(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#7B3FE4] hover:bg-[#6B2FD4] rounded-xl text-sm font-medium text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Lead
            </button>
          </div>

          {/* Tabela */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1C1C1E]">
              <h2 className="text-sm font-semibold text-white">
                {leadsFiltrados.length} leads
                {filtroEtapa !== 'todas' && ` em ${etapaLabels[filtroEtapa]}`}
              </h2>
              <span className="text-xs text-[#71717A]">{totalAtivos} ativos</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : leadsFiltrados.length === 0 ? (
              <div className="text-center py-16 text-[#71717A]">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum lead encontrado</p>
                <p className="text-xs mt-1">
                  {leads.length === 0
                    ? 'Execute o SQL do arquivo supabase_crm_schema.sql no Supabase para começar'
                    : 'Tente ajustar os filtros'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1C1C1E]">
                      <th className="text-left text-xs text-[#71717A] font-medium px-6 py-3">Lead</th>
                      <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Etapa</th>
                      <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Temp.</th>
                      <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Último contato</th>
                      <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Origem</th>
                      <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadsFiltrados.map(lead => (
                      <tr key={lead.id} className="border-b border-[#1C1C1E] hover:bg-[#18181A] transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-white">{lead.nome}</p>
                          <p className="text-xs text-[#71717A]">{lead.email}</p>
                          {(lead.telefone || lead.whatsapp) && (
                            <p className="text-xs text-[#71717A]">{lead.whatsapp || lead.telefone}</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={lead.etapa}
                            onChange={e => atualizarEtapa(lead.id, e.target.value as Etapa)}
                            className={`text-xs px-2 py-1 rounded-lg border bg-transparent cursor-pointer focus:outline-none ${etapaColors[lead.etapa]}`}
                          >
                            {(Object.keys(etapaLabels) as Etapa[]).map(e => (
                              <option key={e} value={e} className="bg-[#111113] text-white">{etapaLabels[e]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={lead.temperatura}
                            onChange={e => atualizarTemperatura(lead.id, e.target.value as Temperatura)}
                            className="bg-transparent text-xs focus:outline-none cursor-pointer"
                          >
                            <option value="quente" className="bg-[#111113]">🔥 Quente</option>
                            <option value="morno" className="bg-[#111113]">🟡 Morno</option>
                            <option value="frio" className="bg-[#111113]">❄️ Frio</option>
                          </select>
                        </td>
                        <td className="px-4 py-4 text-xs text-[#71717A]">
                          {tempoRelativo(lead.ultimo_contato || lead.created_at)}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs text-[#71717A] bg-[#1C1C1E] px-2 py-1 rounded-lg">
                            {lead.origem}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setLeadSelecionado(lead); setShowModal(true) }}
                              className="p-1.5 text-[#71717A] hover:text-white hover:bg-[#1C1C1E] rounded-lg transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {(lead.whatsapp || lead.telefone) && (
                              <a
                                href={`https://wa.me/55${(lead.whatsapp || lead.telefone || '').replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-[#71717A] hover:text-green-400 hover:bg-[#1C1C1E] rounded-lg transition-colors"
                                title="Abrir WhatsApp"
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal detalhe lead */}
      {showModal && leadSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{leadSelecionado.nome}</h3>
              <button onClick={() => setShowModal(false)} className="text-[#71717A] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#71717A]">Email</span>
                <span className="text-white">{leadSelecionado.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717A]">Telefone</span>
                <span className="text-white">{leadSelecionado.telefone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717A]">WhatsApp</span>
                <span className="text-white">{leadSelecionado.whatsapp || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717A]">Etapa</span>
                <span className={`px-2 py-0.5 rounded-lg text-xs border ${etapaColors[leadSelecionado.etapa]}`}>
                  {etapaLabels[leadSelecionado.etapa]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717A]">Temperatura</span>
                <div className="flex items-center gap-1">
                  <TemperaturaIcon t={leadSelecionado.temperatura} />
                  <span className="text-white capitalize">{leadSelecionado.temperatura}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717A]">Origem</span>
                <span className="text-white">{leadSelecionado.origem}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717A]">Cadastrado</span>
                <span className="text-white">{new Date(leadSelecionado.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              {leadSelecionado.notas && (
                <div>
                  <span className="text-[#71717A]">Notas</span>
                  <p className="mt-1 text-white bg-[#18181A] rounded-lg p-3 text-xs">{leadSelecionado.notas}</p>
                </div>
              )}
            </div>
            {(leadSelecionado.whatsapp || leadSelecionado.telefone) && (
              <a
                href={`https://wa.me/55${(leadSelecionado.whatsapp || leadSelecionado.telefone || '').replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                <Phone className="w-4 h-4" />
                Abrir no WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      {/* Modal novo lead */}
      {showNovoLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Novo Lead</h3>
              <button onClick={() => setShowNovoLead(false)} className="text-[#71717A] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Nome *', key: 'nome', type: 'text' },
                { label: 'Email *', key: 'email', type: 'email' },
                { label: 'Telefone', key: 'telefone', type: 'tel' },
                { label: 'WhatsApp', key: 'whatsapp', type: 'tel' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-[#71717A] mb-1 block">{f.label}</label>
                  <input
                    type={f.type}
                    value={novoLead[f.key as keyof typeof novoLead]}
                    onChange={e => setNovoLead(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#71717A] mb-1 block">Etapa</label>
                  <select
                    value={novoLead.etapa}
                    onChange={e => setNovoLead(prev => ({ ...prev, etapa: e.target.value as Etapa }))}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]"
                  >
                    {(Object.keys(etapaLabels) as Etapa[]).map(e => (
                      <option key={e} value={e}>{etapaLabels[e]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#71717A] mb-1 block">Temperatura</label>
                  <select
                    value={novoLead.temperatura}
                    onChange={e => setNovoLead(prev => ({ ...prev, temperatura: e.target.value as Temperatura }))}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]"
                  >
                    <option value="quente">🔥 Quente</option>
                    <option value="morno">🟡 Morno</option>
                    <option value="frio">❄️ Frio</option>
                  </select>
                </div>
              </div>
            </div>
            <button
              onClick={criarLead}
              disabled={salvando || !novoLead.nome || !novoLead.email}
              className="w-full bg-[#7B3FE4] hover:bg-[#6B2FD4] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {salvando ? 'Salvando...' : 'Criar Lead'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
