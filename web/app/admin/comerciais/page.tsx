'use client'

import { useEffect, useState, useRef } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Briefcase, Phone, Mail, MapPin, FileText, Plus, X,
  Pencil, Trash2, RefreshCw, Users, TrendingUp,
  CheckCircle2, AlertCircle, KeyRound, Eye, EyeOff,
} from 'lucide-react'

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
  auth_user_id: string | null
  created_at: string
  updated_at: string | null
}

type FormData = {
  nome: string; cargo: string; telefone: string; email: string
  cnpj: string; razao_social: string; endereco: string
  cidade: string; estado: string; disponivel: boolean; max_referidos: number
}

type AccessInfo = {
  hasAccess: boolean
  lastSignIn?: string | null
  createdAt?: string | null
  email?: string
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
function pwdStrength(v: string): { pct: number; color: string; label: string } {
  let sc = 0
  if (v.length >= 8) sc++
  if (v.length >= 12) sc++
  if (/[A-Z]/.test(v)) sc++
  if (/[0-9]/.test(v)) sc++
  if (/[^A-Za-z0-9]/.test(v)) sc++
  const levels = [
    { pct: 0, color: '#3F3F46', label: '' },
    { pct: 20, color: '#EF4444', label: 'Fraca' },
    { pct: 40, color: '#F59E0B', label: 'Média' },
    { pct: 65, color: '#F59E0B', label: 'Boa' },
    { pct: 85, color: '#10B981', label: 'Forte' },
    { pct: 100, color: '#10B981', label: 'Muito forte' },
  ]
  return levels[Math.min(sc, 5)]
}
function formatDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

// ── Password field ─────────────────────────────────
function PwdField({ label, value, onChange, note }: {
  label: string; value: string; onChange: (v: string) => void; note?: string
}) {
  const [show, setShow] = useState(false)
  const strength = pwdStrength(value)
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          className={inputCls + ' pr-10'}
        />
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525B] hover:text-[#A1A1AA] transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {value && (
        <>
          <div className="h-1 bg-[#1C1C1E] rounded-full overflow-hidden mt-1">
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${strength.pct}%`, background: strength.color }} />
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: strength.color }}>{strength.label}</p>
        </>
      )}
      {note && <p className="text-[10px] text-[#52525B]">{note}</p>}
    </div>
  )
}

export default function ComercialPage() {
  const [comerciais, setComerciais] = useState<Comercial[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todos'|'ativo'|'inativo'>('todos')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'closed'|'new'|'edit'>('closed')
  const [editing, setEditing] = useState<Comercial | null>(null)
  const [form, setForm] = useState<FormData>(BLANK)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{msg: string; ok: boolean} | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // ── Access modal state ──────────────────────────
  const [accessModal, setAccessModal] = useState<{
    comercial: Comercial
    type: 'create' | 'manage'
    info: AccessInfo | null
    tab: 'status' | 'senha'
  } | null>(null)
  const [accessPwd, setAccessPwd] = useState('')
  const [accessPwd2, setAccessPwd2] = useState('')
  const [accessLoading, setAccessLoading] = useState(false)

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeModal(); closeAccessModal() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  function openNew() { setEditing(null); setForm(BLANK); setModal('new') }
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
  function closeModal() { setModal('closed'); setEditing(null); setForm(BLANK) }
  function setF(k: keyof FormData, v: string | boolean | number) { setForm(prev => ({ ...prev, [k]: v })) }

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
      closeModal(); await load()
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

  // ── Access modal handlers ───────────────────────
  async function openAccessModal(c: Comercial) {
    const hasAccess = !!c.auth_user_id
    if (hasAccess) {
      const info: AccessInfo = await fetch(`/api/admin/comerciais/${c.id}/access`).then(r => r.json()).catch(() => ({ hasAccess: false }))
      setAccessModal({ comercial: c, type: 'manage', info, tab: 'status' })
    } else {
      setAccessModal({ comercial: c, type: 'create', info: null, tab: 'status' })
    }
    setAccessPwd('')
    setAccessPwd2('')
  }

  function closeAccessModal() { setAccessModal(null); setAccessPwd(''); setAccessPwd2('') }

  async function handleCreateAccess() {
    if (!accessModal) return
    if (accessPwd.length < 8) { showToast('Senha muito curta (mín. 8 caracteres)', false); return }
    if (accessPwd !== accessPwd2) { showToast('As senhas não coincidem', false); return }
    setAccessLoading(true)
    try {
      const res = await fetch(`/api/admin/comerciais/${accessModal.comercial.id}/access`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: accessPwd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(`✓ Acesso criado para ${accessModal.comercial.nome.split(' ')[0]}`)
      closeAccessModal()
      await load()
    } catch (err: any) {
      showToast(err.message ?? 'Erro ao criar acesso', false)
    } finally {
      setAccessLoading(false)
    }
  }

  async function handleChangePwd() {
    if (!accessModal) return
    if (accessPwd.length < 8) { showToast('Senha muito curta (mín. 8 caracteres)', false); return }
    if (accessPwd !== accessPwd2) { showToast('As senhas não coincidem', false); return }
    setAccessLoading(true)
    try {
      const res = await fetch(`/api/admin/comerciais/${accessModal.comercial.id}/access`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: accessPwd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('✓ Senha alterada com sucesso')
      closeAccessModal()
    } catch (err: any) {
      showToast(err.message ?? 'Erro ao alterar senha', false)
    } finally {
      setAccessLoading(false)
    }
  }

  async function handleRevokeAccess() {
    if (!accessModal) return
    if (!confirm(`Revogar o acesso de ${accessModal.comercial.nome}? O consultor não conseguirá mais entrar.`)) return
    setAccessLoading(true)
    try {
      const res = await fetch(`/api/admin/comerciais/${accessModal.comercial.id}/access`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(`Acesso de ${accessModal.comercial.nome.split(' ')[0]} revogado`)
      closeAccessModal()
      await load()
    } catch (err: any) {
      showToast(err.message ?? 'Erro ao revogar', false)
    } finally {
      setAccessLoading(false)
    }
  }

  const filtered = comerciais.filter(c => {
    const matchFilter = filter === 'todos' ? true : filter === 'ativo' ? c.disponivel : !c.disponivel
    const matchSearch = !search || c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.cidade ?? '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const ativos = comerciais.filter(c => c.disponivel).length
  const inativos = comerciais.filter(c => !c.disponivel).length
  const STATUS_LABEL = {
    todos: `Todos (${comerciais.length})`,
    ativo: `Disponíveis (${ativos})`,
    inativo: `Inativos (${inativos})`,
  }

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin Master', role: 'admin' }} title="Consultores" />
        <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Header */}
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

          {/* KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { label: 'Consultores Ativos', value: ativos, color: '#06B6D4', icon: <Users className="w-5 h-5" />, sub: `de ${comerciais.length} cadastrados` },
              { label: 'Com Acesso ao Portal', value: comerciais.filter(c => !!c.auth_user_id).length, color: '#10B981', icon: <KeyRound className="w-5 h-5" />, sub: 'login criado' },
              { label: 'Conversão Média', value: '—', color: '#F59E0B', icon: <TrendingUp className="w-5 h-5" />, sub: 'referidos → vendas' },
              { label: 'Referidos Livres', value: '—', color: '#7B3FE4', icon: <AlertCircle className="w-5 h-5" />, sub: 'aguardando atribuição' },
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

          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['todos','ativo','inativo'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f === filter ? 'todos' : f)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  filter === f ? 'border-[#06B6D4] text-[#06B6D4] bg-[#06B6D4]/10' : 'border-[#1C1C1E] text-[#71717A] bg-[#111113] hover:border-[#27272A] hover:text-white'
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

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-[#52525B]">Carregando…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(c => {
                const color = cor(c.nome)
                const ini   = initials(c.nome)
                const hasAccess = !!c.auth_user_id
                return (
                  <div key={c.id}
                    className={`bg-[#111113] border rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
                      c.disponivel ? 'border-[#1C1C1E] hover:border-[#27272A]' : 'border-[#1C1C1E] opacity-60'
                    }`}>

                    <div className="p-4 flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                        style={{ background: color + '25', color }}>
                        {ini}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm leading-tight">{c.nome}</p>
                        <p className="text-[11px] text-[#71717A] mt-0.5">{c.cargo || 'Consultor'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <button onClick={() => toggleDisponivel(c)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                            c.disponivel
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              : 'border-[#1C1C1E] bg-[#18181A] text-[#52525B] hover:text-white'
                          }`}>
                          {c.disponivel ? '● Disponível' : '● Inativo'}
                        </button>
                        {/* Access badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${
                          hasAccess
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-[#18181A] text-[#52525B] border border-[#1C1C1E]'
                        }`}>
                          <KeyRound className="w-2.5 h-2.5" />
                          {hasAccess ? 'Acesso ativo' : 'Sem acesso'}
                        </span>
                      </div>
                    </div>

                    <div className="px-4 pb-3 space-y-1.5">
                      {c.cnpj && <div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-[#3F3F46] flex-shrink-0" /><span className="text-[11px] text-[#52525B] font-mono">{c.cnpj}</span></div>}
                      {c.telefone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#3F3F46] flex-shrink-0" /><span className="text-xs text-[#A1A1AA]">{c.telefone}</span></div>}
                      {c.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[#3F3F46] flex-shrink-0" /><span className="text-xs text-[#A1A1AA] truncate">{c.email}</span></div>}
                      {c.cidade && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-[#3F3F46] flex-shrink-0" /><span className="text-xs text-[#A1A1AA]">{c.cidade}{c.estado ? `, ${c.estado}` : ''}</span></div>}
                    </div>

                    <div className="mx-4 border-t border-[#1C1C1E] py-3 grid grid-cols-3 text-center gap-2">
                      {[{ label: 'Ativos', value: '—', color: '#22C55E' }, { label: 'Mês', value: '—' }, { label: 'Conv.', value: '—', color: '#06B6D4' }].map((s, i) => (
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
                      {/* 🔑 Acesso */}
                      <button
                        onClick={() => openAccessModal(c)}
                        title={hasAccess ? 'Gerenciar acesso ao portal' : 'Criar acesso ao portal'}
                        className={`px-3 py-1.5 rounded-lg border transition-colors ${
                          hasAccess
                            ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                            : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                        }`}>
                        <KeyRound className="w-3.5 h-3.5" />
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

      {/* ═══ Modal: Cadastrar / Editar ═══ */}
      {modal !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="bg-[#111113] border border-[#27272A] rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#111113] border-b border-[#1C1C1E] px-6 py-5 flex items-center justify-between z-10 rounded-t-3xl">
              <div>
                <h2 className="font-bold text-white text-base">{modal === 'new' ? 'Cadastrar Consultor' : 'Editar Consultor'}</h2>
                <p className="text-xs text-[#71717A] mt-0.5">Campos com * são obrigatórios</p>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-xl border border-[#1C1C1E] flex items-center justify-center text-[#71717A] hover:text-white hover:bg-[#1C1C1E] transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {[
                { title: 'Dados Pessoais', fields: [
                  { label: 'Nome Completo *', span: 'full' as const, el: <input value={form.nome} onChange={e => setF('nome', e.target.value)} placeholder="Ex: João da Silva" className={inputCls} /> },
                  { label: 'Cargo / Nível', el: <input value={form.cargo} onChange={e => setF('cargo', e.target.value)} placeholder="Ex: Consultor Sênior" className={inputCls} /> },
                  { label: 'Telefone', el: <input value={form.telefone} onChange={e => setF('telefone', e.target.value)} placeholder="+55 47 99999-0000" className={inputCls} /> },
                  { label: 'E-mail', el: <input value={form.email} onChange={e => setF('email', e.target.value)} type="email" placeholder="nome@empresa.com" className={inputCls} /> },
                ]},
                { title: 'Dados Fiscais (PJ)', fields: [
                  { label: 'CNPJ', el: <input value={form.cnpj} onChange={e => setF('cnpj', e.target.value)} placeholder="00.000.000/0001-00" className={inputCls} /> },
                  { label: 'Razão Social', el: <input value={form.razao_social} onChange={e => setF('razao_social', e.target.value)} placeholder="Nome da empresa" className={inputCls} /> },
                ]},
                { title: 'Endereço', fields: [
                  { label: 'Endereço Completo', span: 'full' as const, el: <input value={form.endereco} onChange={e => setF('endereco', e.target.value)} placeholder="Rua, número, complemento" className={inputCls} /> },
                  { label: 'Cidade', el: <input value={form.cidade} onChange={e => setF('cidade', e.target.value)} placeholder="Balneário Camboriú" className={inputCls} /> },
                  { label: 'Estado', el: <input value={form.estado} onChange={e => setF('estado', e.target.value)} placeholder="SC" className={inputCls} /> },
                ]},
                { title: 'Configurações', fields: [
                  { label: 'Status', el: (
                    <select value={form.disponivel ? 'true' : 'false'} onChange={e => setF('disponivel', e.target.value === 'true')} className={inputCls + ' cursor-pointer'}>
                      <option value="true">Ativo / Disponível</option>
                      <option value="false">Inativo</option>
                    </select>
                  )},
                  { label: 'Máx. Referidos Simultâneos', el: <input value={form.max_referidos} onChange={e => setF('max_referidos', parseInt(e.target.value) || 10)} type="number" min={1} className={inputCls} /> },
                ]},
              ].map(section => (
                <div key={section.title}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#3F3F46] border-b border-[#1C1C1E] pb-2 mb-3">{section.title}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {section.fields.map(f => (
                      <div key={f.label} className={f.span === 'full' ? 'col-span-2' : ''}>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#71717A] mb-1.5">{f.label}</label>
                        {f.el}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="sticky bottom-0 bg-[#111113] border-t border-[#1C1C1E] px-6 py-4 flex justify-end gap-2 rounded-b-3xl">
              <button onClick={closeModal} className="px-4 py-2 rounded-xl border border-[#1C1C1E] text-sm text-[#A1A1AA] hover:text-white hover:border-[#27272A] transition-all">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#06B6D4] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all">
                {saving ? 'Salvando…' : modal === 'new' ? 'Cadastrar Consultor' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal: Acesso ═══ */}
      {accessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeAccessModal() }}>
          <div className="bg-[#111113] border border-[#27272A] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 py-5 border-b border-[#1C1C1E] flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: cor(accessModal.comercial.nome) + '25', color: cor(accessModal.comercial.nome) }}>
                {initials(accessModal.comercial.nome)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">
                  {accessModal.type === 'create' ? 'Criar acesso — ' : 'Acesso — '}
                  {accessModal.comercial.nome}
                </p>
                <p className="text-xs text-[#71717A] mt-0.5">
                  {accessModal.type === 'create'
                    ? 'Gera login e senha para entrar em /sales'
                    : 'Altere senha ou revogue o acesso ao portal'}
                </p>
              </div>
              <button onClick={closeAccessModal}
                className="w-8 h-8 rounded-xl border border-[#1C1C1E] flex items-center justify-center text-[#71717A] hover:text-white hover:bg-[#1C1C1E] transition-all flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs (só no gerenciar) */}
            {accessModal.type === 'manage' && (
              <div className="flex border-b border-[#1C1C1E]">
                {(['status', 'senha'] as const).map(t => (
                  <button key={t} onClick={() => { setAccessModal(prev => prev ? {...prev, tab: t} : prev); setAccessPwd(''); setAccessPwd2('') }}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
                      accessModal.tab === t
                        ? 'border-[#8B5CF6] text-[#8B5CF6]'
                        : 'border-transparent text-[#71717A] hover:text-white'
                    }`}>
                    {t === 'status' ? 'Status' : 'Alterar senha'}
                  </button>
                ))}
              </div>
            )}

            <div className="px-6 py-5 space-y-4">
              {/* CRIAR ACESSO */}
              {accessModal.type === 'create' && (
                <>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">Email de acesso</label>
                    <input readOnly value={accessModal.comercial.email ?? '(sem email cadastrado)'}
                      className={inputCls + ' opacity-60 cursor-default'} />
                    <p className="text-[10px] text-[#52525B]">Pré-preenchido do cadastro. O consultor entra com esse email.</p>
                  </div>
                  <PwdField label="Senha" value={accessPwd} onChange={setAccessPwd} />
                  <PwdField label="Confirmar senha" value={accessPwd2} onChange={setAccessPwd2} />
                </>
              )}

              {/* GERENCIAR — aba STATUS */}
              {accessModal.type === 'manage' && accessModal.tab === 'status' && (
                <>
                  {[
                    { label: 'Status', value: <span className="text-emerald-400 font-semibold text-sm flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Ativo</span> },
                    { label: 'Email', value: accessModal.info?.email ?? accessModal.comercial.email ?? '—' },
                    { label: 'Último acesso', value: formatDate(accessModal.info?.lastSignIn) },
                    { label: 'Conta criada em', value: formatDate(accessModal.info?.createdAt) },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-[#1C1C1E] last:border-0">
                      <span className="text-xs text-[#71717A]">{row.label}</span>
                      <span className="text-sm font-medium text-white">{row.value}</span>
                    </div>
                  ))}
                  <div className="bg-red-500/08 border border-red-500/20 rounded-2xl p-4 mt-2">
                    <p className="text-xs text-red-400 mb-3">Revogar acesso impede o consultor de entrar no portal. Os dados permanecem intactos — você pode recriar o acesso a qualquer momento.</p>
                    <button onClick={handleRevokeAccess} disabled={accessLoading}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                      <X className="w-3.5 h-3.5" /> Revogar acesso
                    </button>
                  </div>
                </>
              )}

              {/* GERENCIAR — aba SENHA */}
              {accessModal.type === 'manage' && accessModal.tab === 'senha' && (
                <>
                  <PwdField label="Nova senha" value={accessPwd} onChange={setAccessPwd} />
                  <PwdField label="Confirmar nova senha" value={accessPwd2} onChange={setAccessPwd2} />
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#1C1C1E] flex justify-end gap-2">
              <button onClick={closeAccessModal} className="px-4 py-2 rounded-xl border border-[#1C1C1E] text-sm text-[#A1A1AA] hover:text-white transition-all">
                {accessModal.type === 'manage' && accessModal.tab === 'status' ? 'Fechar' : 'Cancelar'}
              </button>
              {(accessModal.type === 'create' || accessModal.tab === 'senha') && (
                <button
                  onClick={accessModal.type === 'create' ? handleCreateAccess : handleChangePwd}
                  disabled={accessLoading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#7C3AED] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all">
                  <CheckCircle2 className="w-4 h-4" />
                  {accessLoading ? 'Salvando…' : accessModal.type === 'create' ? 'Criar acesso' : 'Salvar senha'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all ${
          toast.ok ? 'bg-[#111113] border-emerald-500/40 text-white' : 'bg-[#111113] border-red-500/40 text-red-300'
        }`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full bg-[#0D0D0F] border border-[#1C1C1E] rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#3F3F46] outline-none focus:border-[#06B6D4] transition-colors'
