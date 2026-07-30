'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import { Save, CheckCircle, AlertCircle, Stethoscope, Star, Phone, Award, MessageSquare, BookOpen } from 'lucide-react'

interface MedicoSettings {
  id?: string
  welcome_title: string
  welcome_subtitle: string
  mentor_name: string
  mentor_specialty: string
  mentor_bio: string
  mentor_photo_url: string
  support_whatsapp: string
  support_message: string
  portal_label: string
  graduation_cta: string
}

const DEFAULT: MedicoSettings = {
  welcome_title: 'Bem-vindo ao Hormone Business OS',
  welcome_subtitle: 'Sua plataforma completa de gestão, treinamento e operação médica. Tudo integrado.',
  mentor_name: 'Dr. Ricardo Lima',
  mentor_specialty: 'Medicina Hormonal',
  mentor_bio: 'Especialista em medicina hormonal com mais de 15 anos de experiência. Criador do método Hormone Ecosystem.',
  mentor_photo_url: '',
  support_whatsapp: '5547988507977',
  support_message: 'Olá! Preciso de suporte com a plataforma Hormone Business OS.',
  portal_label: 'Hormone Academy',
  graduation_cta: 'Falar com Mentor',
}

const SQL_HINT = `-- Execute no Supabase Dashboard:
CREATE TABLE IF NOT EXISTS medical_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  welcome_title text NOT NULL DEFAULT 'Bem-vindo ao Hormone Business OS',
  welcome_subtitle text DEFAULT '',
  mentor_name text DEFAULT 'Dr. Ricardo Lima',
  mentor_specialty text DEFAULT 'Medicina Hormonal',
  mentor_bio text DEFAULT '',
  mentor_photo_url text DEFAULT '',
  support_whatsapp text DEFAULT '5547988507977',
  support_message text DEFAULT '',
  portal_label text DEFAULT 'Hormone Academy',
  graduation_cta text DEFAULT 'Falar com Mentor',
  updated_at timestamptz DEFAULT now()
);`

export default function MedicoSettingsPage() {
  const [settings, setSettings] = useState<MedicoSettings>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('medical_settings')
        .select('*')
        .limit(1)
        .maybeSingle()
      if (data) setSettings(data)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      if (settings.id) {
        const { error: e } = await supabase
          .from('medical_settings')
          .update({ ...settings, updated_at: new Date().toISOString() })
          .eq('id', settings.id)
        if (e) throw e
      } else {
        const { data, error: e } = await supabase
          .from('medical_settings')
          .insert(settings)
          .select()
          .single()
        if (e) throw e
        if (data) setSettings(data)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  function set(key: keyof MedicoSettings, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const whatsappUrl = `https://wa.me/${settings.support_whatsapp}?text=${encodeURIComponent(settings.support_message)}`

  if (loading) {
    return (
      <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
        <Sidebar role="admin" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#7B3FE4] border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin', role: 'admin' }} title="Configurações da Área Médico" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-3xl space-y-6">

            {/* Welcome section */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#7B3FE4]/20 border border-[#7B3FE4]/30 flex items-center justify-center">
                  <Star className="w-4 h-4 text-[#7B3FE4]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Boas-vindas — Dashboard do Médico</h3>
                  <p className="text-xs text-[#71717A]">Título e subtítulo exibidos no portal do médico mentorado</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Título principal</label>
                  <input
                    type="text"
                    value={settings.welcome_title}
                    onChange={(e) => set('welcome_title', e.target.value)}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Subtítulo</label>
                  <textarea
                    value={settings.welcome_subtitle}
                    onChange={(e) => set('welcome_subtitle', e.target.value)}
                    rows={2}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Label do portal (sidebar)</label>
                  <input
                    type="text"
                    value={settings.portal_label}
                    onChange={(e) => set('portal_label', e.target.value)}
                    placeholder="Ex: Hormone Academy"
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Mentor profile */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/30 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-[#3B82F6]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Perfil do Mentor</h3>
                  <p className="text-xs text-[#71717A]">Informações exibidas na página de mentoria e na sidebar</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Nome do mentor</label>
                    <input
                      type="text"
                      value={settings.mentor_name}
                      onChange={(e) => set('mentor_name', e.target.value)}
                      className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Especialidade</label>
                    <input
                      type="text"
                      value={settings.mentor_specialty}
                      onChange={(e) => set('mentor_specialty', e.target.value)}
                      className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Bio curta</label>
                  <textarea
                    value={settings.mentor_bio}
                    onChange={(e) => set('mentor_bio', e.target.value)}
                    rows={3}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">URL da foto (opcional)</label>
                  <input
                    type="url"
                    value={settings.mentor_photo_url}
                    onChange={(e) => set('mentor_photo_url', e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Escola CTA */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/20 border border-[#F59E0B]/30 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Botão de Conclusão / Mentoria</h3>
                  <p className="text-xs text-[#71717A]">CTA exibido ao médico ao concluir módulos</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Texto do botão</label>
                <input
                  type="text"
                  value={settings.graduation_cta}
                  onChange={(e) => set('graduation_cta', e.target.value)}
                  placeholder="Ex: Falar com Mentor"
                  className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
                />
              </div>
            </div>

            {/* WhatsApp support */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-[#25D366]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">WhatsApp de Suporte</h3>
                  <p className="text-xs text-[#71717A]">Contato de suporte exibido para os médicos mentorados</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Número (com DDI, sem +)</label>
                  <input
                    type="text"
                    value={settings.support_whatsapp}
                    onChange={(e) => set('support_whatsapp', e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 5547988507977"
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Mensagem padrão</label>
                  <textarea
                    value={settings.support_message}
                    onChange={(e) => set('support_message', e.target.value)}
                    rows={2}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors resize-none"
                  />
                </div>
                <div className="bg-[#18181A] rounded-xl p-3 border border-[#1C1C1E]">
                  <p className="text-[10px] text-[#52525B] mb-1 uppercase tracking-wider">Preview do link</p>
                  <p className="text-xs text-[#7B3FE4] break-all font-mono">{whatsappUrl}</p>
                </div>
              </div>
            </div>

            {/* Errors */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}
            {error?.includes('does not exist') && (
              <div className="bg-[#111113] border border-amber-500/30 rounded-2xl p-4">
                <p className="text-xs font-semibold text-amber-400 mb-2">Execute este SQL no Supabase Dashboard:</p>
                <pre className="text-xs text-[#A1A1AA] bg-[#18181A] rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">{SQL_HINT}</pre>
              </div>
            )}

            {/* Save */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#7B3FE4] hover:bg-[#6325C8] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl flex items-center gap-2 transition-colors"
              >
                {saving ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Salvando...</>
                ) : saved ? (
                  <><CheckCircle className="w-4 h-4" />Salvo!</>
                ) : (
                  <><Save className="w-4 h-4" />Salvar configurações</>
                )}
              </button>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
