'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  RefreshCw, Upload, CheckCircle2, XCircle, Clock,
  GitBranch, Zap, Settings, ChevronRight, AlertTriangle,
  Terminal, Globe, Package, ArrowUpRight, Loader2,
  LayoutDashboard, BarChart3, Users, CreditCard,
  MessageSquare, Network, TrendingUp, FileText,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

interface PageOption {
  key: string
  label: string
  adminPath: string
  medicalPath: string
  icon: React.FC<{ className?: string }>
  description: string
}

interface SyncResult {
  success: boolean
  message: string
}

interface LogEntry {
  ts: string
  msg: string
  type: 'info' | 'success' | 'error' | 'git' | 'deploy'
}

// ─── Page options ─────────────────────────────────────────────────────────────

const PAGE_OPTIONS: PageOption[] = [
  { key: 'dashboard',  label: 'Dashboard',   adminPath: 'admin/dashboard',  medicalPath: 'medical/dashboard',  icon: LayoutDashboard, description: 'KPIs, métricas e visão geral do negócio' },
  { key: 'crm',        label: 'CRM',         adminPath: 'admin/crm',        medicalPath: 'medical/crm',        icon: Users,           description: 'Pipeline de leads, funil e gestão de contatos' },
  { key: 'referidos',  label: 'Referidos',   adminPath: 'admin/referidos',  medicalPath: 'medical/referidos',  icon: Network,         description: 'Contatos IA, Ana automática e gestão de indicações' },
  { key: 'financeiro', label: 'Financeiro',  adminPath: 'admin/financeiro', medicalPath: 'medical/financeiro', icon: CreditCard,      description: 'Painel financeiro ao vivo, receitas e KPIs' },
  { key: 'agente',     label: 'Agente IA',   adminPath: 'admin/agente',     medicalPath: 'medical/agente',     icon: MessageSquare,   description: 'Monitor WhatsApp em tempo real com inteligência' },
  { key: 'analytics',  label: 'Analytics',   adminPath: 'admin/analytics',  medicalPath: 'medical/analytics',  icon: BarChart3,       description: 'Relatórios avançados e análise de dados' },
  { key: 'rede',       label: 'Rede',        adminPath: 'admin/rede',       medicalPath: 'medical/rede',       icon: Network,         description: 'Rede de referências e parceiros' },
  { key: 'resultados', label: 'Resultados',  adminPath: 'admin/resultados', medicalPath: 'medical/resultados', icon: TrendingUp,      description: 'Resultados clínicos e métricas de pacientes' },
]

function now() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SistemaPage() {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [results, setResults] = useState<Record<string, SyncResult>>({})
  const [log, setLog] = useState<LogEntry[]>([])
  const [deployAuto, setDeployAuto] = useState(false)
  const [gitInfo, setGitInfo] = useState<string | null>(null)
  const [deployInfo, setDeployInfo] = useState<string | null>(null)

  function addLog(msg: string, type: LogEntry['type'] = 'info') {
    setLog(prev => [...prev, { ts: now(), msg, type }])
  }

  function togglePage(key: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleAll() {
    if (selecionados.size === PAGE_OPTIONS.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(PAGE_OPTIONS.map(p => p.key)))
    }
  }

  async function sincronizar() {
    if (selecionados.size === 0) return
    setStatus('syncing')
    setResults({})
    setGitInfo(null)
    setDeployInfo(null)
    setLog([])

    const pages = Array.from(selecionados)
    addLog(`Iniciando sincronização de ${pages.length} página(s)...`, 'info')
    pages.forEach(p => {
      const opt = PAGE_OPTIONS.find(x => x.key === p)
      addLog(`→ ${opt?.label ?? p}: lendo admin/${p}/page.tsx`, 'info')
    })

    try {
      const resp = await fetch('/api/admin/sync-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages, deploy: deployAuto }),
      })
      const data = await resp.json()

      if (!resp.ok) {
        addLog(`Erro: ${data.error}`, 'error')
        setStatus('error')
        return
      }

      // Process page results
      const res: Record<string, SyncResult> = data.results ?? {}
      setResults(res)
      let anyError = false

      for (const [key, r] of Object.entries(res)) {
        const opt = PAGE_OPTIONS.find(x => x.key === key)
        if (r.success) {
          addLog(`✓ ${opt?.label ?? key}: ${r.message}`, 'success')
        } else {
          addLog(`✗ ${opt?.label ?? key}: ${r.message}`, 'error')
          anyError = true
        }
      }

      // Git result
      if (data.gitResult) {
        const g = data.gitResult
        setGitInfo(g.output)
        addLog(g.success ? `Git: ${g.output}` : `Git erro: ${g.output}`, g.success ? 'git' : 'error')
      }

      // Deploy result
      if (data.deployResult) {
        const d = data.deployResult
        setDeployInfo(d.message)
        addLog(d.triggered ? `Deploy: ${d.message}` : `Deploy: ${d.message}`, d.triggered ? 'deploy' : 'error')
      }

      setStatus(anyError ? 'error' : 'success')
      addLog(anyError ? 'Sincronização concluída com erros.' : 'Sincronização concluída com sucesso!', anyError ? 'error' : 'success')
    } catch (err) {
      addLog(`Erro inesperado: ${err}`, 'error')
      setStatus('error')
    }
  }

  const logTypeStyle: Record<LogEntry['type'], string> = {
    info:    'text-[#71717A]',
    success: 'text-emerald-400',
    error:   'text-red-400',
    git:     'text-blue-400',
    deploy:  'text-[#7B3FE4]',
  }

  const allSelected = selecionados.size === PAGE_OPTIONS.length
  const noneSelected = selecionados.size === 0

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin', role: 'admin' }} title="Sistema" />
        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#7B3FE4]" />
                Atualização do Sistema
              </h1>
              <p className="text-xs text-[#52525B] mt-0.5">
                Sincronize páginas do Admin para a área Médica e faça deploy em produção
              </p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-5">

            {/* ── Left: page selector ── */}
            <div className="col-span-7 space-y-4">

              {/* Select all bar */}
              <div className="flex items-center justify-between bg-[#111113] border border-[#1C1C1E] rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleAll}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      allSelected ? 'bg-[#7B3FE4] border-[#7B3FE4]' : 'border-[#3F3F46] hover:border-[#7B3FE4]/50'
                    }`}
                  >
                    {allSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>
                  <span className="text-sm font-medium text-white">
                    {allSelected ? 'Desselecionar todas' : 'Selecionar todas as páginas'}
                  </span>
                  {selecionados.size > 0 && (
                    <span className="text-xs text-[#7B3FE4] bg-[#7B3FE4]/10 px-2 py-0.5 rounded-full border border-[#7B3FE4]/20">
                      {selecionados.size} selecionada{selecionados.size !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#52525B]">Admin → Medical</span>
              </div>

              {/* Page list */}
              <div className="space-y-2">
                {PAGE_OPTIONS.map(page => {
                  const Icon = page.icon
                  const selected = selecionados.has(page.key)
                  const result = results[page.key]
                  return (
                    <button
                      key={page.key}
                      onClick={() => togglePage(page.key)}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all text-left ${
                        selected
                          ? 'bg-[#7B3FE4]/10 border-[#7B3FE4]/40'
                          : 'bg-[#111113] border-[#1C1C1E] hover:border-[#27272A] hover:bg-[#18181A]/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                        selected ? 'bg-[#7B3FE4] border-[#7B3FE4]' : 'border-[#3F3F46]'
                      }`}>
                        {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>

                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                        selected ? 'bg-[#7B3FE4]/20 text-[#9558EE]' : 'bg-[#1C1C1E] text-[#52525B]'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${selected ? 'text-white' : 'text-[#A1A1AA]'}`}>
                            {page.label}
                          </span>
                          <span className="text-[9px] text-[#52525B] font-mono">
                            app/{page.adminPath} → app/{page.medicalPath}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#52525B] truncate">{page.description}</p>
                      </div>

                      {/* Result badge */}
                      {result && (
                        <div className="flex-shrink-0">
                          {result.success
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            : <XCircle className="w-4 h-4 text-red-400" />
                          }
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Right: controls + log ── */}
            <div className="col-span-5 space-y-4">

              {/* Deploy toggle */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#52525B]" /> Modo de Deploy
                </h3>
                <div className="space-y-2">
                  {[
                    { id: false, label: 'Só Sincronizar', desc: 'Transforma e commita localmente, sem push automático', icon: GitBranch },
                    { id: true,  label: 'Sincronizar + Deploy', desc: 'Transforma, commita, faz push e dispara deploy em produção', icon: Zap },
                  ].map(opt => {
                    const Icon = opt.icon
                    return (
                      <button
                        key={String(opt.id)}
                        onClick={() => setDeployAuto(opt.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                          deployAuto === opt.id
                            ? 'bg-[#7B3FE4]/10 border-[#7B3FE4]/40'
                            : 'bg-[#18181A] border-[#1C1C1E] hover:border-[#27272A]'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          deployAuto === opt.id ? 'bg-[#7B3FE4]/20 text-[#9558EE]' : 'bg-[#27272A] text-[#52525B]'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className={`text-xs font-semibold ${deployAuto === opt.id ? 'text-white' : 'text-[#A1A1AA]'}`}>{opt.label}</p>
                          <p className="text-[10px] text-[#52525B]">{opt.desc}</p>
                        </div>
                        {deployAuto === opt.id && <CheckCircle2 className="w-3.5 h-3.5 text-[#7B3FE4] ml-auto flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
                {deployAuto && (
                  <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-lg p-2.5 text-[10px] text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    Configure <code className="font-mono bg-amber-500/10 px-1 rounded">VERCEL_DEPLOY_WEBHOOK_URL</code> nas variáveis de ambiente para ativar o deploy automático.
                  </div>
                )}
              </div>

              {/* Action button */}
              <button
                onClick={sincronizar}
                disabled={noneSelected || status === 'syncing'}
                className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                  noneSelected || status === 'syncing'
                    ? 'bg-[#27272A] text-[#52525B] cursor-not-allowed border border-[#3F3F46]'
                    : deployAuto
                      ? 'bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white hover:opacity-90 shadow-lg shadow-[#7B3FE4]/20'
                      : 'bg-[#7B3FE4] text-white hover:bg-[#6D35CC] shadow-lg shadow-[#7B3FE4]/20'
                }`}
              >
                {status === 'syncing' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sincronizando...</>
                ) : deployAuto ? (
                  <><Upload className="w-4 h-4" /> Sincronizar + Deploy ({selecionados.size})</>
                ) : (
                  <><RefreshCw className="w-4 h-4" /> Sincronizar ({selecionados.size})</>
                )}
              </button>

              {/* Status summary */}
              {Object.keys(results).length > 0 && (
                <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${
                  status === 'success' ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-red-500/8 border-red-500/20'
                }`}>
                  {status === 'success'
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  }
                  <div>
                    <p className={`text-xs font-semibold ${status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {status === 'success' ? 'Sincronização concluída' : 'Concluído com erros'}
                    </p>
                    {gitInfo && <p className="text-[10px] text-[#52525B] mt-0.5 font-mono truncate">{gitInfo}</p>}
                    {deployInfo && <p className="text-[10px] text-[#7B3FE4] mt-0.5">{deployInfo}</p>}
                  </div>
                </div>
              )}

              {/* Log terminal */}
              {log.length > 0 && (
                <div className="bg-[#0D0D0F] border border-[#1C1C1E] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1C1C1E]">
                    <Terminal className="w-3.5 h-3.5 text-[#52525B]" />
                    <span className="text-[10px] font-semibold text-[#52525B] uppercase tracking-wider">Log de Execução</span>
                    <button onClick={() => setLog([])} className="ml-auto text-[10px] text-[#3F3F46] hover:text-[#52525B] transition-colors">Limpar</button>
                  </div>
                  <div className="p-3 space-y-1 max-h-[240px] overflow-y-auto font-mono text-[10px]">
                    {log.map((entry, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[#3F3F46] flex-shrink-0">{entry.ts}</span>
                        <span className={logTypeStyle[entry.type]}>{entry.msg}</span>
                      </div>
                    ))}
                    {status === 'syncing' && (
                      <div className="flex items-center gap-1 text-[#52525B]">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>processando...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Info card */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-4">
                <h4 className="text-xs font-semibold text-white flex items-center gap-1.5 mb-3">
                  <Package className="w-3.5 h-3.5 text-[#52525B]" /> Como funciona
                </h4>
                <div className="space-y-2">
                  {[
                    { step: '1', text: 'Lê o arquivo da página Admin original' },
                    { step: '2', text: 'Aplica transformações: Sidebar → medical, TopBar → Dr. Ricardo Lima, links /admin/ → /medical/' },
                    { step: '3', text: 'Salva em medical/{página}/page.tsx' },
                    { step: '4', text: 'Faz git commit automático com mensagem descritiva' },
                    { step: '5', text: (d: boolean) => d ? 'Push + webhook Vercel → produção' : 'Push automático (se "Deploy" ativado)' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#27272A] text-[9px] font-bold text-[#52525B] flex items-center justify-center flex-shrink-0 mt-0.5">
                        {item.step}
                      </span>
                      <p className="text-[11px] text-[#52525B]">
                        {typeof item.text === 'function' ? item.text(deployAuto) : item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
