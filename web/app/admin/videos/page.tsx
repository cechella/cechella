'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Upload, Play, Eye, EyeOff, Trash2, Plus, X,
  CheckCircle, Clock, AlertCircle, Film, Star, Pencil,
  MoreVertical, Users, GraduationCap, Link2, Save,
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Video {
  id: string
  title: string
  description: string | null
  category: string
  duration_seconds: number | null
  hls_path: string | null
  thumbnail_path: string | null
  is_published: boolean
  is_featured: boolean
  created_at: string
}

interface TrainingLesson {
  id: string
  module_id: string
  num: number
  title: string
  duration: string
  video_url: string
}

interface TrainingModule {
  id: string
  num: number
  title: string
  color: string
  lessons: TrainingLesson[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Implantes Hormonais', 'Menopausa', 'Andropausa', 'Performance',
  'Libido', 'Saúde Feminina', 'Saúde Masculina', 'TRH', 'Tireóide', 'Cortisol',
]

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminVideosPage() {
  const [tab, setTab] = useState<'patient' | 'medical'>('patient')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin', role: 'admin' }} title="Gerenciar Vídeos" />
        <main className="flex-1 overflow-y-auto px-6 py-6">

          {/* Tab switcher */}
          <div className="flex gap-2 mb-6 bg-[#111113] border border-[#1C1C1E] rounded-2xl p-1.5 w-fit">
            <button
              onClick={() => setTab('patient')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === 'patient'
                  ? 'bg-[#7B3FE4] text-white shadow-[0_0_12px_rgba(123,63,228,0.3)]'
                  : 'text-[#71717A] hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Landpage / Paciente
            </button>
            <button
              onClick={() => setTab('medical')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === 'medical'
                  ? 'bg-[#3B82F6] text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                  : 'text-[#71717A] hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Área do Médico
            </button>
          </div>

          {tab === 'patient'
            ? <PatientVideos supabase={supabase} />
            : <MedicalVideos supabase={supabase} />
          }

        </main>
      </div>
    </div>
  )
}

// ─── Patient Videos Section ──────────────────────────────────────────────────

function PatientVideos({ supabase }: { supabase: ReturnType<typeof createBrowserClient> }) {
  const [videos, setVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const editVideoInputRef = useRef<HTMLInputElement>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const [editVideoName, setEditVideoName] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '', description: '', category: CATEGORIES[0], duration_seconds: '',
  })

  async function loadVideos() {
    setIsLoading(true)
    const { data } = await supabase.from('videos').select('*').order('created_at', { ascending: false })
    setVideos(data ?? [])
    setIsLoading(false)
  }

  useEffect(() => { loadVideos() }, []) // eslint-disable-line

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    setUploadError(null)
    setUploadSuccess(false)
    if (!form.title.trim()) { setUploadError('Título é obrigatório'); return }
    const file = fileInputRef.current?.files?.[0]
    setUploading(true)
    try {
      const { data: newVideo, error: insertError } = await supabase
        .from('videos')
        .insert({ title: form.title.trim(), description: form.description.trim() || null, category: form.category, duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : null, is_published: false })
        .select().single()
      if (insertError || !newVideo) throw new Error(insertError?.message ?? 'Falha ao criar registro')

      if (file) {
        const urlRes = await fetch('/api/video/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: newVideo.id, fileName: file.name, contentType: file.type || 'video/mp4' }) })
        if (!urlRes.ok) { await supabase.from('videos').delete().eq('id', newVideo.id); throw new Error('Falha ao obter URL de upload') }
        const { uploadUrl, key } = await urlRes.json()
        const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'video/mp4' } })
        if (!uploadRes.ok) { await supabase.from('videos').delete().eq('id', newVideo.id); throw new Error('Falha no upload do vídeo') }
        await supabase.from('videos').update({ hls_path: key }).eq('id', newVideo.id)
      }

      const thumbFile = thumbInputRef.current?.files?.[0]
      if (thumbFile) {
        const thumbRes = await fetch('/api/video/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: newVideo.id, fileName: thumbFile.name, contentType: thumbFile.type || 'image/jpeg', type: 'thumbnail' }) })
        if (thumbRes.ok) {
          const { uploadUrl: thumbUrl, key: thumbKey } = await thumbRes.json()
          const tr = await fetch(thumbUrl, { method: 'PUT', body: thumbFile, headers: { 'Content-Type': thumbFile.type || 'image/jpeg' } })
          if (tr.ok) await supabase.from('videos').update({ thumbnail_path: thumbKey }).eq('id', newVideo.id)
        }
      }

      setUploadSuccess(true)
      setForm({ title: '', description: '', category: CATEGORIES[0], duration_seconds: '' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (thumbInputRef.current) thumbInputRef.current.value = ''
      setThumbPreview(null)
      await loadVideos()
      setTimeout(() => { setShowForm(false); setUploadSuccess(false) }, 1500)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function togglePublished(video: Video) {
    await supabase.from('videos').update({ is_published: !video.is_published }).eq('id', video.id)
    setVideos((prev) => prev.map((v) => v.id === video.id ? { ...v, is_published: !v.is_published } : v))
  }

  async function toggleFeatured(video: Video) {
    const newFeatured = !video.is_featured
    if (newFeatured) await supabase.from('videos').update({ is_featured: false }).neq('id', video.id)
    await supabase.from('videos').update({ is_featured: newFeatured }).eq('id', video.id)
    setVideos((prev) => prev.map((v) => v.id === video.id ? { ...v, is_featured: newFeatured } : newFeatured ? { ...v, is_featured: false } : v))
  }

  function startEdit(video: Video) {
    setEditingVideo(video)
    setForm({ title: video.title, description: video.description ?? '', category: video.category, duration_seconds: video.duration_seconds?.toString() ?? '' })
    setThumbPreview(null); setEditVideoName(null); setUploadError(null); setUploadSuccess(false); setOpenMenuId(null)
    if (editVideoInputRef.current) editVideoInputRef.current.value = ''
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingVideo) return
    setUploadError(null); setUploading(true)
    try {
      await supabase.from('videos').update({ title: form.title.trim(), description: form.description.trim() || null, category: form.category, duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : null }).eq('id', editingVideo.id)
      const thumbFile = thumbInputRef.current?.files?.[0]
      if (thumbFile) {
        const thumbRes = await fetch('/api/video/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: editingVideo.id, fileName: thumbFile.name, contentType: thumbFile.type || 'image/jpeg', type: 'thumbnail' }) })
        if (thumbRes.ok) { const { uploadUrl: tu, key: tk } = await thumbRes.json(); const tr = await fetch(tu, { method: 'PUT', body: thumbFile, headers: { 'Content-Type': thumbFile.type || 'image/jpeg' } }); if (tr.ok) await supabase.from('videos').update({ thumbnail_path: tk }).eq('id', editingVideo.id) }
      }
      const newVideoFile = editVideoInputRef.current?.files?.[0]
      if (newVideoFile) {
        const urlRes = await fetch('/api/video/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: editingVideo.id, fileName: newVideoFile.name, contentType: newVideoFile.type || 'video/mp4' }) })
        if (urlRes.ok) { const { uploadUrl, key } = await urlRes.json(); const vr = await fetch(uploadUrl, { method: 'PUT', body: newVideoFile, headers: { 'Content-Type': newVideoFile.type || 'video/mp4' } }); if (vr.ok) await supabase.from('videos').update({ hls_path: key }).eq('id', editingVideo.id) }
      }
      setUploadSuccess(true); await loadVideos()
      setTimeout(() => { setEditingVideo(null); setUploadSuccess(false) }, 1200)
    } catch { setUploadError('Erro ao salvar') } finally { setUploading(false) }
  }

  async function deleteVideo(video: Video) {
    if (!confirm(`Excluir "${video.title}"?`)) return
    if (video.hls_path) await supabase.storage.from('videos').remove([video.hls_path])
    await supabase.from('videos').delete().eq('id', video.id)
    setVideos((prev) => prev.filter((v) => v.id !== video.id))
  }

  const publishedCount = videos.filter((v) => v.is_published).length

  return (
    <>
      {/* Info banner */}
      <div className="flex items-center gap-3 bg-[#7B3FE4]/8 border border-[#7B3FE4]/20 rounded-xl px-4 py-3 mb-5">
        <Users className="w-4 h-4 text-[#7B3FE4] flex-shrink-0" />
        <p className="text-xs text-[#A1A1AA]">Vídeos exibidos na <span className="text-white font-medium">Landpage / Área do Paciente</span> — depoimentos e conteúdo de captação que aparecem em <span className="text-[#7B3FE4]">/patient/dashboard</span></p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7B3FE4]/10 flex items-center justify-center"><Film className="w-5 h-5 text-[#7B3FE4]" /></div>
          <div><p className="text-2xl font-bold text-white">{videos.length}</p><p className="text-xs text-[#71717A]">Total de vídeos</p></div>
        </div>
        <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-500" /></div>
          <div><p className="text-2xl font-bold text-white">{publishedCount}</p><p className="text-xs text-[#71717A]">Publicados</p></div>
        </div>
        <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-500" /></div>
          <div><p className="text-2xl font-bold text-white">{videos.length - publishedCount}</p><p className="text-xs text-[#71717A]">Rascunhos</p></div>
        </div>
      </div>

      {/* Header + Add */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">Biblioteca de Vídeos — Landpage/Paciente</h2>
        <button onClick={() => { setShowForm(true); setUploadError(null); setUploadSuccess(false) }} className="bg-[#7B3FE4] hover:bg-[#6325C8] text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Adicionar Vídeo
        </button>
      </div>

      {/* Upload Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Adicionar Vídeo — Landpage Paciente</h3>
              <button onClick={() => setShowForm(false)} className="text-[#71717A] hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Título *</label>
                <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Depoimento Adriana Mendes" className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Descrição</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descrição do vídeo..." rows={2} className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Categoria</label>
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#7B3FE4] transition-colors">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Duração (segundos)</label>
                  <input type="number" value={form.duration_seconds} onChange={(e) => setForm((f) => ({ ...f, duration_seconds: e.target.value }))} placeholder="Ex: 102" min={0} className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Capa (opcional)</label>
                <div className="border border-dashed border-[#2A2A2E] rounded-xl overflow-hidden cursor-pointer hover:border-[#7B3FE4]/50 transition-colors" onClick={() => thumbInputRef.current?.click()}>
                  {thumbPreview ? <div className="relative h-28"><img src={thumbPreview} alt="Capa" className="w-full h-full object-cover" /></div>
                    : <div className="p-4 text-center"><Upload className="w-4 h-4 text-[#7B3FE4] mx-auto mb-1" /><p className="text-xs text-[#71717A]">Clique para selecionar a capa</p><p className="text-[10px] text-[#52525B] mt-0.5">JPG, PNG — recomendado 16:9</p></div>}
                  <input ref={thumbInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setThumbPreview(URL.createObjectURL(f)) }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Arquivo de Vídeo (opcional)</label>
                <div className="border border-dashed border-[#2A2A2E] rounded-xl p-4 text-center cursor-pointer hover:border-[#7B3FE4]/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-5 h-5 text-[#52525B] mx-auto mb-1" />
                  <p className="text-xs text-[#71717A]">Clique para selecionar</p>
                  <p className="text-[10px] text-[#52525B] mt-0.5">MP4, MOV — máx. 2GB</p>
                  <input ref={fileInputRef} type="file" accept="video/*,.m3u8" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f && !form.duration_seconds) { const url = URL.createObjectURL(f); const vid = document.createElement('video'); vid.src = url; vid.onloadedmetadata = () => { setForm((prev) => ({ ...prev, duration_seconds: Math.floor(vid.duration).toString() })); URL.revokeObjectURL(url) } } }} />
                </div>
              </div>
              {uploadError && <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5"><AlertCircle className="w-4 h-4 flex-shrink-0" />{uploadError}</div>}
              {uploadSuccess && <div className="flex items-center gap-2 text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5"><CheckCircle className="w-4 h-4 flex-shrink-0" />Vídeo adicionado!</div>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-[#18181A] border border-[#1C1C1E] text-[#A1A1AA] text-sm font-medium py-2.5 rounded-xl hover:border-[#27272A] transition-colors">Cancelar</button>
                <button type="submit" disabled={uploading} className="flex-1 bg-[#7B3FE4] hover:bg-[#6325C8] disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  {uploading ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Enviando...</> : <><Upload className="w-4 h-4" />Adicionar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Videos table */}
      <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-[#7B3FE4] border-t-transparent animate-spin" /></div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center"><Film className="w-10 h-10 text-[#3A3A3E] mb-3" /><p className="text-[#71717A] mb-1">Nenhum vídeo ainda</p><p className="text-xs text-[#52525B]">Adicione o primeiro vídeo de depoimento</p></div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full" style={{ borderCollapse: 'separate' }}>
              <thead>
                <tr className="border-b border-[#1C1C1E]">
                  {['Título', 'Categoria', 'Duração', 'Status', 'Destaque', 'Criado em', 'Ações'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-[#71717A] px-5 py-3 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {videos.map((video, i) => (
                  <tr key={video.id} className={`border-b border-[#1C1C1E] hover:bg-[#18181A] transition-colors ${i === videos.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#7B3FE4]/10 flex items-center justify-center flex-shrink-0"><Play className="w-3.5 h-3.5 text-[#7B3FE4]" /></div>
                        <div><p className="text-sm font-medium text-white line-clamp-1">{video.title}</p>{video.hls_path && <p className="text-[10px] text-[#52525B] mt-0.5 truncate max-w-[200px]">{video.hls_path}</p>}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className="text-xs bg-[#7B3FE4]/10 text-[#9558EE] px-2 py-1 rounded-lg border border-[#7B3FE4]/20">{video.category}</span></td>
                    <td className="px-5 py-4"><span className="text-sm text-[#A1A1AA]">{formatDuration(video.duration_seconds)}</span></td>
                    <td className="px-5 py-4">
                      {video.is_published
                        ? <span className="flex items-center gap-1.5 text-xs text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Publicado</span>
                        : <span className="flex items-center gap-1.5 text-xs text-[#71717A]"><span className="w-1.5 h-1.5 rounded-full bg-[#3A3A3E]" />Rascunho</span>}
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => toggleFeatured(video)} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${video.is_featured ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-[#18181A] border-[#1C1C1E] text-[#52525B] hover:text-amber-400 hover:border-amber-500/30'}`}>
                        <Star className={`w-3 h-3 ${video.is_featured ? 'fill-amber-400' : ''}`} />{video.is_featured ? 'Destaque' : 'Destacar'}
                      </button>
                    </td>
                    <td className="px-5 py-4"><span className="text-sm text-[#71717A]">{formatDate(video.created_at)}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(video)} className="w-8 h-8 rounded-lg bg-[#18181A] border border-[#1C1C1E] flex items-center justify-center text-[#71717A] hover:text-[#7B3FE4] hover:border-[#7B3FE4]/30 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => togglePublished(video)} className="w-8 h-8 rounded-lg bg-[#18181A] border border-[#1C1C1E] flex items-center justify-center text-[#71717A] hover:text-white hover:border-[#27272A] transition-all">
                          {video.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={(e) => {
                            if (openMenuId === video.id) { setOpenMenuId(null); setMenuPos(null) }
                            else { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenuPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right }); setOpenMenuId(video.id) }
                          }}
                          className="w-8 h-8 rounded-lg bg-[#18181A] border border-[#1C1C1E] flex items-center justify-center text-[#71717A] hover:text-white hover:border-[#27272A] transition-all"
                        ><MoreVertical className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Editar Vídeo</h3>
              <button onClick={() => setEditingVideo(null)} className="text-[#71717A] hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div><label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Título *</label><input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#7B3FE4] transition-colors" required /></div>
              <div><label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Descrição</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#7B3FE4] transition-colors resize-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Categoria</label><select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#7B3FE4] transition-colors">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Duração (seg)</label><input type="number" value={form.duration_seconds} onChange={(e) => setForm((f) => ({ ...f, duration_seconds: e.target.value }))} min={0} className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#7B3FE4] transition-colors" /></div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Trocar Thumbnail</label>
                <div className="border border-dashed border-[#2A2A2E] rounded-xl overflow-hidden cursor-pointer hover:border-[#7B3FE4]/50 transition-colors" onClick={() => thumbInputRef.current?.click()}>
                  {thumbPreview ? <div className="relative h-24"><img src={thumbPreview} alt="Capa" className="w-full h-full object-cover" /></div> : <div className="p-3 text-center"><Upload className="w-4 h-4 text-[#7B3FE4] mx-auto mb-1" /><p className="text-xs text-[#71717A]">Trocar thumbnail</p></div>}
                  <input ref={thumbInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setThumbPreview(URL.createObjectURL(f)) }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Substituir Vídeo</label>
                <div className="border border-dashed border-[#2A2A2E] rounded-xl cursor-pointer hover:border-[#7B3FE4]/50 transition-colors" onClick={() => editVideoInputRef.current?.click()}>
                  {editVideoName ? <div className="px-4 py-3 flex items-center gap-2"><Film className="w-4 h-4 text-[#7B3FE4] shrink-0" /><span className="text-xs text-white truncate">{editVideoName}</span></div>
                    : <div className="p-3 text-center"><Upload className="w-4 h-4 text-[#7B3FE4] mx-auto mb-1" /><p className="text-xs text-[#71717A]">Substituir arquivo</p></div>}
                  <input ref={editVideoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setEditVideoName(f.name) }} />
                </div>
              </div>
              {uploadError && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">{uploadError}</p>}
              {uploadSuccess && <p className="text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5">Salvo com sucesso!</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditingVideo(null)} className="flex-1 bg-[#18181A] border border-[#1C1C1E] text-[#A1A1AA] text-sm font-medium py-2.5 rounded-xl hover:border-[#27272A] transition-colors">Cancelar</button>
                <button type="submit" disabled={uploading} className="flex-1 bg-[#7B3FE4] hover:bg-[#6325C8] disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  {uploading ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Salvando...</> : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dropdown portal */}
      {openMenuId && menuPos && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => { setOpenMenuId(null); setMenuPos(null) }} />
          <div className="fixed z-[100] bg-[#18181A] border border-[#1C1C1E] rounded-xl shadow-xl w-44 py-1" style={{ top: menuPos.top, right: menuPos.right }}>
            {(() => {
              const video = videos.find(v => v.id === openMenuId)
              if (!video) return null
              return <>
                <button onClick={() => { toggleFeatured(video); setOpenMenuId(null); setMenuPos(null) }} className="w-full text-left px-4 py-2 text-sm text-[#A1A1AA] hover:text-white hover:bg-[#1C1C1E] flex items-center gap-2"><Star className="w-3.5 h-3.5" />{video.is_featured ? 'Remover destaque' : 'Destacar'}</button>
                <button onClick={() => { startEdit(video); setOpenMenuId(null); setMenuPos(null) }} className="w-full text-left px-4 py-2 text-sm text-[#A1A1AA] hover:text-white hover:bg-[#1C1C1E] flex items-center gap-2"><Pencil className="w-3.5 h-3.5" />Editar detalhes</button>
                <div className="border-t border-[#1C1C1E] my-1" />
                <button onClick={() => { deleteVideo(video); setOpenMenuId(null); setMenuPos(null) }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" />Excluir</button>
              </>
            })()}
          </div>
        </>,
        document.body
      )}
    </>
  )
}

// ─── Medical Videos Section ──────────────────────────────────────────────────

const FALLBACK_MODULES = [
  {
    num: 1, title: 'Técnica de Vendas', color: 'from-[#7B3FE4] to-[#4C1B9B]',
    lessons: [
      { num: 1, title: 'Módulo 01 — Aula Modelo Mental / Comportamento', duration: '1h 08min' },
      { num: 2, title: 'Módulo 02 — Cultura de Vendas', duration: '1h 19min' },
      { num: 3, title: 'Módulo 03 — Canais de Vendas', duration: '1h 05min' },
      { num: 4, title: 'Módulo 04 — Técnicas de Vendas', duration: '1h 10min' },
      { num: 5, title: 'Módulo 05 — Resumo', duration: '1h 04min' },
    ],
  },
  {
    num: 2, title: 'Influência', color: 'from-[#3B82F6] to-[#1D4ED8]',
    lessons: [
      { num: 1, title: 'Posicionamento — encontre o nicho que te pagará R$150k/mês', duration: '1h 02min' },
      { num: 2, title: 'Instagram médico de alta conversão — sem dançar reels', duration: '57min' },
      { num: 3, title: 'LinkedIn e autoridade B2B para atrair parceiros estratégicos', duration: '1h 02min' },
      { num: 4, title: 'YouTube e podcast médico — conteúdo evergreen que vende', duration: '1h 01min' },
      { num: 5, title: 'Relações públicas e imprensa — como aparecer nos grandes veículos', duration: '1h 02min' },
    ],
  },
  {
    num: 3, title: 'Liderança & Recrutamento', color: 'from-[#F59E0B] to-[#D97706]',
    lessons: [
      { num: 1, title: 'Quando e como contratar o primeiro funcionário do consultório', duration: '1h 01min' },
      { num: 2, title: 'Formação de times de vendas — recrutando e treinando consultores', duration: '56min' },
      { num: 3, title: 'Cultura de alta performance — o playbook do consultório campeão', duration: '1h 03min' },
      { num: 4, title: 'Liderança situacional — gerenciar sem perder tempo clínico', duration: '1h 01min' },
    ],
  },
  {
    num: 4, title: 'Modelos de Negócio', color: 'from-[#10B981] to-[#059669]',
    lessons: [
      { num: 1, title: 'Os 7 modelos de receita para clínicas hormonais', duration: '1h 13min' },
      { num: 2, title: 'Franquia médica — como replicar seu consultório em outras cidades', duration: '1h 07min' },
      { num: 3, title: 'Parcerias estratégicas — academia, estética, nutrição, psicologia', duration: '1h 05min' },
      { num: 4, title: 'Receita recorrente — planos de acompanhamento e assinaturas de saúde', duration: '1h 10min' },
      { num: 5, title: 'Valuation e exit — quanto vale seu consultório e como vendê-lo', duration: '1h 04min' },
    ],
  },
]

interface LessonUpload { modNum: number; lessonNum: number; lessonId: string | null; lessonTitle: string }

function MedicalVideos({ supabase }: { supabase: ReturnType<typeof createBrowserClient> }) {
  const [modules, setModules] = useState<TrainingModule[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadForm, setUploadForm] = useState<LessonUpload | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const [videoName, setVideoName] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const trainingThumbRef = useRef<HTMLInputElement>(null)
  const trainingFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, []) // eslint-disable-line

  async function load() {
    setLoading(true)
    try {
      const { data: mods } = await supabase.from('training_modules').select('*').order('num')
      const { data: lessons } = await supabase.from('training_lessons').select('*').order('num')
      if (mods && mods.length > 0) {
        setModules((mods ?? []).map((m: TrainingModule) => ({
          ...m,
          lessons: (lessons ?? []).filter((l: TrainingLesson) => l.module_id === m.id),
        })))
      }
    } catch { /* use fallback */ } finally { setLoading(false) }
  }

  const displayModules = modules.length > 0
    ? modules
    : FALLBACK_MODULES.map(fb => ({
        id: '',
        num: fb.num,
        title: fb.title,
        color: fb.color,
        lessons: fb.lessons.map(l => ({
          id: '',
          module_id: '',
          num: l.num,
          title: l.title,
          duration: l.duration,
          video_url: '',
        })),
      }))

  const totalLessons = displayModules.reduce((a, m) => a + m.lessons.length, 0)
  const withVideo = displayModules.reduce((a, m) => a + m.lessons.filter(l => l.video_url).length, 0)

  function openUpload(mod: TrainingModule, lesson: TrainingLesson) {
    setUploadForm({ modNum: mod.num, lessonNum: lesson.num, lessonId: lesson.id || null, lessonTitle: lesson.title })
    setUploadError(null); setUploadSuccess(false); setThumbPreview(null); setVideoName(null)
    if (trainingThumbRef.current) trainingThumbRef.current.value = ''
    if (trainingFileRef.current) trainingFileRef.current.value = ''
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadForm) return
    const videoFile = trainingFileRef.current?.files?.[0]
    if (!videoFile) { setUploadError('Selecione um arquivo de vídeo'); return }
    setUploading(true); setUploadError(null); setUploadSuccess(false)
    try {
      // 1. Insert into videos table
      const { data: newVideo, error: insertError } = await supabase
        .from('videos')
        .insert({ title: uploadForm.lessonTitle, category: 'Treinamento Médico', is_published: true })
        .select().single()
      if (insertError || !newVideo) throw new Error(insertError?.message ?? 'Falha ao criar registro')

      // 2. Upload video file to R2
      const urlRes = await fetch('/api/video/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: newVideo.id, fileName: videoFile.name, contentType: videoFile.type || 'video/mp4' }),
      })
      if (!urlRes.ok) { await supabase.from('videos').delete().eq('id', newVideo.id); throw new Error('Falha ao obter URL de upload') }
      const { uploadUrl, key } = await urlRes.json()
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: videoFile, headers: { 'Content-Type': videoFile.type || 'video/mp4' } })
      if (!uploadRes.ok) { await supabase.from('videos').delete().eq('id', newVideo.id); throw new Error('Falha no upload do vídeo') }
      await supabase.from('videos').update({ hls_path: key }).eq('id', newVideo.id)

      // 3. Upload thumbnail if selected
      const thumbFile = trainingThumbRef.current?.files?.[0]
      if (thumbFile) {
        const thumbRes = await fetch('/api/video/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: newVideo.id, fileName: thumbFile.name, contentType: thumbFile.type || 'image/jpeg', type: 'thumbnail' }),
        })
        if (thumbRes.ok) {
          const { uploadUrl: tu, key: tk } = await thumbRes.json()
          const tr = await fetch(tu, { method: 'PUT', body: thumbFile, headers: { 'Content-Type': thumbFile.type || 'image/jpeg' } })
          if (tr.ok) await supabase.from('videos').update({ thumbnail_path: tk }).eq('id', newVideo.id)
        }
      }

      // 4. Link video UUID to lesson
      if (uploadForm.lessonId) {
        await supabase.from('training_lessons').update({ video_url: newVideo.id }).eq('id', uploadForm.lessonId)
        setModules(prev => prev.map((m: TrainingModule) => ({
          ...m,
          lessons: m.lessons.map((l: TrainingLesson) =>
            l.id === uploadForm.lessonId ? { ...l, video_url: newVideo.id } : l
          ),
        })))
      }

      setSaved(`${uploadForm.modNum}-${uploadForm.lessonNum}`)
      setUploadSuccess(true)
      setTimeout(() => { setUploadForm(null); setUploadSuccess(false); setSaved(null) }, 1500)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erro no upload')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-[#3B82F6] border-t-transparent animate-spin" /></div>
  }

  return (
    <>
      {/* Info banner */}
      <div className="flex items-center gap-3 bg-[#3B82F6]/8 border border-[#3B82F6]/20 rounded-xl px-4 py-3 mb-5">
        <GraduationCap className="w-4 h-4 text-[#3B82F6] flex-shrink-0" />
        <p className="text-xs text-[#A1A1AA]">
          Vídeos das aulas da <span className="text-white font-medium">Escola de Negócios Médicos</span> — aparecem em{' '}
          <a href="/medical/escola" className="text-[#3B82F6] hover:underline">/medical/escola</a>.
          {modules.length === 0 && <span className="text-amber-400 ml-2">Crie módulos em <a href="/admin/treinamento" className="underline">Ger. Treinamento</a> para vincular permanentemente.</span>}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total de aulas', value: totalLessons, icon: <Film className="w-4 h-4 text-[#3B82F6]" />, bg: 'bg-[#3B82F6]/8 border-[#3B82F6]/20' },
          { label: 'Com vídeo', value: withVideo, icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, bg: 'bg-emerald-500/8 border-emerald-500/20' },
          { label: 'Sem vídeo', value: totalLessons - withVideo, icon: <AlertCircle className="w-4 h-4 text-amber-400" />, bg: 'bg-amber-500/8 border-amber-500/20' },
        ].map((s, i) => (
          <div key={i} className={`flex items-center gap-3 bg-[#111113] border ${s.bg} rounded-xl px-4 py-3`}>
            {s.icon}
            <div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-[#71717A]">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modules */}
      <div className="space-y-4">
        {displayModules.map((mod) => (
          <div key={mod.num} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#1C1C1E]">
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${mod.color || 'from-[#7B3FE4] to-[#4C1B9B]'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{mod.num}</div>
              <div>
                <p className="text-sm font-semibold text-white">{mod.title}</p>
                <p className="text-[10px] text-[#52525B]">{mod.lessons.length} aulas</p>
              </div>
              <div className="ml-auto">
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${mod.lessons.filter(l => l.video_url).length === mod.lessons.length ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'}`}>
                  {mod.lessons.filter(l => l.video_url).length}/{mod.lessons.length} vídeos
                </span>
              </div>
            </div>

            <div className="divide-y divide-[#1C1C1E]">
              <div className="grid grid-cols-[2fr_2fr_auto] gap-4 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">
                <span>Aula</span><span>Vídeo</span><span>Ação</span>
              </div>
              {mod.lessons.map((lesson) => {
                const isSaved = saved === `${mod.num}-${lesson.num}`
                const hasVideo = !!lesson.video_url
                return (
                  <div key={lesson.num} className="grid grid-cols-[2fr_2fr_auto] gap-4 items-center px-5 py-3 hover:bg-[#18181A]/40 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center ${hasVideo ? 'bg-emerald-500/15 border border-emerald-500/20' : 'bg-[#18181A] border border-[#27272A]'}`}>
                        {hasVideo ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Play className="w-3 h-3 text-[#3F3F46]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-[#52525B]">Aula {String(lesson.num).padStart(2, '0')}</p>
                        <p className="text-xs text-[#A1A1AA] truncate">{lesson.title}</p>
                      </div>
                    </div>

                    <div className="min-w-0">
                      {isSaved ? (
                        <p className="text-[10px] text-emerald-400 font-medium">✓ Vídeo enviado!</p>
                      ) : hasVideo ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center">
                            <Film className="w-2.5 h-2.5 text-[#3B82F6]" />
                          </div>
                          <p className="text-[10px] text-emerald-400 font-medium">Vídeo configurado</p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#3F3F46] italic">Sem vídeo</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {lesson.duration && (
                        <span className="hidden xl:flex items-center gap-1 text-[10px] text-[#52525B] mr-1"><Clock className="w-3 h-3" />{lesson.duration}</span>
                      )}
                      <button
                        onClick={() => openUpload(mod as TrainingModule, lesson as TrainingLesson)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${hasVideo ? 'text-[#3B82F6] border-[#3B82F6]/30 bg-[#3B82F6]/8 hover:bg-[#3B82F6]/15' : 'text-white border-[#3B82F6] bg-[#3B82F6] hover:bg-[#3B82F6]/90 shadow-[0_0_8px_rgba(59,130,246,0.3)]'}`}
                      >
                        <Upload className="w-3 h-3" />
                        {hasVideo ? 'Substituir' : 'Enviar Vídeo'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {uploadForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-white">Adicionar Vídeo — Aula {String(uploadForm.lessonNum).padStart(2, '0')}</h3>
                <p className="text-xs text-[#71717A] mt-0.5 truncate max-w-[360px]">{uploadForm.lessonTitle}</p>
              </div>
              <button onClick={() => setUploadForm(null)} className="text-[#71717A] hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              {/* Thumbnail */}
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Capa (opcional)</label>
                <div
                  className="border border-dashed border-[#2A2A2E] rounded-xl overflow-hidden cursor-pointer hover:border-[#3B82F6]/50 transition-colors"
                  onClick={() => trainingThumbRef.current?.click()}
                >
                  {thumbPreview
                    ? <div className="relative h-28"><img src={thumbPreview} alt="Capa" className="w-full h-full object-cover" /></div>
                    : <div className="p-4 text-center">
                        <Upload className="w-4 h-4 text-[#3B82F6] mx-auto mb-1" />
                        <p className="text-xs text-[#71717A]">Clique para selecionar a capa</p>
                        <p className="text-[10px] text-[#52525B] mt-0.5">JPG, PNG — recomendado 16:9</p>
                      </div>
                  }
                  <input
                    ref={trainingThumbRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setThumbPreview(URL.createObjectURL(f)) }}
                  />
                </div>
              </div>

              {/* Video file */}
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Arquivo de Vídeo *</label>
                <div
                  className="border border-dashed border-[#2A2A2E] rounded-xl p-4 text-center cursor-pointer hover:border-[#3B82F6]/50 transition-colors"
                  onClick={() => trainingFileRef.current?.click()}
                >
                  {videoName
                    ? <div className="flex items-center justify-center gap-2"><Film className="w-4 h-4 text-[#3B82F6]" /><span className="text-xs text-white truncate">{videoName}</span></div>
                    : <>
                        <Upload className="w-5 h-5 text-[#52525B] mx-auto mb-1" />
                        <p className="text-xs text-[#71717A]">Clique para selecionar</p>
                        <p className="text-[10px] text-[#52525B] mt-0.5">MP4, MOV — máx. 2GB</p>
                      </>
                  }
                  <input
                    ref={trainingFileRef}
                    type="file"
                    accept="video/*,.m3u8"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideoName(f.name) }}
                  />
                </div>
              </div>

              {!uploadForm.lessonId && (
                <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-400">Esta aula ainda não está no banco de dados. Crie os módulos em <a href="/admin/treinamento" className="underline">Ger. Treinamento</a> para vincular permanentemente.</p>
                </div>
              )}

              {uploadError && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{uploadError}
                </div>
              )}
              {uploadSuccess && (
                <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />Vídeo enviado com sucesso!
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setUploadForm(null)} className="flex-1 bg-[#18181A] border border-[#1C1C1E] text-[#A1A1AA] text-sm font-medium py-2.5 rounded-xl hover:border-[#27272A] transition-colors">Cancelar</button>
                <button type="submit" disabled={uploading} className="flex-1 bg-[#3B82F6] hover:bg-[#3B82F6]/90 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  {uploading
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Enviando...</>
                    : <><Upload className="w-4 h-4" />Adicionar Vídeo</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
