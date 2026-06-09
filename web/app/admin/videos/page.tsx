'use client'

import { useState, useEffect, useRef } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Upload, Play, Eye, EyeOff, Trash2, Plus, X,
  CheckCircle, Clock, AlertCircle, Film
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface Video {
  id: string
  title: string
  description: string | null
  category: string
  duration_seconds: number | null
  hls_path: string | null
  thumbnail_path: string | null
  is_published: boolean
  created_at: string
}

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

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0],
    duration_seconds: '',
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function loadVideos() {
    setIsLoading(true)
    const { data } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })
    setVideos(data ?? [])
    setIsLoading(false)
  }

  useEffect(() => { loadVideos() }, [])  // eslint-disable-line

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    setUploadError(null)
    setUploadSuccess(false)

    if (!form.title.trim()) {
      setUploadError('Título é obrigatório')
      return
    }

    const file = fileInputRef.current?.files?.[0]
    setUploading(true)

    try {
      // Insert video record first to get the ID
      const { data: newVideo, error: insertError } = await supabase
        .from('videos')
        .insert({
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : null,
          is_published: false,
        })
        .select()
        .single()

      if (insertError || !newVideo) {
        throw new Error(insertError?.message ?? 'Failed to create video record')
      }

      // Upload video file to R2
      if (file) {
        const urlRes = await fetch('/api/video/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: newVideo.id, fileName: file.name, contentType: file.type || 'video/mp4' }),
        })
        if (!urlRes.ok) {
          await supabase.from('videos').delete().eq('id', newVideo.id)
          throw new Error('Falha ao obter URL de upload')
        }
        const { uploadUrl, key } = await urlRes.json()
        const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'video/mp4' } })
        if (!uploadRes.ok) {
          await supabase.from('videos').delete().eq('id', newVideo.id)
          throw new Error('Falha no upload do vídeo')
        }
        await supabase.from('videos').update({ hls_path: key }).eq('id', newVideo.id)
      }

      // Upload thumbnail to R2
      const thumbFile = thumbInputRef.current?.files?.[0]
      if (thumbFile) {
        const thumbRes = await fetch('/api/video/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: newVideo.id, fileName: thumbFile.name, contentType: thumbFile.type || 'image/jpeg', type: 'thumbnail' }),
        })
        if (thumbRes.ok) {
          const { uploadUrl: thumbUrl, key: thumbKey } = await thumbRes.json()
          const tr = await fetch(thumbUrl, { method: 'PUT', body: thumbFile, headers: { 'Content-Type': thumbFile.type || 'image/jpeg' } })
          if (tr.ok) {
            await supabase.from('videos').update({ thumbnail_path: thumbKey }).eq('id', newVideo.id)
          }
        }
      }

      setUploadSuccess(true)
      setForm({ title: '', description: '', category: CATEGORIES[0], duration_seconds: '' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (thumbInputRef.current) thumbInputRef.current.value = ''
      setThumbPreview(null)
      await loadVideos()

      setTimeout(() => {
        setShowForm(false)
        setUploadSuccess(false)
      }, 1500)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function togglePublished(video: Video) {
    await supabase
      .from('videos')
      .update({ is_published: !video.is_published, updated_at: new Date().toISOString() })
      .eq('id', video.id)
    setVideos((prev) =>
      prev.map((v) => v.id === video.id ? { ...v, is_published: !v.is_published } : v)
    )
  }

  async function deleteVideo(video: Video) {
    if (!confirm(`Tem certeza que quer excluir "${video.title}"?`)) return

    // Delete from storage if path exists
    if (video.hls_path) {
      await supabase.storage.from('videos').remove([video.hls_path])
    }

    await supabase.from('videos').delete().eq('id', video.id)
    setVideos((prev) => prev.filter((v) => v.id !== video.id))
  }

  const publishedCount = videos.filter((v) => v.is_published).length

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin', role: 'admin' }} title="Gerenciar Vídeos" />
        <main className="flex-1 overflow-y-auto px-6 py-6">

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#7B3FE4]/10 flex items-center justify-center">
                <Film className="w-5 h-5 text-[#7B3FE4]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{videos.length}</p>
                <p className="text-xs text-[#71717A]">Total de vídeos</p>
              </div>
            </div>
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{publishedCount}</p>
                <p className="text-xs text-[#71717A]">Publicados</p>
              </div>
            </div>
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{videos.length - publishedCount}</p>
                <p className="text-xs text-[#71717A]">Rascunhos</p>
              </div>
            </div>
          </div>

          {/* Header + Add button */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Biblioteca de Vídeos</h2>
            <button
              onClick={() => { setShowForm(true); setUploadError(null); setUploadSuccess(false) }}
              className="bg-[#7B3FE4] hover:bg-[#6325C8] text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Adicionar Vídeo
            </button>
          </div>

          {/* Upload Form Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6 w-full max-w-lg mx-4">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-white">Adicionar Novo Vídeo</h3>
                  <button onClick={() => setShowForm(false)} className="text-[#71717A] hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Título *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Ex: Entendendo os Implantes Hormonais"
                      className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Descrição</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Descrição do vídeo..."
                      rows={3}
                      className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Categoria</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                        className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#7B3FE4] transition-colors"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Duração (segundos)</label>
                      <input
                        type="number"
                        value={form.duration_seconds}
                        onChange={(e) => setForm((f) => ({ ...f, duration_seconds: e.target.value }))}
                        placeholder="Ex: 1200"
                        min={0}
                        className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Thumbnail upload */}
                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Capa do Vídeo (opcional)</label>
                    <div
                      className="border border-dashed border-[#2A2A2E] rounded-xl overflow-hidden cursor-pointer hover:border-[#7B3FE4]/50 transition-colors"
                      onClick={() => thumbInputRef.current?.click()}
                    >
                      {thumbPreview ? (
                        <div className="relative h-32">
                          <img src={thumbPreview} alt="Capa" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <p className="text-white text-xs">Trocar imagem</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 text-center">
                          <div className="w-8 h-8 rounded-lg bg-[#7B3FE4]/10 flex items-center justify-center mx-auto mb-2">
                            <Upload className="w-4 h-4 text-[#7B3FE4]" />
                          </div>
                          <p className="text-xs text-[#71717A]">Clique para selecionar a capa</p>
                          <p className="text-[10px] text-[#52525B] mt-1">JPG, PNG, WEBP — recomendado 16:9</p>
                        </div>
                      )}
                      <input
                        ref={thumbInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) setThumbPreview(URL.createObjectURL(f))
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Arquivo de Vídeo (opcional)</label>
                    <div
                      className="border border-dashed border-[#2A2A2E] rounded-xl p-4 text-center cursor-pointer hover:border-[#7B3FE4]/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-6 h-6 text-[#52525B] mx-auto mb-2" />
                      <p className="text-xs text-[#71717A]">Clique para selecionar ou arraste o arquivo</p>
                      <p className="text-[10px] text-[#52525B] mt-1">MP4, MOV, M3U8 — máx. 2GB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*,.m3u8"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f && !form.duration_seconds) {
                            // Try to auto-fill duration from video metadata
                            const url = URL.createObjectURL(f)
                            const vid = document.createElement('video')
                            vid.src = url
                            vid.onloadedmetadata = () => {
                              setForm((prev) => ({ ...prev, duration_seconds: Math.floor(vid.duration).toString() }))
                              URL.revokeObjectURL(url)
                            }
                          }
                        }}
                      />
                    </div>
                    {fileInputRef.current?.files?.[0] && (
                      <p className="text-xs text-[#7B3FE4] mt-1.5">{fileInputRef.current.files[0].name}</p>
                    )}
                  </div>

                  {uploadError && (
                    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {uploadError}
                    </div>
                  )}

                  {uploadSuccess && (
                    <div className="flex items-center gap-2 text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      Vídeo adicionado com sucesso!
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 bg-[#18181A] border border-[#1C1C1E] text-[#A1A1AA] text-sm font-medium py-2.5 rounded-xl hover:border-[#27272A] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="flex-1 bg-[#7B3FE4] hover:bg-[#6325C8] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" /> Adicionar
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Videos table */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-[#7B3FE4] border-t-transparent animate-spin" />
              </div>
            ) : videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Film className="w-10 h-10 text-[#3A3A3E] mb-3" />
                <p className="text-[#71717A] mb-1">Nenhum vídeo ainda</p>
                <p className="text-xs text-[#52525B]">Adicione o primeiro vídeo para começar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1C1C1E]">
                      <th className="text-left text-xs font-semibold text-[#71717A] px-5 py-3 uppercase tracking-wide">Título</th>
                      <th className="text-left text-xs font-semibold text-[#71717A] px-5 py-3 uppercase tracking-wide">Categoria</th>
                      <th className="text-left text-xs font-semibold text-[#71717A] px-5 py-3 uppercase tracking-wide">Duração</th>
                      <th className="text-left text-xs font-semibold text-[#71717A] px-5 py-3 uppercase tracking-wide">Status</th>
                      <th className="text-left text-xs font-semibold text-[#71717A] px-5 py-3 uppercase tracking-wide">Criado em</th>
                      <th className="text-left text-xs font-semibold text-[#71717A] px-5 py-3 uppercase tracking-wide">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map((video, i) => (
                      <tr
                        key={video.id}
                        className={`border-b border-[#1C1C1E] hover:bg-[#18181A] transition-colors ${i === videos.length - 1 ? 'border-b-0' : ''}`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#7B3FE4]/10 flex items-center justify-center flex-shrink-0">
                              <Play className="w-3.5 h-3.5 text-[#7B3FE4]" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white line-clamp-1">{video.title}</p>
                              {video.hls_path && (
                                <p className="text-[10px] text-[#52525B] mt-0.5 truncate max-w-[200px]">{video.hls_path}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs bg-[#7B3FE4]/10 text-[#9558EE] px-2 py-1 rounded-lg border border-[#7B3FE4]/20">
                            {video.category}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-[#A1A1AA]">{formatDuration(video.duration_seconds)}</span>
                        </td>
                        <td className="px-5 py-4">
                          {video.is_published ? (
                            <span className="flex items-center gap-1.5 text-xs text-green-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                              Publicado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs text-[#71717A]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#3A3A3E]" />
                              Rascunho
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-[#71717A]">{formatDate(video.created_at)}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => togglePublished(video)}
                              title={video.is_published ? 'Despublicar' : 'Publicar'}
                              className="w-8 h-8 rounded-lg bg-[#18181A] border border-[#1C1C1E] flex items-center justify-center text-[#71717A] hover:text-white hover:border-[#27272A] transition-all"
                            >
                              {video.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => deleteVideo(video)}
                              title="Excluir"
                              className="w-8 h-8 rounded-lg bg-[#18181A] border border-[#1C1C1E] flex items-center justify-center text-[#71717A] hover:text-red-400 hover:border-red-500/30 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
