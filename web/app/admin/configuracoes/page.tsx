'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  DollarSign, Megaphone, RefreshCw, Save, Check, AlertTriangle,
  Tag, CreditCard, Percent, Calendar, Bell, MessageSquare, Zap, Plus, X,
} from 'lucide-react'

/* ─── Types ─── */
interface Produto {
  slug: string
  nome: string
  status: string
  ativo?: boolean
  padrao_funil?: string
  valor_pix: number | null
  valor_cartao: number | null
  desconto_pix_pct: number | null
  parcelas_max: number | null
  juros_cartao_pct: number | null
  parcelamento_texto: string | null
  campanha?: ConfigCampanha | null
  renovacao?: ConfigRenovacao | null
}

interface ConfigPagamento {
  valor_pix: number
  valor_cartao: number
  desconto_pix_pct: number
  parcelas_max: number
  juros_cartao_pct: number
  parcelamento_texto: string
}

interface ConfigCampanha {
  ativa: boolean
  nome: string
  desconto_pct: number
  inicio: string
  fim: string
  mensagem_whatsapp: string
}

interface ConfigRenovacao {
  alertas_ativos: boolean
  dias_antes: number
  mensagem: string
}

type Aba = 'pagamento' | 'campanha' | 'renovacao'

const STATUS_COLOR: Record<string, string> = {
  ativo:   '#22c55e',
  pausado: '#f97316',
  inativo: '#52525B',
}

const PAG_DEFAULT: ConfigPagamento = {
  valor_pix: 5000, valor_cartao: 5000, desconto_pix_pct: 0,
  parcelas_max: 6, juros_cartao_pct: 0, parcelamento_texto: 'até 6x sem juros',
}
const CAMP_DEFAULT: ConfigCampanha = {
  ativa: false, nome: '', desconto_pct: 0, inicio: '', fim: '', mensagem_whatsapp: '',
}
const RENOV_DEFAULT: ConfigRenovacao = {
  alertas_ativos: true, dias_antes: 30,
  mensagem: 'Olá! 💜 Seu implante hormonal está próximo do vencimento. Vamos agendar sua renovação?',
}

/* ─── Helpers ─── */
function moeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function InputField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5A5A70', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: '#3A3A50', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

function TextInput({ value, onChange, prefix, suffix, type = 'text', min, max, step, placeholder }: {
  value: string | number; onChange: (v: string) => void; prefix?: string; suffix?: string;
  type?: string; min?: number; max?: number; step?: number; placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: '#111116', border: '1px solid #2C2C38', borderRadius: 8, overflow: 'hidden' }}>
      {prefix && <span style={{ padding: '0 10px', color: '#4A4A60', fontSize: 13, borderRight: '1px solid #2C2C38', height: 40, display: 'flex', alignItems: 'center' }}>{prefix}</span>}
      <input
        type={type} value={value} min={min} max={max} step={step} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#F0F0F5', fontSize: 14, fontWeight: 600, padding: '0 12px', height: 40 }}
      />
      {suffix && <span style={{ padding: '0 10px', color: '#4A4A60', fontSize: 13, borderLeft: '1px solid #2C2C38', height: 40, display: 'flex', alignItems: 'center' }}>{suffix}</span>}
    </div>
  )
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={() => onChange(!value)}
        style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', background: value ? '#7B3FE4' : '#2C2C38' }}
      >
        <span style={{ position: 'absolute', top: 3, left: value ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </button>
      <span style={{ fontSize: 13, color: value ? '#A78BFA' : '#5A5A70', fontWeight: 600 }}>{label}</span>
    </div>
  )
}

function Card({ children, title, icon }: { children: React.ReactNode; title: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: '#0E0E12', border: '1px solid #1E1E28', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E1E28', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#7B3FE4' }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#D0D0E0' }}>{title}</span>
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  )
}

/* ─── Modal Novo Produto ─── */
function ModalNovoProduto({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Produto) => void }) {
  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  function handleNome(v: string) {
    setNome(v)
    if (!slugManual) setSlug(slugify(v))
  }

  async function salvar() {
    if (!nome.trim()) { setErro('Nome obrigatório'); return }
    if (!slug.trim()) { setErro('Slug obrigatório'); return }
    setSaving(true)
    setErro('')
    const novoProduto: Produto = {
      slug, nome, status: 'inativo', ativo: false,
      valor_pix: 5000, valor_cartao: 5000, desconto_pix_pct: 0,
      parcelas_max: 6, juros_cartao_pct: 0, parcelamento_texto: 'até 6x sem juros',
    }
    try {
      const r = await fetch('/api/admin/produtos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', produto: novoProduto }),
      })
      const d = await r.json()
      if (!d.ok) { setErro(d.error ?? 'Erro ao criar'); setSaving(false); return }
      onCreate(novoProduto)
      onClose()
    } catch { setErro('Erro de conexão') }
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 16, padding: 28, width: 420, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#5A5A70' }}><X className="w-5 h-5" /></button>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#F0F0F5', margin: '0 0 4px' }}>Novo Produto</h2>
        <p style={{ fontSize: 12, color: '#5A5A70', margin: '0 0 24px' }}>Cadastre um novo produto para configurar pagamento, campanha e renovação</p>

        {erro && <div style={{ fontSize: 12, color: '#FF3B5C', background: '#FF3B5C18', border: '1px solid #FF3B5C30', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>{erro}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <InputField label="Nome do produto">
            <TextInput value={nome} onChange={handleNome} placeholder="Ex: Implante Hormonal, Consulta, Semaglutida..." />
          </InputField>
          <InputField label="Slug (identificador)" hint="Usado internamente. Gerado automaticamente.">
            <TextInput
              value={slug}
              onChange={v => { setSlugManual(true); setSlug(slugify(v)) }}
              placeholder="ex: implante-hormonal"
            />
          </InputField>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', background: '#1C1C1E', border: '1px solid #2C2C38', borderRadius: 10, color: '#71717A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={salvar} disabled={saving} style={{ flex: 2, padding: '10px 0', background: '#7B3FE4', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Criando...' : 'Criar Produto'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main ─── */
export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<Aba>('pagamento')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [slugSelecionado, setSlugSelecionado] = useState<string>('')

  // Per-product state maps keyed by slug
  const [pagMap, setPagMap] = useState<Record<string, ConfigPagamento>>({})
  const [campMap, setCampMap] = useState<Record<string, ConfigCampanha>>({})
  const [renovMap, setRenovMap] = useState<Record<string, ConfigRenovacao>>({})

  const pag = pagMap[slugSelecionado] ?? PAG_DEFAULT
  const camp = campMap[slugSelecionado] ?? CAMP_DEFAULT
  const renov = renovMap[slugSelecionado] ?? RENOV_DEFAULT

  function setPag(fn: (p: ConfigPagamento) => ConfigPagamento) {
    setPagMap(m => ({ ...m, [slugSelecionado]: fn(m[slugSelecionado] ?? PAG_DEFAULT) }))
  }
  function setCamp(fn: (c: ConfigCampanha) => ConfigCampanha) {
    setCampMap(m => ({ ...m, [slugSelecionado]: fn(m[slugSelecionado] ?? CAMP_DEFAULT) }))
  }
  function setRenov(fn: (r: ConfigRenovacao) => ConfigRenovacao) {
    setRenovMap(m => ({ ...m, [slugSelecionado]: fn(m[slugSelecionado] ?? RENOV_DEFAULT) }))
  }

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [rCfg, rProd] = await Promise.all([
        fetch('/api/admin/configuracoes', { cache: 'no-store' }),
        fetch('/api/admin/produtos', { cache: 'no-store' }),
      ])
      const dCfg = await rCfg.json()
      const dProd = await rProd.json()

      const lista: Produto[] = dProd.produtos ?? []
      setProdutos(lista)

      // Seed price maps from produto rows
      const newPagMap: Record<string, ConfigPagamento> = {}
      const newCampMap: Record<string, ConfigCampanha> = {}
      const newRenovMap: Record<string, ConfigRenovacao> = {}

      for (const p of lista) {
        newPagMap[p.slug] = {
          valor_pix:          p.valor_pix          ?? PAG_DEFAULT.valor_pix,
          valor_cartao:       p.valor_cartao       ?? PAG_DEFAULT.valor_cartao,
          desconto_pix_pct:   p.desconto_pix_pct   ?? PAG_DEFAULT.desconto_pix_pct,
          parcelas_max:       p.parcelas_max        ?? PAG_DEFAULT.parcelas_max,
          juros_cartao_pct:   p.juros_cartao_pct   ?? PAG_DEFAULT.juros_cartao_pct,
          parcelamento_texto: p.parcelamento_texto  ?? PAG_DEFAULT.parcelamento_texto,
        }
        newCampMap[p.slug] = p.campanha ?? CAMP_DEFAULT
        newRenovMap[p.slug] = p.renovacao ?? RENOV_DEFAULT
      }

      // Global configuracoes as fallback for campanha/renovacao
      if (dCfg.config?.campanha) {
        for (const p of lista) {
          if (!p.campanha) newCampMap[p.slug] = dCfg.config.campanha as ConfigCampanha
        }
      }
      if (dCfg.config?.renovacao) {
        for (const p of lista) {
          if (!p.renovacao) newRenovMap[p.slug] = dCfg.config.renovacao as ConfigRenovacao
        }
      }

      setPagMap(newPagMap)
      setCampMap(newCampMap)
      setRenovMap(newRenovMap)

      if (lista.length > 0) {
        const ativo = lista.find(p => p.status === 'ativo') ?? lista[0]
        setSlugSelecionado(ativo.slug)
      }
    } catch { setErro('Erro ao carregar configurações') }
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const salvar = async () => {
    if (!slugSelecionado) return
    setSaving(true)
    setErro(null)
    try {
      const produtoAtual = produtos.find(p => p.slug === slugSelecionado)
      const promises: Promise<Response>[] = [
        // Salva configuracoes globais (campanha + renovacao para compatibilidade)
        fetch('/api/admin/configuracoes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chave: 'campanha', valor: camp }),
        }),
        fetch('/api/admin/configuracoes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chave: 'renovacao', valor: renov }),
        }),
        // Salva preços direto no produto
        fetch('/api/admin/produtos', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upsert',
            produto: {
              ...(produtoAtual ?? {}),
              slug: slugSelecionado,
              valor_pix:          pag.valor_pix,
              valor_cartao:       pag.valor_cartao,
              desconto_pix_pct:   pag.desconto_pix_pct,
              parcelas_max:       pag.parcelas_max,
              juros_cartao_pct:   pag.juros_cartao_pct,
              parcelamento_texto: pag.parcelamento_texto,
            },
          }),
        }),
      ]

      // Também sincroniza configuracoes.pagamento para ANA
      promises.push(
        fetch('/api/admin/configuracoes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chave: 'pagamento', valor: pag }),
        })
      )

      await Promise.all(promises)
      setProdutos(prev => prev.map(p =>
        p.slug === slugSelecionado ? { ...p, ...pag } : p
      ))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { setErro('Erro ao salvar') }
    setSaving(false)
  }

  /* Preview */
  const valorPixComDesconto = pag.valor_pix * (1 - pag.desconto_pix_pct / 100)
  const valorCampanha = pag.valor_pix * (1 - (camp.ativa ? camp.desconto_pct : 0) / 100)
  const parcela = pag.valor_cartao / pag.parcelas_max

  const abas: { id: Aba; label: string; icon: React.ReactNode }[] = [
    { id: 'pagamento', label: 'Pagamento', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'campanha', label: 'Campanhas', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'renovacao', label: 'Renovação', icon: <RefreshCw className="w-4 h-4" /> },
  ]

  const produtoAtivo = produtos.find(p => p.slug === slugSelecionado)

  return (
    <div className="flex h-screen bg-[#080809] overflow-hidden">
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        select option { background: #111116; color: #F0F0F5; }
      `}</style>
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Configurações" />

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

          {/* ── Painel de Produtos (esquerda) ── */}
          <div style={{ width: 220, borderRight: '1px solid #1A1A1E', display: 'flex', flexDirection: 'column', background: '#0A0A0C', flexShrink: 0, overflowY: 'auto' }}>
            <div style={{ padding: '20px 16px 12px' }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#3F3F46', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Produtos</span>
            </div>

            {loading ? (
              <div style={{ padding: '12px 16px', fontSize: 12, color: '#3A3A50' }}>Carregando...</div>
            ) : produtos.length === 0 ? (
              <div style={{ padding: '12px 16px', fontSize: 12, color: '#3A3A50', lineHeight: 1.5 }}>
                Nenhum produto. Clique em <strong style={{ color: '#5A5A70' }}>Novo</strong> para criar.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px 16px' }}>
                {produtos.map(p => {
                  const cor = STATUS_COLOR[p.status] ?? STATUS_COLOR.inativo
                  const sel = p.slug === slugSelecionado
                  return (
                    <button
                      key={p.slug}
                      onClick={() => setSlugSelecionado(p.slug)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                        borderRadius: 8, border: sel ? '1px solid #7B3FE440' : '1px solid transparent',
                        background: sel ? '#7B3FE415' : 'transparent', cursor: 'pointer',
                        textAlign: 'left', transition: 'all 0.12s',
                      }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cor, flexShrink: 0, boxShadow: p.status === 'ativo' ? `0 0 6px ${cor}` : 'none' }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? '#E0D0FF' : '#8891a8', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</p>
                        <p style={{ fontSize: 10, color: '#3F3F46', margin: 0, textTransform: 'capitalize' }}>{p.status}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Conteúdo principal (direita) ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F0F0F5', margin: 0, letterSpacing: '-0.02em' }}>
                  {produtoAtivo ? produtoAtivo.nome : 'Configurações'}
                </h1>
                <p style={{ fontSize: 13, color: '#4A4A60', marginTop: 4 }}>
                  {produtoAtivo
                    ? `Configure pagamento, campanhas e renovação para este produto`
                    : 'Selecione ou crie um produto para começar'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {produtoAtivo && (() => {
                  const cor = STATUS_COLOR[produtoAtivo.status] ?? STATUS_COLOR.inativo
                  return (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: cor, background: `${cor}18`, border: `1px solid ${cor}30`, borderRadius: 20, padding: '5px 12px', textTransform: 'capitalize' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cor, ...(produtoAtivo.status === 'ativo' ? { boxShadow: `0 0 6px ${cor}` } : {}) }} />
                      {produtoAtivo.status}
                    </span>
                  )
                })()}
                <button
                  onClick={() => setShowModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: 'transparent', border: '1px solid #7B3FE460', borderRadius: 10, color: '#A78BFA', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  <Plus className="w-4 h-4" /> Novo Produto
                </button>
              </div>
            </div>

            {erro && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FF3B5C18', border: '1px solid #FF3B5C30', borderRadius: 8, marginBottom: 20, color: '#FF3B5C', fontSize: 13 }}>
                <AlertTriangle className="w-4 h-4" /> {erro}
              </div>
            )}

            {!slugSelecionado && !loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16 }}>
                <span style={{ fontSize: 40 }}>📦</span>
                <p style={{ fontSize: 15, color: '#5A5A70', textAlign: 'center' }}>Crie um produto no painel esquerdo para começar</p>
                <button
                  onClick={() => setShowModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#7B3FE4', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  <Plus className="w-4 h-4" /> Novo Produto
                </button>
              </div>
            ) : (
              <>
                {/* Abas */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#0E0E12', border: '1px solid #1E1E28', borderRadius: 10, padding: 4, width: 'fit-content' }}>
                  {abas.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setAba(a.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 7,
                        border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                        background: aba === a.id ? '#7B3FE4' : 'transparent',
                        color: aba === a.id ? '#fff' : '#5A5A70',
                      }}
                    >
                      {a.icon} {a.label}
                    </button>
                  ))}
                </div>

                {/* ── ABA: PAGAMENTO ── */}
                {aba === 'pagamento' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                    <Card title={`Valores — ${produtoAtivo?.nome ?? ''}`} icon={<DollarSign className="w-4 h-4" />}>
                      <InputField label="Valor PIX (à vista)" hint="Valor padrão quando lead escolhe PIX">
                        <TextInput value={pag.valor_pix} type="number" prefix="R$" onChange={v => setPag(p => ({ ...p, valor_pix: Number(v) }))} />
                      </InputField>
                      <InputField label="Valor Cartão" hint="Valor base para parcelamento no cartão">
                        <TextInput value={pag.valor_cartao} type="number" prefix="R$" onChange={v => setPag(p => ({ ...p, valor_cartao: Number(v) }))} />
                      </InputField>
                    </Card>

                    <Card title="Desconto PIX à Vista" icon={<Percent className="w-4 h-4" />}>
                      <InputField label="Desconto (%)" hint="0 = sem desconto. Ex: 10 = 10% off no PIX">
                        <TextInput value={pag.desconto_pix_pct} type="number" min={0} max={50} suffix="%" onChange={v => setPag(p => ({ ...p, desconto_pix_pct: Number(v) }))} />
                      </InputField>
                      <div style={{ background: '#111116', border: '1px solid #2C2C38', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontSize: 10, color: '#4A4A60', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Preview — o que ANA vai dizer</div>
                        <div style={{ fontSize: 13, color: '#A78BFA', lineHeight: 1.5 }}>
                          {pag.desconto_pix_pct > 0
                            ? `PIX à vista: ${moeda(valorPixComDesconto)} (${pag.desconto_pix_pct}% de desconto! 🎉)`
                            : `PIX à vista: ${moeda(pag.valor_pix)}`}
                        </div>
                      </div>
                    </Card>

                    <Card title="Parcelamento Cartão" icon={<CreditCard className="w-4 h-4" />}>
                      <InputField label="Máx. parcelas" hint="Número máximo de parcelas sem juros">
                        <TextInput value={pag.parcelas_max} type="number" min={1} max={24} suffix="x" onChange={v => setPag(p => ({ ...p, parcelas_max: Number(v) }))} />
                      </InputField>
                      <InputField label="Juros (%)" hint="0 = sem juros. Por parcela">
                        <TextInput value={pag.juros_cartao_pct} type="number" min={0} max={10} step={0.1} suffix="%" onChange={v => setPag(p => ({ ...p, juros_cartao_pct: Number(v) }))} />
                      </InputField>
                      <InputField label="Texto que ANA usa" hint="Aparece na mensagem de fechamento">
                        <TextInput value={pag.parcelamento_texto} onChange={v => setPag(p => ({ ...p, parcelamento_texto: v }))} />
                      </InputField>
                      <div style={{ background: '#111116', border: '1px solid #2C2C38', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontSize: 10, color: '#4A4A60', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Preview</div>
                        <div style={{ fontSize: 13, color: '#A78BFA' }}>
                          💳 Cartão: {pag.parcelas_max}x de {moeda(parcela)} ({pag.parcelamento_texto})
                        </div>
                      </div>
                    </Card>

                    <Card title="Preview Mensagem de Fechamento" icon={<Zap className="w-4 h-4" />}>
                      <div style={{ background: '#111116', border: '1px solid #2C2C38', borderRadius: 10, padding: 14, fontSize: 13, color: '#C0C0D8', lineHeight: 1.7 }}>
                        O investimento em <strong style={{ color: '#A78BFA' }}>{produtoAtivo?.nome ?? 'produto'}</strong> é de <strong style={{ color: '#A78BFA' }}>{moeda(pag.valor_pix)}</strong>.<br /><br />
                        Para avançar, temos duas formas:<br />
                        💳 Cartão de crédito — <strong style={{ color: '#A78BFA' }}>{pag.parcelas_max}x de {moeda(parcela)}</strong> ({pag.parcelamento_texto})<br />
                        💰 Pix — <strong style={{ color: '#A78BFA' }}>{moeda(valorPixComDesconto)}</strong>{pag.desconto_pix_pct > 0 ? ` (${pag.desconto_pix_pct}% de desconto!)` : ' à vista'}<br /><br />
                        Qual funciona melhor para você? 😊
                      </div>
                    </Card>

                  </div>
                )}

                {/* ── ABA: CAMPANHAS ── */}
                {aba === 'campanha' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                    <Card title="Campanha Ativa" icon={<Megaphone className="w-4 h-4" />}>
                      <Toggle value={camp.ativa} onChange={v => setCamp(c => ({ ...c, ativa: v }))} label={camp.ativa ? 'Campanha ativa — ANA aplica desconto automaticamente' : 'Campanha desativada'} />
                      <InputField label="Nome da campanha" hint="Ex: Black Friday, Dia das Mães...">
                        <TextInput value={camp.nome} onChange={v => setCamp(c => ({ ...c, nome: v }))} />
                      </InputField>
                      <InputField label="Desconto (%)" hint="Aplicado sobre o valor PIX durante a campanha">
                        <TextInput value={camp.desconto_pct} type="number" min={0} max={60} suffix="%" onChange={v => setCamp(c => ({ ...c, desconto_pct: Number(v) }))} />
                      </InputField>
                    </Card>

                    <Card title="Período da Campanha" icon={<Calendar className="w-4 h-4" />}>
                      <InputField label="Data início">
                        <TextInput value={camp.inicio} type="date" onChange={v => setCamp(c => ({ ...c, inicio: v }))} />
                      </InputField>
                      <InputField label="Data fim">
                        <TextInput value={camp.fim} type="date" onChange={v => setCamp(c => ({ ...c, fim: v }))} />
                      </InputField>
                      {camp.ativa && camp.desconto_pct > 0 && (
                        <div style={{ background: '#7B3FE420', border: '1px solid #7B3FE440', borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ fontSize: 11, color: '#A78BFA', fontWeight: 700, marginBottom: 4 }}>🎯 {camp.nome || 'Campanha'} ativa</div>
                          <div style={{ fontSize: 13, color: '#C0C0D8' }}>PIX: <strong>{moeda(valorCampanha)}</strong> ({camp.desconto_pct}% off)</div>
                        </div>
                      )}
                    </Card>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <Card title="Mensagem WhatsApp da Campanha" icon={<MessageSquare className="w-4 h-4" />}>
                        <InputField label="Texto que ANA envia ao apresentar a campanha" hint="Use {nome}, {desconto}, {valor} como variáveis">
                          <textarea
                            value={camp.mensagem_whatsapp}
                            onChange={e => setCamp(c => ({ ...c, mensagem_whatsapp: e.target.value }))}
                            rows={4}
                            placeholder="Ex: 🎉 Temos uma condição especial hoje! Por tempo limitado, o implante está com {desconto}% de desconto..."
                            style={{ width: '100%', background: '#111116', border: '1px solid #2C2C38', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#F0F0F5', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
                          />
                        </InputField>
                      </Card>
                    </div>

                  </div>
                )}

                {/* ── ABA: RENOVAÇÃO ── */}
                {aba === 'renovacao' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                    <Card title="Alertas de Renovação" icon={<Bell className="w-4 h-4" />}>
                      <Toggle value={renov.alertas_ativos} onChange={v => setRenov(r => ({ ...r, alertas_ativos: v }))} label={renov.alertas_ativos ? 'Alertas automáticos ativos' : 'Alertas desativados'} />
                      <InputField label="Dias antes do vencimento" hint="ANA envia mensagem X dias antes de completar 6 meses">
                        <TextInput value={renov.dias_antes} type="number" min={7} max={60} suffix="dias" onChange={v => setRenov(r => ({ ...r, dias_antes: Number(v) }))} />
                      </InputField>
                      <div style={{ background: '#111116', border: '1px solid #2C2C38', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontSize: 11, color: '#4A4A60', marginBottom: 4 }}>ANA vai enviar</div>
                        <div style={{ fontSize: 13, color: '#A78BFA' }}>{renov.dias_antes} dias antes do vencimento</div>
                      </div>
                    </Card>

                    <Card title="Em breve" icon={<Tag className="w-4 h-4" />}>
                      <div style={{ fontSize: 13, color: '#3A3A50', lineHeight: 1.7 }}>
                        📧 <strong style={{ color: '#4A4A60' }}>E-mail Marketing</strong> — envio de campanhas para base de pacientes<br /><br />
                        🔔 <strong style={{ color: '#4A4A60' }}>Push Notifications</strong> — alertas no app<br /><br />
                        📊 <strong style={{ color: '#4A4A60' }}>Segmentação</strong> — por temperatura, etapa ou data de implante<br /><br />
                        <span style={{ fontSize: 11, color: '#2A2A3A' }}>Em desenvolvimento — disponível em breve</span>
                      </div>
                    </Card>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <Card title="Mensagem de Renovação" icon={<MessageSquare className="w-4 h-4" />}>
                        <InputField label="Texto que ANA envia para renovação" hint="Use {nome} para personalizar">
                          <textarea
                            value={renov.mensagem}
                            onChange={e => setRenov(r => ({ ...r, mensagem: e.target.value }))}
                            rows={4}
                            style={{ width: '100%', background: '#111116', border: '1px solid #2C2C38', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#F0F0F5', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
                          />
                        </InputField>
                      </Card>
                    </div>

                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Rodapé fixo com Salvar ── */}
          {slugSelecionado && (
            <div style={{ borderTop: '1px solid #1A1A1E', padding: '14px 28px', background: '#080809', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: saved ? '#22c55e' : '#3F3F46' }}>
                {saved ? '✓ Configurações salvas com sucesso' : `Editando: ${produtoAtivo?.nome ?? ''}`}
              </span>
              <button
                onClick={salvar}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
                  background: saved ? '#00D084' : '#7B3FE4', border: 'none', borderRadius: 10,
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
                  opacity: saving ? 0.7 : 1, transition: 'background 0.2s',
                }}
              >
                {saved ? <><Check className="w-4 h-4" /> Salvo!</> : saving ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar configurações</>}
              </button>
            </div>
          )}
          </div>
        </div>
      </div>

      {showModal && (
        <ModalNovoProduto
          onClose={() => setShowModal(false)}
          onCreate={p => {
            setProdutos(prev => [...prev, p])
            setSlugSelecionado(p.slug)
            setPagMap(m => ({ ...m, [p.slug]: PAG_DEFAULT }))
            setCampMap(m => ({ ...m, [p.slug]: CAMP_DEFAULT }))
            setRenovMap(m => ({ ...m, [p.slug]: RENOV_DEFAULT }))
          }}
        />
      )}
    </div>
  )
}
