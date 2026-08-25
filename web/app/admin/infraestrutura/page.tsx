'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { ExternalLink, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

interface LiveStatus {
  openai: { ok: boolean; available: number | null; error?: string }
  zapi: { ok: boolean; connected: boolean; status?: string }
  ts: string
}

interface Service {
  id: string
  name: string
  icon: string
  color: string
  status: 'online' | 'warn' | 'offline'
  alertLevel: 'warn' | 'crit' | null
  description: string
  cost: string
  balance: string
  renewal: string
  renewalDays: number
  storage?: { used: number; total: number; unit: string }
  link?: string
}

const SERVICES: Service[] = [
  {
    id: 'vercel', name: 'Vercel', icon: '▲', color: '#ffffff',
    status: 'online', alertLevel: null,
    description: 'Hospedagem do app Next.js. Deploy contínuo via GitHub.',
    cost: '$20/mês', balance: 'Pro Plan', renewal: '15/09/2026', renewalDays: 39, link: 'https://vercel.com',
  },
  {
    id: 'supabase', name: 'Supabase', icon: '⚡', color: '#3ecf8e',
    status: 'warn', alertLevel: 'warn',
    description: 'Banco de dados PostgreSQL + Auth. Armazena leads, mensagens e referidos.',
    cost: '$25/mês', balance: 'Pro Plan', renewal: '01/09/2026', renewalDays: 25,
    storage: { used: 7.8, total: 10, unit: 'GB' }, link: 'https://supabase.com',
  },
  {
    id: 'claude', name: 'Claude API', icon: '✦', color: '#cc785c',
    status: 'online', alertLevel: null,
    description: 'Inteligência do agente Ana Mensagem via n8n.',
    cost: '$150/mês', balance: '$342 créditos', renewal: 'Pay-as-you-go', renewalDays: 999, link: 'https://console.anthropic.com',
  },
  {
    id: 'openai', name: 'OpenAI', icon: '🤖', color: '#10a37f',
    status: 'online', alertLevel: null,
    description: 'API de voz em tempo real para Ana Voz (Realtime API). Créditos pay-as-you-go.',
    cost: '$120/mês', balance: '…', renewal: 'Pay-as-you-go', renewalDays: 999, link: 'https://platform.openai.com/billing',
  },
  {
    id: 'zapi', name: 'Z-API', icon: '📱', color: '#25d366',
    status: 'warn', alertLevel: 'warn',
    description: 'API WhatsApp Business. Recebe e envia mensagens para leads.',
    cost: 'R$99/mês', balance: '…', renewal: '20/08/2026', renewalDays: 13, link: 'https://app.z-api.io',
  },
  {
    id: 'n8n', name: 'n8n', icon: '⚙️', color: '#ea4b71',
    status: 'online', alertLevel: null,
    description: 'Orquestrador de fluxos. Hospeda Ana Mensagem e Ana Vapi.',
    cost: '$50/mês', balance: 'Cloud Pro', renewal: '10/09/2026', renewalDays: 34, link: 'https://n8n.hormoneecosystem.com',
  },
  {
    id: 'elevenlabs', name: 'ElevenLabs', icon: '🔊', color: '#f5a623',
    status: 'online', alertLevel: null,
    description: 'Síntese de voz para Ana Voz.',
    cost: '$22/mês', balance: '48.000 chars', renewal: '05/09/2026', renewalDays: 29, link: 'https://elevenlabs.io',
  },
  {
    id: 'r2', name: 'R2 Storage', icon: '☁️', color: '#f6821f',
    status: 'online', alertLevel: null,
    description: 'Armazenamento de vídeos (tutorial WhatsApp, conteúdo).',
    cost: '$5/mês', balance: 'Pay-as-you-go', renewal: 'Mensal', renewalDays: 999,
    storage: { used: 2.1, total: 10, unit: 'GB' }, link: 'https://dash.cloudflare.com',
  },
  {
    id: 'github', name: 'GitHub', icon: '🐙', color: '#a0a0a0',
    status: 'online', alertLevel: null,
    description: 'Repositório de código e CI/CD.',
    cost: '$0/mês', balance: 'Free Plan', renewal: '—', renewalDays: 999, link: 'https://github.com',
  },
  {
    id: 'twilio', name: 'Twilio', icon: '📞', color: '#f22f46',
    status: 'online', alertLevel: null,
    description: 'Telefonia para ligações de Ana Voz.',
    cost: '$45/mês', balance: '$89 créditos', renewal: 'Pay-as-you-go', renewalDays: 999, link: 'https://console.twilio.com',
  },
  {
    id: 'claudecode', name: 'Claude Code', icon: '💻', color: '#7c5cfc',
    status: 'online', alertLevel: null,
    description: 'Desenvolvimento e manutenção do ecossistema.',
    cost: '$420/mês', balance: 'Max Plan', renewal: '01/09/2026', renewalDays: 25, link: 'https://claude.ai/code',
  },
]

const TOTAL_COST = 847

// Canvas spider web layout
interface Node {
  id: string
  x: number
  y: number
  r: number
  service: Service
}

interface Pulse {
  from: number
  to: number
  t: number
  speed: number
  color: string
}

function buildNodes(W: number, H: number): Node[] {
  const cx = W / 2, cy = H * 0.47
  const outer = SERVICES
  const angleStep = (2 * Math.PI) / outer.length
  const rad = Math.min(W, H) * 0.32
  return [
    { id: 'center', x: cx, y: cy, r: 36, service: { id: 'center', name: 'Hormone Ecosystem', icon: '🧬', color: '#7c5cfc', status: 'online', alertLevel: null, description: 'Core', cost: '', balance: '', renewal: '', renewalDays: 999 } },
    ...outer.map((s, i) => ({
      id: s.id,
      x: cx + rad * Math.cos(angleStep * i - Math.PI / 2),
      y: cy + rad * Math.sin(angleStep * i - Math.PI / 2),
      r: 26,
      service: s,
    })),
  ]
}

function drawWeb(ctx: CanvasRenderingContext2D, nodes: Node[], selectedId: string | null, hoveredId: string | null, pulses: Pulse[]) {
  const W = ctx.canvas.width, H = ctx.canvas.height
  ctx.clearRect(0, 0, W, H)

  const center = nodes[0]
  const outer = nodes.slice(1)

  // Draw outer ring connections (polygon)
  ctx.beginPath()
  outer.forEach((n, i) => {
    if (i === 0) ctx.moveTo(n.x, n.y)
    else ctx.lineTo(n.x, n.y)
  })
  ctx.closePath()
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Draw spokes center → each outer
  outer.forEach((n) => {
    const isHighlighted = selectedId === n.id || hoveredId === n.id
    ctx.beginPath()
    ctx.moveTo(center.x, center.y)
    ctx.lineTo(n.x, n.y)
    ctx.strokeStyle = isHighlighted ? `${n.service.color}60` : 'rgba(255,255,255,0.06)'
    ctx.lineWidth = isHighlighted ? 1.5 : 1
    ctx.stroke()
  })

  // Draw pulses
  pulses.forEach((p) => {
    const fromNode = nodes[p.from]
    const toNode = nodes[p.to]
    const x = fromNode.x + (toNode.x - fromNode.x) * p.t
    const y = fromNode.y + (toNode.y - fromNode.y) * p.t
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 6)
    grad.addColorStop(0, p.color)
    grad.addColorStop(1, 'transparent')
    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()
  })

  // Draw nodes
  nodes.forEach((n) => {
    const isSelected = selectedId === n.id
    const isHovered = hoveredId === n.id
    const isCenter = n.id === 'center'
    const r = isCenter ? n.r : n.r

    // Glow
    if (isSelected || isHovered) {
      ctx.beginPath()
      ctx.arc(n.x, n.y, r + 10, 0, Math.PI * 2)
      const glow = ctx.createRadialGradient(n.x, n.y, r - 4, n.x, n.y, r + 10)
      glow.addColorStop(0, `${n.service.color}40`)
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.fill()
    }

    // Circle fill
    ctx.beginPath()
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
    ctx.fillStyle = isCenter ? '#1a1f2e' : '#131720'
    ctx.fill()

    // Border
    ctx.beginPath()
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
    ctx.strokeStyle = isSelected
      ? n.service.color
      : isHovered
      ? `${n.service.color}80`
      : isCenter
      ? '#252d42'
      : '#1e2436'
    ctx.lineWidth = isSelected ? 2 : 1.5
    ctx.stroke()

    // Alert dot
    if (n.service.alertLevel) {
      ctx.beginPath()
      ctx.arc(n.x + r * 0.65, n.y - r * 0.65, 5, 0, Math.PI * 2)
      ctx.fillStyle = n.service.alertLevel === 'crit' ? '#ef4444' : '#f59e0b'
      ctx.fill()
    }

    // Icon text
    ctx.font = isCenter ? '20px serif' : '14px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(n.service.icon, n.x, n.y)

    // Label
    if (!isCenter) {
      ctx.font = '10px system-ui,sans-serif'
      ctx.fillStyle = isSelected || isHovered ? '#e2e5f0' : '#8891a8'
      ctx.fillText(n.service.name, n.x, n.y + r + 13)
    }
  })
}

export default function InfraPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<Node[]>([])
  const pulsesRef = useRef<Pulse[]>([])
  const animRef = useRef<number>(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  const hoveredIdRef = useRef<string | null>(null)
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)

  const fetchLiveStatus = useCallback(async () => {
    setLiveLoading(true)
    try {
      const res = await fetch('/api/admin/infraestrutura/status')
      if (res.ok) setLiveStatus(await res.json())
    } finally {
      setLiveLoading(false)
    }
  }, [])

  useEffect(() => { fetchLiveStatus() }, [fetchLiveStatus])

  const selected = selectedId ? SERVICES.find(s => s.id === selectedId) || (selectedId === 'center' ? null : null) : null
  const hovered = hoveredId ? SERVICES.find(s => s.id === hoveredId) : null

  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  useEffect(() => {
    hoveredIdRef.current = hoveredId
  }, [hoveredId])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect()
      canvas.width = rect.width * devicePixelRatio
      canvas.height = rect.height * devicePixelRatio
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      ctx.scale(devicePixelRatio, devicePixelRatio)
      nodesRef.current = buildNodes(rect.width, rect.height)
    }
    resize()
    window.addEventListener('resize', resize)

    // Seed pulses
    const seedPulses = () => {
      const nodes = nodesRef.current
      if (nodes.length < 2) return
      if (pulsesRef.current.length < 6) {
        const outerIdx = Math.floor(Math.random() * (nodes.length - 1)) + 1
        const toCenter = Math.random() > 0.5
        pulsesRef.current.push({
          from: toCenter ? outerIdx : 0,
          to: toCenter ? 0 : outerIdx,
          t: 0,
          speed: 0.004 + Math.random() * 0.004,
          color: nodes[outerIdx].service.color,
        })
      }
    }

    let last = 0
    const frame = (ts: number) => {
      const dt = Math.min(ts - last, 50)
      last = ts
      pulsesRef.current = pulsesRef.current.filter(p => {
        p.t += p.speed * (dt / 16)
        return p.t < 1
      })
      if (Math.random() < 0.03) seedPulses()
      const rect = canvas.parentElement!.getBoundingClientRect()
      drawWeb(ctx, nodesRef.current, selectedIdRef.current, hoveredIdRef.current, pulsesRef.current)
      animRef.current = requestAnimationFrame(frame)
    }
    animRef.current = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const getNodeAt = (x: number, y: number) => {
    return nodesRef.current.find(n => Math.hypot(n.x - x, n.y - y) < n.r + 8) || null
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const n = getNodeAt(e.clientX - rect.left, e.clientY - rect.top)
    const id = n ? n.id : null
    setHoveredId(id)
    canvasRef.current!.style.cursor = id ? 'pointer' : 'default'
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const n = getNodeAt(e.clientX - rect.left, e.clientY - rect.top)
    if (n) setSelectedId(prev => prev === n.id ? null : n.id)
  }

  const displayService = SERVICES.find(s => s.id === selectedId) || (selectedId === 'center' ? null : null)

  const renewalColor = (days: number) => {
    if (days === 999) return 'ok'
    if (days < 14) return 'crit'
    if (days < 30) return 'warn'
    return 'ok'
  }

  const renewalColors = {
    ok: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', text: '#22c55e' },
    warn: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b' },
    crit: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: '#ef4444' },
  }

  const alertServices = SERVICES.filter(s => s.alertLevel)
  const renewingSoon = SERVICES.filter(s => s.renewalDays < 30 && s.renewalDays !== 999)

  const openaiOk = liveStatus ? liveStatus.openai.ok : true
  const zapiOk = liveStatus ? liveStatus.zapi.connected : true
  const criticalCount = (!openaiOk ? 1 : 0) + (!zapiOk ? 1 : 0)

  const openaiBalance = liveStatus?.openai.available !== null && liveStatus?.openai.available !== undefined
    ? `$${liveStatus.openai.available.toFixed(2)}`
    : liveStatus
    ? (liveStatus.openai.ok ? 'Ativo' : '⚠️ Sem saldo')
    : '…'

  const zapiBalance = liveStatus
    ? (liveStatus.zapi.connected ? 'Conectado' : '⚠️ Desconectado')
    : '…'

  const lastChecked = liveStatus
    ? new Date(liveStatus.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-hidden flex flex-col p-6 gap-4">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[22px] font-bold text-white">Infraestrutura</h1>
              <p className="text-sm text-[#71717A] mt-1">Serviços conectados, custos e alertas em tempo real</p>
            </div>
            <button
              onClick={fetchLiveStatus}
              disabled={liveLoading}
              className="flex items-center gap-2 px-3 py-2 bg-[#111113] border border-[#1C1C1E] rounded-lg text-xs text-[#71717A] hover:text-white hover:border-[#3F3F46] transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${liveLoading ? 'animate-spin' : ''}`} />
              {lastChecked ? `Atualizado ${lastChecked}` : 'Verificar agora'}
            </button>
          </div>

          {/* Critical live alerts */}
          {liveStatus && (!openaiOk || !zapiOk) && (
            <div className="flex gap-2 flex-wrap">
              {!openaiOk && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#ef4444] text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  🔴 OpenAI sem crédito — Ana Voz OFFLINE. Recarregue: platform.openai.com/billing
                </div>
              )}
              {!zapiOk && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#ef4444] text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  🔴 Z-API desconectado — WhatsApp não está funcionando. Verifique: app.z-api.io
                </div>
              )}
            </div>
          )}

          {/* Top metrics */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-4">
              <p className="text-[22px] font-bold font-mono text-[#7c5cfc]">${TOTAL_COST}</p>
              <p className="text-[10px] text-[#3F3F46] uppercase tracking-wider mt-1">Custo Mensal Total</p>
            </div>
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-4">
              <p className="text-[22px] font-bold font-mono text-[#f59e0b]">{renewingSoon.length}</p>
              <p className="text-[10px] text-[#3F3F46] uppercase tracking-wider mt-1">Renovações em 30 dias</p>
            </div>
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-4">
              <p className="text-[22px] font-bold font-mono text-[#22c55e]">11/11</p>
              <p className="text-[10px] text-[#3F3F46] uppercase tracking-wider mt-1">Serviços Online</p>
            </div>
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-4">
              <p className={`text-[22px] font-bold font-mono ${criticalCount > 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                {criticalCount}
              </p>
              <p className="text-[10px] text-[#3F3F46] uppercase tracking-wider mt-1">Alertas Críticos</p>
            </div>
          </div>

          {/* Static alerts */}
          {(alertServices.length > 0 || renewingSoon.length > 0) && (
            <div className="flex gap-2 flex-wrap">
              {alertServices.filter(s => s.id !== 'zapi').map(s => (
                <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] text-[#f59e0b] text-xs font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {s.name}: {s.id === 'supabase' ? 'Storage em 78% — considere upgrade' : `Renova em ${s.renewalDays} dias`}
                </div>
              ))}
              {renewingSoon.filter(s => !alertServices.includes(s)).map(s => (
                <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] text-[#f59e0b] text-xs font-medium">
                  <RefreshCw className="w-3 h-3" />
                  {s.name}: renova em {s.renewalDays} dias
                </div>
              ))}
            </div>
          )}

          {/* Spider + Detail */}
          <div className="flex-1 flex gap-4 overflow-hidden min-h-0">

            {/* Canvas */}
            <div className="flex-1 bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden relative">
              <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredId(null)}
                onClick={handleClick}
                style={{ display: 'block', width: '100%', height: '100%' }}
              />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-[#3F3F46] bg-[#18181A] border border-[#1C1C1E] rounded-full px-3 py-1 pointer-events-none whitespace-nowrap">
                Clique em um nó para ver detalhes
              </div>
            </div>

            {/* Detail panel */}
            <div className="w-[320px] bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-y-auto flex flex-col">
              {displayService ? (
                <>
                  <div className="p-4 border-b border-[#1C1C1E]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#3F3F46] mb-2">Serviço Selecionado</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{displayService.icon}</span>
                      <div>
                        <p className="text-base font-bold text-white">{displayService.name}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(34,197,94,0.1)] text-[#22c55e] border border-[rgba(34,197,94,0.25)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                          Online
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-[#8891a8] mt-2">{displayService.description}</p>
                  </div>

                  <div className="px-4 flex flex-col divide-y divide-[#1C1C1E]">
                    <div className="flex justify-between items-center py-3">
                      <span className="text-xs text-[#71717A]">Custo mensal</span>
                      <span className="text-sm font-bold font-mono text-white">{displayService.cost || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-xs text-[#71717A]">Saldo / Plano</span>
                      <span className={`text-sm font-semibold font-mono ${
                        displayService.id === 'openai'
                          ? openaiOk ? 'text-[#22c55e]' : 'text-[#ef4444]'
                          : displayService.id === 'zapi'
                          ? zapiOk ? 'text-[#22c55e]' : 'text-[#ef4444]'
                          : 'text-[#22c55e]'
                      }`}>
                        {displayService.id === 'openai'
                          ? openaiBalance
                          : displayService.id === 'zapi'
                          ? zapiBalance
                          : displayService.balance || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-xs text-[#71717A]">Renovação</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold font-mono text-white">{displayService.renewal}</span>
                        {displayService.renewalDays !== 999 && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{
                              background: renewalColors[renewalColor(displayService.renewalDays)].bg,
                              border: `1px solid ${renewalColors[renewalColor(displayService.renewalDays)].border}`,
                              color: renewalColors[renewalColor(displayService.renewalDays)].text,
                            }}
                          >
                            {displayService.renewalDays}d
                          </span>
                        )}
                      </div>
                    </div>

                    {displayService.storage && (
                      <div className="py-3">
                        <div className="flex justify-between text-xs text-[#71717A] mb-2">
                          <span>Armazenamento</span>
                          <span className="text-white font-mono">{displayService.storage.used}/{displayService.storage.total} {displayService.storage.unit}</span>
                        </div>
                        <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(displayService.storage.used / displayService.storage.total) * 100}%`,
                              background: displayService.storage.used / displayService.storage.total > 0.8 ? '#f59e0b' : '#22c55e',
                            }}
                          />
                        </div>
                        {displayService.storage.used / displayService.storage.total > 0.75 && (
                          <p className="text-[10px] text-[#f59e0b] mt-1.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Considere fazer upgrade em breve
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {displayService.link && (
                    <div className="p-4 mt-auto">
                      <a
                        href={displayService.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-[rgba(124,92,252,0.1)] border border-[rgba(124,92,252,0.3)] text-[#7c5cfc] rounded-xl text-xs font-semibold hover:bg-[#7c5cfc] hover:text-white transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir painel
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 p-8 text-center gap-3">
                  <span className="text-4xl opacity-20">🕸️</span>
                  <p className="text-xs text-[#3F3F46]">Clique em um nó para ver custo, saldo, renovação e armazenamento</p>
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
