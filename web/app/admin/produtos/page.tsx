'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Save, ChevronRight, Zap, AlertTriangle } from 'lucide-react'

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

const PADROES: { value: PadraoFunil; sigla: string; label: string; etapas: string }[] = [
  { value: 'consultivo',   sigla: 'A', label: 'Consultivo High Ticket',  etapas: 'Qualificação → Dor → Educação → Fechamento → Pagamento' },
  { value: 'digital',      sigla: 'B', label: 'Evento / Digital Simples', etapas: 'Interesse → Preço → Pagamento' },
  { value: 'recrutamento', sigla: 'C', label: 'Recrutamento / MLM',       etapas: 'Oportunidade → Qualificação → Convite' },
]

const TONS: { value: TomVoz; label: string }[] = [
  { value: 'acolhedor', label: 'Acolhedor' },
  { value: 'formal',    label: 'Formal' },
  { value: 'informal',  label: 'Informal' },
  { value: 'direto',    label: 'Direto' },
]

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

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; produto: Produto; isNew: boolean }>({
    open: false, produto: EMPTY, isNew: true,
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [modoAna, setModoAna] = useState<'perguntar' | 'fixo'>('perguntar')
  const [produtoFixo, setProdutoFixo] = useState<string>('implante')
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([])
  const [savingModo, setSavingModo] = useState(false)
  const [activeSection, setActiveSection] = useState<'basico' | 'preco' | 'funil' | 'ana_texto' | 'ana_voz'>('basico')

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
    if (json.ok) { showToast(modal.isNew ? 'Produto criado' : 'Produto salvo'); setModal(m => ({ ...m, open: false })); fetchProdutos() }
    else showToast(json.error ?? 'Erro ao salvar', false)
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
    showToast('Removido')
    fetchProdutos()
  }

  const setField = (key: keyof Produto, value: unknown) =>
    setModal(m => ({ ...m, produto: { ...m.produto, [key]: value } }))

  const p = modal.produto
  const pixFinal = Math.round(p.valor_pix * (1 - (p.desconto_pix_pct || 0) / 100))
  const parcela  = p.parcelas_max > 0 ? Math.round(p.valor_cartao / p.parcelas_max) : 0
  const jaExiste = (slug: string) => produtos.some(p => p.slug === slug)

  const SECTIONS = [
    { id: 'basico',    label: 'Identificação' },
    { id: 'preco',     label: 'Preços' },
    { id: 'funil',     label: 'Funil' },
    { id: 'ana_texto', label: 'Contexto' },
    { id: 'ana_voz',   label: 'ANA Voz' },
  ] as const

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        input,textarea,select{outline:none;font-family:inherit}
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
        input[type=number]{-moz-appearance:textfield}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#000}
        ::-webkit-scrollbar-thumb{background:#222}
        .row-hover:hover{background:#0a0a0a}
        .btn-ghost:hover{background:#111;color:#fff}
        .btn-ghost:focus{outline:1px solid #333}
        .tab-btn:hover{color:#fff}
        .check-row:hover{background:#0d0d0d}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 3, color: '#444', textTransform: 'uppercase' }}>PRODUTOS</span>
          <span style={{ width: 1, height: 16, background: '#1a1a1a' }} />
          <span style={{ fontSize: 11, color: '#444', fontFamily: 'monospace' }}>
            {loading ? '...' : `${produtos.filter(p => p.ativo).length} ativos / ${produtos.length} total`}
          </span>
        </div>
        <button
          onClick={() => { setModal({ open: true, isNew: true, produto: EMPTY }); setActiveSection('basico') }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#000', border: 'none', padding: '0 16px', height: 32, cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}
        >
          <Plus size={13} />
          NOVO PRODUTO
        </button>
      </div>

      <div style={{ padding: '0 32px', maxWidth: 1100, margin: '0 auto' }}>

        {/* ── MODO ANA ── */}
        <div style={{ borderBottom: '1px solid #111', padding: '24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={12} color="#e8ff00" />
              <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, color: '#555', textTransform: 'uppercase' }}>Modo de Atendimento — ANA</span>
            </div>
            {savingModo && <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#444' }}>salvando...</span>}
          </div>

          <div style={{ display: 'flex', gap: 2 }}>
            {/* opção: perguntar */}
            <div style={{ flex: 1, border: `1px solid ${modoAna === 'perguntar' ? '#e8ff00' : '#1a1a1a'}`, background: modoAna === 'perguntar' ? '#0d0d00' : 'transparent', transition: 'all .15s' }}>
              <button
                onClick={() => salvarModoAna('perguntar')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: modoAna === 'perguntar' ? '#e8ff00' : '#555', textAlign: 'left' }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: modoAna === 'perguntar' ? '#e8ff00' : '#222', flexShrink: 0, transition: 'background .15s' }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: modoAna === 'perguntar' ? '#e8ff00' : '#888', marginBottom: 2 }}>ANA PERGUNTA AO LEAD</div>
                  <div style={{ fontSize: 11, color: '#444', fontFamily: 'monospace' }}>Apresenta menu → lead escolhe o programa</div>
                </div>
              </button>

              {modoAna === 'perguntar' && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid #1a1a1a', marginTop: 0, paddingTop: 12 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#333', marginBottom: 10, textTransform: 'uppercase' }}>Produtos no menu</div>
                  {produtos.filter(pp => pp.ativo).map(prod => {
                    const sel = produtosSelecionados.includes(prod.slug)
                    return (
                      <button
                        key={prod.slug}
                        onClick={() => toggleProdutoSelecionado(prod.slug)}
                        className="check-row"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 8px', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 2, transition: 'background .1s' }}
                      >
                        <div style={{ width: 12, height: 12, border: `1px solid ${sel ? '#e8ff00' : '#333'}`, background: sel ? '#e8ff00' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .1s' }}>
                          {sel && <div style={{ width: 6, height: 6, background: '#000' }} />}
                        </div>
                        <span style={{ fontSize: 12, color: sel ? '#fff' : '#555' }}>{prod.nome}</span>
                        <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 10, color: '#333' }}>
                          {PADROES.find(pp => pp.value === prod.padrao_funil)?.sigla}
                        </span>
                      </button>
                    )
                  })}
                  {produtos.filter(pp => pp.ativo).length === 0 && (
                    <span style={{ fontSize: 11, color: '#333', fontFamily: 'monospace' }}>nenhum produto ativo</span>
                  )}
                </div>
              )}
            </div>

            {/* opção: fixo */}
            <div style={{ flex: 1, border: `1px solid ${modoAna === 'fixo' ? '#e8ff00' : '#1a1a1a'}`, background: modoAna === 'fixo' ? '#0d0d00' : 'transparent', transition: 'all .15s' }}>
              <button
                onClick={() => salvarModoAna('fixo')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: modoAna === 'fixo' ? '#e8ff00' : '#555', textAlign: 'left' }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: modoAna === 'fixo' ? '#e8ff00' : '#222', flexShrink: 0, transition: 'background .15s' }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: modoAna === 'fixo' ? '#e8ff00' : '#888', marginBottom: 2 }}>PRODUTO FIXO</div>
                  <div style={{ fontSize: 11, color: '#444', fontFamily: 'monospace' }}>ANA vai direto para o funil selecionado</div>
                </div>
              </button>

              {modoAna === 'fixo' && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid #1a1a1a', paddingTop: 12 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#333', marginBottom: 10, textTransform: 'uppercase' }}>Produto ativo</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {produtos.filter(pp => pp.ativo).map(prod => (
                      <button
                        key={prod.slug}
                        onClick={e => { e.stopPropagation(); salvarModoAna('fixo', prod.slug) }}
                        style={{ padding: '5px 12px', border: `1px solid ${produtoFixo === prod.slug ? '#e8ff00' : '#222'}`, background: produtoFixo === prod.slug ? '#e8ff00' : 'transparent', color: produtoFixo === prod.slug ? '#000' : '#555', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .1s' }}
                      >
                        {prod.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SUGESTÕES ── */}
        {SUGESTOES.some(s => !jaExiste(s.slug)) && (
          <div style={{ padding: '20px 0', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#333', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Adicionar</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SUGESTOES.filter(s => !jaExiste(s.slug)).map(s => (
                <button
                  key={s.slug}
                  onClick={() => { setModal({ open: true, isNew: true, produto: { ...EMPTY, ...s } }); setActiveSection('basico') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', border: '1px solid #1a1a1a', background: 'none', color: '#444', fontSize: 11, cursor: 'pointer', transition: 'all .1s' }}
                  className="btn-ghost"
                >
                  <Plus size={10} />
                  {s.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── LISTA ── */}
        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: '#333', letterSpacing: 2 }}>CARREGANDO...</div>
        ) : produtos.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#333', letterSpacing: 2 }}>NENHUM PRODUTO</div>
          </div>
        ) : (
          <div>
            {/* cabeçalho tabela */}
            <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 80px 140px 100px 80px', gap: 0, padding: '12px 16px', borderBottom: '1px solid #111' }}>
              {['', 'PRODUTO', 'FUNIL', 'PREÇO PIX', 'CARTÃO', ''].map((h, i) => (
                <span key={i} style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#333', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>

            {produtos.map(prod => {
              const pxFin = Math.round(prod.valor_pix * (1 - (prod.desconto_pix_pct || 0) / 100))
              const parc  = prod.parcelas_max > 0 ? Math.round(prod.valor_cartao / prod.parcelas_max) : 0
              const pad   = PADROES.find(pp => pp.value === prod.padrao_funil)

              return (
                <div
                  key={prod.slug}
                  className="row-hover"
                  style={{ display: 'grid', gridTemplateColumns: '24px 1fr 80px 140px 100px 80px', gap: 0, padding: '14px 16px', borderBottom: '1px solid #0d0d0d', alignItems: 'center', transition: 'background .1s', opacity: prod.ativo ? 1 : 0.35 }}
                >
                  {/* status dot */}
                  <div>
                    <button
                      onClick={() => toggleAtivo(prod.slug, !prod.ativo)}
                      title={prod.ativo ? 'Desativar' : 'Ativar'}
                      style={{ width: 8, height: 8, borderRadius: '50%', background: prod.ativo ? '#00ff88' : '#222', border: 'none', cursor: 'pointer', padding: 0, display: 'block', transition: 'background .15s' }}
                    />
                  </div>

                  {/* nome + slug */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e8e8', marginBottom: 2 }}>{prod.nome}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#333' }}>{prod.slug}</div>
                  </div>

                  {/* funil */}
                  <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#555' }}>
                    <span style={{ background: '#111', padding: '2px 6px', fontSize: 10, fontWeight: 700 }}>{pad?.sigla}</span>
                  </div>

                  {/* pix */}
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#888', fontVariantNumeric: 'tabular-nums' }}>
                    {prod.valor_pix > 0 ? `R$ ${pxFin.toLocaleString('pt-BR')}` : '—'}
                    {prod.desconto_pix_pct > 0 && <span style={{ marginLeft: 6, fontSize: 9, color: '#00ff88' }}>-{prod.desconto_pix_pct}%</span>}
                  </div>

                  {/* cartão */}
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#555', fontVariantNumeric: 'tabular-nums' }}>
                    {prod.valor_cartao > 0 ? `${prod.parcelas_max}x ${parc.toLocaleString('pt-BR')}` : '—'}
                  </div>

                  {/* ações */}
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { setModal({ open: true, isNew: false, produto: { ...prod } }); setActiveSection('basico') }}
                      className="btn-ghost"
                      style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #1a1a1a', color: '#444', cursor: 'pointer', transition: 'all .1s' }}
                    >
                      <Pencil size={11} />
                    </button>
                    {prod.slug !== 'implante' && (
                      <button
                        onClick={() => setConfirmDelete(prod.slug)}
                        className="btn-ghost"
                        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #1a1a1a', color: '#444', cursor: 'pointer', transition: 'all .1s' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      {modal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.85)' }}>
          <div style={{ width: '100%', maxWidth: 640, background: '#000', borderLeft: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', height: '100vh' }}>

            {/* modal header */}
            <div style={{ padding: '0 24px', height: 56, borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, color: '#444', textTransform: 'uppercase' }}>
                  {modal.isNew ? 'NOVO PRODUTO' : p.slug}
                </span>
                {!modal.isNew && (
                  <button
                    onClick={() => toggleAtivo(p.slug, !p.ativo)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', border: `1px solid ${p.ativo ? '#00ff88' : '#222'}`, background: 'none', color: p.ativo ? '#00ff88' : '#333', fontSize: 10, fontFamily: 'monospace', cursor: 'pointer', letterSpacing: 1 }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.ativo ? '#00ff88' : '#333' }} />
                    {p.ativo ? 'ATIVO' : 'INATIVO'}
                  </button>
                )}
              </div>
              <button
                onClick={() => setModal(m => ({ ...m, open: false }))}
                className="btn-ghost"
                style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #1a1a1a', color: '#444', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* section tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #111', flexShrink: 0 }}>
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className="tab-btn"
                  style={{ flex: 1, padding: '10px 4px', background: 'none', border: 'none', borderBottom: `2px solid ${activeSection === s.id ? '#e8ff00' : 'transparent'}`, color: activeSection === s.id ? '#e8ff00' : '#333', fontSize: 9, fontFamily: 'monospace', letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer', transition: 'color .1s' }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* modal body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

              {/* ─ IDENTIFICAÇÃO ─ */}
              {activeSection === 'basico' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Field label="Nome do produto">
                    <input
                      value={p.nome}
                      onChange={e => setField('nome', e.target.value)}
                      placeholder="Ex: Implante Hormonal Bioidêntico"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Slug — identificador único (sem espaços)">
                    <input
                      value={p.slug}
                      onChange={e => setField('slug', e.target.value.toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_]/g, ''))}
                      placeholder="implante_hormonal"
                      disabled={!modal.isNew}
                      style={{ ...inputStyle, fontFamily: 'monospace', opacity: modal.isNew ? 1 : 0.4 }}
                    />
                  </Field>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', border: '1px solid #1a1a1a', marginTop: 4 }}>
                    <button
                      onClick={() => setField('ativo', !p.ativo)}
                      style={{ width: 32, height: 18, background: p.ativo ? '#e8ff00' : '#111', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .15s', flexShrink: 0 }}
                    >
                      <div style={{ position: 'absolute', top: 3, left: p.ativo ? 16 : 3, width: 12, height: 12, background: p.ativo ? '#000' : '#333', transition: 'left .15s' }} />
                    </button>
                    <span style={{ fontSize: 12, color: p.ativo ? '#888' : '#333' }}>{p.ativo ? 'Produto ativo — ANA pode vender' : 'Produto inativo'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button onClick={() => setActiveSection('preco')} style={{ ...nextBtnStyle }}>
                      PREÇOS <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* ─ PREÇOS ─ */}
              {activeSection === 'preco' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Valor PIX (R$)">
                      <input type="number" value={p.valor_pix || ''} onChange={e => setField('valor_pix', Number(e.target.value))} placeholder="5000" style={{ ...inputStyle, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }} />
                    </Field>
                    <Field label="Desconto PIX (%)">
                      <input type="number" value={p.desconto_pix_pct || ''} onChange={e => setField('desconto_pix_pct', Number(e.target.value))} placeholder="0" style={{ ...inputStyle, fontFamily: 'monospace' }} />
                    </Field>
                    <Field label="Valor cartão (R$)">
                      <input type="number" value={p.valor_cartao || ''} onChange={e => setField('valor_cartao', Number(e.target.value))} placeholder="5500" style={{ ...inputStyle, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }} />
                    </Field>
                    <Field label="Máx. parcelas">
                      <input type="number" value={p.parcelas_max || ''} onChange={e => setField('parcelas_max', Number(e.target.value))} placeholder="6" style={{ ...inputStyle, fontFamily: 'monospace' }} />
                    </Field>
                  </div>
                  <Field label="Texto parcelamento">
                    <input value={p.parcelamento_texto ?? ''} onChange={e => setField('parcelamento_texto', e.target.value)} placeholder="até 6x sem juros" style={inputStyle} />
                  </Field>
                  {(p.valor_pix > 0 || p.valor_cartao > 0) && (
                    <div style={{ padding: '12px 16px', border: '1px solid #1a1a00', background: '#0a0a00' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#555', marginBottom: 8, textTransform: 'uppercase' }}>Preview — o que ANA diz</div>
                      <div style={{ fontSize: 12, color: '#888', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
                        PIX R$ {pixFinal.toLocaleString('pt-BR')}{p.desconto_pix_pct > 0 ? ` (${p.desconto_pix_pct}% off)` : ''} · {p.parcelas_max}x R$ {parcela.toLocaleString('pt-BR')} {p.parcelamento_texto}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button onClick={() => setActiveSection('funil')} style={{ ...nextBtnStyle }}>
                      FUNIL <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* ─ FUNIL ─ */}
              {activeSection === 'funil' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {PADROES.map(pad => {
                    const ativo = p.padrao_funil === pad.value
                    return (
                      <button
                        key={pad.value}
                        onClick={() => setField('padrao_funil', pad.value)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px', border: `1px solid ${ativo ? '#e8ff00' : '#1a1a1a'}`, background: ativo ? '#0d0d00' : 'none', cursor: 'pointer', textAlign: 'left', transition: 'all .1s' }}
                      >
                        <div style={{ width: 28, height: 28, background: ativo ? '#e8ff00' : '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'monospace', fontSize: 13, fontWeight: 900, color: ativo ? '#000' : '#333' }}>
                          {pad.sigla}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: ativo ? '#e8ff00' : '#666', marginBottom: 4 }}>{pad.label}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#333', letterSpacing: 0.5 }}>{pad.etapas}</div>
                        </div>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: ativo ? '#e8ff00' : '#222', flexShrink: 0, marginTop: 4, transition: 'background .1s' }} />
                      </button>
                    )
                  })}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button onClick={() => setActiveSection('ana_texto')} style={{ ...nextBtnStyle }}>
                      CONTEXTO <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* ─ CONTEXTO ANA ─ */}
              {activeSection === 'ana_texto' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Field label="O que ANA sabe sobre este produto">
                    <textarea
                      value={p.prompt_contexto ?? ''}
                      onChange={e => setField('prompt_contexto', e.target.value)}
                      rows={5}
                      placeholder="Descreva o produto: o que é, como funciona, duração, público-alvo, diferenciais..."
                      style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
                    />
                  </Field>
                  <Field label="Dores do público — ANA usa para criar conexão emocional">
                    <textarea
                      value={p.dores ?? ''}
                      onChange={e => setField('dores', e.target.value)}
                      rows={4}
                      placeholder="cansaço crônico, ganho de peso, falta de energia, metabolismo lento..."
                      style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                    />
                  </Field>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button onClick={() => setActiveSection('ana_voz')} style={{ ...nextBtnStyle }}>
                      ANA VOZ <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* ─ ANA VOZ ─ */}
              {activeSection === 'ana_voz' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ padding: '10px 14px', border: '1px solid #1a1a00', background: '#0a0a00' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#555', marginBottom: 4, textTransform: 'uppercase' }}>Configuração da ligação</div>
                    <div style={{ fontSize: 11, color: '#444' }}>Esses campos serão injetados automaticamente no prompt da ANA quando ela ligar para leads deste produto.</div>
                  </div>

                  <Field label="Médico / empresa responsável">
                    <input
                      value={p.nome_responsavel ?? ''}
                      onChange={e => setField('nome_responsavel', e.target.value)}
                      placeholder="Dr. Vinícius · Clínica Hormone Ecosystem"
                      style={inputStyle}
                    />
                  </Field>

                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#444', marginBottom: 10, textTransform: 'uppercase' }}>Tom de voz</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {TONS.map(t => {
                        const ativo = (p.tom_voz ?? 'acolhedor') === t.value
                        return (
                          <button
                            key={t.value}
                            onClick={() => setField('tom_voz', t.value)}
                            style={{ padding: '10px 14px', border: `1px solid ${ativo ? '#e8ff00' : '#1a1a1a'}`, background: ativo ? '#0d0d00' : 'none', color: ativo ? '#e8ff00' : '#444', fontSize: 11, fontWeight: ativo ? 700 : 400, cursor: 'pointer', textAlign: 'left', transition: 'all .1s', fontFamily: 'monospace', letterSpacing: 1 }}
                          >
                            {t.label.toUpperCase()}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <Field label="Script de abertura da ligação">
                    <textarea
                      value={p.script_abertura ?? ''}
                      onChange={e => setField('script_abertura', e.target.value)}
                      rows={4}
                      placeholder={`"Oi! Aqui é a ANA, assistente do Dr. Vinícius. Você entrou em contato sobre o implante hormonal bioidêntico..."`}
                      style={{ ...inputStyle, resize: 'vertical', minHeight: 80, fontSize: 12 }}
                    />
                    <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#333', marginTop: 4 }}>Deixe em branco para usar o padrão do funil</div>
                  </Field>

                  <Field label="Objeções e respostas">
                    <textarea
                      value={p.objecoes ?? ''}
                      onChange={e => setField('objecoes', e.target.value)}
                      rows={5}
                      placeholder={`"Está caro" → Explique o custo de não tratar\n"Vou pensar" → Pergunte o que falta para se sentir segura\n"Tenho medo" → Explique que é bioidêntico, seguro e monitorado`}
                      style={{ ...inputStyle, resize: 'vertical', minHeight: 100, fontFamily: 'monospace', fontSize: 11 }}
                    />
                    <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#333', marginTop: 4 }}>Uma objeção por linha. ANA lê durante a ligação.</div>
                  </Field>
                </div>
              )}
            </div>

            {/* modal footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              <button
                onClick={() => setModal(m => ({ ...m, open: false }))}
                className="btn-ghost"
                style={{ padding: '0 16px', height: 36, background: 'none', border: '1px solid #1a1a1a', color: '#444', fontSize: 12, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 20px', height: 36, background: '#fff', border: 'none', color: '#000', fontSize: 12, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.5 : 1, letterSpacing: 0.5 }}
              >
                <Save size={13} />
                {saving ? 'SALVANDO...' : 'SALVAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE ── */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)' }}>
          <div style={{ width: 380, background: '#000', border: '1px solid #ff3333', padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <AlertTriangle size={14} color="#ff3333" />
              <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: '#ff3333', textTransform: 'uppercase' }}>Confirmar remoção</span>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#555', marginBottom: 24, lineHeight: 1.6 }}>
              Remover <span style={{ color: '#888' }}>{confirmDelete}</span>? Os leads associados não são afetados.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost" style={{ flex: 1, height: 36, background: 'none', border: '1px solid #1a1a1a', color: '#444', fontSize: 11, cursor: 'pointer' }}>
                CANCELAR
              </button>
              <button onClick={() => deletar(confirmDelete)} style={{ flex: 1, height: 36, background: '#ff3333', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>
                REMOVER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 70, padding: '10px 18px', background: '#000', border: `1px solid ${toast.ok ? '#00ff88' : '#ff3333'}`, color: toast.ok ? '#00ff88' : '#ff3333', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

/* ─ helpers ─ */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#444', marginBottom: 6, textTransform: 'uppercase' }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#080808',
  border: '1px solid #1a1a1a',
  padding: '10px 12px',
  fontSize: 13,
  color: '#e8e8e8',
  transition: 'border-color .1s',
}

const nextBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 16px',
  height: 32,
  background: 'none',
  border: '1px solid #1a1a1a',
  color: '#444',
  fontSize: 10,
  fontFamily: 'monospace',
  letterSpacing: 2,
  cursor: 'pointer',
  textTransform: 'uppercase' as const,
}
