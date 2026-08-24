'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import { Save, CheckCircle, AlertCircle, RotateCcw, Plus, Trash2 } from 'lucide-react'

const DEFAULT_NUMEROS = [
  { valor: '2.847', label: 'Pacientes transformadas' },
  { valor: '98%', label: 'Satisfação comprovada' },
  { valor: '6 meses', label: 'De proteção por implante' },
  { valor: '15 anos', label: 'De experiência clínica' },
]

const DEFAULT_BENEFICIOS = [
  { icon: '⚡', titulo: 'Energia de volta', desc: 'Recupere sua disposição e vitalidade em semanas' },
  { icon: '😴', titulo: 'Sono reparador', desc: 'Durma profundamente e acorde renovada' },
  { icon: '🔥', titulo: 'Libido restaurada', desc: 'Reconecte-se com seu corpo e prazer' },
  { icon: '💪', titulo: 'Força e músculo', desc: 'Mantenha massa muscular e reduza gordura' },
  { icon: '🧠', titulo: 'Foco e memória', desc: 'Clareza mental e concentração no dia a dia' },
  { icon: '❤️', titulo: 'Humor estável', desc: 'Adeus ansiedade, irritabilidade e tristeza' },
]

const DEFAULT_DEPOIMENTOS = [
  {
    nome: 'Fernanda Costa',
    cidade: 'Curitiba, PR',
    mensagem: 'Acordava cansada, dormia cansada. Depois do implante com o Dr. Vinícius Cechella, na primeira semana já senti diferença no sono. Na segunda semana, a energia no trabalho voltou. Hoje durmo profundamente e acordo com vontade de conquistar o dia. Mudou minha vida! 🙏',
    horario: '14:32',
  },
  {
    nome: 'Patricia Mendes',
    cidade: 'Porto Alegre, RS',
    mensagem: 'Tentei de tudo para perder peso. Nada funcionava. Com o implante do Dr. Vinícius Cechella, em 3 meses perdi 8 quilos sem dieta restritiva. O metabolismo voltou a funcionar. Hoje com 58 anos uso calça que não usava com 48. Não é milagre — é ciência hormonal! ✨',
    horario: '09:17',
  },
]

type Numero = { valor: string; label: string }
type Beneficio = { icon: string; titulo: string; desc: string }
type Depoimento = { nome: string; cidade: string; mensagem: string; horario: string }

export default function LandingAdminPage() {
  const [numeros, setNumeros] = useState<Numero[]>(DEFAULT_NUMEROS)
  const [beneficios, setBeneficios] = useState<Beneficio[]>(DEFAULT_BENEFICIOS)
  const [depoimentos, setDepoimentos] = useState<Depoimento[]>(DEFAULT_DEPOIMENTOS)
  const [heroTitle, setHeroTitle] = useState('Recupere sua energia, libido e qualidade de vida')
  const [heroSub, setHeroSub] = useState('Milhares de mulheres já transformaram sua saúde hormonal com implantes bioidenticos. Descubra como em menos de 30 minutos.')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => { loadContent() }, []) // eslint-disable-line

  async function loadContent() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('site_content')
        .select('key, value')
        .in('key', ['landing_numeros', 'landing_beneficios', 'landing_depoimentos', 'landing_hero'])
      if (data) {
        for (const row of data) {
          if (row.key === 'landing_numeros') setNumeros(row.value)
          if (row.key === 'landing_beneficios') setBeneficios(row.value)
          if (row.key === 'landing_depoimentos') setDepoimentos(row.value)
          if (row.key === 'landing_hero') {
            setHeroTitle(row.value.title ?? heroTitle)
            setHeroSub(row.value.subtitle ?? heroSub)
          }
        }
      }
    } catch {
      // table may not exist yet — use defaults silently
    } finally {
      setLoading(false)
    }
  }

  async function saveAll() {
    setSaving(true)
    setError(null)
    try {
      const rows = [
        { key: 'landing_numeros', value: numeros },
        { key: 'landing_beneficios', value: beneficios },
        { key: 'landing_depoimentos', value: depoimentos },
        { key: 'landing_hero', value: { title: heroTitle, subtitle: heroSub } },
      ]
      const { error: e } = await supabase.from('site_content').upsert(rows, { onConflict: 'key' })
      if (e) throw e
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar. Verifique se a tabela site_content foi criada.')
    } finally {
      setSaving(false)
    }
  }

  const updateNumero = (i: number, key: keyof Numero, v: string) =>
    setNumeros(prev => prev.map((n, idx) => idx === i ? { ...n, [key]: v } : n))

  const updateBeneficio = (i: number, key: keyof Beneficio, v: string) =>
    setBeneficios(prev => prev.map((b, idx) => idx === i ? { ...b, [key]: v } : b))

  const updateDepoimento = (i: number, key: keyof Depoimento, v: string) =>
    setDepoimentos(prev => prev.map((d, idx) => idx === i ? { ...d, [key]: v } : d))

  const input = 'w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7B3FE4] transition-colors'
  const textarea = `${input} resize-none`
  const sectionCard = 'bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5'

  if (loading) return (
    <div className="flex h-screen bg-[#0A0A0B]"><Sidebar role="admin" />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#7B3FE4] border-t-transparent animate-spin" />
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin', role: 'admin' }} title="Landing Page — Editor" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-3xl space-y-5">

            {/* Status */}
            {saved && (
              <div className="flex items-center gap-2 text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                <CheckCircle className="w-4 h-4" /> Salvo com sucesso — a landing page já exibe o novo conteúdo.
              </div>
            )}
            {error && (
              <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1"><AlertCircle className="w-4 h-4" /> {error}</div>
                <p className="text-[#71717A] mt-1">Execute a migration <code className="text-white">web/supabase/migrations/20260824_site_content.sql</code> no Supabase antes de salvar.</p>
              </div>
            )}

            {/* Hero */}
            <div className={sectionCard}>
              <p className="text-[9px] font-bold tracking-widest uppercase text-[#F59E0B] mb-3">Hero</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#71717A] block mb-1">Título principal</label>
                  <input className={input} value={heroTitle} onChange={e => setHeroTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-[#71717A] block mb-1">Subtítulo</label>
                  <textarea className={textarea} rows={2} value={heroSub} onChange={e => setHeroSub(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Números */}
            <div className={sectionCard}>
              <p className="text-[9px] font-bold tracking-widest uppercase text-[#F59E0B] mb-3">Números de Impacto (4 cards)</p>
              <div className="grid grid-cols-2 gap-3">
                {numeros.map((n, i) => (
                  <div key={i} className="bg-[#18181A] border border-[#1C1C1E] rounded-xl p-3 space-y-2">
                    <input className={input} placeholder="Valor (ex: 2.847)" value={n.valor} onChange={e => updateNumero(i, 'valor', e.target.value)} />
                    <input className={input} placeholder="Label" value={n.label} onChange={e => updateNumero(i, 'label', e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Benefícios */}
            <div className={sectionCard}>
              <p className="text-[9px] font-bold tracking-widest uppercase text-[#F59E0B] mb-3">Benefícios (6 cards)</p>
              <div className="space-y-3">
                {beneficios.map((b, i) => (
                  <div key={i} className="bg-[#18181A] border border-[#1C1C1E] rounded-xl p-3 grid grid-cols-[40px_1fr_1fr] gap-2 items-start">
                    <input className={input} placeholder="🔥" value={b.icon} onChange={e => updateBeneficio(i, 'icon', e.target.value)} />
                    <input className={input} placeholder="Título" value={b.titulo} onChange={e => updateBeneficio(i, 'titulo', e.target.value)} />
                    <input className={input} placeholder="Descrição" value={b.desc} onChange={e => updateBeneficio(i, 'desc', e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Depoimentos texto */}
            <div className={sectionCard}>
              <p className="text-[9px] font-bold tracking-widest uppercase text-[#F59E0B] mb-3">Depoimentos Texto (estilo WhatsApp)</p>
              <div className="space-y-4">
                {depoimentos.map((d, i) => (
                  <div key={i} className="bg-[#18181A] border border-[#1C1C1E] rounded-xl p-4 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <input className={input} placeholder="Nome" value={d.nome} onChange={e => updateDepoimento(i, 'nome', e.target.value)} />
                      <input className={input} placeholder="Cidade, UF" value={d.cidade} onChange={e => updateDepoimento(i, 'cidade', e.target.value)} />
                      <input className={input} placeholder="Horário (ex: 14:32)" value={d.horario} onChange={e => updateDepoimento(i, 'horario', e.target.value)} />
                    </div>
                    <textarea className={textarea} rows={3} placeholder="Mensagem da paciente..." value={d.mensagem} onChange={e => updateDepoimento(i, 'mensagem', e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pb-6">
              <button
                onClick={saveAll}
                disabled={saving}
                className="flex items-center gap-2 bg-[#7B3FE4] hover:bg-[#6D35CC] disabled:opacity-50 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button
                onClick={() => { setNumeros(DEFAULT_NUMEROS); setBeneficios(DEFAULT_BENEFICIOS); setDepoimentos(DEFAULT_DEPOIMENTOS); setHeroTitle('Recupere sua energia, libido e qualidade de vida'); setHeroSub('Milhares de mulheres já transformaram sua saúde hormonal com implantes bioidenticos. Descubra como em menos de 30 minutos.') }}
                className="flex items-center gap-2 text-[#71717A] hover:text-white text-sm px-4 py-3 rounded-xl border border-[#1C1C1E] hover:border-[#3F3F46] transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Restaurar padrão
              </button>
              <a href="/" target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-[#71717A] hover:text-white transition-colors underline underline-offset-2">
                Ver landing page →
              </a>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
