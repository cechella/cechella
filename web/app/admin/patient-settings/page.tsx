'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import { Save, CheckCircle, AlertCircle, Settings, Users, MessageSquare, Star, Phone } from 'lucide-react'

interface PatientSettings {
  id?: string
  hero_title: string
  hero_subtitle: string
  stat_patients: string
  stat_satisfaction: string
  stat_duration: string
  stat_years: string
  whatsapp_number: string
  whatsapp_message: string
  cta_primary_label: string
  cta_secondary_label: string
}

const DEFAULT_SETTINGS: PatientSettings = {
  hero_title: 'Sua transformação hormonal começa aqui',
  hero_subtitle: 'Milhares de mulheres já recuperaram energia, bem-estar e qualidade de vida com o implante hormonal. Você pode ser a próxima.',
  stat_patients: '2.847',
  stat_satisfaction: '98%',
  stat_duration: '6 meses',
  stat_years: '15 anos',
  whatsapp_number: '5547988507977',
  whatsapp_message: 'Olá! Tenho interesse no implante hormonal. Pode me ajudar?',
  cta_primary_label: 'QUERO MEU IMPLANTE',
  cta_secondary_label: 'Ver depoimentos',
}

export default function PatientSettingsPage() {
  const [settings, setSettings] = useState<PatientSettings>(DEFAULT_SETTINGS)
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
        .from('patient_settings')
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
          .from('patient_settings')
          .update({ ...settings, updated_at: new Date().toISOString() })
          .eq('id', settings.id)
        if (e) throw e
      } else {
        const { data, error: e } = await supabase
          .from('patient_settings')
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

  function set(key: keyof PatientSettings, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const whatsappUrl = `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(settings.whatsapp_message)}`

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
        <TopBar user={{ name: 'Admin', role: 'admin' }} title="Configurações do Paciente" />
        <main className="flex-1 overflow-y-auto px-6 py-6">

          <div className="max-w-3xl space-y-6">

            {/* Hero Section */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#7B3FE4]/20 border border-[#7B3FE4]/30 flex items-center justify-center">
                  <Star className="w-4 h-4 text-[#7B3FE4]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Seção Hero — Dashboard</h3>
                  <p className="text-xs text-[#71717A]">Título e subtítulo da tela inicial do paciente</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Título principal</label>
                  <input
                    type="text"
                    value={settings.hero_title}
                    onChange={(e) => set('hero_title', e.target.value)}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Subtítulo</label>
                  <textarea
                    value={settings.hero_subtitle}
                    onChange={(e) => set('hero_subtitle', e.target.value)}
                    rows={3}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#3B82F6]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Números de Prova Social</h3>
                  <p className="text-xs text-[#71717A]">Estatísticas exibidas no banner do dashboard</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Pacientes atendidos</label>
                  <input
                    type="text"
                    value={settings.stat_patients}
                    onChange={(e) => set('stat_patients', e.target.value)}
                    placeholder="Ex: 2.847"
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Taxa de satisfação</label>
                  <input
                    type="text"
                    value={settings.stat_satisfaction}
                    onChange={(e) => set('stat_satisfaction', e.target.value)}
                    placeholder="Ex: 98%"
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Duração do implante</label>
                  <input
                    type="text"
                    value={settings.stat_duration}
                    onChange={(e) => set('stat_duration', e.target.value)}
                    placeholder="Ex: 6 meses"
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Anos de experiência</label>
                  <input
                    type="text"
                    value={settings.stat_years}
                    onChange={(e) => set('stat_years', e.target.value)}
                    placeholder="Ex: 15 anos"
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-[#25D366]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">WhatsApp Business</h3>
                  <p className="text-xs text-[#71717A]">Número e mensagem padrão para os CTAs</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Número (com DDI, sem +)</label>
                  <input
                    type="text"
                    value={settings.whatsapp_number}
                    onChange={(e) => set('whatsapp_number', e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 5547988507977"
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Mensagem padrão</label>
                  <textarea
                    value={settings.whatsapp_message}
                    onChange={(e) => set('whatsapp_message', e.target.value)}
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

            {/* CTA Labels */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#EC4899]/20 border border-[#EC4899]/30 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-[#EC4899]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Textos dos Botões CTA</h3>
                  <p className="text-xs text-[#71717A]">Labels dos botões de chamada para ação</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Botão principal (WhatsApp)</label>
                  <input
                    type="text"
                    value={settings.cta_primary_label}
                    onChange={(e) => set('cta_primary_label', e.target.value)}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Botão secundário</label>
                  <input
                    type="text"
                    value={settings.cta_secondary_label}
                    onChange={(e) => set('cta_secondary_label', e.target.value)}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Save button */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
                {error.includes('does not exist') && (
                  <span className="ml-1 text-[#71717A]">— Execute o SQL abaixo no Supabase primeiro.</span>
                )}
              </div>
            )}

            {error?.includes('does not exist') && (
              <div className="bg-[#111113] border border-amber-500/30 rounded-2xl p-4">
                <p className="text-xs font-semibold text-amber-400 mb-2">Execute este SQL no Supabase Dashboard:</p>
                <pre className="text-xs text-[#A1A1AA] bg-[#18181A] rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">{`CREATE TABLE IF NOT EXISTS patient_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_title text NOT NULL DEFAULT 'Sua transformação hormonal começa aqui',
  hero_subtitle text NOT NULL DEFAULT '',
  stat_patients text NOT NULL DEFAULT '2.847',
  stat_satisfaction text NOT NULL DEFAULT '98%',
  stat_duration text NOT NULL DEFAULT '6 meses',
  stat_years text NOT NULL DEFAULT '15 anos',
  whatsapp_number text NOT NULL DEFAULT '5547988507977',
  whatsapp_message text NOT NULL DEFAULT 'Olá! Tenho interesse no implante hormonal.',
  cta_primary_label text NOT NULL DEFAULT 'QUERO MEU IMPLANTE',
  cta_secondary_label text NOT NULL DEFAULT 'Ver depoimentos',
  updated_at timestamptz DEFAULT now()
);`}</pre>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#7B3FE4] hover:bg-[#6325C8] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl flex items-center gap-2 transition-colors"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Salvando...
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Salvo!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar configurações
                  </>
                )}
              </button>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
