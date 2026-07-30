'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import {
  BadgeCheck, Search, RefreshCw, AlertTriangle, Plus,
  ChevronDown, Edit2, Save, X, CheckCircle,
} from 'lucide-react'

type Plan = 'starter' | 'pro' | 'elite' | 'founder'
type SubStatus = 'ativo' | 'inadimplente' | 'cancelado' | 'trial'

interface MedicoAssinatura {
  id?: string
  medico_nome: string
  medico_email: string
  medico_whatsapp?: string
  plano: Plan
  status: SubStatus
  valor_anual: number
  royalty_pct: number
  data_inicio: string
  data_renovacao: string
  obs?: string
}

const PLAN_CONFIG: Record<Plan, { label: string; valor: number; royalty: number; color: string; bg: string }> = {
  starter: { label: 'Starter',  valor: 48000,  royalty: 15, color: 'text-[#A1A1AA]',       bg: 'bg-[#3F3F46]/20 border-[#3F3F46]/30' },
  pro:     { label: 'Pro',      valor: 120000, royalty: 7,  color: 'text-[#3B82F6]',       bg: 'bg-[#3B82F6]/15 border-[#3B82F6]/25' },
  elite:   { label: 'Elite',    valor: 220000, royalty: 5,  color: 'text-[#7B3FE4]',       bg: 'bg-[#7B3FE4]/15 border-[#7B3FE4]/25' },
  founder: { label: 'Founder',  valor: 350000, royalty: 0,  color: 'text-[#22C55E]',       bg: 'bg-[#22C55E]/12 border-[#22C55E]/20' },
}

const STATUS_STYLES: Record<SubStatus, string> = {
  ativo:        'bg-green-500/15 text-green-400 border-green-500/25',
  inadimplente: 'bg-red-500/15 text-red-400 border-red-500/25',
  cancelado:    'bg-[#3F3F46]/30 text-[#71717A] border-[#3F3F46]/30',
  trial:        'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
}

const BLANK: Omit<MedicoAssinatura, 'id'> = {
  medico_nome: '',
  medico_email: '',
  medico_whatsapp: '',
  plano: 'starter',
  status: 'ativo',
  valor_anual: PLAN_CONFIG.starter.valor,
  royalty_pct: PLAN_CONFIG.starter.royalty,
  data_inicio: new Date().toISOString().slice(0, 10),
  data_renovacao: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  obs: '',
}

const SQL_HINT = `-- Execute no Supabase Dashboard:
CREATE TABLE IF NOT EXISTS medico_assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_nome text NOT NULL,
  medico_email text NOT NULL,
  medico_whatsapp text DEFAULT '',
  plano text NOT NULL DEFAULT 'starter',
  status text NOT NULL DEFAULT 'ativo',
  valor_anual numeric NOT NULL DEFAULT 48000,
  royalty_pct numeric NOT NULL DEFAULT 15,
  data_inicio date NOT NULL,
  data_renovacao date NOT NULL,
  obs text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);`

export default function AdminAssinaturasPage() {
  const [subs, setSubs] = useState<MedicoAssinatura[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<SubStatus | 'todos'>('todos')
  const [filterPlano, setFilterPlano] = useState<Plan | 'todos'>('todos')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<MedicoAssinatura | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newData, setNewData] = useState<Omit<MedicoAssinatura, 'id'>>({ ...BLANK })
  const [saving, setSaving] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: e } = await supabase
        .from('medico_assinaturas')
        .select('*')
        .order('data_renovacao')
      if (e) throw e
      setSubs(data ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  // KPIs
  const mrr = subs.filter((s) => s.status === 'ativo').reduce((acc, s) => acc + (s.valor_anual / 12), 0)
  const arr = subs.filter((s) => s.status === 'ativo').reduce((acc, s) => acc + s.valor_anual, 0)
  const inadimplentes = subs.filter((s) => s.status === 'inadimplente').length
  const renovandoEm30 = subs.filter((s) => {
    const days = Math.ceil((new Date(s.data_renovacao).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 30 && s.status === 'ativo'
  }).length

  const filtered = subs.filter((s) => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.medico_nome.toLowerCase().includes(q) || s.medico_email.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'todos' || s.status === filterStatus
    const matchPlano = filterPlano === 'todos' || s.plano === filterPlano
    return matchSearch && matchStatus && matchPlano
  })

  async function handleSave(data: MedicoAssinatura) {
    setSaving(true)
    try {
      if (data.id) {
        const { error: e } = await supabase.from('medico_assinaturas').update({ ...data, updated_at: new Date().toISOString() }).eq('id', data.id)
        if (e) throw e
        setSubs((prev) => prev.map((s) => s.id === data.id ? data : s))
      } else {
        const { data: d, error: e } = await supabase.from('medico_assinaturas').insert(data).select().single()
        if (e) throw e
        setSubs((prev) => [...prev, d])
      }
      setEditingId(null)
      setEditData(null)
      setShowNew(false)
      setNewData({ ...BLANK })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta assinatura?')) return
    const { error: e } = await supabase.from('medico_assinaturas').delete().eq('id', id)
    if (e) { setError(e.message); return }
    setSubs((prev) => prev.filter((s) => s.id !== id))
  }

  function planAutoFill(plan: Plan, setter: (fn: (p: MedicoAssinatura) => MedicoAssinatura) => void) {
    setter((prev) => ({
      ...prev,
      plano: plan,
      valor_anual: PLAN_CONFIG[plan].valor,
      royalty_pct: PLAN_CONFIG[plan].royalty,
    }))
  }

  function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
  }
  function fmtBRL(n: number) {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  }
  function daysToRenewal(d: string) {
    return Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000)
  }

  const FormRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-[10px] font-semibold text-[#71717A] uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  )
  const inputCls = "w-full bg-[#0A0A0B] border border-[#1C1C1E] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7B3FE4] transition-colors"

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin', role: 'admin' }} title="Assinaturas — Médicos" />
        <main className="flex-1 overflow-y-auto px-6 py-6">

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'ARR', value: fmtBRL(arr), sub: 'receita anual recorrente', color: 'text-[#7B3FE4]' },
              { label: 'MRR', value: fmtBRL(mrr), sub: 'receita mensal recorrente', color: 'text-[#3B82F6]' },
              { label: 'Inadimplentes', value: inadimplentes, sub: 'aguardam pagamento', color: inadimplentes > 0 ? 'text-red-400' : 'text-[#71717A]' },
              { label: 'Renovando em 30d', value: renovandoEm30, sub: 'médicos a renovar', color: renovandoEm30 > 0 ? 'text-yellow-400' : 'text-[#71717A]' },
            ].map((k) => (
              <div key={k.label} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl px-5 py-4">
                <p className={`text-xl font-bold ${k.color} tabular-nums`}>{k.value}</p>
                <p className="text-xs font-semibold text-[#A1A1AA] mt-0.5">{k.label}</p>
                <p className="text-[10px] text-[#52525B] mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Plan summary pills */}
          <div className="flex gap-3 mb-6 flex-wrap">
            {(Object.entries(PLAN_CONFIG) as [Plan, typeof PLAN_CONFIG.starter][]).map(([key, cfg]) => {
              const count = subs.filter((s) => s.plano === key && s.status === 'ativo').length
              return (
                <div key={key} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}: {count} médico{count !== 1 ? 's' : ''}
                </div>
              )
            })}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar médico..."
                className="w-full bg-[#111113] border border-[#1C1C1E] rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
              />
            </div>
            <div className="flex gap-1">
              {(['todos', 'ativo', 'inadimplente', 'trial', 'cancelado'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all ${filterStatus === s ? 'bg-[#7B3FE4] text-white' : 'bg-[#111113] border border-[#1C1C1E] text-[#71717A] hover:text-white'}`}
                >
                  {s === 'todos' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="relative">
              <select value={filterPlano} onChange={(e) => setFilterPlano(e.target.value as Plan | 'todos')}
                className="appearance-none bg-[#111113] border border-[#1C1C1E] rounded-xl pl-3 pr-8 py-2.5 text-sm text-[#A1A1AA] focus:outline-none focus:border-[#7B3FE4] cursor-pointer">
                <option value="todos">Plano: Todos</option>
                {(Object.entries(PLAN_CONFIG) as [Plan, typeof PLAN_CONFIG.starter][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525B] pointer-events-none" />
            </div>
            <button onClick={load} className="p-2.5 bg-[#111113] border border-[#1C1C1E] rounded-xl text-[#71717A] hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="ml-auto flex items-center gap-2 bg-[#7B3FE4] hover:bg-[#6325C8] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Novo Médico
            </button>
          </div>

          {saved && (
            <div className="mb-4 flex items-center gap-2 text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              <CheckCircle className="w-4 h-4" /> Salvo com sucesso
            </div>
          )}
          {error && (
            <div className="mb-4 flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          {error?.includes('does not exist') && (
            <div className="mb-4 bg-[#111113] border border-amber-500/30 rounded-2xl p-4">
              <p className="text-xs font-semibold text-amber-400 mb-2">Execute este SQL no Supabase Dashboard:</p>
              <pre className="text-xs text-[#A1A1AA] bg-[#18181A] rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">{SQL_HINT}</pre>
            </div>
          )}

          {/* New subscription form */}
          {showNew && (
            <div className="mb-5 bg-[#111113] border border-[#7B3FE4]/30 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-white">Novo Médico / Assinatura</p>
                <button onClick={() => setShowNew(false)} className="text-[#71717A] hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <FormRow label="Nome"><input value={newData.medico_nome} onChange={(e) => setNewData((p) => ({ ...p, medico_nome: e.target.value }))} placeholder="Dr. ..." className={inputCls} /></FormRow>
                <FormRow label="E-mail"><input type="email" value={newData.medico_email} onChange={(e) => setNewData((p) => ({ ...p, medico_email: e.target.value }))} className={inputCls} /></FormRow>
                <FormRow label="WhatsApp"><input value={newData.medico_whatsapp} onChange={(e) => setNewData((p) => ({ ...p, medico_whatsapp: e.target.value.replace(/\D/g, '') }))} placeholder="5547..." className={inputCls + ' font-mono'} /></FormRow>
                <FormRow label="Plano">
                  <select value={newData.plano} onChange={(e) => planAutoFill(e.target.value as Plan, setNewData as never)}
                    className={inputCls + ' cursor-pointer'}>
                    {(Object.entries(PLAN_CONFIG) as [Plan, typeof PLAN_CONFIG.starter][]).map(([k, v]) => <option key={k} value={k}>{v.label} — {fmtBRL(v.valor)}/ano · {v.royalty}% royalty</option>)}
                  </select>
                </FormRow>
                <FormRow label="Status">
                  <select value={newData.status} onChange={(e) => setNewData((p) => ({ ...p, status: e.target.value as SubStatus }))} className={inputCls + ' cursor-pointer'}>
                    {(['ativo', 'trial', 'inadimplente', 'cancelado'] as SubStatus[]).map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </FormRow>
                <FormRow label="Data início"><input type="date" value={newData.data_inicio} onChange={(e) => setNewData((p) => ({ ...p, data_inicio: e.target.value }))} className={inputCls} /></FormRow>
                <FormRow label="Data renovação"><input type="date" value={newData.data_renovacao} onChange={(e) => setNewData((p) => ({ ...p, data_renovacao: e.target.value }))} className={inputCls} /></FormRow>
                <FormRow label="Observação"><input value={newData.obs} onChange={(e) => setNewData((p) => ({ ...p, obs: e.target.value }))} className={inputCls} /></FormRow>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowNew(false)} className="px-4 py-2 text-xs text-[#71717A] hover:text-white">Cancelar</button>
                <button onClick={() => handleSave(newData as MedicoAssinatura)} disabled={saving || !newData.medico_nome || !newData.medico_email}
                  className="flex items-center gap-2 bg-[#7B3FE4] hover:bg-[#6325C8] disabled:opacity-50 text-white text-xs font-semibold px-5 py-2 rounded-xl transition-colors">
                  <Save className="w-3.5 h-3.5" /> Salvar
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-[#7B3FE4] border-t-transparent animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#52525B]">
                <BadgeCheck className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhuma assinatura encontrada</p>
                <button onClick={() => setShowNew(true)} className="mt-3 text-xs text-[#7B3FE4] hover:underline">+ Adicionar primeiro médico</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1C1C1E]">
                      {['Médico', 'Plano', 'Status', 'Valor Anual', 'Royalty', 'Renovação', 'Obs', 'Ações'].map((h) => (
                        <th key={h} className="text-left text-[10px] font-semibold text-[#52525B] uppercase tracking-wider px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => {
                      const isEditing = editingId === s.id
                      const days = daysToRenewal(s.data_renovacao)
                      const cfg = PLAN_CONFIG[s.plano as Plan] ?? PLAN_CONFIG.starter
                      return (
                        <tr key={s.id} className="border-b border-[#1C1C1E] last:border-b-0 hover:bg-[#18181A] transition-colors">
                          <td className="px-4 py-3">
                            {isEditing && editData ? (
                              <div className="space-y-1">
                                <input value={editData.medico_nome} onChange={(e) => setEditData((p) => p ? { ...p, medico_nome: e.target.value } : p)} className={inputCls} />
                                <input value={editData.medico_email} onChange={(e) => setEditData((p) => p ? { ...p, medico_email: e.target.value } : p)} className={inputCls} />
                              </div>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-white">{s.medico_nome}</p>
                                <p className="text-xs text-[#52525B]">{s.medico_email}</p>
                              </>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing && editData ? (
                              <select value={editData.plano} onChange={(e) => planAutoFill(e.target.value as Plan, setEditData as never)}
                                className={inputCls + ' cursor-pointer text-[10px]'}>
                                {(Object.entries(PLAN_CONFIG) as [Plan, typeof PLAN_CONFIG.starter][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                              </select>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing && editData ? (
                              <select value={editData.status} onChange={(e) => setEditData((p) => p ? { ...p, status: e.target.value as SubStatus } : p)}
                                className={inputCls + ' cursor-pointer text-[10px]'}>
                                {(['ativo', 'trial', 'inadimplente', 'cancelado'] as SubStatus[]).map((st) => <option key={st} value={st}>{st}</option>)}
                              </select>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border capitalize ${STATUS_STYLES[s.status as SubStatus]}`}>{s.status}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-white tabular-nums font-medium">{fmtBRL(s.valor_anual)}</td>
                          <td className="px-4 py-3 text-sm tabular-nums">
                            <span className={s.royalty_pct === 0 ? 'text-green-400 font-semibold' : 'text-[#A1A1AA]'}>{s.royalty_pct}%</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-white">{fmtDate(s.data_renovacao)}</p>
                            {days >= 0 && days <= 30 && s.status === 'ativo' && (
                              <p className="text-[10px] text-yellow-400 mt-0.5">em {days}d</p>
                            )}
                            {days < 0 && s.status === 'ativo' && (
                              <p className="text-[10px] text-red-400 mt-0.5">vencido</p>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-[120px]">
                            {isEditing && editData ? (
                              <input value={editData.obs ?? ''} onChange={(e) => setEditData((p) => p ? { ...p, obs: e.target.value } : p)} className={inputCls} />
                            ) : (
                              <p className="text-xs text-[#52525B] truncate">{s.obs || '—'}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {isEditing && editData ? (
                                <>
                                  <button onClick={() => handleSave(editData)} disabled={saving} className="text-[#7B3FE4] hover:text-[#9D6BF0] transition-colors p-1">
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => { setEditingId(null); setEditData(null) }} className="text-[#71717A] hover:text-white transition-colors p-1">
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => { setEditingId(s.id!); setEditData({ ...s }) }} className="text-[#71717A] hover:text-white transition-colors p-1">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDelete(s.id!)} className="text-[#71717A] hover:text-red-400 transition-colors p-1">
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-[#1C1C1E]">
                <p className="text-xs text-[#52525B]">{filtered.length} assinatura{filtered.length !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
