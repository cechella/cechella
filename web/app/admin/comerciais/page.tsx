'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Briefcase, Phone, Mail, MapPin, FileText, Plus, X, Pencil, Trash2, RefreshCw, Users, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react'

type Comercial = {
  id: string
  nome: string
  cargo: string | null
  telefone: string | null
  email: string | null
  cnpj: string | null
  razao_social: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
  disponivel: boolean
  max_referidos: number
  created_at: string
  updated_at: string | null
}

type FormData = {
  nome: string
  cargo: string
  telefone: string
  email: string
  cnpj: string
  razao_social: string
  endereco: string
  cidade: string
  estado: string
  disponivel: boolean
  max_referidos: number
}

const BLANK: FormData = {
  nome: '', cargo: '', telefone: '', email: '',
  cnpj: '', razao_social: '', endereco: '',
  cidade: '', estado: '', disponivel: true, max_referidos: 10,
}

const COR_PALETTE = ['#7B3FE4','#06B6D4','#10B981','#F59E0B','#EF4444','#F97316','#3B82F6','#8B5CF6']

function initials(nome: string) {
  return nome.trim().split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase()
}
function cor(nome: string) {
  let n = 0; for (const c of nome) n += c.charCodeAt(0)
  return COR_PALETTE[n % COR_PALETTE.length]
}

export default function ComercialPage() {
  const [comerciais, setComerciais] = useState<Comercial[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todos'|'ativo'|'ocupado'|'inativo'>('todos')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'closed'|'new'|'edit'>('closed')
  const [editing, setEditing] = useState<Comercial | null>(null)
  const [form, setForm] = useState<FormData>(BLANK)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{msg: string; ok: boolean} | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await fetch('/api/admin/comerciais').then(r => r.json())
      setComerciais(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function openNew() {
    setEditing(null)
    setForm(BLANK)
    setModal('new')
  }

  function openEdit(c: Comercial) {
    setEditing(c)
    setForm({
      nome: c.nome, cargo: c.cargo ?? '', telefone: c.telefone ?? '',
      email: c.email ?? '', cnpj: c.cnpj ?? '', razao_social: c.razao_social ?? '',
      endereco: c.endereco ?? '', cidade: c.cidade ?? '', estado: c.estado ?? '',
      disponivel: c.disponivel, max_referidos: c.max_referidos,
    })
    setModal('edit')
  }

  function closeModal() {
    setModal('closed')
    setEditing(null)
    setForm(BLANK)
  }

  function setF(k: keyof FormData, v: string | boolean | number) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSave() {
    if (!form.nome.trim()) { showToast('Nome é obrigatório', false); return }
    setSaving(true)
    try {
      if (modal === 'new') {
        const res = await fetch('/api/admin/comerciais', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        showToast('Consultor cadastrado com sucesso!')
      } else if (editing) {
        const res = await fetch(`/api/admin/comerciais/${editing.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        showToast('Consultor atualizado!')
      }
      closeModal()
      await load()
    } catch (err: any) {
      showToast(err.message ?? 'Erro ao salvar', false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este consultor?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/comerciais/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Consultor removido.')
      await load()
    } catch (err: any) {
      showToast(err.message ?? 'Erro ao remover', false)
    } finally {
      setDeleting(null)
    }
  }

  async function toggleDisponivel(c: Comercial) {
    await fetch(`/api/admin/comerciais/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disponivel: !c.disponivel }),
    })
    await load()
  }

  const filtered = comerciais.filter(c => {
    const matchFilter =
      filter === 'todos' ? true :
      filter === 'ativo' ? c.disponivel :
      filter === 'inativo' ? !c.disponivel : false
    const matchSearch = !search || c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.cidade ?? '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const ativos   = comerciais.filter(c => c.disponivel).length
  const inativos = comerciais.filter(c => !c.disponivel).length

  const STATUS_LABEL: Record<string, string> = {
    todos: `Todos (${comerciais.length})`,
    ativo: `Disponíveis (${ativos})`,
    inativo: `Inativos (${inativos})`,
  }

  const c_color  = (c: Comercial) => cor(c.nome)
  const c_initials = (c: Comercial) => initials(c.nome)

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin Master', role: 'admin' }} title="Consultores" />
        <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-white">Equipe Comercial</h1>
              <p className="text-sm text-[#71717A] mt-1">Gerencie consultores, atribua referidos e acompanhe performance</p>
            </div>
            <div className="flex gap-2">
              <button onClick={load}
                className="flex items-center gap-1.5 text-xs font-medium bg-[#111113] border border-[#1C1C1E] px-3 py-2 rounded-xl hover:border-[#27272A] hover:text-white transition-all text-[#A1A1AA]">
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar
              </button>
              <button onClick={openNew}
                className="flex items-center gap-2 bg-[#06B6D4] hover:opacity-90 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:-translate-y-0.5">
                <Plus className="w-4 h-4" /> Cadastrar Consultor
              </button>
            </div>
          </div>

          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { label: 'Consultores Ativos',    value: ativos,                     color: '#06B6D4', icon: <Users className="w-5 h-5" />,       sub: `de ${comerciais.length} cadastrados` },
              { label: 'Referidos Atribuídos',  value: '—',                        color: '#22C55E', icon: <CheckCircle2 className="w-5 h-5" />, sub: 'este mês' },
              { label: 'Conversão Média',        value: '—',                        color: '#F59E0B', icon: <TrendingUp className="w-5 h-5" />,   sub: 'referidos → vendas' },
              { label: 'Referidos Livres',       value: '—',                        color: '#7B3FE4', icon: <AlertCircle className="w-5 h-5" />,  sub: 'aguardando atribuição' },
            ].map((k, i) => (
              <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--kc)] to-transparent"
                  style={{ '--kc': k.color } as React.CSSProperties} />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: k.color, opacity: .7 }}>{k.label}</span>
                  <span style={{ color: k.color }}>{k.icon}</span>
                </div>
                <p className="text-2xl font-black text-white tabular-nums">{loading ? '…' : k.value}</p>
                <p className="text-[11px] text-[#52525B]">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Filtros ── */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['todos','ativo','inativo'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f === filter ? 'todos' : f)}
                className={`px-4 py-1.5 rounded-full text-xs font-600 border transition-all ${
                  filter === f
                    ? 'border-[#06B6D4] text-[#06B6D4] bg-[#06B6D4]/10'
                    : 'border-[#1C1C1E] text-[#71717A] bg-[#111113] hover:border-[#27272A] hover:text-white'
                }`}>
                {STATUS_LABEL[f]}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 bg-[#111113] border border-[#1C1C1E] rounded-xl px-3 py-1.5">
              <span className="text-[#52525B] text-xs">🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar consultor…"
                className="bg-transparent text-xs text-white placeholder:text-[#3F3F46] outline-none w-40" />
            </div>
          </div>

          {/* ── Grid ── */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-[#52525B]">Carregando…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(c => {
                const color = c_color(c)
                const ini   = c_initials(c)
                return (
                  <div key={c.id}
                    className={`bg-[#111113] border rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
                      c.disponivel ? 'border-[#1C1C1E] hover:border-[#27272A]' : 'border-[#1C1C1E] opacity-60'
                    }`}>

                    {/* Header */}
                    <div className="p-4 flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                        style={{ background: color + '25', color }}>
                        {ini}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm leading-tight">{c.nome}</p>
                        <p className="text-[11px] text-[#71717A] mt-0.5">{c.cargo || 'Consultor'}</p>
                      </div>
                      <button onClick={() => toggleDisponivel(c)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all flex-shrink-0 ${
                          c.disponivel
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            : 'border-[#1C1C1E] bg-[#18181A] text-[#52525B] hover:text-white'
                        }`}
                        title="Clique para alternar disponibilidade">
                        {c.disponivel ? '● Disponível' : '● Inativo'}
                      </button>
                    </div>

                    {/* Dados */}
                    <div className="px-4 pb-3 space-y-1.5">
                      {c.cnpj && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-[#3F3F46] flex-shrink-0" />
                          <span className="text-[11px] text-[#52525B] font-mono">{c.cnpj}</span>
                        </div>
                      )}
                      {c.telefone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-[#3F3F46] flex-shrink-0" />
                          <span className="text-xs text-[#A1A1AA]">{c.telefone}</span>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-[#3F3F46] flex-shrink-0" />
                          <span className="text-xs text-[#A1A1AA] truncate">{c.email}</span>
                        </div>
                      )}
                      {c.cidade && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#3F3F46] flex-shrink-0" />
                          <span className="text-xs text-[#A1A1AA]">{c.cidade}{c.estado ? `, ${c.estado}` : ''}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="mx-4 border-t border-[#1C1C1E] py-3 grid grid-cols-3 text-center gap-2">
                      {[
                        { label: 'Ativos',  value: '—',  color: '#22C55E' },
                        { label: 'Mês',     value: '—',  color: undefined  },
                        { label: 'Conv.',   value: '—',  color: '#06B6D4' },
                      ].map((s, i) => (
                        <div key={i}>
                          <p className="text-base font-black tabular-nums" style={{ color: s.color ?? '#FAFAFA' }}>{s.value}</p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#52525B] mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="bg-[#0D0D0F] border-t border-[#1C1C1E] px-3 py-2.5 flex gap-2">
                      <button className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg border border-[#06B6D4]/40 text-[#06B6D4] bg-[#06B6D4]/08 hover:bg-[#06B6D4]/15 transition-colors">
                        Ver Referidos
                      </button>
                      <button onClick={() => openEdit(c)}
                        className="px-3 py-1.5 rounded-lg border border-[#1C1C1E] text-[#A1A1AA] hover:text-white hover:border-[#27272A] transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                        className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-500/70 hover:text-red-400 hover:border-red-500/40 transition-colors disabled:opacity-40">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Card "Novo" */}
              <button onClick={openNew}
                className="bg-[#111113] border border-dashed border-[#27272A] rounded-2xl flex flex-col items-center justify-center gap-3 min-h-[280px] hover:border-[#06B6D4]/40 hover:bg-[#06B6D4]/05 transition-all group">
                <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-[#27272A] group-hover:border-[#06B6D4]/40 flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5 text-[#3F3F46] group-hover:text-[#06B6D4]/60 transition-colors" />
                </div>
                <span className="text-xs font-semibold text-[#52525B] group-hover:text-[#06B6D4]/60 transition-colors">Novo Consultor</span>
              </button>
            </div>
          )}

          {filtered.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Briefcase className="w-10 h-10 text-[#27272A]" />
              <p className="text-[#52525B] text-sm">Nenhum consultor encontrado</p>
              <button onClick={openNew} className="text-xs text-[#06B6D4] hover:underline">Cadastrar o primeiro</button>
            </div>
          )}

        </main>
      </div>

      {/* ── Modal ── */}
      {modal !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="bg-[#111113] border border-[#27272A] rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

            {/* Modal header */}
            <div className="sticky top-0 bg-[#111113] border-b border-[#1C1C1E] px-6 py-5 flex items-center justify-between z-10 rounded-t-3xl">
              <div>
                <h2 className="font-bold text-white text-base">{modal === 'new' ? 'Cadastrar Consultor' : 'Editar Consultor'}</h2>
                <p className="text-xs text-[#71717A] mt-0.5">Campos com * são obrigatórios</p>
              </div>
              <button onClick={closeModal}
                className="w-8 h-8 rounded-xl border border-[#1C1C1E] flex items-center justify-center text-[#71717A] hover:text-white hover:bg-[#1C1C1E] transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Dados Pessoais */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#3F3F46] border-b border-[#1C1C1E] pb-2 mb-3">Dados Pessoais</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nome Completo *" span="full">
                    <input value={form.nome} onChange={e => setF('nome', e.target.value)} placeholder="Ex: João da Silva" className={input} />
                  </Field>
                  <Field label="Cargo / Nível">
                    <input value={form.cargo} onChange={e => setF('cargo', e.target.value)} placeholder="Ex: Consultor Sênior" className={input} />
                  </Field>
                  <Field label="Telefone">
                    <input value={form.telefone} onChange={e => setF('telefone', e.target.value)} placeholder="+55 47 99999-0000" className={input} />
                  </Field>
                  <Field label="E-mail">
                    <input value={form.email} onChange={e => setF('email', e.target.value)} type="email" placeholder="nome@empresa.com" className={input} />
                  </Field>
                </div>
              </div>

              {/* Dados Fiscais */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#3F3F46] border-b border-[#1C1C1E] pb-2 mb-3">Dados Fiscais (PJ)</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="CNPJ">
                    <input value={form.cnpj} onChange={e => setF('cnpj', e.target.value)} placeholder="00.000.000/0001-00" className={input} />
                  </Field>
                  <Field label="Razão Social">
                    <input value={form.razao_social} onChange={e => setF('razao_social', e.target.value)} placeholder="Nome da empresa" className={input} />
                  </Field>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#3F3F46] border-b border-[#1C1C1E] pb-2 mb-3">Endereço</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Endereço Completo" span="full">
                    <input value={form.endereco} onChange={e => setF('endereco', e.target.value)} placeholder="Rua, número, complemento" className={input} />
                  </Field>
                  <Field label="Cidade">
                    <input value={form.cidade} onChange={e => setF('cidade', e.target.value)} placeholder="Balneário Camboriú" className={input} />
                  </Field>
                  <Field label="Estado">
                    <input value={form.estado} onChange={e => setF('estado', e.target.value)} placeholder="SC" className={input} />
                  </Field>
                </div>
              </div>

              {/* Configurações */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#3F3F46] border-b border-[#1C1C1E] pb-2 mb-3">Configurações</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Status">
                    <select value={form.disponivel ? 'true' : 'false'} onChange={e => setF('disponivel', e.target.value === 'true')} className={input + ' cursor-pointer'}>
                      <option value="true">Ativo / Disponível</option>
                      <option value="false">Inativo</option>
                    </select>
                  </Field>
                  <Field label="Máx. Referidos Simultâneos">
                    <input value={form.max_referidos} onChange={e => setF('max_referidos', parseInt(e.target.value) || 10)} type="number" min={1} className={input} />
                  </Field>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[#111113] border-t border-[#1C1C1E] px-6 py-4 flex justify-end gap-2 rounded-b-3xl">
              <button onClick={closeModal} className="px-4 py-2 rounded-xl border border-[#1C1C1E] text-sm text-[#A1A1AA] hover:text-white hover:border-[#27272A] transition-all">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#06B6D4] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all">
                {saving ? 'Salvando…' : modal === 'new' ? 'Cadastrar Consultor' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all ${
          toast.ok
            ? 'bg-[#111113] border-emerald-500/40 text-white'
            : 'bg-[#111113] border-red-500/40 text-red-300'
        }`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

const input = 'w-full bg-[#0D0D0F] border border-[#1C1C1E] rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#3F3F46] outline-none focus:border-[#06B6D4] transition-colors'

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: 'full' }) {
  return (
    <div className={span === 'full' ? 'col-span-2' : ''}>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#71717A] mb-1.5">{label}</label>
      {children}
    </div>
  )
}
