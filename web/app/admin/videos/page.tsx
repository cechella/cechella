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

          <PatientVideos supabase={supabase} />

        </main>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uploadWithProgress(url: string, file: File, contentType: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error(`Upload failed: ${xhr.status}`)) }
    xhr.onerror = () => reject(new Error('Erro de rede no upload'))
    xhr.send(file)
  })
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
  const [linkVideo, setLinkVideo] = useState<Video | null>(null)
  const [linkModNum, setLinkModNum] = useState(1)
  const [linkLessonNum, setLinkLessonNum] = useState(1)
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linkSuccess, setLinkSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const editVideoInputRef = useRef<HTMLInputElement>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const [editVideoName, setEditVideoName] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '', description: '', category: CATEGORIES[0], duration_seconds: '',
    destino: 'patient' as 'patient' | 'medical',
    medModNum: 1, medLessonNum: 1,
  })
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoFileName, setVideoFileName] = useState<string | null>(null)

  const medLessons = FALLBACK_MODULES.find(m => m.num === form.medModNum)?.lessons ?? []

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
    const isMedical = form.destino === 'medical'
    const file = fileInputRef.current?.files?.[0]
    if (isMedical && !file) { setUploadError('Selecione um arquivo de vídeo'); return }
    if (!isMedical && !form.title.trim()) { setUploadError('Título é obrigatório'); return }

    const fallbackMod = FALLBACK_MODULES.find(m => m.num === form.medModNum)
    const fallbackLesson = fallbackMod?.lessons.find(l => l.num === form.medLessonNum)
    const title = isMedical ? (fallbackLesson?.title ?? form.title.trim()) : form.title.trim()
    const category = isMedical ? 'Treinamento Médico' : form.category

    setUploading(true); setUploadProgress(0)
    try {
      const { data: newVideo, error: insertError } = await supabase
        .from('videos')
        .insert({ title, description: isMedical ? null : (form.description.trim() || null), category, duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : null, is_published: isMedical })
        .select().single()
      if (insertError || !newVideo) throw new Error(insertError?.message ?? 'Falha ao criar registro')

      if (file) {
        const urlRes = await fetch('/api/video/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: newVideo.id, fileName: file.name, contentType: file.type || 'video/mp4' }) })
        if (!urlRes.ok) { await supabase.from('videos').delete().eq('id', newVideo.id); throw new Error('Falha ao obter URL de upload') }
        const { uploadUrl, key } = await urlRes.json()
        if (isMedical) {
          await uploadWithProgress(uploadUrl, file, file.type || 'video/mp4', setUploadProgress)
        } else {
          const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'video/mp4' } })
          if (!uploadRes.ok) { await supabase.from('videos').delete().eq('id', newVideo.id); throw new Error('Falha no upload do vídeo') }
        }
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

      if (isMedical) {
        const linkRes = await fetch('/api/training/link-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modNum: form.medModNum,
            modTitle: fallbackMod?.title ?? `Módulo ${form.medModNum}`,
            modColor: fallbackMod?.color ?? 'from-[#7B3FE4] to-[#4C1B9B]',
            lessonNum: form.medLessonNum,
            lessonTitle: fallbackLesson?.title ?? title,
            lessonDuration: fallbackLesson?.duration ?? '',
            videoId: newVideo.id,
          }),
        })
        if (!linkRes.ok) {
          const e = await linkRes.json().catch(() => ({}))
          throw new Error(`Falha ao vincular aula: ${e.error ?? linkRes.status}`)
        }
      }

      setUploadSuccess(true)
      setForm({ title: '', description: '', category: CATEGORIES[0], duration_seconds: '', destino: form.destino, medModNum: form.medModNum, medLessonNum: form.medLessonNum })
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (thumbInputRef.current) thumbInputRef.current.value = ''
      setThumbPreview(null); setVideoFileName(null)
      if (!isMedical) await loadVideos()
      setTimeout(() => { setShowForm(false); setUploadSuccess(false) }, 1500)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false); setUploadProgress(0)
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
    setForm(f => ({ ...f, title: video.title, description: video.description ?? '', category: video.category, duration_seconds: video.duration_seconds?.toString() ?? '' }))
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

  async function handleLink() {
    if (!linkVideo) return
    setLinkLoading(true); setLinkError(null); setLinkSuccess(false)
    const fallbackMod = FALLBACK_MODULES.find(m => m.num === linkModNum)
    const fallbackLesson = fallbackMod?.lessons.find(l => l.num === linkLessonNum)
    try {
      const res = await fetch('/api/training/link-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modNum: linkModNum,
          modTitle: fallbackMod?.title ?? `Módulo ${linkModNum}`,
          modColor: fallbackMod?.color ?? 'from-[#7B3FE4] to-[#4C1B9B]',
          lessonNum: linkLessonNum,
          lessonTitle: fallbackLesson?.title ?? linkVideo.title,
          lessonDuration: fallbackLesson?.duration ?? '',
          videoId: linkVideo.id,
        }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'Erro ao vincular') }
      setLinkSuccess(true)
      setTimeout(() => { setLinkVideo(null); setLinkSuccess(false) }, 1500)
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLinkLoading(false)
    }
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
        <p className="text-xs text-[#A1A1AA]">Todos os vídeos da plataforma — <span className="text-white font-medium">Landpage/Paciente</span> e <span className="text-white font-medium">Área do Médico</span></p>
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
        <h2 className="font-semibold text-white">Biblioteca de Vídeos</h2>
        <button onClick={() => { setShowForm(true); setUploadError(null); setUploadSuccess(false) }} className="bg-[#7B3FE4] hover:bg-[#6325C8] text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Adicionar Vídeo
        </button>
      </div>

      {/* Upload Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Adicionar Vídeo</h3>
              <button onClick={() => setShowForm(false)} className="text-[#71717A] hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">

              {/* Destino */}
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Destino</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm(f => ({ ...f, destino: 'patient' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${form.destino === 'patient' ? 'bg-[#7B3FE4]/15 border-[#7B3FE4] text-[#7B3FE4]' : 'bg-[#18181A] border-[#1C1C1E] text-[#71717A] hover:text-white'}`}>
                    <Users className="w-4 h-4" /> Landpage / Paciente
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, destino: 'medical' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${form.destino === 'medical' ? 'bg-[#3B82F6]/15 border-[#3B82F6] text-[#3B82F6]' : 'bg-[#18181A] border-[#1C1C1E] text-[#71717A] hover:text-white'}`}>
                    <GraduationCap className="w-4 h-4" /> Área do Médico
                  </button>
                </div>
              </div>

              {/* Medical: module + lesson selectors */}
              {form.destino === 'medical' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Módulo</label>
                    <select value={form.medModNum} onChange={(e) => setForm(f => ({ ...f, medModNum: parseInt(e.target.value), medLessonNum: 1 }))} className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6] transition-colors">
                      {FALLBACK_MODULES.map(m => <option key={m.num} value={m.num}>Módulo {m.num} — {m.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Aula</label>
                    <select value={form.medLessonNum} onChange={(e) => setForm(f => ({ ...f, medLessonNum: parseInt(e.target.value) }))} className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6] transition-colors">
                      {medLessons.map(l => <option key={l.num} value={l.num}>Aula {String(l.num).padStart(2,'0')}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 bg-[#3B82F6]/8 border border-[#3B82F6]/20 rounded-xl px-3 py-2 text-xs text-[#60A5FA]">
                    {medLessons.find(l => l.num === form.medLessonNum)?.title}
                  </div>
                </div>
              )}

              {/* Patient: title + description + category */}
              {form.destino === 'patient' && <>
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
              </>}

              {/* Thumbnail */}
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Capa (opcional)</label>
                <div className="border border-dashed border-[#2A2A2E] rounded-xl overflow-hidden cursor-pointer hover:border-[#7B3FE4]/50 transition-colors" onClick={() => thumbInputRef.current?.click()}>
                  {thumbPreview ? <div className="relative h-28"><img src={thumbPreview} alt="Capa" className="w-full h-full object-cover" /></div>
                    : <div className="p-4 text-center"><Upload className="w-4 h-4 text-[#7B3FE4] mx-auto mb-1" /><p className="text-xs text-[#71717A]">Clique para selecionar a capa</p><p className="text-[10px] text-[#52525B] mt-0.5">JPG, PNG — recomendado 16:9</p></div>}
                  <input ref={thumbInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setThumbPreview(URL.createObjectURL(f)) }} />
                </div>
              </div>

              {/* Video file */}
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Arquivo de Vídeo {form.destino === 'medical' ? '*' : '(opcional)'}</label>
                <div className="border border-dashed border-[#2A2A2E] rounded-xl overflow-hidden cursor-pointer hover:border-[#7B3FE4]/50 transition-colors" onClick={() => !uploading && fileInputRef.current?.click()}>
                  {videoFileName
                    ? <div className="px-4 py-3 flex items-center gap-2"><Film className="w-4 h-4 text-[#7B3FE4] shrink-0" /><span className="text-xs text-white truncate">{videoFileName}</span></div>
                    : <div className="p-4 text-center"><Upload className="w-5 h-5 text-[#52525B] mx-auto mb-1" /><p className="text-xs text-[#71717A]">Clique para selecionar</p><p className="text-[10px] text-[#52525B] mt-0.5">MP4, MOV — máx. 2GB</p></div>}
                  <input ref={fileInputRef} type="file" accept="video/*,.m3u8" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { setVideoFileName(f.name); if (!form.duration_seconds) { const url = URL.createObjectURL(f); const vid = document.createElement('video'); vid.src = url; vid.onloadedmetadata = () => { setForm((prev) => ({ ...prev, duration_seconds: Math.floor(vid.duration).toString() })); URL.revokeObjectURL(url) } } } }} />
                </div>
              </div>

              {/* Progress bar (medical only) */}
              {uploading && form.destino === 'medical' && (
                <div className="bg-[#18181A] border border-[#1C1C1E] rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-2">
                    <span>Enviando para o servidor...</span><span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-[#27272A] rounded-full overflow-hidden">
                    <div className="h-full bg-[#3B82F6] rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-[10px] text-[#52525B] mt-2">Não feche esta janela durante o envio</p>
                </div>
              )}

              {uploadError && <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5"><AlertCircle className="w-4 h-4 flex-shrink-0" />{uploadError}</div>}
              {uploadSuccess && <div className="flex items-center gap-2 text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5"><CheckCircle className="w-4 h-4 flex-shrink-0" />Vídeo enviado com sucesso!</div>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-[#18181A] border border-[#1C1C1E] text-[#A1A1AA] text-sm font-medium py-2.5 rounded-xl hover:border-[#27272A] transition-colors">Cancelar</button>
                <button type="submit" disabled={uploading} className="flex-1 bg-[#7B3FE4] hover:bg-[#6325C8] disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  {uploading
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />{form.destino === 'medical' ? `${uploadProgress}%` : 'Enviando...'}</>
                    : <><Upload className="w-4 h-4" />Adicionar</>}
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
                  {['Título', 'Destino', 'Categoria', 'Duração', 'Status', 'Destaque', 'Criado em', 'Ações'].map((h) => (
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
                    <td className="px-5 py-4">
                      {video.category === 'Treinamento Médico'
                        ? <span className="text-xs bg-[#3B82F6]/10 text-[#60A5FA] px-2 py-1 rounded-lg border border-[#3B82F6]/20 flex items-center gap-1 w-fit"><GraduationCap className="w-3 h-3" />Área do Médico</span>
                        : <span className="text-xs bg-[#7B3FE4]/10 text-[#9558EE] px-2 py-1 rounded-lg border border-[#7B3FE4]/20 flex items-center gap-1 w-fit"><Users className="w-3 h-3" />Landpage/Paciente</span>}
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
                {video.category === 'Treinamento Médico' && (
                  <button onClick={() => { setLinkVideo(video); setLinkModNum(1); setLinkLessonNum(1); setLinkError(null); setLinkSuccess(false); setOpenMenuId(null); setMenuPos(null) }} className="w-full text-left px-4 py-2 text-sm text-[#A1A1AA] hover:text-white hover:bg-[#1C1C1E] flex items-center gap-2"><Link2 className="w-3.5 h-3.5" />Vincular à aula</button>
                )}
                <div className="border-t border-[#1C1C1E] my-1" />
                <button onClick={() => { deleteVideo(video); setOpenMenuId(null); setMenuPos(null) }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" />Excluir</button>
              </>
            })()}
          </div>
        </>,
        document.body
      )}

      {/* Vincular à aula modal */}
      {linkVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold flex items-center gap-2"><Link2 className="w-4 h-4 text-[#7B3FE4]" />Vincular à aula</h2>
              <button onClick={() => setLinkVideo(null)} className="w-8 h-8 rounded-lg bg-[#18181A] flex items-center justify-center text-[#71717A] hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[#71717A] text-sm mb-4 truncate">Vídeo: <span className="text-white">{linkVideo.title}</span></p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-[#71717A] mb-1 block">Módulo</label>
                <select value={linkModNum} onChange={e => { setLinkModNum(Number(e.target.value)); setLinkLessonNum(1) }} className="w-full bg-[#18181A] border border-[#27272A] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#7B3FE4]">
                  {FALLBACK_MODULES.map(m => <option key={m.num} value={m.num}>Módulo {m.num} — {m.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#71717A] mb-1 block">Aula</label>
                <select value={linkLessonNum} onChange={e => setLinkLessonNum(Number(e.target.value))} className="w-full bg-[#18181A] border border-[#27272A] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#7B3FE4]">
                  {(FALLBACK_MODULES.find(m => m.num === linkModNum)?.lessons ?? []).map(l => <option key={l.num} value={l.num}>Aula {l.num} — {l.title}</option>)}
                </select>
              </div>
            </div>
            {linkError && <p className="text-red-400 text-sm mb-3">{linkError}</p>}
            {linkSuccess && <p className="text-emerald-400 text-sm mb-3">Vinculado com sucesso!</p>}
            <button onClick={handleLink} disabled={linkLoading || linkSuccess} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] hover:opacity-90 transition-opacity disabled:opacity-50">
              {linkLoading ? 'Vinculando...' : linkSuccess ? 'Vinculado ✓' : 'Vincular'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Training Videos Management ─────────────────────────────────────────────

function TrainingVideos({ supabase }: { supabase: ReturnType<typeof createBrowserClient> }) {
  const [videos, setVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const [editVideoName, setEditVideoName] = useState<string | null>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const editVideoInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ title: '', description: '', category: 'Treinamento Médico', duration_seconds: '' })

  async function load() {
    setIsLoading(true)
    const { data } = await supabase.from('videos').select('*').eq('category', 'Treinamento Médico').order('created_at', { ascending: false })
    setVideos(data ?? [])
    setIsLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  function startEdit(video: Video) {
    setEditingVideo(video)
    setForm(f => ({ ...f, title: video.title, description: video.description ?? '', duration_seconds: video.duration_seconds?.toString() ?? '' }))
    setThumbPreview(null); setEditVideoName(null); setUploadError(null); setUploadSuccess(false)
    if (editVideoInputRef.current) editVideoInputRef.current.value = ''
    if (thumbInputRef.current) thumbInputRef.current.value = ''
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingVideo) return
    setUploadError(null); setUploading(true)
    try {
      await supabase.from('videos').update({ title: form.title.trim(), duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : null }).eq('id', editingVideo.id)
      const thumbFile = thumbInputRef.current?.files?.[0]
      if (thumbFile) {
        const thumbRes = await fetch('/api/video/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: editingVideo.id, fileName: thumbFile.name, contentType: thumbFile.type || 'image/jpeg', type: 'thumbnail' }) })
        if (thumbRes.ok) { const { uploadUrl: tu, key: tk } = await thumbRes.json(); const tr = await fetch(tu, { method: 'PUT', body: thumbFile, headers: { 'Content-Type': thumbFile.type || 'image/jpeg' } }); if (tr.ok) await supabase.from('videos').update({ thumbnail_path: tk }).eq('id', editingVideo.id) }
      }
      const newVideoFile = editVideoInputRef.current?.files?.[0]
      if (newVideoFile) {
        const urlRes = await fetch('/api/video/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: editingVideo.id, fileName: newVideoFile.name, contentType: newVideoFile.type || 'video/mp4' }) })
        if (urlRes.ok) { const { uploadUrl, key } = await urlRes.json(); await uploadWithProgress(uploadUrl, newVideoFile, newVideoFile.type || 'video/mp4', () => {}); await supabase.from('videos').update({ hls_path: key }).eq('id', editingVideo.id) }
      }
      setUploadSuccess(true); await load()
      setTimeout(() => { setEditingVideo(null); setUploadSuccess(false) }, 1200)
    } catch { setUploadError('Erro ao salvar') } finally { setUploading(false) }
  }

  async function deleteVideo(video: Video) {
    if (!confirm(`Excluir "${video.title}"?`)) return
    await supabase.from('videos').delete().eq('id', video.id)
    setVideos(prev => prev.filter(v => v.id !== video.id))
  }

  return (
    <>
      <div>
        <div className="flex items-center gap-3 bg-[#3B82F6]/8 border border-[#3B82F6]/20 rounded-xl px-4 py-3 mb-5">
          <GraduationCap className="w-4 h-4 text-[#3B82F6] flex-shrink-0" />
          <p className="text-xs text-[#A1A1AA]">Vídeos da <span className="text-white font-medium">Escola de Negócios Médicos</span> — gerencie capas e substitua arquivos</p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Vídeos de Treinamento</h2>
        </div>

        <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-[#3B82F6] border-t-transparent animate-spin" /></div>
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Film className="w-8 h-8 text-[#3A3A3E] mb-2" />
              <p className="text-[#71717A] text-sm">Nenhum vídeo de treinamento ainda</p>
              <p className="text-xs text-[#52525B] mt-1">Use "+ Adicionar Vídeo → Área do Médico" para enviar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'separate' }}>
                <thead>
                  <tr className="border-b border-[#1C1C1E]">
                    {['Título', 'Duração', 'Capa', 'Criado em', 'Ações'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-[#71717A] px-5 py-3 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video, i) => (
                    <tr key={video.id} className={`border-b border-[#1C1C1E] hover:bg-[#18181A] transition-colors ${i === videos.length - 1 ? 'border-b-0' : ''}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center flex-shrink-0"><Play className="w-3.5 h-3.5 text-[#3B82F6]" /></div>
                          <div><p className="text-sm font-medium text-white line-clamp-1">{video.title}</p>{video.hls_path && <p className="text-[10px] text-[#52525B] mt-0.5 truncate max-w-[200px]">{video.hls_path}</p>}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="text-sm text-[#A1A1AA]">{formatDuration(video.duration_seconds)}</span></td>
                      <td className="px-5 py-4">
                        {video.thumbnail_path
                          ? <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Com capa</span>
                          : <span className="text-xs text-[#52525B]">Sem capa</span>}
                      </td>
                      <td className="px-5 py-4"><span className="text-sm text-[#71717A]">{formatDate(video.created_at)}</span></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(video)} className="w-8 h-8 rounded-lg bg-[#18181A] border border-[#1C1C1E] flex items-center justify-center text-[#71717A] hover:text-[#3B82F6] hover:border-[#3B82F6]/30 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteVideo(video)} className="w-8 h-8 rounded-lg bg-[#18181A] border border-[#1C1C1E] flex items-center justify-center text-[#71717A] hover:text-red-400 hover:border-red-500/30 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Editar Vídeo de Treinamento</h3>
              <button onClick={() => setEditingVideo(null)} className="text-[#71717A] hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div><label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Título</label><input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6] transition-colors" required /></div>
              <div><label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Duração (seg)</label><input type="number" value={form.duration_seconds} onChange={e => setForm(f => ({ ...f, duration_seconds: e.target.value }))} min={0} className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6] transition-colors" /></div>
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Capa (thumbnail)</label>
                <div className="border border-dashed border-[#2A2A2E] rounded-xl overflow-hidden cursor-pointer hover:border-[#3B82F6]/50 transition-colors" onClick={() => thumbInputRef.current?.click()}>
                  {thumbPreview ? <div className="relative h-28"><img src={thumbPreview} alt="Capa" className="w-full h-full object-cover" /></div>
                    : <div className="p-4 text-center"><Upload className="w-4 h-4 text-[#3B82F6] mx-auto mb-1" /><p className="text-xs text-[#71717A]">{editingVideo.thumbnail_path ? 'Trocar capa' : 'Adicionar capa'}</p></div>}
                  <input ref={thumbInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setThumbPreview(URL.createObjectURL(f)) }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Substituir vídeo</label>
                <div className="border border-dashed border-[#2A2A2E] rounded-xl cursor-pointer hover:border-[#3B82F6]/50 transition-colors" onClick={() => editVideoInputRef.current?.click()}>
                  {editVideoName ? <div className="px-4 py-3 flex items-center gap-2"><Film className="w-4 h-4 text-[#3B82F6] shrink-0" /><span className="text-xs text-white truncate">{editVideoName}</span></div>
                    : <div className="p-3 text-center"><Upload className="w-4 h-4 text-[#3B82F6] mx-auto mb-1" /><p className="text-xs text-[#71717A]">Substituir arquivo MP4</p></div>}
                  <input ref={editVideoInputRef} type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setEditVideoName(f.name) }} />
                </div>
              </div>
              {uploadError && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">{uploadError}</p>}
              {uploadSuccess && <p className="text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5">Salvo com sucesso!</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditingVideo(null)} className="flex-1 bg-[#18181A] border border-[#1C1C1E] text-[#A1A1AA] text-sm font-medium py-2.5 rounded-xl hover:border-[#27272A] transition-colors">Cancelar</button>
                <button type="submit" disabled={uploading} className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  {uploading ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Salvando...</> : <><Save className="w-4 h-4" />Salvar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
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

function MedicalVideos({ supabase }: { supabase: ReturnType<typeof createBrowserClient> }) {
  const [modules, setModules] = useState<TrainingModule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, []) // eslint-disable-line

  async function load() {
    setLoading(true)
    try {
      const { data: mods } = await supabase.from('training_modules').select('*').order('num')
      const { data: lessons } = await supabase.from('training_lessons').select('*').order('num')
      if (mods && mods.length > 0) {
        setModules(mods.map((m: TrainingModule) => ({
          ...m,
          lessons: (lessons ?? []).filter((l: TrainingLesson) => l.module_id === m.id),
        })))
      }
    } catch { /* use fallback */ } finally { setLoading(false) }
  }

  const displayModules = modules.length > 0
    ? modules
    : FALLBACK_MODULES.map(fb => ({
        id: '', num: fb.num, title: fb.title, color: fb.color,
        lessons: fb.lessons.map(l => ({ id: '', module_id: '', num: l.num, title: l.title, duration: l.duration, video_url: '' })),
      }))

  const totalLessons = displayModules.reduce((a, m) => a + m.lessons.length, 0)
  const withVideo = displayModules.reduce((a, m) => a + m.lessons.filter(l => l.video_url).length, 0)

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-[#3B82F6] border-t-transparent animate-spin" /></div>

  return (
    <>
      <div className="flex items-center gap-3 bg-[#3B82F6]/8 border border-[#3B82F6]/20 rounded-xl px-4 py-3 mb-5">
        <GraduationCap className="w-4 h-4 text-[#3B82F6] flex-shrink-0" />
        <p className="text-xs text-[#A1A1AA]">Status dos vídeos da <span className="text-white font-medium">Escola de Negócios Médicos</span>. Para enviar vídeos use <span className="text-[#7B3FE4] font-medium">+ Adicionar Vídeo → Área do Médico</span>.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total de aulas', value: totalLessons, icon: <Film className="w-4 h-4 text-[#3B82F6]" />, bg: 'border-[#3B82F6]/20' },
          { label: 'Com vídeo', value: withVideo, icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, bg: 'border-emerald-500/20' },
          { label: 'Sem vídeo', value: totalLessons - withVideo, icon: <AlertCircle className="w-4 h-4 text-amber-400" />, bg: 'border-amber-500/20' },
        ].map((s, i) => (
          <div key={i} className={`flex items-center gap-3 bg-[#111113] border ${s.bg} rounded-xl px-4 py-3`}>
            {s.icon}<div><p className="text-xl font-bold text-white">{s.value}</p><p className="text-[10px] text-[#71717A]">{s.label}</p></div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {displayModules.map((mod) => (
          <div key={mod.num} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#1C1C1E]">
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${mod.color || 'from-[#7B3FE4] to-[#4C1B9B]'} flex items-center justify-center text-white text-xs font-bold`}>{mod.num}</div>
              <div><p className="text-sm font-semibold text-white">{mod.title}</p><p className="text-[10px] text-[#52525B]">{mod.lessons.length} aulas</p></div>
              <span className={`ml-auto text-[10px] font-semibold px-2 py-1 rounded-full ${mod.lessons.filter(l => l.video_url).length === mod.lessons.length ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'}`}>
                {mod.lessons.filter(l => l.video_url).length}/{mod.lessons.length} vídeos
              </span>
            </div>
            <div className="divide-y divide-[#1C1C1E]">
              {mod.lessons.map((lesson) => {
                const hasVideo = !!lesson.video_url
                return (
                  <div key={lesson.num} className="grid grid-cols-[auto_1fr_auto] gap-4 items-center px-5 py-3">
                    <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center ${hasVideo ? 'bg-emerald-500/15 border border-emerald-500/20' : 'bg-[#18181A] border border-[#27272A]'}`}>
                      {hasVideo ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Play className="w-3 h-3 text-[#3F3F46]" />}
                    </div>
                    <div><p className="text-[10px] text-[#52525B]">Aula {String(lesson.num).padStart(2, '0')}</p><p className="text-xs text-[#A1A1AA] truncate">{lesson.title}</p></div>
                    <span className={`text-[10px] font-medium ${hasVideo ? 'text-emerald-400' : 'text-[#3F3F46] italic'}`}>{hasVideo ? '● Vídeo configurado' : 'Sem vídeo'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
