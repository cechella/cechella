'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import { Save, CheckCircle, AlertCircle, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'

interface FeaturedStudy {
  acronym: string
  title: string
  journal: string
  date: string
  doi: string
  authors: string
  type: string
  badge: string
  summary: string
  conclusion: string
}

interface WorldStudy {
  title: string
  source: string
  year: string
  type: string
  finding: string
}

const DEFAULT_FEATURED: FeaturedStudy[] = [
  {
    acronym: 'CLARA',
    title: 'Pharmacokinetic Analysis of 25mg Estradiol Subcutaneous Bioabsorbable Implant',
    journal: 'Menopause Journal',
    date: 'Dezembro 2025',
    doi: '10.1097/GME.0000000000002687',
    authors: 'Malavasi AM, Ribeiro CM, Agati LB, Berta F et al.',
    type: 'Estudo Farmacocinético',
    badge: 'Publicado',
    summary: 'Análise farmacocinética do implante subcutâneo de estradiol 25mg bioreabsorvível em mulheres pós-menopausadas histerectomizadas. Acompanhamento nas semanas 4, 12 e 24 demonstrou perfil de liberação sustentada e segurança consistente.',
    conclusion: 'O implante bioreabsorvível demonstrou perfil farmacocinético favorável com liberação estável e previsível de estradiol ao longo de 6 meses.',
  },
  {
    acronym: 'GLADE',
    title: 'First Randomized Controlled Trial of Gestrinone 85mg Subdermic Implant for Endometriosis',
    journal: 'ISGE 2026 — Rome',
    date: 'Apresentado 2026',
    doi: 'ISGE Congress Rome 2026',
    authors: 'Dr. André Malavasi MD PhD',
    type: 'Ensaio Clínico Randomizado (RCT)',
    badge: 'Premiado',
    summary: 'Primeiro ensaio clínico randomizado com implante subdérmico de gestrinona 85mg para endometriose. Apresentado no maior congresso mundial de ginecologia endoscópica, ISGE 2026, em Roma.',
    conclusion: '0% de efeitos adversos sérios. Liberação sustentada com pico na semana 8 e estabilidade até a semana 12.',
  },
]

const DEFAULT_WORLD: WorldStudy[] = [
  { title: 'Efficacy of Hormone Pellet Therapy: A Systematic Review', source: 'Journal of Clinical Endocrinology & Metabolism', year: '2023', type: 'Meta-análise', finding: 'Implantes hormonais demonstraram superioridade em compliance e estabilidade de níveis séricos vs formas orais e transdérmicas.' },
  { title: 'Testosterone Pellets and Quality of Life in Postmenopausal Women', source: 'North American Menopause Society', year: '2022', type: 'Revisão Sistemática', finding: 'Melhora significativa em energia, libido e bem-estar com 85-90% de satisfação em acompanhamento de 12 meses.' },
  { title: 'Subcutaneous Estradiol Implants: Long-term Safety Profile', source: 'Maturitas', year: '2023', type: 'Coorte Prospectiva', finding: 'Perfil de segurança favorável em 10 anos de acompanhamento, com redução de risco cardiovascular e osteoporose.' },
  { title: 'Bioidentical Hormone Therapy: Clinical Outcomes Review', source: 'Climacteric', year: '2024', type: 'Revisão Clínica', finding: 'Hormônios bioidênticos apresentam perfil de risco inferior às formas sintéticas com eficácia equivalente.' },
  { title: 'Pellet Implants for Testosterone Deficiency in Women', source: 'Osteoporosis International', year: '2022', type: 'RCT', finding: 'Aumento de 23% na densidade mineral óssea e melhora significativa na composição corporal após 12 meses.' },
  { title: 'Cognitive Benefits of Hormone Pellet Therapy', source: 'Neurology & Endocrinology Reviews', year: '2024', type: 'Revisão', finding: 'Melhoras em memória, foco e velocidade de processamento cognitivo em mulheres na peri e pós-menopausa.' },
]

export default function EvidenciaAdminPage() {
  const [featured, setFeatured] = useState<FeaturedStudy[]>(DEFAULT_FEATURED)
  const [world, setWorld] = useState<WorldStudy[]>(DEFAULT_WORLD)
  const [expandedFeatured, setExpandedFeatured] = useState<number | null>(0)
  const [expandedWorld, setExpandedWorld] = useState<number | null>(null)

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
        .in('key', ['evidencia_featured', 'evidencia_world'])
      if (data) {
        for (const row of data) {
          if (row.key === 'evidencia_featured') setFeatured(row.value)
          if (row.key === 'evidencia_world') setWorld(row.value)
        }
      }
    } catch {
      // table may not exist yet — use defaults
    } finally {
      setLoading(false)
    }
  }

  async function saveAll() {
    setSaving(true)
    setError(null)
    try {
      const rows = [
        { key: 'evidencia_featured', value: featured },
        { key: 'evidencia_world', value: world },
      ]
      const { error: e } = await supabase.from('site_content').upsert(rows, { onConflict: 'key' })
      if (e) throw e
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar. Execute a migration 20260824_site_content.sql no Supabase.')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full bg-[#0A0A0B] border border-[#1C1C1E] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7B3FE4] transition-colors'
  const ta = `${inp} resize-none`

  const updateFeatured = (i: number, key: keyof FeaturedStudy, v: string) =>
    setFeatured(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: v } : s))
  const updateWorld = (i: number, key: keyof WorldStudy, v: string) =>
    setWorld(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: v } : s))

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
        <TopBar user={{ name: 'Admin', role: 'admin' }} title="Evidência Científica — Editor" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-3xl space-y-5">

            {saved && (
              <div className="flex items-center gap-2 text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                <CheckCircle className="w-4 h-4" /> Salvo — a página de Evidência Científica já exibe o novo conteúdo.
              </div>
            )}
            {error && (
              <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 space-y-1">
                <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>
              </div>
            )}

            {/* Featured studies */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1C1C1E]">
                <p className="text-[9px] font-bold tracking-widest uppercase text-[#7B3FE4]">Estudos em Destaque ({featured.length})</p>
              </div>
              {featured.map((s, i) => (
                <div key={i} className="border-b border-[#1C1C1E] last:border-0">
                  <button
                    onClick={() => setExpandedFeatured(expandedFeatured === i ? null : i)}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[#18181A] transition-colors"
                  >
                    {expandedFeatured === i ? <ChevronDown className="w-4 h-4 text-[#71717A] flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-[#71717A] flex-shrink-0" />}
                    <span className="text-xs font-bold text-[#7B3FE4] w-16 flex-shrink-0">{s.acronym}</span>
                    <span className="text-xs text-white truncate flex-1">{s.title}</span>
                    <span className="text-[10px] text-[#71717A] flex-shrink-0">{s.journal}</span>
                  </button>
                  {expandedFeatured === i && (
                    <div className="px-5 pb-4 grid grid-cols-2 gap-3 bg-[#0D0D0F]">
                      {([
                        ['acronym','Sigla (CLARA, GLADE...)'],
                        ['badge','Badge (Publicado, Premiado...)'],
                        ['type','Tipo de estudo'],
                        ['date','Data'],
                        ['journal','Revista / Congresso'],
                        ['doi','DOI ou referência'],
                        ['authors','Autores'],
                      ] as [keyof FeaturedStudy, string][]).map(([key, label]) => (
                        <div key={key}>
                          <label className="text-[10px] text-[#71717A] block mb-1">{label}</label>
                          <input className={inp} value={s[key]} onChange={e => updateFeatured(i, key, e.target.value)} />
                        </div>
                      ))}
                      <div className="col-span-2">
                        <label className="text-[10px] text-[#71717A] block mb-1">Título completo</label>
                        <input className={inp} value={s.title} onChange={e => updateFeatured(i, 'title', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-[#71717A] block mb-1">Resumo</label>
                        <textarea className={ta} rows={3} value={s.summary} onChange={e => updateFeatured(i, 'summary', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-[#71717A] block mb-1">Conclusão</label>
                        <textarea className={ta} rows={2} value={s.conclusion} onChange={e => updateFeatured(i, 'conclusion', e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* World evidence */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1C1C1E]">
                <p className="text-[9px] font-bold tracking-widest uppercase text-[#3B82F6]">Literatura Mundial ({world.length} estudos)</p>
              </div>
              {world.map((s, i) => (
                <div key={i} className="border-b border-[#1C1C1E] last:border-0">
                  <button
                    onClick={() => setExpandedWorld(expandedWorld === i ? null : i)}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[#18181A] transition-colors"
                  >
                    {expandedWorld === i ? <ChevronDown className="w-4 h-4 text-[#71717A] flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-[#71717A] flex-shrink-0" />}
                    <span className="text-xs text-white truncate flex-1">{s.title}</span>
                    <span className="text-[10px] text-[#71717A] flex-shrink-0">{s.year}</span>
                  </button>
                  {expandedWorld === i && (
                    <div className="px-5 pb-4 grid grid-cols-2 gap-3 bg-[#0D0D0F]">
                      <div>
                        <label className="text-[10px] text-[#71717A] block mb-1">Ano</label>
                        <input className={inp} value={s.year} onChange={e => updateWorld(i, 'year', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#71717A] block mb-1">Tipo</label>
                        <input className={inp} value={s.type} onChange={e => updateWorld(i, 'type', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-[#71717A] block mb-1">Título</label>
                        <input className={inp} value={s.title} onChange={e => updateWorld(i, 'title', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-[#71717A] block mb-1">Revista / Fonte</label>
                        <input className={inp} value={s.source} onChange={e => updateWorld(i, 'source', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-[#71717A] block mb-1">Principal achado</label>
                        <textarea className={ta} rows={2} value={s.finding} onChange={e => updateWorld(i, 'finding', e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
                onClick={() => { setFeatured(DEFAULT_FEATURED); setWorld(DEFAULT_WORLD) }}
                className="flex items-center gap-2 text-[#71717A] hover:text-white text-sm px-4 py-3 rounded-xl border border-[#1C1C1E] hover:border-[#3F3F46] transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Restaurar padrão
              </button>
              <a href="/patient/evidencia" target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-[#71717A] hover:text-white transition-colors underline underline-offset-2">
                Ver página →
              </a>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
