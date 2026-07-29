'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Bot,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Radio,
} from 'lucide-react'

type PadraoFunil = 'consultivo' | 'digital' | 'recrutamento'

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
  created_at?: string
}

const PADROES: { value: PadraoFunil; label: string; sigla: string; desc: string; etapas: string; cor: string }[] = [
  {
    value: 'consultivo',
    label: 'Consultivo High Ticket',
    sigla: 'A',
    desc: 'Funil completo com qualificação aprofundada, construção de dor e fechamento consultivo.',
    etapas: 'Qualificação → Dor → Educação → Fechamento → Pagamento',
    cor: '#7B3FE4',
  },
  {
    value: 'digital',
    label: 'Evento / Digital Simples',
    sigla: 'B',
    desc: 'Funil curto para produtos de baixo atrito. ANA apresenta, responde dúvidas e envia o link.',
    etapas: 'Interesse → Preço → Pagamento',
    cor: '#3B82F6',
  },
  {
    value: 'recrutamento',
    label: 'Recrutamento / MLM',
    sigla: 'C',
    desc: 'ANA atua como recrutadora: apresenta a oportunidade, qualifica o perfil e convida.',
    etapas: 'Oportunidade → Qualificação → Convite',
    cor: '#F59E0B',
  },
]

const EMPTY: Produto = {
  slug: '',
  nome: '',
  ativo: true,
  padrao_funil: 'consultivo',
  prompt_contexto: '',
  dores: '',
  valor_pix: 0,
  valor_cartao: 0,
  parcelas_max: 6,
  desconto_pix_pct: 0,
  parcelamento_texto: 'até 6x sem juros',
}

const SUGESTOES = [
  { slug: 'emagrecimento', nome: 'Acompanhamento Emagrecimento' },
  { slug: 'mentoria_medica', nome: 'Mentoria Médica' },
  { slug: 'ageless', nome: 'Ageless Marketing Multinível' },
  { slug: 'palestra_vinicius', nome: 'Ingressos Palestra Vinícius' },
  { slug: 'ebook_ia', nome: 'Ebook IA para Empresas' },
]

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; produto: Produto; isNew: boolean }>({
    open: false,
    produto: EMPTY,
    isNew: true,
  })
  const [expandido, setExpandido] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Configuração do modo de atendimento da ANA
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
    setProdutos(jsonP.produtos ?? [])
    const prods: Produto[] = jsonP.produtos ?? []
    const ana = jsonC.config?.atendimento_ana
    if (ana) {
      setModoAna(ana.modo ?? 'perguntar')
      setProdutoFixo(ana.produto_fixo ?? 'implante')
      setProdutosSelecionados(
        ana.produtos_selecionados ?? prods.filter((p: Produto) => p.ativo).map((p: Produto) => p.slug)
      )
    } else {
      setProdutosSelecionados(prods.filter((p: Produto) => p.ativo).map((p: Produto) => p.slug))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchProdutos() }, [fetchProdutos])

  const salvarModoAna = async (
    novoModo?: 'perguntar' | 'fixo',
    novoFixo?: string,
    novosSelecionados?: string[]
  ) => {
    setSavingModo(true)
    const modo = novoModo ?? modoAna
    const fixo = novoFixo ?? produtoFixo
    const selecionados = novosSelecionados ?? produtosSelecionados
    await fetch('/api/admin/configuracoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chave: 'atendimento_ana',
        valor: { modo, produto_fixo: fixo, produtos_selecionados: selecionados },
      }),
    })
    if (novoModo) setModoAna(novoModo)
    if (novoFixo) setProdutoFixo(novoFixo)
    if (novosSelecionados) setProdutosSelecionados(novosSelecionados)
    setSavingModo(false)
    showToast('Modo de atendimento salvo!')
  }

  const toggleProdutoSelecionado = (slug: string) => {
    const novo = produtosSelecionados.includes(slug)
      ? produtosSelecionados.filter(s => s !== slug)
      : [...produtosSelecionados, slug]
    setProdutosSelecionados(novo)
    salvarModoAna(undefined, undefined, novo)
  }

  const abrirNovo = (sugestao?: { slug: string; nome: string }) => {
    setModal({
      open: true,
      isNew: true,
      produto: { ...EMPTY, ...(sugestao ?? {}) },
    })
  }

  const abrirEditar = (p: Produto) => {
    setModal({ open: true, isNew: false, produto: { ...p } })
  }

  const fecharModal = () => setModal(m => ({ ...m, open: false }))

  const salvar = async () => {
    const p = modal.produto
    if (!p.slug.trim() || !p.nome.trim()) {
      showToast('Preencha slug e nome', false)
      return
    }
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
      fecharModal()
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

  const setField = (key: keyof Produto, value: unknown) => {
    setModal(m => ({ ...m, produto: { ...m.produto, [key]: value } }))
  }

  const p = modal.produto
  const valorPixFinal = Math.round(p.valor_pix * (1 - (p.desconto_pix_pct || 0) / 100))
  const parcelaCartao = p.parcelas_max > 0 ? Math.round(p.valor_cartao / p.parcelas_max) : 0

  const jaExiste = (slug: string) => produtos.some(p => p.slug === slug)

  return (
    <div className="flex flex-col h-screen bg-[#080809] text-white">
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-[#1C1C1E]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Produtos</h1>
            <p className="text-xs text-[#52525B]">Gerencie os produtos que ANA vende</p>
          </div>
        </div>
        <button
          onClick={() => abrirNovo()}
          className="flex items-center gap-2 bg-[#7B3FE4] hover:bg-[#6D35CC] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo produto
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">

        {/* Modo de atendimento da ANA */}
        <div className="mb-8 bg-[#0E0E10] border border-[#222228] rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1C1C1E]">
            <div className="w-8 h-8 rounded-lg bg-[#7B3FE4]/15 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-[#7B3FE4]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Modo de atendimento da ANA</p>
              <p className="text-xs text-[#52525B]">Como ANA identifica qual produto atender quando um lead entra</p>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-3">
            {/* Opção: Perguntar */}
            <div
              className={`rounded-xl border transition-all ${
                modoAna === 'perguntar' ? 'border-[#7B3FE4]/50 bg-[#7B3FE4]/8' : 'border-[#222228]'
              }`}
            >
              <button
                onClick={() => salvarModoAna('perguntar')}
                disabled={savingModo}
                className="flex items-start gap-4 p-4 w-full text-left"
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                  modoAna === 'perguntar' ? 'border-[#7B3FE4]' : 'border-[#3F3F46]'
                }`}>
                  {modoAna === 'perguntar' && <div className="w-1.5 h-1.5 rounded-full bg-[#7B3FE4]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white mb-1">ANA pergunta ao lead</p>
                  <p className="text-xs text-[#71717A] leading-relaxed">
                    ANA apresenta um menu e deixa o lead escolher o programa de interesse.
                  </p>
                </div>
              </button>

              {modoAna === 'perguntar' && (
                <div className="px-4 pb-4 border-t border-[#1C1C1E] pt-3">
                  <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-widest mb-3">Quais produtos ANA apresenta no menu</p>
                  <div className="flex flex-col gap-2 mb-3">
                    {produtos.filter(p => p.ativo).map(prod => {
                      const sel = produtosSelecionados.includes(prod.slug)
                      return (
                        <button
                          key={prod.slug}
                          onClick={() => toggleProdutoSelecionado(prod.slug)}
                          disabled={savingModo}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all ${
                            sel ? 'border-[#7B3FE4]/40 bg-[#7B3FE4]/8' : 'border-[#222228] hover:border-[#333338]'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                            sel ? 'bg-[#7B3FE4] border-[#7B3FE4]' : 'border-[#3F3F46]'
                          }`}>
                            {sel && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span className="text-sm text-white flex-1">{prod.nome}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                            prod.padrao_funil === 'consultivo' ? 'bg-[#7B3FE4]/15 text-[#A78BFA]' :
                            prod.padrao_funil === 'digital' ? 'bg-blue-500/15 text-blue-400' :
                            'bg-amber-500/15 text-amber-400'
                          }`}>
                            {prod.padrao_funil === 'consultivo' ? 'A' : prod.padrao_funil === 'digital' ? 'B' : 'C'}
                          </span>
                        </button>
                      )
                    })}
                    {produtos.filter(p => p.ativo).length === 0 && (
                      <p className="text-xs text-[#52525B] italic">Nenhum produto ativo.</p>
                    )}
                  </div>
                  {produtosSelecionados.length > 0 && (
                    <div className="bg-[#18181A] rounded-lg px-3 py-2.5 border border-[#2A2A2E]">
                      <p className="text-[10px] text-[#52525B] mb-1">Preview da mensagem da ANA</p>
                      <p className="text-[11px] text-[#A1A1AA] italic leading-relaxed whitespace-pre-line">
                        {`💜 Para te ajudar melhor, você tem interesse em qual programa?\n${
                          produtos
                            .filter(p => produtosSelecionados.includes(p.slug))
                            .map((p, i) => `${i + 1}. ${p.nome}`)
                            .join('\n')
                        }`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Opção: Produto fixo */}
            <div
              className={`rounded-xl border transition-all ${
                modoAna === 'fixo' ? 'border-[#7B3FE4]/50 bg-[#7B3FE4]/8' : 'border-[#222228]'
              }`}
            >
              <button
                onClick={() => salvarModoAna('fixo')}
                disabled={savingModo}
                className="flex items-start gap-4 p-4 w-full text-left"
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                  modoAna === 'fixo' ? 'border-[#7B3FE4]' : 'border-[#3F3F46]'
                }`}>
                  {modoAna === 'fixo' && <div className="w-1.5 h-1.5 rounded-full bg-[#7B3FE4]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white mb-1">Atender produto fixo</p>
                  <p className="text-xs text-[#71717A] leading-relaxed">
                    ANA vai direto ao funil do produto selecionado, sem perguntar ao lead.
                  </p>
                </div>
              </button>

              {modoAna === 'fixo' && (
                <div className="px-4 pb-4 border-t border-[#1C1C1E] pt-3">
                  <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-widest mb-2">Produto que ANA atende</p>
                  <div className="flex flex-wrap gap-2">
                    {produtos.filter(p => p.ativo).map(prod => (
                      <button
                        key={prod.slug}
                        onClick={e => { e.stopPropagation(); salvarModoAna('fixo', prod.slug) }}
                        disabled={savingModo}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                          produtoFixo === prod.slug
                            ? 'bg-[#7B3FE4] border-[#7B3FE4] text-white'
                            : 'border-[#2A2A2E] text-[#71717A] hover:text-white hover:border-[#7B3FE4]/40'
                        }`}
                      >
                        {prod.nome}
                      </button>
                    ))}
                    {produtos.filter(p => p.ativo).length === 0 && (
                      <p className="text-xs text-[#52525B] italic">Nenhum produto ativo. Ative um produto acima.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sugestões rápidas */}
        {SUGESTOES.some(s => !jaExiste(s.slug)) && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-[#52525B] uppercase tracking-widest mb-3">Adicionar rápido</p>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.filter(s => !jaExiste(s.slug)).map(s => (
                <button
                  key={s.slug}
                  onClick={() => abrirNovo(s)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#222228] text-[#71717A] hover:text-white hover:border-[#7B3FE4]/50 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  {s.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#52525B] text-sm">Carregando...</div>
        ) : produtos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-[#52525B]">
            <Package className="w-8 h-8 opacity-30" />
            <p className="text-sm">Nenhum produto cadastrado</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {produtos.map(prod => {
              const aberto = expandido === prod.slug
              const pixFinal = Math.round(prod.valor_pix * (1 - (prod.desconto_pix_pct || 0) / 100))
              const parcela = prod.parcelas_max > 0 ? Math.round(prod.valor_cartao / prod.parcelas_max) : 0
              return (
                <div key={prod.slug} className={`rounded-2xl border transition-all ${prod.ativo ? 'border-[#222228] bg-[#0E0E10]' : 'border-[#1A1A1C] bg-[#0A0A0C] opacity-60'}`}>
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Toggle */}
                    <button onClick={() => toggleAtivo(prod.slug, !prod.ativo)} className="flex-shrink-0">
                      {prod.ativo
                        ? <ToggleRight className="w-7 h-7 text-[#7B3FE4]" />
                        : <ToggleLeft className="w-7 h-7 text-[#3F3F46]" />}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white truncate">{prod.nome}</span>
                        {prod.ativo && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">Ativo</span>
                        )}
                        {(() => {
                          const pad = PADROES.find(p => p.value === (prod.padrao_funil ?? 'consultivo'))
                          if (!pad) return null
                          return (
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold border"
                              style={{ color: pad.cor, backgroundColor: pad.cor + '20', borderColor: pad.cor + '40' }}>
                              {pad.sigla} — {pad.label}
                            </span>
                          )
                        })()}
                      </div>
                      <div className="flex items-center gap-4 mt-0.5">
                        <span className="text-[11px] text-[#52525B] font-mono">{prod.slug}</span>
                        {prod.valor_pix > 0 && (
                          <span className="text-[11px] text-[#52525B]">
                            PIX R$ {pixFinal.toLocaleString('pt-BR')}
                            {prod.desconto_pix_pct > 0 && <span className="text-emerald-500 ml-1">(-{prod.desconto_pix_pct}%)</span>}
                            {prod.valor_cartao > 0 && ` · ${prod.parcelas_max}x R$ ${parcela.toLocaleString('pt-BR')}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setExpandido(aberto ? null : prod.slug)}
                        className="p-2 rounded-lg text-[#52525B] hover:text-white hover:bg-[#18181A] transition-all"
                        title="Ver detalhes"
                      >
                        {aberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => abrirEditar(prod)}
                        className="p-2 rounded-lg text-[#52525B] hover:text-white hover:bg-[#18181A] transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {prod.slug !== 'implante' && (
                        <button
                          onClick={() => setConfirmDelete(prod.slug)}
                          className="p-2 rounded-lg text-[#52525B] hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandido */}
                  {aberto && (
                    <div className="px-5 pb-5 border-t border-[#1C1C1E] pt-4 grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Bot className="w-3 h-3" /> Contexto da ANA
                        </p>
                        <p className="text-xs text-[#A1A1AA] leading-relaxed whitespace-pre-wrap">
                          {prod.prompt_contexto || <span className="italic text-[#3F3F46]">Não configurado</span>}
                        </p>
                        {prod.dores && (
                          <>
                            <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-widest mb-2 mt-4">Dores do público</p>
                            <p className="text-xs text-[#A1A1AA] leading-relaxed whitespace-pre-wrap">{prod.dores}</p>
                          </>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <DollarSign className="w-3 h-3" /> Preços
                        </p>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between text-[#71717A]"><span>PIX à vista</span><span className="text-white font-semibold">R$ {pixFinal.toLocaleString('pt-BR')}</span></div>
                          {prod.desconto_pix_pct > 0 && <div className="flex justify-between text-[#71717A]"><span>Desconto PIX</span><span className="text-emerald-400 font-semibold">{prod.desconto_pix_pct}%</span></div>}
                          <div className="flex justify-between text-[#71717A]"><span>Cartão ({prod.parcelas_max}x)</span><span className="text-white font-semibold">R$ {parcela.toLocaleString('pt-BR')}/mês</span></div>
                          <div className="flex justify-between text-[#71717A]"><span>Parcelamento</span><span className="text-[#A1A1AA]">{prod.parcelamento_texto}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0E0E10] border border-[#222228] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1C1C1E]">
              <h2 className="text-base font-semibold text-white">
                {modal.isNew ? 'Novo produto' : `Editar — ${p.nome}`}
              </h2>
              <button onClick={fecharModal} className="p-1.5 rounded-lg text-[#52525B] hover:text-white hover:bg-[#18181A] transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Identificação */}
              <section>
                <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-widest mb-3">Identificação</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#71717A] mb-1 block">Nome do produto</label>
                    <input
                      value={p.nome}
                      onChange={e => setField('nome', e.target.value)}
                      placeholder="Ex: Mentoria Médica"
                      className="w-full bg-[#18181A] border border-[#222228] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#7B3FE4]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#71717A] mb-1 block">Slug (identificador único)</label>
                    <input
                      value={p.slug}
                      onChange={e => setField('slug', e.target.value.toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_]/g, ''))}
                      placeholder="Ex: mentoria_medica"
                      disabled={!modal.isNew}
                      className="w-full bg-[#18181A] border border-[#222228] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#7B3FE4]/50 disabled:opacity-40 font-mono"
                    />
                  </div>
                </div>
              </section>

              {/* Preços */}
              <section>
                <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-3 h-3" /> Preços
                </p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-[#71717A] mb-1 block">Valor PIX (R$)</label>
                    <input
                      type="number"
                      value={p.valor_pix || ''}
                      onChange={e => setField('valor_pix', Number(e.target.value))}
                      placeholder="5000"
                      className="w-full bg-[#18181A] border border-[#222228] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#7B3FE4]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#71717A] mb-1 block">Desconto PIX (%)</label>
                    <input
                      type="number"
                      value={p.desconto_pix_pct || ''}
                      onChange={e => setField('desconto_pix_pct', Number(e.target.value))}
                      placeholder="0"
                      className="w-full bg-[#18181A] border border-[#222228] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#7B3FE4]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#71717A] mb-1 block">Valor cartão (R$)</label>
                    <input
                      type="number"
                      value={p.valor_cartao || ''}
                      onChange={e => setField('valor_cartao', Number(e.target.value))}
                      placeholder="5000"
                      className="w-full bg-[#18181A] border border-[#222228] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#7B3FE4]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#71717A] mb-1 block">Máx. parcelas</label>
                    <input
                      type="number"
                      value={p.parcelas_max || ''}
                      onChange={e => setField('parcelas_max', Number(e.target.value))}
                      placeholder="6"
                      className="w-full bg-[#18181A] border border-[#222228] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#7B3FE4]/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#71717A] mb-1 block">Texto parcelamento</label>
                  <input
                    value={p.parcelamento_texto ?? ''}
                    onChange={e => setField('parcelamento_texto', e.target.value)}
                    placeholder="até 6x sem juros"
                    className="w-full bg-[#18181A] border border-[#222228] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#7B3FE4]/50"
                  />
                </div>

                {/* Preview preço */}
                {(p.valor_pix > 0 || p.valor_cartao > 0) && (
                  <div className="mt-3 bg-[#7B3FE4]/8 border border-[#7B3FE4]/20 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-semibold text-[#7B3FE4] uppercase tracking-widest mb-2">Preview — o que ANA vai dizer</p>
                    <p className="text-xs text-[#C4B5FD] leading-relaxed">
                      {p.desconto_pix_pct > 0
                        ? `💜 PIX à vista: R$ ${valorPixFinal.toLocaleString('pt-BR')} (${p.desconto_pix_pct}% de desconto) · Cartão: ${p.parcelas_max}x de R$ ${parcelaCartao.toLocaleString('pt-BR')} (${p.parcelamento_texto})`
                        : `💜 PIX à vista: R$ ${valorPixFinal.toLocaleString('pt-BR')} · Cartão: ${p.parcelas_max}x de R$ ${parcelaCartao.toLocaleString('pt-BR')} (${p.parcelamento_texto})`
                      }
                    </p>
                  </div>
                )}
              </section>

              {/* Padrão de Funil */}
              <section>
                <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-widest mb-3">Padrão de funil</p>
                <div className="flex flex-col gap-2">
                  {PADROES.map(pad => {
                    const ativo = p.padrao_funil === pad.value
                    return (
                      <button
                        key={pad.value}
                        onClick={() => setField('padrao_funil', pad.value)}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                          ativo ? 'border-opacity-50 bg-opacity-8' : 'border-[#222228] hover:border-[#333338]'
                        }`}
                        style={ativo ? { borderColor: pad.cor + '80', backgroundColor: pad.cor + '14' } : {}}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black text-white"
                          style={{ backgroundColor: ativo ? pad.cor : '#222228' }}
                        >
                          {pad.sigla}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{pad.label}</p>
                          <p className="text-[11px] text-[#71717A] mt-0.5 leading-relaxed">{pad.desc}</p>
                          <p className="text-[10px] font-mono mt-1.5" style={{ color: ativo ? pad.cor : '#3F3F46' }}>
                            {pad.etapas}
                          </p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center`}
                          style={ativo ? { borderColor: pad.cor } : { borderColor: '#3F3F46' }}>
                          {ativo && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pad.cor }} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Contexto ANA */}
              <section>
                <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Bot className="w-3 h-3" /> Contexto para ANA
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#71717A] mb-1 block">O que ANA sabe sobre este produto</label>
                    <textarea
                      value={p.prompt_contexto ?? ''}
                      onChange={e => setField('prompt_contexto', e.target.value)}
                      rows={4}
                      placeholder={`Ex: Este é um programa de acompanhamento de emagrecimento com duração de 3 meses. Inclui consultas semanais, plano alimentar personalizado e suporte via WhatsApp. Público-alvo: mulheres 35-60 anos...`}
                      className="w-full bg-[#18181A] border border-[#222228] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#7B3FE4]/50 resize-none leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#71717A] mb-1 block">Dores do público (ANA usa para criar conexão)</label>
                    <textarea
                      value={p.dores ?? ''}
                      onChange={e => setField('dores', e.target.value)}
                      rows={3}
                      placeholder={`Ex: cansaço crônico, dificuldade de perder peso mesmo fazendo dieta, metabolismo lento, falta de energia no dia a dia...`}
                      className="w-full bg-[#18181A] border border-[#222228] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#7B3FE4]/50 resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#1C1C1E]">
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  onClick={() => setField('ativo', !p.ativo)}
                  className="flex-shrink-0"
                >
                  {p.ativo
                    ? <ToggleRight className="w-7 h-7 text-[#7B3FE4]" />
                    : <ToggleLeft className="w-7 h-7 text-[#3F3F46]" />}
                </button>
                <span className="text-sm text-[#71717A]">{p.ativo ? 'Produto ativo' : 'Produto inativo'}</span>
              </label>
              <div className="flex items-center gap-2">
                <button onClick={fecharModal} className="px-4 py-2 rounded-xl text-sm text-[#71717A] hover:text-white hover:bg-[#18181A] transition-all">
                  Cancelar
                </button>
                <button
                  onClick={salvar}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7B3FE4] hover:bg-[#6D35CC] text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar produto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0E0E10] border border-red-500/20 rounded-2xl p-6 max-w-sm w-full mx-4">
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
              Deseja remover <span className="font-mono text-white">{confirmDelete}</span>? Os leads associados não serão afetados.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl text-sm text-[#71717A] hover:text-white hover:bg-[#18181A] transition-all border border-[#222228]">
                Cancelar
              </button>
              <button onClick={() => deletar(confirmDelete)} className="flex-1 py-2 rounded-xl text-sm text-white font-semibold bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition-all">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border transition-all ${toast.ok ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400'}`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
