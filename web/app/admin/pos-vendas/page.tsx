'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createClient } from '@supabase/supabase-js'
import { PhoneCall, UserCheck, Clock, CheckCircle2, Calendar, FileText, Package, Bot, Settings, Save, ChevronDown, ChevronUp, Zap } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type OnboardingStatus =
  | 'aguardando_contato'
  | 'dados_coletados'
  | 'exames_solicitados'
  | 'implante_agendado'
  | 'concluido'

interface PacientePos {
  id: string
  nome: string | null
  telefone: string
  etapa_agente: number
  updated_at: string
  onboarding_status: OnboardingStatus | null
  data_implante: string | null
}

const STATUS_CONFIG: Record<OnboardingStatus, { label: string; color: string; icon: React.ReactNode }> = {
  aguardando_contato: { label: 'Aguardando contato', color: '#f59e0b', icon: <Clock className="w-3 h-3" /> },
  dados_coletados:    { label: 'Dados coletados',    color: '#7B3FE4', icon: <FileText className="w-3 h-3" /> },
  exames_solicitados: { label: 'Exames solicitados', color: '#3b82f6', icon: <Bot className="w-3 h-3" /> },
  implante_agendado:  { label: 'Implante agendado',  color: '#22c55e', icon: <Calendar className="w-3 h-3" /> },
  concluido:          { label: 'Concluído',           color: '#10b981', icon: <CheckCircle2 className="w-3 h-3" /> },
}

const ETAPAS: { key: OnboardingStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'aguardando_contato', label: 'Aguardando', icon: <Clock className="w-4 h-4" /> },
  { key: 'dados_coletados',    label: 'Dados',      icon: <FileText className="w-4 h-4" /> },
  { key: 'exames_solicitados', label: 'Exames',     icon: <Bot className="w-4 h-4" /> },
  { key: 'implante_agendado',  label: 'Agendado',   icon: <Calendar className="w-4 h-4" /> },
  { key: 'concluido',          label: 'Concluído',  icon: <CheckCircle2 className="w-4 h-4" /> },
]

function tempoRelativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return `há ${Math.floor(diff / 60000)}min`
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

export default function PosVendasPage() {
  const [pacientes, setPacientes] = useState<PacientePos[]>([])
  const [loading, setLoading] = useState(true)
  const [ligando, setLigando] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [andrePrompt, setAndrePrompt] = useState('')
  const [savingPrompt, setSavingPrompt] = useState(false)
  const [andreAuto, setAndreAuto] = useState(false)
  const [savingAuto, setSavingAuto] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const [{ data: leads }, cfgRes, autoRes] = await Promise.all([
        supabase.from('leads').select('id, nome, telefone, etapa_agente, updated_at, onboarding_status, data_implante').gte('etapa_agente', 7).order('updated_at', { ascending: false }),
        fetch('/api/admin/andre-config'),
        fetch('/api/admin/andre-auto'),
      ])
      setPacientes((leads as PacientePos[]) ?? [])
      const cfg = await cfgRes.json()
      if (cfg?.instructions) setAndrePrompt(cfg.instructions)
      const autoCfg = await autoRes.json().catch(() => ({}))
      setAndreAuto(autoCfg?.ativo === true)
      setLoading(false)
    }
    carregar()
  }, [])

  async function salvarPrompt() {
    setSavingPrompt(true)
    await fetch('/api/admin/andre-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instructions: andrePrompt }),
    })
    setSavingPrompt(false)
    showToast('Prompt do André salvo ✅')
  }

  async function toggleAndreAuto(val: boolean) {
    setSavingAuto(true)
    await fetch('/api/admin/andre-auto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: val }),
    })
    setAndreAuto(val)
    setSavingAuto(false)
    showToast(val ? 'André automático ATIVADO ✅' : 'André automático desativado')
  }

  async function ligarAndre(p: PacientePos) {
    setLigando(p.id)
    try {
      const res = await fetch('/api/admin/andre-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: p.telefone, nome: p.nome || '' }),
      })
      if (res.ok) showToast(`André ligando para ${p.nome || p.telefone}...`)
      else showToast('Erro ao iniciar ligação')
    } catch {
      showToast('Erro de conexão')
    }
    setLigando(null)
  }

  async function atualizarStatus(id: string, status: OnboardingStatus) {
    await supabase.from('leads').update({ onboarding_status: status }).eq('id', id)
    setPacientes(prev => prev.map(p => p.id === id ? { ...p, onboarding_status: status } : p))
  }

  const aguardando   = pacientes.filter(p => !p.onboarding_status || p.onboarding_status === 'aguardando_contato')
  const emAndamento  = pacientes.filter(p => p.onboarding_status && p.onboarding_status !== 'aguardando_contato' && p.onboarding_status !== 'concluido')
  const concluidos   = pacientes.filter(p => p.onboarding_status === 'concluido')

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-[22px] font-bold text-white flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-[#f59e0b]" />
                Pós-Vendas
              </h1>
              <p className="text-sm text-[#71717A] mt-1">Onboarding de pacientes — André cuida de tudo após o fechamento</p>
            </div>
            <div className="flex items-center gap-2 bg-[#1a1508] border border-[#f59e0b]/30 rounded-full px-3 py-1.5 text-xs font-semibold text-[#f59e0b]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
              André — voz Tempo
            </div>
          </div>

          {/* André Auto Toggle */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl px-5 py-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className={`w-5 h-5 ${andreAuto ? 'text-[#f59e0b]' : 'text-[#3F3F46]'}`} />
              <div>
                <p className="text-sm font-semibold text-white">André Automático</p>
                <p className="text-xs text-[#52525B]">
                  {andreAuto
                    ? 'Ligação automática ao fechar venda (etapa 7)'
                    : 'Desativado — André só liga quando acionado manualmente'}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleAndreAuto(!andreAuto)}
              disabled={savingAuto}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 disabled:opacity-50 ${andreAuto ? 'bg-[#f59e0b]' : 'bg-[#27272A]'}`}
              title={andreAuto ? 'Desativar André automático' : 'Ativar André automático'}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${andreAuto ? 'translate-x-6' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total pacientes', value: pacientes.length,   color: '#7B3FE4' },
              { label: 'Aguardando André', value: aguardando.length,  color: '#f59e0b' },
              { label: 'Em andamento',     value: emAndamento.length, color: '#3b82f6' },
              { label: 'Concluídos',       value: concluidos.length,  color: '#22c55e' },
            ].map(k => (
              <div key={k.label} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <p className="text-2xl font-bold font-mono" style={{ color: k.color }}>{k.value}</p>
                <p className="text-xs text-[#71717A] mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Pipeline Etapas */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 mb-6">
            <p className="text-[10px] font-bold tracking-widest text-[#3F3F46] uppercase mb-4">Pipeline André</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {ETAPAS.map((e, i) => {
                const count = pacientes.filter(p =>
                  (p.onboarding_status ?? 'aguardando_contato') === e.key
                ).length
                const cfg = STATUS_CONFIG[e.key]
                return (
                  <div key={e.key} className="flex items-center gap-2 flex-shrink-0">
                    <div className="bg-[#18181A] border border-[#1C1C1E] rounded-xl px-4 py-3 min-w-[120px] text-center">
                      <div className="flex items-center justify-center gap-1 mb-1" style={{ color: cfg.color }}>
                        {e.icon}
                        <span className="text-xs font-semibold">{e.label}</span>
                      </div>
                      <p className="text-xl font-bold font-mono text-white">{count}</p>
                    </div>
                    {i < ETAPAS.length - 1 && <span className="text-[#2C2C2E] text-lg">›</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Config André */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl mb-6 overflow-hidden">
            <button
              onClick={() => setConfigOpen(o => !o)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#111115] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#f59e0b]" />
                <span className="text-sm font-semibold text-white">Config André</span>
                <span className="text-[10px] text-[#3F3F46] bg-[#18181A] px-2 py-0.5 rounded font-mono">profile=andre · voz Tempo</span>
              </div>
              {configOpen ? <ChevronUp className="w-4 h-4 text-[#52525B]" /> : <ChevronDown className="w-4 h-4 text-[#52525B]" />}
            </button>
            {configOpen && (
              <div className="px-6 pb-5 border-t border-[#1C1C1E]">
                <p className="text-xs text-[#52525B] mt-4 mb-2">System Instructions — editadas aqui e salvas diretamente no Supabase</p>
                <textarea
                  value={andrePrompt}
                  onChange={e => setAndrePrompt(e.target.value)}
                  rows={16}
                  className="w-full bg-[#0A0A0B] border border-[#1C1C1E] rounded-xl px-4 py-3 text-xs text-white font-mono resize-y focus:outline-none focus:border-[#f59e0b]/50"
                  placeholder="Prompt do André..."
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={salvarPrompt}
                    disabled={savingPrompt}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-black text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingPrompt ? 'Salvando...' : 'Salvar prompt'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lista de pacientes */}
          {loading ? (
            <div className="text-center py-12 text-[#3F3F46] text-sm">Carregando...</div>
          ) : pacientes.length === 0 ? (
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-12 text-center">
              <UserCheck className="w-12 h-12 text-[#2C2C2E] mx-auto mb-3" />
              <p className="text-sm text-[#3F3F46]">Nenhum paciente ainda</p>
              <p className="text-xs text-[#2C2C2E] mt-1">Os pacientes aparecem aqui quando fecham na Etapa 7</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pacientes.map(p => {
                const status = (p.onboarding_status ?? 'aguardando_contato') as OnboardingStatus
                const statusIdx = ETAPAS.findIndex(e => e.key === status)
                const cfg = STATUS_CONFIG[status]
                return (
                  <div key={p.id} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl px-5 py-4">
                    {/* Top row: name + phone + time + call button */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#1C1C1E] flex items-center justify-center flex-shrink-0">
                          <UserCheck className="w-4 h-4 text-[#f59e0b]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{p.nome || 'Paciente'}</p>
                          <p className="text-xs font-mono text-[#52525B]">{p.telefone} · fechou {tempoRelativo(p.updated_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Status badge */}
                        <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                        <button
                          onClick={() => ligarAndre(p)}
                          disabled={ligando === p.id}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 text-[#f59e0b] border border-[#f59e0b]/30 rounded-xl transition-colors disabled:opacity-50 font-semibold"
                        >
                          <PhoneCall className="w-3 h-3" />
                          {ligando === p.id ? 'Ligando...' : 'André'}
                        </button>
                      </div>
                    </div>

                    {/* Progress track */}
                    <div className="flex items-center gap-0">
                      {ETAPAS.map((e, i) => {
                        const done = i < statusIdx
                        const current = i === statusIdx
                        const eCfg = STATUS_CONFIG[e.key]
                        return (
                          <div key={e.key} className="flex items-center flex-1">
                            <button
                              onClick={() => atualizarStatus(p.id, e.key)}
                              title={`Marcar como: ${eCfg.label}`}
                              className="flex flex-col items-center gap-1 group w-full"
                            >
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all border-2 ${
                                  done    ? 'border-transparent'
                                  : current ? 'border-current scale-110'
                                  : 'border-[#2C2C2E] opacity-30'
                                }`}
                                style={done || current ? { backgroundColor: done ? `${eCfg.color}30` : 'transparent', color: eCfg.color, borderColor: done ? 'transparent' : eCfg.color } : {}}
                              >
                                {done ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: eCfg.color }} />
                                ) : (
                                  <span style={current ? { color: eCfg.color } : { color: '#3F3F46' }}>
                                    {e.icon}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-[9px] font-semibold tracking-wide ${current ? 'opacity-100' : done ? 'opacity-60' : 'opacity-25'}`}
                                style={{ color: current ? eCfg.color : done ? eCfg.color : '#71717A' }}
                              >
                                {e.label}
                              </span>
                            </button>
                            {i < ETAPAS.length - 1 && (
                              <div className={`h-px flex-1 mx-1 mb-4 transition-colors ${done ? 'bg-[#2C2C2E]' : 'bg-[#1C1C1E]'}`} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1C1C1E] border border-[#2C2C2E] text-white text-sm px-5 py-2.5 rounded-2xl shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
