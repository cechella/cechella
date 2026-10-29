'use client'

import { useCallback, useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { BookOpen, LineChart, MessageSquareQuote, Plus, Sparkles, Trash2, Check, X, Star, RefreshCw, Play } from 'lucide-react'
import { ETAPAS } from '@/lib/ana-aprendizado/core'

type Status = 'rascunho' | 'teste' | 'ativo' | 'inativo'
type Conhecimento = { id: string; titulo: string; conteudo: string; etapa: number | null; situacao: string | null; status: Status; fonte: string | null; updated_at: string }
type Sugestao = { id: string; relatorio_id: string; titulo: string; conteudo: string; etapa: number | null; situacao: string | null; justificativa: string | null; status: 'pendente' | 'aprovada' | 'recusada'; created_at: string }
type Grupo = { leads: number; pagos: number; conversao: number }
type Relatorio = { id: string; periodo_inicio: string; periodo_fim: string; analise: string | null; created_at: string; metricas: { total_leads: number; pagos: number; conversao: number; parados_por_etapa: Record<string, number>; grupos: { A: Grupo; B: Grupo } } }
type Exemplo = { id: string; telefone: string; etapa: number; trecho: Array<{ role: string; content: string }>; destaque: boolean; ativo: boolean; created_at: string }
type Dados = { conhecimento: Conhecimento[]; sugestoes: Sugestao[]; relatorios: Relatorio[]; exemplos: Exemplo[] }

const STATUS_INFO: Record<Status, { label: string; cor: string; ajuda: string }> = {
  rascunho: { label: 'Rascunho', cor: '#6b7280', ajuda: 'A Ana não usa' },
  teste:    { label: 'Em teste', cor: '#f59e0b', ajuda: 'Só metade dos leads (grupo B)' },
  ativo:    { label: 'Ativo',    cor: '#22c55e', ajuda: 'Todos os leads' },
  inativo:  { label: 'Inativo',  cor: '#ef4444', ajuda: 'A Ana não usa' },
}

const card = 'bg-[#141416] border border-white/[0.06] rounded-xl'
const input = 'w-full bg-[#0A0A0B] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#7B3FE4]'
const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40'
const etapaLabel = (e: number | null) => (e ? `${e}. ${ETAPAS[e]}` : 'Todas as etapas')
const dataBR = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')
const mascara = (tel: string) => tel.replace(/\d(?=\d{4})/g, '•')

async function api(body?: Record<string, unknown>) {
  const res = await fetch('/api/admin/ana-aprendizado', body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : undefined)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? `erro ${res.status}`)
  return json
}

function EtapaSelect({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <select className={input} value={value ?? ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">Todas as etapas</option>
      {Object.entries(ETAPAS).map(([n, l]) => <option key={n} value={n}>{n}. {l}</option>)}
    </select>
  )
}

export default function AnaAprendizadoPage() {
  const [aba, setAba] = useState<'conhecimento' | 'aprendizado' | 'exemplos'>('conhecimento')
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState('')

  const carregar = useCallback(async () => {
    try { setDados(await api()); setErro('') } catch (e: any) { setErro(e.message) }
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function acao(nome: string, body: Record<string, unknown>, ok?: (r: any) => string) {
    setOcupado(nome); setErro(''); setAviso('')
    try {
      const r = await api(body)
      if (ok) setAviso(ok(r))
      await carregar()
      return true
    } catch (e: any) { setErro(e.message); return false } finally { setOcupado('') }
  }

  const pendentes = dados?.sugestoes.filter(s => s.status === 'pendente').length ?? 0

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl font-bold text-white">Aprendizado da Ana</h1>
              <p className="text-sm text-white/50 mt-1">
                O roteiro das 8 etapas não muda. Aqui você dá material de consulta para a Ana, revisa o relatório semanal e escolhe os melhores exemplos de venda.
              </p>
            </div>

            <div className="flex gap-2 border-b border-white/[0.06]">
              {([
                ['conhecimento', 'Conhecimento', <BookOpen key="i" className="w-4 h-4" />],
                ['aprendizado', `Relatório semanal${pendentes ? ` (${pendentes})` : ''}`, <LineChart key="i" className="w-4 h-4" />],
                ['exemplos', 'Exemplos de venda', <MessageSquareQuote key="i" className="w-4 h-4" />],
              ] as const).map(([k, l, i]) => (
                <button key={k} onClick={() => setAba(k)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${aba === k ? 'border-[#7B3FE4] text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}>
                  {i}{l}
                </button>
              ))}
            </div>

            {erro && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{erro}</div>}
            {aviso && <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm text-green-300">{aviso}</div>}
            {!dados && !erro && <p className="text-sm text-white/40">Carregando…</p>}

            {dados && aba === 'conhecimento' && <AbaConhecimento itens={dados.conhecimento} ocupado={ocupado} acao={acao} />}
            {dados && aba === 'aprendizado' && <AbaAprendizado relatorios={dados.relatorios} sugestoes={dados.sugestoes} ocupado={ocupado} acao={acao} />}
            {dados && aba === 'exemplos' && <AbaExemplos exemplos={dados.exemplos} ocupado={ocupado} acao={acao} />}
          </div>
        </main>
      </div>
    </div>
  )
}

type Acao = (nome: string, body: Record<string, unknown>, ok?: (r: any) => string) => Promise<boolean>

function AbaConhecimento({ itens, ocupado, acao }: { itens: Conhecimento[]; ocupado: string; acao: Acao }) {
  const [material, setMaterial] = useState('')
  const [fonte, setFonte] = useState('')
  const [novo, setNovo] = useState({ titulo: '', conteudo: '', etapa: null as number | null, situacao: '' })
  const [filtro, setFiltro] = useState<Status | 'todos'>('todos')
  const visiveis = itens.filter(i => filtro === 'todos' || i.status === filtro)

  return (
    <div className="space-y-6">
      <div className={`${card} p-5 space-y-3`}>
        <div className="flex items-center gap-2 text-white font-semibold"><Sparkles className="w-4 h-4 text-[#7B3FE4]" />Importar treinamento</div>
        <p className="text-xs text-white/50">Cole uma transcrição, aula ou anotação. A IA separa em técnicas curtas, que entram como <b>rascunho</b>. Nada muda na Ana até você ativar.</p>
        <input className={input} placeholder="Fonte (ex.: Aula Flávio Augusto e Davidson — Estabilidade não existe)" value={fonte} onChange={e => setFonte(e.target.value)} />
        <textarea className={`${input} h-40 font-mono text-xs`} placeholder="Cole aqui o material…" value={material} onChange={e => setMaterial(e.target.value)} />
        <button className={`${btn} bg-[#7B3FE4] text-white hover:bg-[#6a32cc]`} disabled={!!ocupado || material.trim().length < 200}
          onClick={async () => { if (await acao('extrair', { acao: 'extrair', texto: material, fonte }, r => `${r.criadas} técnicas extraídas como rascunho. Revise e ative abaixo.`)) setMaterial('') }}>
          <Sparkles className="w-3.5 h-3.5" />{ocupado === 'extrair' ? 'Extraindo… (até 1 min)' : 'Extrair técnicas'}
        </button>
      </div>

      <div className={`${card} p-5 space-y-3`}>
        <div className="flex items-center gap-2 text-white font-semibold"><Plus className="w-4 h-4 text-[#7B3FE4]" />Nova técnica manual</div>
        <div className="grid gap-3 md:grid-cols-2">
          <input className={input} placeholder="Título" value={novo.titulo} onChange={e => setNovo({ ...novo, titulo: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <EtapaSelect value={novo.etapa} onChange={v => setNovo({ ...novo, etapa: v })} />
            <input className={input} placeholder="Situação (ex.: preco)" value={novo.situacao} onChange={e => setNovo({ ...novo, situacao: e.target.value })} />
          </div>
        </div>
        <textarea className={`${input} h-24`} placeholder="Quando usar e como dizer…" value={novo.conteudo} onChange={e => setNovo({ ...novo, conteudo: e.target.value })} />
        <button className={`${btn} bg-white/10 text-white hover:bg-white/15`} disabled={!!ocupado || !novo.titulo.trim() || !novo.conteudo.trim()}
          onClick={async () => { if (await acao('criar', { acao: 'criar', ...novo, fonte: 'manual' }, () => 'Técnica criada como rascunho.')) setNovo({ titulo: '', conteudo: '', etapa: null, situacao: '' }) }}>
          <Plus className="w-3.5 h-3.5" />Adicionar como rascunho
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['todos', 'rascunho', 'teste', 'ativo', 'inativo'] as const).map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            className={`${btn} ${filtro === s ? 'bg-[#7B3FE4] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
            {s === 'todos' ? `Todos (${itens.length})` : `${STATUS_INFO[s].label} (${itens.filter(i => i.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {!visiveis.length && <p className="text-sm text-white/40">Nenhuma técnica aqui ainda.</p>}
        {visiveis.map(item => <ItemConhecimento key={item.id} item={item} ocupado={ocupado} acao={acao} />)}
      </div>
    </div>
  )
}

function ItemConhecimento({ item, ocupado, acao }: { item: Conhecimento; ocupado: string; acao: Acao }) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(item)
  const info = STATUS_INFO[item.status]
  return (
    <div className={`${card} p-4 space-y-2`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">{item.titulo}</div>
          <div className="text-xs text-white/40 mt-0.5">{etapaLabel(item.etapa)}{item.situacao ? ` · ${item.situacao}` : ''}{item.fonte ? ` · ${item.fonte}` : ''}</div>
        </div>
        <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ color: info.cor, background: `${info.cor}1a` }} title={info.ajuda}>{info.label}</span>
      </div>

      {editando ? (
        <div className="space-y-2">
          <input className={input} value={rascunho.titulo} onChange={e => setRascunho({ ...rascunho, titulo: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <EtapaSelect value={rascunho.etapa} onChange={v => setRascunho({ ...rascunho, etapa: v })} />
            <input className={input} value={rascunho.situacao ?? ''} onChange={e => setRascunho({ ...rascunho, situacao: e.target.value })} />
          </div>
          <textarea className={`${input} h-28`} value={rascunho.conteudo} onChange={e => setRascunho({ ...rascunho, conteudo: e.target.value })} />
          <div className="flex gap-2">
            <button className={`${btn} bg-[#7B3FE4] text-white`} disabled={!!ocupado}
              onClick={async () => { if (await acao(`ed-${item.id}`, { acao: 'atualizar', id: item.id, titulo: rascunho.titulo, conteudo: rascunho.conteudo, etapa: rascunho.etapa, situacao: rascunho.situacao })) setEditando(false) }}>
              <Check className="w-3.5 h-3.5" />Salvar
            </button>
            <button className={`${btn} bg-white/5 text-white/70`} onClick={() => { setRascunho(item); setEditando(false) }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-white/70 whitespace-pre-wrap">{item.conteudo}</p>
      )}

      {!editando && (
        <div className="flex flex-wrap gap-2 pt-1">
          {item.status !== 'teste' && <button className={`${btn} bg-[#f59e0b]/15 text-[#f59e0b]`} disabled={!!ocupado} onClick={() => acao(`st-${item.id}`, { acao: 'atualizar', id: item.id, status: 'teste' })}>Testar com metade</button>}
          {item.status !== 'ativo' && <button className={`${btn} bg-[#22c55e]/15 text-[#22c55e]`} disabled={!!ocupado} onClick={() => acao(`st-${item.id}`, { acao: 'atualizar', id: item.id, status: 'ativo' })}>Ativar para todos</button>}
          {(item.status === 'ativo' || item.status === 'teste') && <button className={`${btn} bg-white/5 text-white/60`} disabled={!!ocupado} onClick={() => acao(`st-${item.id}`, { acao: 'atualizar', id: item.id, status: 'inativo' })}>Desativar</button>}
          <button className={`${btn} bg-white/5 text-white/60`} onClick={() => setEditando(true)}>Editar</button>
          <ConfirmarExclusao disabled={!!ocupado} onConfirm={() => acao(`del-${item.id}`, { acao: 'excluir', id: item.id })} />
        </div>
      )}
    </div>
  )
}

function ConfirmarExclusao({ onConfirm, disabled }: { onConfirm: () => void; disabled: boolean }) {
  const [confirmando, setConfirmando] = useState(false)
  if (!confirmando) return <button className={`${btn} bg-white/5 text-red-300/80`} disabled={disabled} onClick={() => setConfirmando(true)}><Trash2 className="w-3.5 h-3.5" />Excluir</button>
  return (
    <span className="inline-flex gap-1">
      <button className={`${btn} bg-red-500/20 text-red-300`} disabled={disabled} onClick={() => { setConfirmando(false); onConfirm() }}>Confirmar exclusão</button>
      <button className={`${btn} bg-white/5 text-white/60`} onClick={() => setConfirmando(false)}>Cancelar</button>
    </span>
  )
}

function Barra({ label, valor, max }: { label: string; valor: number; max: number }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-40 shrink-0 text-white/60">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full bg-[#7B3FE4]" style={{ width: `${max ? (valor / max) * 100 : 0}%` }} />
      </div>
      <span className="w-8 text-right text-white tabular-nums">{valor}</span>
    </div>
  )
}

function AbaAprendizado({ relatorios, sugestoes, ocupado, acao }: { relatorios: Relatorio[]; sugestoes: Sugestao[]; ocupado: string; acao: Acao }) {
  const ultimo = relatorios[0]
  const pendentes = sugestoes.filter(s => s.status === 'pendente')
  const parados = ultimo ? Object.entries(ultimo.metricas.parados_por_etapa).sort((a, b) => Number(a[0]) - Number(b[0])) : []
  const maxParados = Math.max(0, ...parados.map(([, v]) => v))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-white/50">O relatório roda sozinho toda segunda às 8h. Você também pode rodar agora.</p>
        <button className={`${btn} bg-[#7B3FE4] text-white`} disabled={!!ocupado}
          onClick={() => acao('analise', { acao: 'rodar_analise', dias: 7 }, r => `Relatório gerado: ${r.sugestoes} sugestões, ${r.exemplos} trechos de exemplo salvos.`)}>
          <Play className="w-3.5 h-3.5" />{ocupado === 'analise' ? 'Analisando… (até 2 min)' : 'Rodar análise agora'}
        </button>
      </div>

      {!ultimo && <p className="text-sm text-white/40">Ainda não há relatório.</p>}

      {ultimo && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ['Leads na semana', ultimo.metricas.total_leads],
              ['Pagaram', ultimo.metricas.pagos],
              ['Conversão', `${ultimo.metricas.conversao}%`],
              ['Período', `${dataBR(ultimo.periodo_inicio)} – ${dataBR(ultimo.periodo_fim)}`],
            ].map(([l, v]) => (
              <div key={String(l)} className={`${card} p-4`}>
                <div className="text-[11px] uppercase tracking-wider text-white/40">{l}</div>
                <div className="text-lg font-bold text-white mt-1 tabular-nums">{v}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className={`${card} p-5 space-y-3`}>
              <div className="text-sm font-semibold text-white">Onde os leads param</div>
              {!parados.length && <p className="text-xs text-white/40">Nenhum lead parado no período.</p>}
              {parados.map(([e, v]) => <Barra key={e} label={etapaLabel(Number(e))} valor={v} max={maxParados} />)}
            </div>
            <div className={`${card} p-5 space-y-3`}>
              <div className="text-sm font-semibold text-white">Teste A/B</div>
              <p className="text-xs text-white/50">Grupo A usa só técnicas <b>ativas</b>. Grupo B usa também as <b>em teste</b>.</p>
              {(['A', 'B'] as const).map(g => (
                <div key={g} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Grupo {g}</span>
                  <span className="text-white tabular-nums">{ultimo.metricas.grupos[g].pagos}/{ultimo.metricas.grupos[g].leads} · <b>{ultimo.metricas.grupos[g].conversao}%</b></span>
                </div>
              ))}
            </div>
          </div>

          {ultimo.analise && (
            <div className={`${card} p-5`}>
              <div className="text-sm font-semibold text-white mb-2">Análise</div>
              <p className="text-sm text-white/70 whitespace-pre-wrap">{ultimo.analise}</p>
            </div>
          )}
        </>
      )}

      <div className="space-y-3">
        <div className="text-sm font-semibold text-white">Sugestões aguardando sua decisão ({pendentes.length})</div>
        <p className="text-xs text-white/50">Ao aprovar, a sugestão vira uma técnica <b>em teste</b> (só grupo B). Depois de comparar os grupos, você decide ativar para todos.</p>
        {!pendentes.length && <p className="text-sm text-white/40">Nenhuma sugestão pendente.</p>}
        {pendentes.map(s => (
          <div key={s.id} className={`${card} p-4 space-y-2`}>
            <div className="text-sm font-semibold text-white">{s.titulo}</div>
            <div className="text-xs text-white/40">{etapaLabel(s.etapa)}{s.situacao ? ` · ${s.situacao}` : ''}</div>
            <p className="text-sm text-white/70 whitespace-pre-wrap">{s.conteudo}</p>
            {s.justificativa && <p className="text-xs text-white/50"><b>Por quê:</b> {s.justificativa}</p>}
            <div className="flex gap-2 pt-1">
              <button className={`${btn} bg-[#22c55e]/15 text-[#22c55e]`} disabled={!!ocupado} onClick={() => acao(`ap-${s.id}`, { acao: 'aprovar_sugestao', id: s.id }, () => 'Aprovada: entrou como técnica em teste.')}><Check className="w-3.5 h-3.5" />Aprovar</button>
              <button className={`${btn} bg-white/5 text-white/60`} disabled={!!ocupado} onClick={() => acao(`rc-${s.id}`, { acao: 'recusar_sugestao', id: s.id })}><X className="w-3.5 h-3.5" />Recusar</button>
            </div>
          </div>
        ))}
      </div>

      {relatorios.length > 1 && (
        <div className={`${card} p-5`}>
          <div className="text-sm font-semibold text-white mb-3">Histórico de conversão</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead className="text-white/40"><tr><th className="text-left py-1">Semana</th><th className="text-right">Leads</th><th className="text-right">Pagos</th><th className="text-right">Conversão</th><th className="text-right">A</th><th className="text-right">B</th></tr></thead>
              <tbody className="text-white/80">
                {relatorios.map(r => (
                  <tr key={r.id} className="border-t border-white/5">
                    <td className="py-1.5">{dataBR(r.periodo_inicio)}</td>
                    <td className="text-right">{r.metricas.total_leads}</td>
                    <td className="text-right">{r.metricas.pagos}</td>
                    <td className="text-right">{r.metricas.conversao}%</td>
                    <td className="text-right">{r.metricas.grupos.A.conversao}%</td>
                    <td className="text-right">{r.metricas.grupos.B.conversao}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function AbaExemplos({ exemplos, ocupado, acao }: { exemplos: Exemplo[]; ocupado: string; acao: Acao }) {
  const [etapa, setEtapa] = useState<number | null>(null)
  const visiveis = exemplos.filter(e => !etapa || e.etapa === etapa)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-white/50 max-w-xl">Trechos de conversas de quem pagou, salvos por etapa. A Ana recebe até 2 trechos parecidos com a conversa atual. ⭐ dá prioridade; desativar tira da Ana.</p>
        <button className={`${btn} bg-white/10 text-white`} disabled={!!ocupado}
          onClick={() => acao('importar', { acao: 'importar_exemplos' }, r => `${r.trechos} trechos verificados (os já salvos são ignorados).`)}>
          <RefreshCw className="w-3.5 h-3.5" />{ocupado === 'importar' ? 'Importando…' : 'Buscar vendas agora'}
        </button>
      </div>
      <div className="w-64"><EtapaSelect value={etapa} onChange={setEtapa} /></div>
      {!visiveis.length && <p className="text-sm text-white/40">Nenhum exemplo ainda. Eles aparecem conforme as vendas pelo WhatsApp novo acontecem.</p>}
      {visiveis.map(ex => (
        <div key={ex.id} className={`${card} p-4 space-y-2 ${ex.ativo ? '' : 'opacity-50'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-white/40">{etapaLabel(ex.etapa)} · {mascara(ex.telefone)} · {dataBR(ex.created_at)}</div>
            <div className="flex gap-2">
              <button className={`${btn} ${ex.destaque ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'bg-white/5 text-white/60'}`} disabled={!!ocupado}
                onClick={() => acao(`ex-${ex.id}`, { acao: 'exemplo', id: ex.id, destaque: !ex.destaque })}><Star className="w-3.5 h-3.5" />{ex.destaque ? 'Destaque' : 'Destacar'}</button>
              <button className={`${btn} bg-white/5 text-white/60`} disabled={!!ocupado}
                onClick={() => acao(`ex-${ex.id}`, { acao: 'exemplo', id: ex.id, ativo: !ex.ativo })}>{ex.ativo ? 'Desativar' : 'Reativar'}</button>
            </div>
          </div>
          <div className="space-y-1.5">
            {ex.trecho.map((m, i) => (
              <div key={i} className={`text-sm rounded-lg px-3 py-1.5 max-w-[85%] whitespace-pre-wrap ${m.role === 'assistant' ? 'bg-[#7B3FE4]/15 text-white/85' : 'bg-white/5 text-white/70 ml-auto'}`}>{m.content}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
