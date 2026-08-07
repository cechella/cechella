'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, X, Save, ChevronRight,
  Package, Zap, MessageSquare, Radio, DollarSign, Bot,
  ToggleLeft, ToggleRight, AlertCircle, CheckCircle2,
  CheckSquare, Square, Settings,
} from 'lucide-react'

type PadraoFunil = 'consultivo' | 'digital' | 'recrutamento'
type TomVoz = 'acolhedor' | 'formal' | 'informal' | 'direto'

interface Produto {
  slug: string
  nome: string
  ativo: boolean
  padrao_funil: PadraoFunil
  prompt_contexto: string | null
  dores: string | null
  valor_pix: number
  valor_cartao: number
  parcelas_max: number
  desconto_pix_pct: number
  parcelamento_texto: string | null
  nome_responsavel: string | null
  script_abertura: string | null
  objecoes: string | null
  tom_voz: TomVoz | null
  created_at?: string
}

const PADROES: { value: PadraoFunil; sigla: string; label: string; etapas: string; color: string }[] = [
  { value: 'consultivo',   sigla: 'A', label: 'Consultivo High Ticket',   etapas: 'Qualificação → Dor → Educação → Fechamento → Pagamento', color: '#7B3FE4' },
  { value: 'digital',      sigla: 'B', label: 'Evento / Digital Simples',  etapas: 'Interesse → Preço → Pagamento',                          color: '#3B82F6' },
  { value: 'recrutamento', sigla: 'C', label: 'Recrutamento / MLM',        etapas: 'Oportunidade → Qualificação → Convite',                   color: '#F59E0B' },
]

const TONS: { value: TomVoz; label: string; desc: string }[] = [
  { value: 'acolhedor', label: 'Acolhedor', desc: 'Empático, cria conexão emocional' },
  { value: 'formal',    label: 'Formal',    desc: 'Profissional, transmite autoridade' },
  { value: 'informal',  label: 'Informal',  desc: 'Próximo, como uma amiga' },
  { value: 'direto',    label: 'Direto',    desc: 'Objetivo, sem rodeios' },
]

const EMOJI_MAP: Record<string, string> = {
  implante: '💉', emagrecimento: '🏃', mentoria_medica: '🩺',
  ageless: '✨', palestra_vinicius: '🎤', ebook_ia: '📘',
}

const EMPTY: Produto = {
  slug: '', nome: '', ativo: true, padrao_funil: 'consultivo',
  prompt_contexto: '', dores: '', valor_pix: 0, valor_cartao: 0,
  parcelas_max: 6, desconto_pix_pct: 0, parcelamento_texto: 'até 6x sem juros',
  nome_responsavel: '', script_abertura: '', objecoes: '', tom_voz: 'acolhedor',
}

const SUGESTOES = [
  { slug: 'emagrecimento', nome: 'Acompanhamento Emagrecimento' },
  { slug: 'mentoria_medica', nome: 'Mentoria Médica' },
  { slug: 'ageless', nome: 'Ageless Marketing Multinível' },
  { slug: 'palestra_vinicius', nome: 'Ingressos Palestra Vinícius' },
  { slug: 'ebook_ia', nome: 'Ebook IA para Empresas' },
]

const MODAL_TABS = [
  { id: 'basico',    label: 'Produto' },
  { id: 'preco',     label: 'Preços' },
  { id: 'funil',     label: 'Funil' },
  { id: 'contexto',  label: 'Contexto' },
  { id: 'ana_voz',   label: 'ANA Voz' },
] as const
type ModalTab = typeof MODAL_TABS[number]['id']

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; produto: Produto; isNew: boolean }>({
    open: false, produto: EMPTY, isNew: true,
  })
  const [activeTab, setActiveTab] = useState<ModalTab>('basico')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [modoAna, setModoAna] = useState<'perguntar' | 'fixo'>('perguntar')
  const [produtoFixo, setProdutoFixo] = useState<string>('implante')
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([])
  const [savingModo, setSavingModo] = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchProdutos = useCallback(async () => {
    setLoading(true)
    const [resProdutos, resCfg] = await Promise.all([
      fetch('/api/admin/produtos'),
      fetch('/api/admin/configuracoes'),
    ])
    const jsonP = await resProdutos.json()
    const jsonC = await resCfg.json()
    const prods: Produto[] = jsonP.produtos ?? []
    setProdutos(prods)
    const ana = jsonC.config?.atendimento_ana
    if (ana) {
      setModoAna(ana.modo ?? 'perguntar')
      setProdutoFixo(ana.produto_fixo ?? 'implante')
      setProdutosSelecionados(ana.produtos_selecionados ?? prods.filter(p => p.ativo).map(p => p.slug))
    } else {
      setProdutosSelecionados(prods.filter(p => p.ativo).map(p => p.slug))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchProdutos() }, [fetchProdutos])

  const salvarModoAna = async (novoModo?: 'perguntar' | 'fixo', novoFixo?: string, novosSel?: string[]) => {
    setSavingModo(true)
    const modo = novoModo ?? modoAna
    const fixo = novoFixo ?? produtoFixo
    const selecionados = novosSel ?? produtosSelecionados
    await fetch('/api/admin/configuracoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave: 'atendimento_ana', valor: { modo, produto_fixo: fixo, produtos_selecionados: selecionados } }),
    })
    if (novoModo) setModoAna(novoModo)
    if (novoFixo) setProdutoFixo(novoFixo)
    if (novosSel) setProdutosSelecionados(novosSel)
    setSavingModo(false)
    showToast('Modo salvo')
  }

  const toggleProdutoSelecionado = (slug: string) => {
    const novo = produtosSelecionados.includes(slug)
      ? produtosSelecionados.filter(s => s !== slug)
      : [...produtosSelecionados, slug]
    setProdutosSelecionados(novo)
    salvarModoAna(undefined, undefined, novo)
  }

  const salvar = async () => {
    const p = modal.produto
    if (!p.slug.trim() || !p.nome.trim()) { showToast('Slug e nome obrigatórios', false); return }
    setSaving(true)
    const res = await fetch('/api/admin/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert', produto: p }),
    })
    const json = await res.json()
    setSaving(false)
    if (json.ok) {
      showToast(modal.isNew ? 'Produto criado!' : 'Produto salvo!')
      setModal(m => ({ ...m, open: false }))
      fetchProdutos()
    } else {
      showToast(json.error ?? 'Erro ao salvar', false)
    }
  }

  const toggleAtivo = async (slug: string, ativo: boolean) => {
    await fetch('/api/admin/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', slug, ativo }),
    })
    setProdutos(prev => prev.map(p => p.slug === slug ? { ...p, ativo } : p))
  }

  const deletar = async (slug: string) => {
    await fetch('/api/admin/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', slug }),
    })
    setConfirmDelete(null)
    showToast('Produto removido')
    fetchProdutos()
  }

  const setField = (key: keyof Produto, value: unknown) =>
    setModal(m => ({ ...m, produto: { ...m.produto, [key]: value } }))

  const p = modal.produto
  const pixFinal = Math.round(p.valor_pix * (1 - (p.desconto_pix_pct || 0) / 100))
  const parcela  = p.parcelas_max > 0 ? Math.round(p.valor_cartao / p.parcelas_max) : 0
  const jaExiste = (slug: string) => produtos.some(pp => pp.slug === slug)

  const openNew = (preset?: Partial<Produto>) => {
    setModal({ open: true, isNew: true, produto: { ...EMPTY, ...preset } })
    setActiveTab('basico')
  }
  const openEdit = (prod: Produto) => {
    setModal({ open: true, isNew: false, produto: { ...prod } })
    setActiveTab('basico')
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-bold text-white">Produtos</h1>
            <p className="text-sm text-[#71717A] mt-1">Gerencie os produtos que ANA vende</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#131720] border border-[#252d42] rounded-full px-3 py-1.5 text-xs font-semibold text-[#7B3FE4]">
              <Package className="w-3 h-3" />
              {loading ? '...' : `${produtos.filter(p => p.ativo).length} ativos`}
            </div>
            <button
              onClick={() => openNew()}
              className="flex items-center gap-2 bg-[#7B3FE4] hover:bg-[#6D35CC] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo produto
            </button>
          </div>
        </div>

        {/* ── MODO ANA ── */}
        <p className="text-[10px] font-bold tracking-[0.1em] text-[#3F3F46] uppercase mb-3 flex items-center gap-2">
          Modo de Atendimento — ANA
          <span className="flex-1 h-px bg-[#1C1C1E]" />
          {savingModo && <span className="text-[10px] text-[#52525B] normal-case font-normal tracking-normal">salvando...</span>}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-8">
          {/* perguntar */}
          <div className={`bg-[#111113] border rounded-2xl overflow-hidden transition-all ${modoAna === 'perguntar' ? 'border-[#7B3FE4]/50' : 'border-[#1C1C1E]'}`}>
            <button
              onClick={() => salvarModoAna('perguntar')}
              className="flex items-start gap-4 p-4 w-full text-left hover:bg-[#18181A] transition-colors"
            >
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${modoAna === 'perguntar' ? 'border-[#7B3FE4]' : 'border-[#3F3F46]'}`}>
                {modoAna === 'perguntar' && <div className="w-1.5 h-1.5 rounded-full bg-[#7B3FE4]" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-0.5">ANA pergunta ao lead</p>
                <p className="text-xs text-[#71717A]">Apresenta um menu e deixa o lead escolher o programa de interesse</p>
              </div>
            </button>
            {modoAna === 'perguntar' && (
              <div className="px-4 pb-4 border-t border-[#1C1C1E] pt-3">
                <p className="text-[10px] font-bold tracking-widest text-[#52525B] uppercase mb-2">Produtos no menu</p>
                <div className="space-y-1">
                  {produtos.filter(pp => pp.ativo).map(prod => {
                    const sel = produtosSelecionados.includes(prod.slug)
                    return (
                      <button
                        key={prod.slug}
                        onClick={() => toggleProdutoSelecionado(prod.slug)}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-[#18181A] transition-colors text-left"
                      >
                        {sel
                          ? <CheckSquare className="w-4 h-4 text-[#7B3FE4] flex-shrink-0" />
                          : <Square className="w-4 h-4 text-[#3F3F46] flex-shrink-0" />}
                        <span className="text-sm flex-1" style={{ color: sel ? '#fff' : '#71717A' }}>{prod.nome}</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: PADROES.find(pp => pp.value === prod.padrao_funil)?.color + '22', color: PADROES.find(pp => pp.value === prod.padrao_funil)?.color }}>
                          {PADROES.find(pp => pp.value === prod.padrao_funil)?.sigla}
                        </span>
                      </button>
                    )
                  })}
                  {produtos.filter(pp => pp.ativo).length === 0 && (
                    <p className="text-xs text-[#3F3F46] italic px-3 py-2">Nenhum produto ativo</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* fixo */}
          <div className={`bg-[#111113] border rounded-2xl overflow-hidden transition-all ${modoAna === 'fixo' ? 'border-[#7B3FE4]/50' : 'border-[#1C1C1E]'}`}>
            <button
              onClick={() => salvarModoAna('fixo')}
              className="flex items-start gap-4 p-4 w-full text-left hover:bg-[#18181A] transition-colors"
            >
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${modoAna === 'fixo' ? 'border-[#7B3FE4]' : 'border-[#3F3F46]'}`}>
                {modoAna === 'fixo' && <div className="w-1.5 h-1.5 rounded-full bg-[#7B3FE4]" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-0.5">Atender produto fixo</p>
                <p className="text-xs text-[#71717A]">ANA vai direto ao funil do produto selecionado, sem perguntar ao lead</p>
              </div>
            </button>
            {modoAna === 'fixo' && (
              <div className="px-4 pb-4 border-t border-[#1C1C1E] pt-3">
                <p className="text-[10px] font-bold tracking-widest text-[#52525B] uppercase mb-2">Produto ativo</p>
                <div className="flex flex-wrap gap-2">
                  {produtos.filter(pp => pp.ativo).map(prod => (
                    <button
                      key={prod.slug}
                      onClick={e => { e.stopPropagation(); salvarModoAna('fixo', prod.slug) }}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${produtoFixo === prod.slug ? 'bg-[#7B3FE4] border-[#7B3FE4] text-white' : 'border-[#2A2A2E] text-[#71717A] hover:text-white hover:border-[#7B3FE4]/40'}`}
                    >
                      {prod.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── PRODUTOS ATIVOS ── */}
        {!loading && produtos.filter(p => p.ativo).length > 0 && (
          <>
            <p className="text-[10px] font-bold tracking-[0.1em] text-[#3F3F46] uppercase mb-3 flex items-center gap-2">
              Produtos Ativos
              <span className="flex-1 h-px bg-[#1C1C1E]" />
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
              {produtos.filter(p => p.ativo).map(prod => <ProdutoCard key={prod.slug} prod={prod} onEdit={openEdit} onToggle={toggleAtivo} onDelete={setConfirmDelete} />)}
            </div>
          </>
        )}

        {/* ── PRODUTOS INATIVOS ── */}
        {!loading && produtos.filter(p => !p.ativo).length > 0 && (
          <>
            <p className="text-[10px] font-bold tracking-[0.1em] text-[#3F3F46] uppercase mb-3 flex items-center gap-2">
              Inativos
              <span className="flex-1 h-px bg-[#1C1C1E]" />
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
              {produtos.filter(p => !p.ativo).map(prod => <ProdutoCard key={prod.slug} prod={prod} onEdit={openEdit} onToggle={toggleAtivo} onDelete={setConfirmDelete} />)}
            </div>
          </>
        )}

        {/* ── LOADING ── */}
        {loading && (
          <div className="flex items-center justify-center h-40 text-[#52525B] text-sm">Carregando...</div>
        )}

        {/* ── ADICIONAR RÁPIDO ── */}
        {SUGESTOES.some(s => !jaExiste(s.slug)) && (
          <>
            <p className="text-[10px] font-bold tracking-[0.1em] text-[#3F3F46] uppercase mb-3 flex items-center gap-2">
              Adicionar rápido
              <span className="flex-1 h-px bg-[#1C1C1E]" />
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.filter(s => !jaExiste(s.slug)).map(s => (
                <button
                  key={s.slug}
                  onClick={() => openNew(s)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#1C1C1E] text-[#71717A] hover:text-white hover:border-[#7B3FE4]/40 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  {s.nome}
                </button>
              ))}
            </div>
          </>
        )}

      </main>

      {/* ── MODAL ── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-[580px] bg-[#0A0A0B] border-l border-[#1C1C1E] flex flex-col h-screen">

            {/* header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1C1C1E] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#7B3FE4]/15 flex items-center justify-center">
                  <Package className="w-4 h-4 text-[#7B3FE4]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{modal.isNew ? 'Novo produto' : p.nome || 'Editar produto'}</p>
                  {!modal.isNew && <p className="text-xs text-[#52525B] font-mono">{p.slug}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!modal.isNew && (
                  <button onClick={() => setField('ativo', !p.ativo)} className="flex-shrink-0">
                    {p.ativo
                      ? <ToggleRight className="w-7 h-7 text-[#7B3FE4]" />
                      : <ToggleLeft className="w-7 h-7 text-[#3F3F46]" />}
                  </button>
                )}
                <button onClick={() => setModal(m => ({ ...m, open: false }))} className="p-2 rounded-lg text-[#52525B] hover:text-white hover:bg-[#18181A] transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* tabs */}
            <div className="flex border-b border-[#1C1C1E] flex-shrink-0">
              {MODAL_TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 py-3 text-[10px] font-bold tracking-widest uppercase transition-all border-b-2 ${activeTab === t.id ? 'text-[#A78BFA] border-[#7B3FE4]' : 'text-[#3F3F46] border-transparent hover:text-[#71717A]'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* PRODUTO */}
              {activeTab === 'basico' && (
                <>
                  <FieldGroup label="Nome do produto">
                    <input value={p.nome} onChange={e => setField('nome', e.target.value)} placeholder="Ex: Implante Hormonal Bioidêntico" className={inputCls} />
                  </FieldGroup>
                  <FieldGroup label="Slug — identificador único">
                    <input
                      value={p.slug}
                      onChange={e => setField('slug', e.target.value.toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_]/g, ''))}
                      placeholder="implante_hormonal"
                      disabled={!modal.isNew}
                      className={`${inputCls} font-mono ${!modal.isNew ? 'opacity-40' : ''}`}
                    />
                  </FieldGroup>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <button onClick={() => setField('ativo', !p.ativo)} className="flex-shrink-0">
                      {p.ativo ? <ToggleRight className="w-7 h-7 text-[#7B3FE4]" /> : <ToggleLeft className="w-7 h-7 text-[#3F3F46]" />}
                    </button>
                    <span className="text-sm text-[#71717A]">{p.ativo ? 'Produto ativo — ANA pode vender' : 'Produto inativo'}</span>
                  </label>
                  <NextBtn onClick={() => setActiveTab('preco')} label="Preços" />
                </>
              )}

              {/* PREÇOS */}
              {activeTab === 'preco' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Valor PIX (R$)">
                      <input type="number" value={p.valor_pix || ''} onChange={e => setField('valor_pix', Number(e.target.value))} placeholder="5000" className={`${inputCls} font-mono`} />
                    </FieldGroup>
                    <FieldGroup label="Desconto PIX (%)">
                      <input type="number" value={p.desconto_pix_pct || ''} onChange={e => setField('desconto_pix_pct', Number(e.target.value))} placeholder="0" className={`${inputCls} font-mono`} />
                    </FieldGroup>
                    <FieldGroup label="Valor cartão (R$)">
                      <input type="number" value={p.valor_cartao || ''} onChange={e => setField('valor_cartao', Number(e.target.value))} placeholder="5500" className={`${inputCls} font-mono`} />
                    </FieldGroup>
                    <FieldGroup label="Máx. parcelas">
                      <input type="number" value={p.parcelas_max || ''} onChange={e => setField('parcelas_max', Number(e.target.value))} placeholder="6" className={`${inputCls} font-mono`} />
                    </FieldGroup>
                  </div>
                  <FieldGroup label="Texto parcelamento">
                    <input value={p.parcelamento_texto ?? ''} onChange={e => setField('parcelamento_texto', e.target.value)} placeholder="até 6x sem juros" className={inputCls} />
                  </FieldGroup>
                  {(p.valor_pix > 0 || p.valor_cartao > 0) && (
                    <div className="bg-[#7B3FE4]/8 border border-[#7B3FE4]/20 rounded-xl px-4 py-3">
                      <p className="text-[10px] font-bold text-[#7B3FE4] uppercase tracking-widest mb-1">Preview — o que ANA diz</p>
                      <p className="text-xs text-[#C4B5FD] font-mono">
                        PIX R$ {pixFinal.toLocaleString('pt-BR')}{p.desconto_pix_pct > 0 ? ` (-${p.desconto_pix_pct}%)` : ''} · {p.parcelas_max}x R$ {parcela.toLocaleString('pt-BR')} {p.parcelamento_texto}
                      </p>
                    </div>
                  )}
                  <NextBtn onClick={() => setActiveTab('funil')} label="Funil" />
                </>
              )}

              {/* FUNIL */}
              {activeTab === 'funil' && (
                <>
                  <div className="space-y-2">
                    {PADROES.map(pad => {
                      const ativo = p.padrao_funil === pad.value
                      return (
                        <button
                          key={pad.value}
                          onClick={() => setField('padrao_funil', pad.value)}
                          className={`flex items-start gap-3 p-4 rounded-xl border w-full text-left transition-all ${ativo ? 'border-opacity-50' : 'border-[#1C1C1E] hover:border-[#2C2C2E]'}`}
                          style={ativo ? { borderColor: pad.color + '80', background: pad.color + '10' } : {}}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black text-white transition-all" style={{ background: ativo ? pad.color : '#1C1C1E' }}>
                            {pad.sigla}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">{pad.label}</p>
                            <p className="text-[11px] font-mono mt-1" style={{ color: ativo ? pad.color : '#3F3F46' }}>{pad.etapas}</p>
                          </div>
                          <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center" style={ativo ? { borderColor: pad.color } : { borderColor: '#3F3F46' }}>
                            {ativo && <div className="w-1.5 h-1.5 rounded-full" style={{ background: pad.color }} />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <NextBtn onClick={() => setActiveTab('contexto')} label="Contexto" />
                </>
              )}

              {/* CONTEXTO */}
              {activeTab === 'contexto' && (
                <>
                  <FieldGroup label="O que ANA sabe sobre este produto">
                    <textarea value={p.prompt_contexto ?? ''} onChange={e => setField('prompt_contexto', e.target.value)} rows={5} placeholder="Descreva: o que é, como funciona, duração, público-alvo, diferenciais..." className={`${inputCls} resize-none`} />
                  </FieldGroup>
                  <FieldGroup label="Dores do público — ANA usa para criar conexão emocional">
                    <textarea value={p.dores ?? ''} onChange={e => setField('dores', e.target.value)} rows={4} placeholder="cansaço crônico, ganho de peso, falta de energia, metabolismo lento..." className={`${inputCls} resize-none`} />
                  </FieldGroup>
                  <NextBtn onClick={() => setActiveTab('ana_voz')} label="ANA Voz" />
                </>
              )}

              {/* ANA VOZ */}
              {activeTab === 'ana_voz' && (
                <>
                  <div className="bg-[#7B3FE4]/8 border border-[#7B3FE4]/20 rounded-xl px-4 py-3 flex items-start gap-3">
                    <Radio className="w-4 h-4 text-[#7B3FE4] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-[#A78BFA] mb-0.5">Configuração da ligação</p>
                      <p className="text-xs text-[#71717A]">Esses campos são injetados automaticamente no prompt quando ANA ligar para leads deste produto.</p>
                    </div>
                  </div>

                  <FieldGroup label="Médico / empresa responsável">
                    <input value={p.nome_responsavel ?? ''} onChange={e => setField('nome_responsavel', e.target.value)} placeholder="Dr. Vinícius · Hormone Ecosystem" className={inputCls} />
                  </FieldGroup>

                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-[#52525B] uppercase mb-2">Tom de voz</p>
                    <div className="grid grid-cols-2 gap-2">
                      {TONS.map(t => {
                        const ativo = (p.tom_voz ?? 'acolhedor') === t.value
                        return (
                          <button
                            key={t.value}
                            onClick={() => setField('tom_voz', t.value)}
                            className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-all ${ativo ? 'border-[#7B3FE4]/50 bg-[#7B3FE4]/10' : 'border-[#1C1C1E] hover:border-[#2C2C2E]'}`}
                          >
                            <span className={`text-xs font-semibold ${ativo ? 'text-[#A78BFA]' : 'text-[#71717A]'}`}>{t.label}</span>
                            <span className="text-[10px] text-[#3F3F46]">{t.desc}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <FieldGroup label="Script de abertura da ligação">
                    <textarea value={p.script_abertura ?? ''} onChange={e => setField('script_abertura', e.target.value)} rows={3} placeholder={`"Oi! Aqui é a ANA, assistente do Dr. Vinícius. Você demonstrou interesse no programa..."`} className={`${inputCls} resize-none`} />
                    <p className="text-[10px] text-[#3F3F46] mt-1">Deixe em branco para usar o padrão do funil</p>
                  </FieldGroup>

                  <FieldGroup label="Objeções e respostas">
                    <textarea value={p.objecoes ?? ''} onChange={e => setField('objecoes', e.target.value)} rows={5} placeholder={`"Está caro" → Explique o custo de não tratar\n"Vou pensar" → Pergunte o que falta para se sentir segura\n"Tenho medo" → Explique que é bioidêntico e seguro`} className={`${inputCls} resize-none font-mono text-[11px]`} />
                    <p className="text-[10px] text-[#3F3F46] mt-1">Uma objeção por linha. ANA lê durante a ligação.</p>
                  </FieldGroup>
                </>
              )}
            </div>

            {/* footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#1C1C1E] flex-shrink-0">
              <button onClick={() => setModal(m => ({ ...m, open: false }))} className="px-4 py-2 rounded-xl text-sm text-[#71717A] hover:text-white hover:bg-[#18181A] transition-all">
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#7B3FE4] hover:bg-[#6D35CC] text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar produto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111113] border border-red-500/20 rounded-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Remover produto</p>
                <p className="text-xs text-[#52525B]">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm text-[#71717A] mb-5">
              Remover <span className="font-mono text-white">{confirmDelete}</span>? Os leads associados não são afetados.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl text-sm text-[#71717A] hover:text-white hover:bg-[#18181A] transition-all border border-[#1C1C1E]">
                Cancelar
              </button>
              <button onClick={() => deletar(confirmDelete)} className="flex-1 py-2 rounded-xl text-sm text-white font-semibold bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition-all">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border transition-all ${toast.ok ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400'}`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

/* ── PRODUCT CARD ── */
function ProdutoCard({
  prod, onEdit, onToggle, onDelete,
}: {
  prod: Produto
  onEdit: (p: Produto) => void
  onToggle: (slug: string, ativo: boolean) => void
  onDelete: (slug: string) => void
}) {
  const pad = PADROES.find(p => p.value === prod.padrao_funil)
  const pixFinal = Math.round(prod.valor_pix * (1 - (prod.desconto_pix_pct || 0) / 100))
  const parcela  = prod.parcelas_max > 0 ? Math.round(prod.valor_cartao / prod.parcelas_max) : 0
  const emoji = EMOJI_MAP[prod.slug] ?? '📦'

  return (
    <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 hover:border-[#7B3FE4]/40 hover:shadow-[0_0_32px_rgba(123,63,228,0.12)] transition-all duration-200">
      {/* top row */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ background: (pad?.color ?? '#7B3FE4') + '20' }}>
          {emoji}
        </div>
        <div className="flex items-center gap-2">
          {prod.ativo ? (
            <span className="flex items-center gap-1.5 bg-[#22c55e]/10 border border-[#22c55e]/25 text-[#22c55e] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              Ativo
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-[#3F3F46]/20 border border-[#3F3F46]/30 text-[#52525B] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3F3F46]" />
              Inativo
            </span>
          )}
        </div>
      </div>
      {/* funil badge */}
      <div className="mb-2">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono"
          style={{ color: pad?.color, background: (pad?.color ?? '#7B3FE4') + '15', borderColor: (pad?.color ?? '#7B3FE4') + '40' }}
        >
          {pad?.sigla} — {pad?.label}
        </span>
      </div>

      {/* name */}
      <h3 className="text-base font-bold text-white">{prod.nome}</h3>
      <p className="text-[11px] text-[#52525B] font-mono mt-0.5 mb-3">{prod.slug}</p>

      {/* metrics */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-[#18181A] rounded-lg p-2.5 text-center">
          <p className="text-sm font-bold font-mono text-white tabular-nums">
            {prod.valor_pix > 0 ? `R$ ${pixFinal.toLocaleString('pt-BR')}` : '—'}
          </p>
          <p className="text-[9px] text-[#3F3F46] uppercase tracking-wider mt-0.5">
            PIX{prod.desconto_pix_pct > 0 ? ` (-${prod.desconto_pix_pct}%)` : ''}
          </p>
        </div>
        <div className="bg-[#18181A] rounded-lg p-2.5 text-center">
          <p className="text-sm font-bold font-mono text-white tabular-nums">
            {prod.valor_cartao > 0 ? `${prod.parcelas_max}x ${parcela.toLocaleString('pt-BR')}` : '—'}
          </p>
          <p className="text-[9px] text-[#3F3F46] uppercase tracking-wider mt-0.5">Cartão</p>
        </div>
      </div>

      {/* tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {prod.tom_voz && (
          <span className="bg-[#18181A] border border-[#1C1C1E] rounded px-2 py-0.5 text-[10px] text-[#71717A] font-mono">
            {prod.tom_voz}
          </span>
        )}
        {prod.nome_responsavel && (
          <span className="bg-[#18181A] border border-[#1C1C1E] rounded px-2 py-0.5 text-[10px] text-[#71717A] font-mono truncate max-w-[140px]">
            {prod.nome_responsavel}
          </span>
        )}
        {prod.prompt_contexto && (
          <span className="bg-[#18181A] border border-[#1C1C1E] rounded px-2 py-0.5 text-[10px] text-[#22c55e] font-mono">contexto ✓</span>
        )}
        {prod.objecoes && (
          <span className="bg-[#18181A] border border-[#1C1C1E] rounded px-2 py-0.5 text-[10px] text-[#22c55e] font-mono">objeções ✓</span>
        )}
      </div>

      {/* actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(prod)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium bg-[#18181A] border border-[#1C1C1E] text-[#71717A] hover:text-white hover:border-[#7B3FE4]/40 transition-all"
        >
          <Pencil className="w-3 h-3" />
          Editar
        </button>
        <button
          onClick={() => onToggle(prod.slug, !prod.ativo)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium bg-[#18181A] border border-[#1C1C1E] text-[#71717A] hover:text-white hover:border-[#7B3FE4]/40 transition-all"
        >
          {prod.ativo ? <ToggleRight className="w-4 h-4 text-[#7B3FE4]" /> : <ToggleLeft className="w-4 h-4" />}
        </button>
        {prod.slug !== 'implante' && (
          <button
            onClick={() => onDelete(prod.slug)}
            className="flex items-center justify-center px-3 py-2 rounded-lg text-[11px] bg-[#18181A] border border-[#1C1C1E] text-[#71717A] hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/8 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

/* ── helpers ── */
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-widest text-[#52525B] uppercase mb-2">{label}</p>
      {children}
    </div>
  )
}

function NextBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="flex justify-end pt-2">
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#18181A] border border-[#1C1C1E] text-[#71717A] hover:text-white hover:border-[#7B3FE4]/40 transition-all"
      >
        {label}
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

const inputCls = 'w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#7B3FE4]/50 transition-colors leading-relaxed'
