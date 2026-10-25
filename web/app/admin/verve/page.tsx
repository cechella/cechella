'use client'

import { emBrasilia } from '@/lib/verve/horario'
import { useState, useEffect, useRef } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Calendar,
  CheckCircle2,
  Target,
  BarChart3,
  Clock,
  Instagram,
  Film,
  Image,
  Circle,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Users,
  RefreshCw,
  Wand2,
  Upload,
  X,
  MoreHorizontal,
  Plus,
  FileText,
  Bot,
  MessageSquare,
  Send,
} from 'lucide-react'

type Tab = 'calendario' | 'aprovacao' | 'publicados' | 'briefings' | 'metas' | 'metricas' | 'chat'

type PostType = 'reel' | 'carrossel' | 'story'
type PostStatus = 'rascunho' | 'aguardando' | 'aprovado' | 'publicado' | 'recusado' | 'publicando' | 'erro'

interface BriefingPost {
  tipo: string
  tema: string
  pilar: string
  scheduled_at: string
}

interface Briefing {
  id: string
  titulo: string
  objetivo: string
  publico_alvo: string
  pilar: string
  gatilho_manychat: string
  semana: string
  posts: BriefingPost[]
  status: 'proposta' | 'aprovado' | 'recusado'
  created_at: string
}

interface Metrics {
  followers_count: number
  followers_gained_week: number
  reach_week: number
  sends_reach_pct: string
  saves_recent: number
  updated_at: string
}

interface Post {
  id: string
  tipo: PostType
  titulo: string
  pilar: 'familia' | 'autoridade' | 'lifestyle'
  data: string
  hora: string
  status: PostStatus
  slides?: number
  image_urls?: string[]
  legenda?: string
  ig_media_id?: string
  permalink?: string
}

const POSTS_SEMANA: Post[] = [
  { id: '1', tipo: 'reel',      titulo: 'Por que seus hormônios mudam tudo', pilar: 'autoridade', data: '2026-10-22', hora: '08:00', status: 'aguardando' },
  { id: '2', tipo: 'carrossel', titulo: 'Pai da Maria — 15 anos', pilar: 'familia',    data: '2026-10-22', hora: '18:00', status: 'aguardando', slides: 8 },
  { id: '3', tipo: 'reel',      titulo: 'Bastidores do mercado de Itajaí', pilar: 'autoridade', data: '2026-10-23', hora: '12:00', status: 'rascunho' },
  { id: '4', tipo: 'carrossel', titulo: '3 sinais de que seus hormônios estão errados', pilar: 'autoridade', data: '2026-10-24', hora: '09:00', status: 'aguardando', slides: 12 },
  { id: '5', tipo: 'carrossel', titulo: 'Rotina de segunda: planejamento semanal', pilar: 'lifestyle', data: '2026-10-25', hora: '07:00', status: 'rascunho', slides: 6 },
  { id: '6', tipo: 'reel',      titulo: 'Longevidade não é luxo — é escolha', pilar: 'autoridade', data: '2026-10-26', hora: '10:00', status: 'rascunho' },
]

const DIAS = ['Seg 20', 'Ter 21', 'Qua 22', 'Qui 23', 'Sex 24', 'Sáb 25', 'Dom 26']
const DATAS = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26']

const pilarColor: Record<string, string> = {
  familia:    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  autoridade: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  lifestyle:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

const tipoIcon: Record<PostType, React.ReactNode> = {
  reel:      <Film className="w-3 h-3" />,
  carrossel: <Image className="w-3 h-3" />,
  story:     <Circle className="w-3 h-3" />,
}

const tipoColor: Record<PostType, string> = {
  reel:      'bg-purple-500/15 text-purple-300 border-purple-500/25',
  carrossel: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  story:     'bg-orange-500/15 text-orange-300 border-orange-500/25',
}

const statusColor: Record<PostStatus, string> = {
  rascunho:   'text-[#71717A]',
  aguardando: 'text-yellow-400',
  aprovado:   'text-green-400',
  publicado:  'text-blue-400',
  recusado:   'text-red-400',
  publicando: 'text-yellow-300',
  erro:       'text-red-500',
}

interface NovoPost {
  tipo: PostType
  titulo: string
  legenda: string
  pilar: 'familia' | 'autoridade' | 'lifestyle'
  scheduled_at: string
  files: File[]
}

export default function VervePage() {
  const [tab, setTab] = useState<Tab>('calendario')
  const [posts, setPosts] = useState<Post[]>(POSTS_SEMANA)
  const [postsLoading, setPostsLoading] = useState(false)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [briefings, setBriefings] = useState<Briefing[]>([])
  const [briefingsLoading, setBriefingsLoading] = useState(false)
  const [captions, setCaptions] = useState<Record<string, string>>({})
  const [captionLoading, setCaptionLoading] = useState<Record<string, boolean>>({})
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)
  const [previewPost, setPreviewPost] = useState<Post | null>(null)
  const [previewSlide, setPreviewSlide] = useState(0)
  const [scheduleModal, setScheduleModal] = useState<{ postId: string; scheduledAt: string } | null>(null)
  const [scheduleCustom, setScheduleCustom] = useState('')
  const [novoPost, setNovoPost] = useState<NovoPost>({
    tipo: 'carrossel',
    titulo: '',
    legenda: '',
    pilar: 'autoridade',
    scheduled_at: '',
    files: [],
  })

  const pendentes = posts.filter(p => p.status === 'aguardando')
  // Carrosséis que ficaram como rascunho sem imagem (a geração foi cortada ou falhou): o CEO pode gerar as imagens de novo.
  const semImagem = posts.filter(p => p.status === 'rascunho' && p.tipo === 'carrossel' && !(p.image_urls && p.image_urls.length))
  const [renderLoading, setRenderLoading] = useState<Record<string, boolean>>({})
  const [renderMsg, setRenderMsg] = useState<Record<string, string>>({})
  const [publishLoading, setPublishLoading] = useState<Record<string, boolean>>({})
  const [publishResult, setPublishResult] = useState<Record<string, { ok: boolean; permalink?: string; error?: string }>>({})
  const [publishSuccess, setPublishSuccess] = useState<{ titulo: string; permalink?: string } | null>(null)
  const [publishError, setPublishError] = useState<{ titulo: string; error: string } | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  async function publicarAgora(id: string) {
    setPublishLoading(s => ({ ...s, [id]: true }))
    setPublishResult(s => { const n = { ...s }; delete n[id]; return n })
    try {
      const res = await fetch('/api/admin/verve/posts/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      const data = await res.json().catch(() => ({}))
      if (data.ok) {
        setPublishResult(s => ({ ...s, [id]: { ok: true, permalink: data.permalink } }))
        const post = posts.find(p => p.id === id)
        setPublishSuccess({ titulo: post?.titulo ?? 'Post', permalink: data.permalink })
        await loadPosts()
      } else {
        const errMsg = data.error ?? `Erro ${res.status}`
        setPublishResult(s => ({ ...s, [id]: { ok: false, error: errMsg } }))
        const post = posts.find(p => p.id === id)
        setPublishError({ titulo: post?.titulo ?? 'Post', error: errMsg })
      }
    } catch (e) {
      const errMsg = String(e)
      setPublishResult(s => ({ ...s, [id]: { ok: false, error: errMsg } }))
      const post = posts.find(p => p.id === id)
      setPublishError({ titulo: post?.titulo ?? 'Post', error: errMsg })
    } finally {
      setPublishLoading(s => ({ ...s, [id]: false }))
    }
  }

  async function gerarImagens(id: string) {
    setRenderLoading(s => ({ ...s, [id]: true }))
    setRenderMsg(s => ({ ...s, [id]: '' }))
    try {
      const res = await fetch('/api/admin/verve/posts/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      const data = await res.json().catch(() => ({}))
      if (data.ok) await loadPosts()
      else setRenderMsg(s => ({ ...s, [id]: `Não gerou (${data.error ?? res.status}). Tente de novo.` }))
    } catch {
      setRenderMsg(s => ({ ...s, [id]: 'Falha de conexão. Tente de novo.' }))
    } finally {
      setRenderLoading(s => ({ ...s, [id]: false }))
    }
  }

  async function loadMetrics() {
    setMetricsLoading(true)
    try {
      const res = await fetch('/api/admin/verve/metrics')
      const data = await res.json()
      if (!data.error) setMetrics(data)
    } finally {
      setMetricsLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [])

  // Automático: ao abrir o VERVE, carrosséis em rascunho sem imagens começam a ser gerados sozinhos (um por vez, uma tentativa por post por visita).
  // O agendador do ATLAS faz o mesmo em segundo plano (até 3 tentativas); aqui o CEO vê "Gerando…" e não precisa apertar nada.
  const autoTentados = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (postsLoading || Object.values(renderLoading).some(Boolean)) return
    const alvo = semImagem.find(p => /^[0-9a-f-]{36}$/i.test(p.id) && !autoTentados.current.has(p.id))
    if (!alvo) return
    autoTentados.current.add(alvo.id)
    gerarImagens(alvo.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, postsLoading])

  useEffect(() => {
    if (tab === 'metricas') loadMetrics()
    if (tab === 'briefings') loadBriefings()
  }, [tab])

  async function loadPosts() {
    setPostsLoading(true)
    try {
      const res = await fetch('/api/admin/verve/posts')
      const data = await res.json()
      if (data.posts?.length) {
        setPosts(data.posts.map((p: {
          id: string; tipo: PostType; titulo: string;
          pilar: 'familia' | 'autoridade' | 'lifestyle';
          scheduled_at: string; status: PostStatus; slides?: number;
          image_urls?: string[]; legenda?: string
        }) => ({
          id: p.id,
          tipo: p.tipo,
          titulo: p.titulo,
          pilar: p.pilar,
          data: emBrasilia(p.scheduled_at).data,
          hora: emBrasilia(p.scheduled_at).hora,
          status: p.status,
          slides: p.slides,
          image_urls: p.image_urls,
          legenda: p.legenda,
          ig_media_id: (p as { ig_media_id?: string }).ig_media_id,
          permalink: (p as { permalink?: string }).permalink,
        })))
      }
    } finally {
      setPostsLoading(false)
    }
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = { role: 'user' as const, content: chatInput.trim() }
    const newMessages = [...chatMessages, userMsg]
    setChatMessages(newMessages)
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/admin/verve/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      if (data.reply) setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } finally {
      setChatLoading(false)
    }
  }


  async function loadBriefings() {
    setBriefingsLoading(true)
    try {
      const res = await fetch('/api/admin/verve/briefings')
      const data = await res.json()
      if (data.briefings) setBriefings(data.briefings)
    } finally {
      setBriefingsLoading(false)
    }
  }

  async function aprovarBriefing(id: string) {
    setBriefings(prev => prev.map(b => b.id === id ? { ...b, status: 'aprovado' } : b))
    await fetch('/api/admin/verve/briefings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'aprovado' }),
    })
  }

  async function recusarBriefing(id: string) {
    setBriefings(prev => prev.map(b => b.id === id ? { ...b, status: 'recusado' } : b))
    await fetch('/api/admin/verve/briefings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'recusado' }),
    })
  }

  async function generateCaption(post: Post) {
    setCaptionLoading(prev => ({ ...prev, [post.id]: true }))
    try {
      const res = await fetch('/api/admin/verve/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: post.titulo, pilar: post.pilar, tipo: post.tipo, slides: post.slides }),
      })
      const data = await res.json()
      if (data.legenda) setCaptions(prev => ({ ...prev, [post.id]: data.legenda }))
    } finally {
      setCaptionLoading(prev => ({ ...prev, [post.id]: false }))
    }
  }

  async function submitNovoPost() {
    if (!novoPost.titulo || !novoPost.scheduled_at || !novoPost.files.length) return
    setUploading(true)
    try {
      const fd = new FormData()
      novoPost.files.forEach(f => fd.append('files', f))
      const upRes = await fetch('/api/admin/verve/upload', { method: 'POST', body: fd })
      const upData = await upRes.json()
      if (!upData.urls?.length) throw new Error('Falha no upload')

      const postRes = await fetch('/api/admin/verve/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: novoPost.tipo,
          titulo: novoPost.titulo,
          legenda: novoPost.legenda,
          pilar: novoPost.pilar,
          scheduled_at: novoPost.scheduled_at,
          image_urls: upData.urls,
          slides: novoPost.files.length > 1 ? novoPost.files.length : undefined,
        }),
      })
      const postData = await postRes.json()
      if (postData.post) {
        setPosts(prev => [...prev, {
          id: postData.post.id,
          tipo: novoPost.tipo,
          titulo: novoPost.titulo,
          pilar: novoPost.pilar,
          data: novoPost.scheduled_at.slice(0, 10),
          hora: novoPost.scheduled_at.slice(11, 16),
          status: 'aguardando',
          slides: novoPost.files.length > 1 ? novoPost.files.length : undefined,
        }])
        setUploadDone(true)
        setTimeout(() => {
          setShowUpload(false)
          setUploadDone(false)
          setNovoPost({ tipo: 'carrossel', titulo: '', legenda: '', pilar: 'autoridade', scheduled_at: '', files: [] })
          setTab('aprovacao')
        }, 1500)
      }
    } catch (err) {
      alert(String(err))
    } finally {
      setUploading(false)
    }
  }

  async function aprovar(id: string, scheduledAt?: string) {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'aprovado' } : p))
    const body: Record<string, unknown> = { id, status: 'aprovado' }
    if (scheduledAt) body.scheduled_at = scheduledAt
    await fetch('/api/admin/verve/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  function openScheduleModal(postId: string) {
    const post = posts.find(p => p.id === postId)
    const defaultAt = post ? `${post.data}T${post.hora}` : ''
    setScheduleModal({ postId, scheduledAt: defaultAt })
    setScheduleCustom(defaultAt)
  }

  async function confirmarAgendamento(option: 'agora' | 'hora' | '3h' | 'custom') {
    if (!scheduleModal) return
    const now = new Date()
    let scheduledAt: string
    if (option === 'agora') scheduledAt = now.toISOString()
    else if (option === 'hora') { now.setHours(now.getHours() + 1); scheduledAt = now.toISOString() }
    else if (option === '3h') { now.setHours(now.getHours() + 3); scheduledAt = now.toISOString() }
    else scheduledAt = new Date(scheduleCustom).toISOString()

    const postId = scheduleModal.postId
    const post = posts.find(p => p.id === postId)
    setScheduleModal(null)
    setPreviewPost(null)

    if (option === 'agora' && (post?.status === 'aprovado' || post?.status === 'erro' || post?.status === 'publicando')) {
      // Post já autorizado (ou travado): publica direto no Instagram agora
      await publicarAgora(postId)
    } else {
      // Ainda não autorizado (ou horário futuro): aprova com o horário escolhido
      await aprovar(postId, scheduledAt)
    }
  }
  async function recusar(id: string) {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'recusado' } : p))
    await fetch('/api/admin/verve/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'recusado' }),
    })
  }

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}>
                📱
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[22px] font-bold text-white">VERVE</h1>
                  <span className="flex items-center gap-1.5 bg-[#22c55e]/10 border border-[#22c55e]/25 text-[#22c55e] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-sm text-[#71717A] mt-0.5">Diretor Autônomo de Mídia · @viniciuscechella · Meta: 1M seguidores / ano</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Post
              </button>
              <a
                href="https://www.instagram.com/viniciuscechella"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#131720] border border-[#252d42] rounded-xl px-4 py-2 text-xs font-semibold text-[#71717A] hover:text-white hover:border-[#7B3FE4]/40 transition-all"
              >
                <Instagram className="w-3.5 h-3.5" />
                @viniciuscechella
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Meta mensal', value: '83.333', sub: 'seguidores', color: '#a855f7', icon: <Target className="w-4 h-4" /> },
              { label: 'Posts esta semana', value: String(posts.filter(p => p.status !== 'recusado').length), sub: 'planejados', color: '#3b82f6', icon: <Calendar className="w-4 h-4" /> },
              { label: 'Aguardando aprovação', value: String(pendentes.length), sub: 'posts pendentes', color: '#eab308', icon: <Clock className="w-4 h-4" /> },
              { label: 'Aprovados', value: String(posts.filter(p => p.status === 'aprovado').length), sub: 'prontos p/ publicar', color: '#22c55e', icon: <CheckCircle2 className="w-4 h-4" /> },
            ].map(s => (
              <div key={s.label} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>
                  {s.icon}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">{s.label}</span>
                </div>
                <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] text-[#3F3F46] mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#111113] border border-[#1C1C1E] rounded-xl p-1 mb-6 w-fit">
            {([
              { key: 'calendario', label: 'Calendário', icon: <Calendar className="w-3.5 h-3.5" /> },
              { key: 'aprovacao',  label: `Aprovação${pendentes.length ? ` (${pendentes.length})` : ''}`, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
              { key: 'publicados', label: `Publicados${posts.filter(p => p.status === 'publicado').length ? ` (${posts.filter(p => p.status === 'publicado').length})` : ''}`, icon: <Instagram className="w-3.5 h-3.5" /> },
              { key: 'briefings',  label: `Briefings${briefings.filter(b => b.status === 'proposta').length ? ` (${briefings.filter(b => b.status === 'proposta').length})` : ''}`, icon: <FileText className="w-3.5 h-3.5" /> },
              { key: 'metas',      label: 'Metas',       icon: <Target className="w-3.5 h-3.5" /> },
              { key: 'metricas',   label: 'Métricas',    icon: <BarChart3 className="w-3.5 h-3.5" /> },
              { key: 'chat',       label: 'Chat VERVE',  icon: <MessageSquare className="w-3.5 h-3.5" /> },
            ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-[#18181A] text-white border border-[#252d42]'
                    : 'text-[#71717A] hover:text-white'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* ── TAB: CALENDÁRIO ── */}
          {tab === 'calendario' && (
            <div>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {DIAS.map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-[#3F3F46] uppercase tracking-wider py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {DATAS.map(data => {
                  const dayPosts = posts.filter(p => p.data === data)
                  const isToday = data === '2026-10-22'
                  return (
                    <div
                      key={data}
                      className={`bg-[#111113] rounded-xl p-2.5 min-h-[100px] border transition-all ${
                        isToday ? 'border-purple-500/40' : 'border-[#1C1C1E]'
                      }`}
                    >
                      {isToday && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                          <span className="text-[9px] text-purple-400 font-bold">HOJE</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        {dayPosts.map(p => (
                          <div
                            key={p.id}
                            onClick={() => p.image_urls && p.image_urls.length > 0 ? (setPreviewPost(p), setPreviewSlide(0)) : undefined}
                            className={`flex items-center gap-1 rounded px-1.5 py-0.5 border text-[9px] font-semibold ${tipoColor[p.tipo]} ${p.image_urls && p.image_urls.length > 0 ? 'cursor-pointer hover:brightness-125' : ''}`}
                            title={p.image_urls && p.image_urls.length > 0 ? 'Clique para ver preview' : p.titulo}
                          >
                            {tipoIcon[p.tipo]}
                            <span className="truncate leading-tight">{p.titulo}</span>
                          </div>
                        ))}
                        {/* Stories placeholder */}
                        <div className="flex items-center gap-1 rounded px-1.5 py-0.5 border text-[9px] font-semibold bg-orange-500/10 text-orange-300 border-orange-500/20">
                          <Circle className="w-2.5 h-2.5" />
                          <span>7–10 stories</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-[11px] text-[#3F3F46] mt-3 text-center">
                Semana de 20–26 out · Stories automáticos gerados pelo VERVE diariamente
              </p>
            </div>
          )}

          {/* ── TAB: APROVAÇÃO ── */}
          {tab === 'aprovacao' && (
            <div>
              {semImagem.length > 0 && (
                <div className="mb-4 flex flex-col gap-2">
                  <p className="text-sm text-[#71717A]">{semImagem.length} carrossel{semImagem.length > 1 ? 'éis' : ''} com as imagens sendo geradas automaticamente. Quando terminar, o post aparece aqui para você revisar e autorizar.</p>
                  {semImagem.map(p => (
                    <div key={p.id} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{p.titulo}</p>
                        <p className="text-[11px] text-[#71717A] mt-1">{p.data.slice(5).replace('-', '/')} às {p.hora} · {renderLoading[p.id] ? 'gerando imagens…' : 'aguardando as imagens'}</p>
                        {renderMsg[p.id] && <p className="text-[11px] text-red-400 mt-1">{renderMsg[p.id]}</p>}
                      </div>
                      <button
                        onClick={() => recusar(p.id)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                      >
                        ✕ Recusar
                      </button>
                      <button
                        onClick={() => gerarImagens(p.id)}
                        disabled={renderLoading[p.id]}
                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {renderLoading[p.id] ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        {renderLoading[p.id] ? 'Gerando… (até 1 min)' : 'Tentar de novo'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {pendentes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <CheckCircle2 className="w-12 h-12 text-[#22c55e] mb-3 opacity-40" />
                  <p className="text-[#71717A] font-medium">Nenhum post aguardando aprovação</p>
                  <p className="text-[#3F3F46] text-sm mt-1">O VERVE vai gerar novos conteúdos automaticamente</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-[#71717A] mb-1">{pendentes.length} post{pendentes.length > 1 ? 's' : ''} aguardando sua aprovação para publicar</p>
                  {pendentes.map(p => (
                    <div key={p.id} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                          style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                          {p.tipo === 'reel' ? '🎬' : p.tipo === 'carrossel' ? '📷' : '⭕'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{p.titulo}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold border ${tipoColor[p.tipo]}`}>
                              {tipoIcon[p.tipo]}
                              {p.tipo}{p.slides ? ` · ${p.slides} slides` : ''}
                            </span>
                            <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold border ${pilarColor[p.pilar]}`}>
                              {p.pilar}
                            </span>
                            <span className="text-[11px] text-[#71717A]">{p.data.slice(5).replace('-', '/')} às {p.hora}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {p.image_urls && p.image_urls.length > 0 && (
                            <button
                              onClick={() => { setPreviewPost(p); setPreviewSlide(0) }}
                              className="px-3 py-2 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center gap-1.5"
                            >
                              <Instagram className="w-3 h-3" />
                              Preview
                            </button>
                          )}
                          <button
                            onClick={() => generateCaption(p)}
                            disabled={captionLoading[p.id]}
                            className="px-3 py-2 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {captionLoading[p.id] ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                            Legenda IA
                          </button>
                          <button
                            onClick={() => recusar(p.id)}
                            className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                          >
                            ✕ Recusar
                          </button>
                          <button
                            onClick={() => openScheduleModal(p.id)}
                            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#22c55e] text-black hover:bg-[#16a34a] transition-all"
                          >
                            ✓ Autorizar
                          </button>
                        </div>
                      </div>
                      {captions[p.id] && (
                        <div className="mt-3 p-3 bg-purple-500/5 border border-purple-500/15 rounded-xl">
                          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Legenda gerada pelo VERVE
                          </p>
                          <p className="text-xs text-[#A1A1AA] whitespace-pre-wrap leading-relaxed">{captions[p.id]}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Posts aprovados — prontos para publicar */}
              {posts.filter(p => p.status === 'aprovado' || p.status === 'erro' || p.status === 'publicando').length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-[#22c55e] font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Autorizados — prontos para publicar
                  </p>
                  <div className="flex flex-col gap-3">
                    {posts.filter(p => p.status === 'aprovado' || p.status === 'erro' || p.status === 'publicando').map(p => (
                      <div key={p.id} className="bg-[#111113] border border-[#22c55e]/20 rounded-2xl p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                            {p.tipo === 'reel' ? '🎬' : p.tipo === 'carrossel' ? '📷' : '⭕'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{p.titulo}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold border ${tipoColor[p.tipo]}`}>
                                {tipoIcon[p.tipo]}{p.tipo}{p.slides ? ` · ${p.slides} slides` : ''}
                              </span>
                              <span className="text-[11px] text-[#22c55e]">✓ Autorizado · {p.data.slice(5).replace('-', '/')} às {p.hora}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0 items-center">
                            {p.image_urls && p.image_urls.length > 0 && (
                              <button onClick={(e) => { e.stopPropagation(); setPreviewPost(p); setPreviewSlide(0) }}
                                className="px-3 py-2 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center gap-1.5">
                                <Instagram className="w-3 h-3" /> Preview
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); publicarAgora(p.id) }}
                              disabled={publishLoading[p.id]}
                              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#22c55e] text-black hover:bg-[#16a34a] disabled:opacity-60 transition-all flex items-center gap-1.5"
                            >
                              {publishLoading[p.id] ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                              {publishLoading[p.id] ? 'Publicando…' : 'Publicar agora'}
                            </button>
                            {/* Three-dot menu */}
                            <div className="relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenu(s => s === p.id ? null : p.id) }}
                                className="p-2 rounded-lg text-[#71717A] hover:text-white hover:bg-[#2a2a2a] transition-all"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              {openMenu === p.id && (
                                <div className="absolute right-0 top-9 z-20 bg-[#1C1C1E] border border-[#2a2a2a] rounded-xl shadow-xl py-1 w-56" onClick={e => e.stopPropagation()}>
                                  {p.permalink && (
                                    <a
                                      href={p.permalink}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={() => setOpenMenu(null)}
                                      className="w-full text-left px-4 py-2.5 text-xs text-[#A1A1AA] hover:text-white hover:bg-[#2a2a2a] flex items-center gap-2"
                                    >
                                      <Instagram className="w-3.5 h-3.5" /> Ver no Instagram
                                    </a>
                                  )}
                                  <button
                                    onClick={async () => {
                                      setOpenMenu(null)
                                      await publicarAgora(p.id)
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-xs text-[#22c55e] hover:bg-[#22c55e]/10 flex items-center gap-2"
                                  >
                                    <Send className="w-3.5 h-3.5" /> Republicar agora
                                  </button>
                                  <button
                                    onClick={async () => {
                                      setOpenMenu(null)
                                      await fetch('/api/admin/verve/posts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, status: 'publicado' }) })
                                      await loadPosts()
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-xs text-orange-400 hover:bg-orange-500/10 flex items-center gap-2"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como publicado
                                  </button>
                                  <div className="border-t border-[#2a2a2a] my-1" />
                                  <button
                                    onClick={async () => {
                                      setOpenMenu(null)
                                      await fetch('/api/admin/verve/posts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, status: 'recusado' }) })
                                      await loadPosts()
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                  >
                                    <X className="w-3.5 h-3.5" /> Excluir post
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {p.status === 'publicando' && !publishResult[p.id] && (
                          <div className="mt-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/25 flex items-center justify-between gap-3">
                            <p className="text-xs text-yellow-400">Post preso em &ldquo;publicando&rdquo; — provável falha anterior. Clique em Resetar.</p>
                            <button
                              onClick={async () => {
                                await fetch('/api/admin/verve/posts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, status: 'aprovado' }) })
                                await loadPosts()
                              }}
                              className="px-3 py-1 rounded-lg text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 transition-all whitespace-nowrap flex-shrink-0"
                            >
                              Resetar
                            </button>
                          </div>
                        )}
                        {publishResult[p.id] && (
                          <div className={`mt-3 p-3 rounded-xl ${publishResult[p.id].ok ? 'bg-[#22c55e]/10 border border-[#22c55e]/25' : 'bg-red-500/10 border border-red-500/25'}`}>
                            {publishResult[p.id].ok ? (
                              <p className="text-xs text-[#22c55e] font-semibold">
                                ✓ Publicado no Instagram!{publishResult[p.id].permalink ? <> · <a href={publishResult[p.id].permalink} target="_blank" rel="noreferrer" className="underline">Ver post</a></> : ''}
                              </p>
                            ) : (
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xs text-red-400">
                                  {publishResult[p.id].error?.startsWith('status_invalido') || publishResult[p.id].error === 'so_publica_aprovado'
                                    ? 'Post em estado inválido no banco. Clique em Resetar para corrigir.'
                                    : publishResult[p.id].error === 'ja_esta_sendo_publicado'
                                    ? 'Já está sendo publicado — aguarde ou recarregue.'
                                    : `Erro: ${publishResult[p.id].error}`}
                                </p>
                                {(publishResult[p.id].error?.startsWith('status_invalido') || publishResult[p.id].error === 'so_publica_aprovado') && (
                                  <button
                                    onClick={async () => {
                                      await fetch('/api/admin/verve/posts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, status: 'aprovado' }) })
                                      setPublishResult(s => ({ ...s, [p.id]: { ok: false } }))
                                      await loadPosts()
                                    }}
                                    className="px-3 py-1 rounded-lg text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 transition-all whitespace-nowrap flex-shrink-0"
                                  >
                                    Resetar
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── TAB: PUBLICADOS ── */}
          {tab === 'publicados' && (
            <div>
              {posts.filter(p => p.status === 'publicado').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Instagram className="w-12 h-12 text-[#71717A] mb-3 opacity-40" />
                  <p className="text-[#71717A] font-medium">Nenhum post publicado ainda</p>
                  <p className="text-[#3F3F46] text-sm mt-1">Os posts publicados no Instagram aparecerão aqui</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-[#71717A] mb-1">{posts.filter(p => p.status === 'publicado').length} post{posts.filter(p => p.status === 'publicado').length > 1 ? 's' : ''} publicado{posts.filter(p => p.status === 'publicado').length > 1 ? 's' : ''} no Instagram</p>
                  {posts.filter(p => p.status === 'publicado').sort((a, b) => b.data.localeCompare(a.data)).map(p => (
                    <div key={p.id} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                      <div className="flex items-center gap-4">
                        {p.image_urls && p.image_urls.length > 0 && (
                          <img src={p.image_urls[0]} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-[#2a2a2a]" />
                        )}
                        {(!p.image_urls || p.image_urls.length === 0) && (
                          <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl bg-[#1C1C1E] border border-[#2a2a2a]">
                            {p.tipo === 'reel' ? '🎬' : '📷'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{p.titulo}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold border ${tipoColor[p.tipo]}`}>
                              {tipoIcon[p.tipo]}{p.tipo}{p.slides ? ` · ${p.slides} slides` : ''}
                            </span>
                            <span className="text-[11px] text-[#71717A]">{p.data.slice(5).replace('-', '/')} às {p.hora}</span>
                            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">✓ publicado</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {p.permalink ? (
                            <a href={p.permalink} target="_blank" rel="noreferrer"
                              className="px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#bc1888] text-white hover:opacity-90 transition-all flex items-center gap-1.5">
                              <Instagram className="w-3 h-3" /> Ver no Instagram
                            </a>
                          ) : (
                            <a href="https://www.instagram.com/viniciuscechella" target="_blank" rel="noreferrer"
                              className="px-3 py-2 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center gap-1.5">
                              <Instagram className="w-3 h-3" /> @viniciuscechella
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: BRIEFINGS ── */}
          {tab === 'briefings' && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="flex items-center gap-2 bg-[#111113] border border-[#1C1C1E] rounded-xl px-4 py-3 flex-1">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <p className="text-xs text-[#71717A]">Propostas do <span className="text-white font-semibold">Gustavo</span> — agente de mídia · Aprovação exclusiva do CEO</p>
                </div>
                <button onClick={loadBriefings} disabled={briefingsLoading} className="flex items-center gap-1.5 bg-[#111113] border border-[#1C1C1E] rounded-xl px-4 py-3 text-xs text-[#71717A] hover:text-white transition-all disabled:opacity-50">
                  <RefreshCw className={`w-3 h-3 ${briefingsLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

              {briefingsLoading && (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="w-6 h-6 text-[#3F3F46] animate-spin" />
                </div>
              )}

              {!briefingsLoading && briefings.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Bot className="w-12 h-12 text-[#3F3F46] mb-3 opacity-40" />
                  <p className="text-[#71717A] font-medium">Nenhum briefing recebido ainda</p>
                  <p className="text-[#3F3F46] text-sm mt-1">O Gustavo vai enviar propostas pelo WhatsApp</p>
                </div>
              )}

              {!briefingsLoading && briefings.length > 0 && (
                <div className="flex flex-col gap-4">
                  {briefings.map(b => (
                    <div key={b.id} className={`bg-[#111113] border rounded-2xl p-5 ${
                      b.status === 'proposta' ? 'border-yellow-500/30' :
                      b.status === 'aprovado' ? 'border-green-500/20' : 'border-[#1C1C1E]'
                    }`}>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-base font-bold text-white">{b.titulo}</p>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              b.status === 'proposta' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                              b.status === 'aprovado' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                              'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>{b.status}</span>
                          </div>
                          <p className="text-sm text-[#71717A] leading-relaxed">{b.objetivo}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] text-[#3F3F46]">Semana</p>
                          <p className="text-sm font-mono text-white">{b.semana}</p>
                        </div>
                      </div>

                      {/* Detalhes */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: 'Público', value: b.publico_alvo || '—' },
                          { label: 'Pilar', value: b.pilar },
                          { label: 'Gatilho ManyChat', value: b.gatilho_manychat || '—' },
                        ].map(d => (
                          <div key={d.label} className="bg-[#18181A] rounded-xl p-3">
                            <p className="text-[10px] text-[#3F3F46] uppercase tracking-wider mb-1">{d.label}</p>
                            <p className="text-xs text-white font-medium">{d.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Plano da semana */}
                      {b.posts?.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[10px] font-bold text-[#3F3F46] uppercase tracking-wider mb-2">Plano da semana — {b.posts.length} posts</p>
                          <div className="flex flex-col gap-1.5">
                            {b.posts.map((p, i) => (
                              <div key={i} className="flex items-center gap-3 bg-[#18181A] rounded-lg px-3 py-2">
                                <span className="text-[10px] font-mono text-[#3F3F46] w-5">{String(i + 1).padStart(2, '0')}</span>
                                <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 border ${tipoColor[p.tipo as PostType] ?? 'bg-[#1C1C1E] text-[#71717A] border-[#252d42]'}`}>
                                  {p.tipo}
                                </span>
                                <span className="text-xs text-white flex-1">{p.tema}</span>
                                <span className="text-[10px] text-[#3F3F46]">{emBrasilia(p.scheduled_at).data}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ações */}
                      {b.status === 'proposta' && (
                        <div className="flex gap-2 pt-2 border-t border-[#1C1C1E]">
                          <button
                            onClick={() => recusarBriefing(b.id)}
                            className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                          >
                            ✕ Recusar proposta
                          </button>
                          <button
                            onClick={() => aprovarBriefing(b.id)}
                            className="px-5 py-2 rounded-lg text-xs font-bold bg-[#22c55e] text-black hover:bg-[#16a34a] transition-all"
                          >
                            ✓ Aprovar e gerar rascunhos
                          </button>
                          <p className="text-[10px] text-[#3F3F46] self-center ml-2">Ao aprovar o VERVE cria os rascunhos automaticamente</p>
                        </div>
                      )}
                      {b.status === 'aprovado' && (
                        <div className="pt-2 border-t border-[#1C1C1E]">
                          <p className="text-xs text-green-400">✓ Aprovado — rascunhos gerados na aba Aprovação</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: METAS ── */}
          {tab === 'metas' && (
            <div>
              {/* Meta principal */}
              <div className="bg-[#111113] border border-purple-500/20 rounded-2xl p-5 mb-5"
                style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(236,72,153,0.05) 100%)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <Target className="w-5 h-5 text-purple-400" />
                  <h2 className="text-base font-bold text-white">Meta Oficial — 1 MILHÃO / ANO</h2>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { n: '1.000.000', l: 'seguidores / ano' },
                    { n: '83.333',    l: 'por mês' },
                    { n: '2.976',     l: 'por dia' },
                  ].map(m => (
                    <div key={m.l} className="text-center">
                      <p className="text-2xl font-bold font-mono text-purple-400">{m.n}</p>
                      <p className="text-[11px] text-[#71717A] mt-0.5">{m.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pilares */}
              <h3 className="text-[10px] font-bold tracking-[0.1em] text-[#3F3F46] uppercase mb-3 flex items-center gap-2">
                3 Pilares de Conteúdo
                <span className="flex-1 h-px bg-[#1C1C1E]" />
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { pct: '40%', nome: 'Família', desc: 'Série Pai da Maria, paternidade, valores', color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
                  { pct: '40%', nome: 'Autoridade', desc: 'Imóveis, medicina, negócios, Itajaí', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
                  { pct: '20%', nome: 'Lifestyle', desc: 'Rotina, eventos, networking, prova social', color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
                ].map(p => (
                  <div key={p.nome} className="rounded-xl p-4 border" style={{ background: p.bg, borderColor: p.border }}>
                    <p className="text-2xl font-bold" style={{ color: p.color }}>{p.pct}</p>
                    <p className="text-sm font-semibold text-white mt-1">{p.nome}</p>
                    <p className="text-[11px] text-[#71717A] mt-1 leading-relaxed">{p.desc}</p>
                  </div>
                ))}
              </div>

              {/* Volume semanal */}
              <h3 className="text-[10px] font-bold tracking-[0.1em] text-[#3F3F46] uppercase mb-3 flex items-center gap-2">
                Volume Semanal Necessário
                <span className="flex-1 h-px bg-[#1C1C1E]" />
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: '🎬', label: 'Reels / semana', meta: 5, atual: 0, color: '#a855f7' },
                  { icon: '📷', label: 'Carrosséis / dia', meta: 2, atual: 0, color: '#3b82f6' },
                  { icon: '⭕', label: 'Stories / dia', meta: 8, atual: 0, color: '#f97316' },
                ].map(g => (
                  <div key={g.label} className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{g.icon}</span>
                      <p className="text-[11px] text-[#71717A] font-medium">{g.label}</p>
                    </div>
                    <p className="text-2xl font-bold font-mono mb-2" style={{ color: g.color }}>{g.atual}</p>
                    <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(g.atual / g.meta) * 100}%`, background: g.color }} />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] text-[#3F3F46]">Meta: {g.meta}</span>
                      <span className="text-[10px] text-[#3F3F46]">{Math.round((g.atual / g.meta) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: MÉTRICAS ── */}
          {tab === 'metricas' && (
            <div>
              <div className="flex items-center gap-2 mb-5 bg-[#111113] border border-[#1C1C1E] rounded-xl px-4 py-3">
                <Instagram className="w-4 h-4 text-[#71717A]" />
                <p className="text-xs text-[#71717A]">
                  Dados via Meta Graph API · <span className="font-mono text-[#3F3F46]">instagram_insights</span>
                </p>
                <button
                  onClick={loadMetrics}
                  disabled={metricsLoading}
                  className="ml-auto flex items-center gap-1.5 text-[10px] text-[#71717A] hover:text-white bg-[#18181A] px-3 py-1.5 rounded transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${metricsLoading ? 'animate-spin' : ''}`} />
                  {metrics ? `Atualizado ${new Date(metrics.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Carregar'}
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  {
                    label: 'Seguidores ganhos',
                    value: metrics ? (metrics.followers_gained_week > 0 ? `+${metrics.followers_gained_week.toLocaleString('pt-BR')}` : metrics.followers_count.toLocaleString('pt-BR')) : '—',
                    sub: metrics ? (metrics.followers_gained_week > 0 ? 'esta semana' : 'total de seguidores') : 'esta semana',
                    color: '#a855f7', icon: <Users className="w-4 h-4" />,
                  },
                  {
                    label: 'Alcance semanal',
                    value: metrics ? metrics.reach_week.toLocaleString('pt-BR') : '—',
                    sub: 'impressões únicas',
                    color: '#3b82f6', icon: <TrendingUp className="w-4 h-4" />,
                  },
                  {
                    label: 'Sends / Reach',
                    value: metrics ? `${metrics.sends_reach_pct}%` : '—',
                    sub: 'meta: > 5%',
                    color: parseFloat(metrics?.sends_reach_pct ?? '0') >= 5 ? '#22c55e' : '#eab308',
                    icon: <BarChart3 className="w-4 h-4" />,
                  },
                  {
                    label: 'Saves (recentes)',
                    value: metrics ? metrics.saves_recent.toLocaleString('pt-BR') : '—',
                    sub: 'últimas 10 mídias',
                    color: '#f97316', icon: <Sparkles className="w-4 h-4" />,
                  },
                ].map(m => (
                  <div key={m.label} className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2" style={{ color: m.color }}>
                      {m.icon}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">{m.label}</span>
                    </div>
                    <p className={`text-2xl font-bold font-mono ${metricsLoading ? 'opacity-40' : ''}`} style={{ color: m.color }}>{m.value}</p>
                    <p className="text-[11px] text-[#3F3F46] mt-0.5">{m.sub}</p>
                  </div>
                ))}
              </div>

              {metrics && (
                <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
                  <h3 className="text-[10px] font-bold tracking-[0.1em] text-[#3F3F46] uppercase mb-4 flex items-center gap-2">
                    Progresso da meta
                    <span className="flex-1 h-px bg-[#1C1C1E]" />
                  </h3>
                  <div className="flex items-end gap-3 mb-2">
                    <p className="text-3xl font-bold font-mono text-purple-400">{metrics.followers_count.toLocaleString('pt-BR')}</p>
                    <p className="text-sm text-[#71717A] pb-1">seguidores atuais</p>
                    <p className="text-sm text-[#3F3F46] pb-1 ml-auto">Meta: 1.000.000</p>
                  </div>
                  <div className="h-2 bg-[#1C1C1E] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((metrics.followers_count / 1_000_000) * 100, 100).toFixed(2)}%`,
                        background: 'linear-gradient(90deg, #a855f7, #3b82f6)',
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-[#3F3F46] mt-1.5 text-right">
                    {((metrics.followers_count / 1_000_000) * 100).toFixed(2)}% concluído
                  </p>
                </div>
              )}

              {!metrics && !metricsLoading && (
                <div className="bg-[#111113] border border-dashed border-[#1C1C1E] rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                  <BarChart3 className="w-10 h-10 text-[#3F3F46] mb-3" />
                  <p className="text-sm font-semibold text-[#3F3F46]">Clique em &quot;Carregar&quot; para buscar métricas reais</p>
                  <p className="text-xs text-[#2D2D32] mt-1 max-w-xs">Dados via Instagram Graph API · Atualiza a cada 5 minutos</p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: CHAT ── */}
          {tab === 'chat' && (
            <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
              {/* Info bar */}
              <div className="flex items-center gap-2 mb-4 bg-[#111113] border border-[#1C1C1E] rounded-xl px-4 py-3">
                <Bot className="w-4 h-4 text-purple-400" />
                <p className="text-xs text-[#71717A]">
                  Fale diretamente com o <span className="text-white font-semibold">VERVE</span> — ele tem contexto dos seus briefings e posts desta semana
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-3 mb-4 pr-1">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                    <MessageSquare className="w-10 h-10 text-[#3F3F46] mb-3" />
                    <p className="text-sm text-[#71717A]">Inicie a conversa com o VERVE</p>
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                      {[
                        'Qual o plano desta semana?',
                        'Gera uma legenda para o carrossel de hormônios',
                        'Quais briefings estão pendentes?',
                        'Sugere pauta para amanhã',
                      ].map(s => (
                        <button
                          key={s}
                          onClick={() => { setChatInput(s) }}
                          className="px-3 py-1.5 bg-[#18181A] border border-[#252d42] rounded-lg text-xs text-[#71717A] hover:text-white hover:border-purple-500/30 transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-0.5"
                        style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}>
                        📱
                      </div>
                    )}
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-purple-600 text-white rounded-tr-sm'
                        : 'bg-[#111113] border border-[#1C1C1E] text-[#E4E4E7] rounded-tl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mr-2"
                      style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}>
                      📱
                    </div>
                    <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
                  placeholder="Digite para o VERVE..."
                  disabled={chatLoading}
                  className="flex-1 bg-[#111113] border border-[#252d42] rounded-xl px-4 py-3 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── MODAL: NOVO POST ── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111113] border border-[#252d42] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#1C1C1E]">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-purple-400" />
                <h2 className="text-base font-bold text-white">Novo Post</h2>
              </div>
              <button onClick={() => setShowUpload(false)} className="text-[#71717A] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Tipo */}
              <div>
                <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-2 block">Tipo</label>
                <div className="flex gap-2">
                  {(['carrossel', 'reel', 'story'] as PostType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setNovoPost(p => ({ ...p, tipo: t }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        novoPost.tipo === t
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-[#18181A] text-[#71717A] border-[#252d42] hover:text-white'
                      }`}
                    >
                      {t === 'carrossel' ? '📷' : t === 'reel' ? '🎬' : '⭕'} {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-2 block">Título</label>
                <input
                  value={novoPost.titulo}
                  onChange={e => setNovoPost(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="Ex: Menopausa aos 40?"
                  className="w-full bg-[#18181A] border border-[#252d42] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Pilar */}
              <div>
                <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-2 block">Pilar</label>
                <div className="flex gap-2">
                  {(['familia', 'autoridade', 'lifestyle'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setNovoPost(prev => ({ ...prev, pilar: p }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        novoPost.pilar === p
                          ? pilarColor[p]
                          : 'bg-[#18181A] text-[#71717A] border-[#252d42] hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Agendamento */}
              <div>
                <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-2 block">Publicar em</label>
                <input
                  type="datetime-local"
                  value={novoPost.scheduled_at}
                  onChange={e => setNovoPost(p => ({ ...p, scheduled_at: e.target.value }))}
                  className="w-full bg-[#18181A] border border-[#252d42] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 [color-scheme:dark]"
                />
              </div>

              {/* Legenda */}
              <div>
                <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-2 block">Legenda</label>
                <textarea
                  value={novoPost.legenda}
                  onChange={e => setNovoPost(p => ({ ...p, legenda: e.target.value }))}
                  rows={4}
                  placeholder="Cole a legenda aqui..."
                  className="w-full bg-[#18181A] border border-[#252d42] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-purple-500/50 resize-none"
                />
              </div>

              {/* Upload de imagens */}
              <div>
                <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-2 block">
                  Imagens {novoPost.files.length > 0 && <span className="text-purple-400">({novoPost.files.length} arquivo{novoPost.files.length > 1 ? 's' : ''})</span>}
                </label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#252d42] rounded-xl p-6 cursor-pointer hover:border-purple-500/40 transition-all">
                  <Upload className="w-6 h-6 text-[#3F3F46]" />
                  <p className="text-xs text-[#71717A] text-center">
                    Arraste os slides aqui ou clique para selecionar<br/>
                    <span className="text-[#3F3F46]">JPG/PNG · 1080×1350 · até 20 arquivos</span>
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => {
                      const fs = Array.from(e.target.files ?? [])
                      setNovoPost(p => ({ ...p, files: fs }))
                    }}
                  />
                </label>
                {novoPost.files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {novoPost.files.map((f, i) => (
                      <span key={i} className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded px-2 py-0.5">
                        {String(i + 1).padStart(2, '0')} {f.name.slice(0, 20)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                onClick={submitNovoPost}
                disabled={uploading || uploadDone || !novoPost.titulo || !novoPost.scheduled_at || !novoPost.files.length}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: uploadDone ? '#22c55e' : 'rgb(147,51,234)', color: 'white' }}
              >
                {uploadDone ? (
                  <>✓ Post adicionado à fila de aprovação</>
                ) : uploading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando imagens...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Enviar para aprovação</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PREVIEW INSTAGRAM ── */}
      {/* Instagram preview modal — portrait 4:5 full-screen */}
      {previewPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setPreviewPost(null)}
        >
          <div
            className="relative flex flex-col"
            // A largura acompanha a ALTURA da janela (foto 4:5 + cabeçalho + ações + legenda + botões): em tela de Windows baixa ou com zoom a legenda não some mais.
            style={{ width: 'min(420px, 95vw, max(260px, calc((100dvh - 340px) * 0.8)))' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Instagram phone shell */}
            <div className="bg-[#0a0a0a] rounded-[2rem] border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100dvh - 84px)' }}>

              {/* IG header */}
              <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-[#1a1a1a] flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5 flex-shrink-0">
                  <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">VC</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white leading-tight">viniciuscechella</p>
                  <p className="text-[11px] text-[#71717A]">Hormone Ecosystem · Patrocinado</p>
                </div>
                <button onClick={() => setPreviewPost(null)} className="text-[#71717A] hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Slide image — aspect 4:5 portrait (Instagram native) */}
              <div className="relative bg-black flex-shrink-0" style={{ aspectRatio: '4/5', width: '100%' }}>
                {previewPost.image_urls && previewPost.image_urls[previewSlide] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewPost.image_urls[previewSlide]}
                    alt={`Slide ${previewSlide + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#111]">
                    <p className="text-[#444] text-sm">Gerando fotos…</p>
                  </div>
                )}
                {/* Slide counter dots */}
                {previewPost.image_urls && previewPost.image_urls.length > 1 && (
                  <div className="absolute top-3 left-0 right-0 flex justify-center gap-1">
                    {previewPost.image_urls.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full transition-all ${i === previewSlide ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
                      />
                    ))}
                  </div>
                )}
                {/* Tap zones prev/next — full half-screen touch area */}
                {previewPost.image_urls && previewSlide > 0 && (
                  <button
                    onClick={() => setPreviewSlide(s => s - 1)}
                    className="absolute left-0 top-0 w-1/3 h-full flex items-center justify-start pl-3 opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <div className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white text-xl">‹</div>
                  </button>
                )}
                {previewPost.image_urls && previewSlide < previewPost.image_urls.length - 1 && (
                  <button
                    onClick={() => setPreviewSlide(s => s + 1)}
                    className="absolute right-0 top-0 w-1/3 h-full flex items-center justify-end pr-3 opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <div className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white text-xl">›</div>
                  </button>
                )}
                {/* Slide number badge */}
                <div className="absolute bottom-3 right-3 bg-black/60 rounded-full px-2.5 py-1 text-[11px] text-white font-medium">
                  {previewSlide + 1} / {previewPost.image_urls?.length ?? previewPost.slides ?? 1}
                </div>
              </div>

              {/* IG action row */}
              <div className="px-4 py-3 flex items-center gap-4 border-b border-[#1a1a1a] flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-none stroke-current stroke-2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-none stroke-current stroke-2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-none stroke-current stroke-2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                <div className="flex-1" />
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-none stroke-current stroke-2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              </div>

              {/* Caption — full text, scrollable */}
              <div className="px-4 py-3 overflow-y-auto flex-1" style={{ minHeight: '110px', maxHeight: '200px' }}>
                <p className="text-[13px] text-white leading-relaxed whitespace-pre-wrap">
                  <span className="font-semibold">viniciuscechella</span>{' '}
                  {captions[previewPost.id] || previewPost.legenda || previewPost.titulo}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { recusar(previewPost.id); setPreviewPost(null) }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                ✕ Recusar
              </button>
              <button
                onClick={() => openScheduleModal(previewPost.id)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#22c55e] text-black hover:bg-[#16a34a] transition-all"
              >
                {(previewPost.status === 'aprovado' || previewPost.status === 'erro') ? '🚀 Publicar' : '✓ Autorizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule modal */}
      {scheduleModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setScheduleModal(null)}>
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-1">Quando publicar?</h3>
            <p className="text-[#71717A] text-sm mb-5">Escolha o horário de publicação no Instagram</p>
            <div className="flex flex-col gap-2 mb-4">
              {[
                { key: 'agora', label: '🟢 Publicar agora' },
                { key: 'hora', label: '⏱ Em 1 hora' },
                { key: '3h', label: '⏰ Em 3 horas' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => confirmarAgendamento(opt.key as 'agora' | 'hora' | '3h')}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-medium text-white border transition-all text-left active:scale-95 ${opt.key === 'agora' ? 'bg-[#22c55e]/15 border-[#22c55e]/50 hover:bg-[#22c55e]/25' : 'bg-[#1C1C1E] border-[#2a2a2a] hover:border-[#22c55e]/50 hover:bg-[#22c55e]/10'}`}
                >
                  {opt.label}
                </button>
              ))}
              <div className="border border-[#2a2a2a] rounded-xl p-3">
                <p className="text-[#71717A] text-[11px] mb-2 uppercase tracking-wider font-semibold">Horário específico</p>
                <input
                  type="datetime-local"
                  value={scheduleCustom}
                  onChange={e => setScheduleCustom(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#22c55e]/50"
                />
                <button
                  onClick={() => confirmarAgendamento('custom')}
                  disabled={!scheduleCustom}
                  className="mt-2 w-full py-2 rounded-lg text-sm font-semibold bg-[#22c55e] text-black hover:bg-[#16a34a] disabled:opacity-40 transition-all"
                >
                  Confirmar horário
                </button>
              </div>
            </div>
            <button onClick={() => setScheduleModal(null)} className="w-full py-2 text-sm text-[#71717A] hover:text-white transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── MODAL ERRO PUBLICAÇÃO ── */}
      {publishError && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={() => setPublishError(null)}>
          <div className="bg-[#111113] border border-red-500/30 rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h3 className="text-white font-bold text-xl mb-2">Falha na publicação</h3>
            <p className="text-[#71717A] text-sm mb-2 leading-relaxed">
              Não foi possível publicar <span className="text-white font-medium">&ldquo;{publishError.titulo}&rdquo;</span>.
            </p>
            <p className="text-red-400 text-xs font-mono bg-red-500/10 rounded-lg px-3 py-2 mb-6 break-all">{publishError.error}</p>
            <button onClick={() => setPublishError(null)} className="w-full py-3 rounded-xl text-sm font-semibold bg-[#1C1C1E] text-[#71717A] hover:text-white border border-[#2a2a2a] transition-all">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL SUCESSO PUBLICAÇÃO ── */}
      {publishSuccess && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={() => setPublishSuccess(null)}>
          <div className="bg-[#111113] border border-[#22c55e]/30 rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-white font-bold text-xl mb-2">Publicado no Instagram!</h3>
            <p className="text-[#71717A] text-sm mb-6 leading-relaxed">
              O carrossel <span className="text-white font-medium">&ldquo;{publishSuccess.titulo}&rdquo;</span> foi publicado com sucesso em <span className="text-[#22c55e] font-semibold">@viniciuscechella</span>.
            </p>
            <div className="flex flex-col gap-3">
              {publishSuccess.permalink && (
                <a
                  href={publishSuccess.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#bc1888] text-white hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <Instagram className="w-4 h-4" /> Ver no Instagram
                </a>
              )}
              <button
                onClick={() => setPublishSuccess(null)}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-[#1C1C1E] text-[#71717A] hover:text-white border border-[#2a2a2a] transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
