'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { ExternalLink, FlaskConical, BookOpen, TrendingUp, Shield, ChevronRight, Star, Users, Award, CheckCircle } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

const WHATSAPP_URL = 'https://wa.me/5547988507977?text=Ol%C3%A1!%20Vi%20os%20estudos%20cient%C3%ADficos%20e%20tenho%20interesse%20no%20implante%20hormonal.%20Pode%20me%20ajudar%3F'

const featuredStudies = [
  {
    acronym: 'CLARA',
    title: 'Pharmacokinetic Analysis of 25mg Estradiol Subcutaneous Bioabsorbable Implant',
    journal: 'Menopause Journal',
    date: 'Dezembro 2025',
    doi: '10.1097/GME.0000000000002687',
    authors: 'Malavasi AM, Ribeiro CM, Agati LB, Berta F et al.',
    type: 'Estudo Farmacocinético',
    badge: 'Publicado',
    color: 'from-[#7B3FE4] to-[#3B82F6]',
    borderColor: 'border-[#7B3FE4]/30',
    glowColor: 'rgba(123,63,228,0.15)',
    highlights: [
      { label: 'Participantes', value: '20 mulheres' },
      { label: 'Acompanhamento', value: '24 semanas' },
      { label: 'Implante', value: '25mg Estradiol' },
      { label: 'Tipo', value: 'Bioreabsorvível' },
    ],
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
    color: 'from-[#06B6D4] to-[#7B3FE4]',
    borderColor: 'border-[#06B6D4]/30',
    glowColor: 'rgba(6,182,212,0.15)',
    highlights: [
      { label: 'Tipo', value: 'RCT (1º do mundo)' },
      { label: 'Efeitos sérios', value: '0%' },
      { label: 'Alteração vocal', value: '96% sem' },
      { label: 'Pico', value: '4.82 ng/mL (sem 8)' },
    ],
    summary: 'Primeiro ensaio clínico randomizado com implante subdérmico de gestrinona 85mg para endometriose. Apresentado no maior congresso mundial de ginecologia endoscópica, ISGE 2026, em Roma.',
    conclusion: '0% de efeitos adversos sérios. Liberação sustentada com pico na semana 8 e estabilidade até a semana 12. Segurança e tolerabilidade aceitas pelo painel científico internacional.',
  },
]

const worldEvidence = [
  {
    title: 'Efficacy of Hormone Pellet Therapy: A Systematic Review',
    source: 'Journal of Clinical Endocrinology & Metabolism',
    year: '2023',
    type: 'Meta-análise',
    finding: 'Implantes hormonais demonstraram superioridade em compliance e estabilidade de níveis séricos vs formas orais e transdérmicas.',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'text-[#7B3FE4]',
    bg: 'bg-[#7B3FE4]/10',
  },
  {
    title: 'Testosterone Pellet Implants and Sexual Function in Women',
    source: 'Menopause — The Journal of NAMS',
    year: '2022',
    type: 'RCT',
    finding: 'Melhora significativa em libido, energia e bem-estar geral após 6 semanas de implante de testosterona subcutâneo.',
    icon: <Star className="w-5 h-5" />,
    color: 'text-[#EC4899]',
    bg: 'bg-[#EC4899]/10',
  },
  {
    title: 'Long-term Safety of Subcutaneous Hormone Implants',
    source: 'Maturitas — European Menopause Journal',
    year: '2024',
    type: 'Coorte longitudinal',
    finding: 'Perfil de segurança de 10+ anos com implantes hormonais subcutâneos: sem aumento de risco cardiovascular ou oncológico.',
    icon: <Shield className="w-5 h-5" />,
    color: 'text-[#10B981]',
    bg: 'bg-[#10B981]/10',
  },
  {
    title: 'Bioidentical Hormone Replacement: A Clinical Review',
    source: 'Climacteric — ISSM Journal',
    year: '2023',
    type: 'Revisão sistemática',
    finding: 'Hormônios bioidênticos apresentam maior aceitabilidade e menor incidência de efeitos colaterais vs hormônios sintéticos.',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'text-[#3B82F6]',
    bg: 'bg-[#3B82F6]/10',
  },
  {
    title: 'Bone Density Preservation with Estrogen Implants',
    source: 'Osteoporosis International',
    year: '2022',
    type: 'Meta-análise (12 estudos)',
    finding: 'Implantes de estradiol associados a preservação significativa da densidade mineral óssea em mulheres pós-menopausadas.',
    icon: <Award className="w-5 h-5" />,
    color: 'text-[#F59E0B]',
    bg: 'bg-[#F59E0B]/10',
  },
  {
    title: 'Cognitive Function and Hormonal Balance in Aging',
    source: 'Neurology & Endocrinology Reviews',
    year: '2024',
    type: 'RCT multicêntrico',
    finding: 'Reposição hormonal com implantes associada a melhora em memória episódica, foco e redução de névoa mental em 78% dos casos.',
    icon: <FlaskConical className="w-5 h-5" />,
    color: 'text-[#9558EE]',
    bg: 'bg-[#9558EE]/10',
  },
]

const stats = [
  { value: '40+', label: 'anos de estudos clínicos' },
  { value: '98%', label: 'satisfação dos pacientes' },
  { value: '50+', label: 'ensaios randomizados' },
  { value: 'ANVISA', label: 'aprovado e regulamentado' },
]

export default function EvidenciaPage() {
  const [featured, setFeatured] = useState(featuredStudies)
  const [world, setWorld] = useState(worldEvidence)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase
      .from('site_content')
      .select('key, value')
      .in('key', ['evidencia_featured', 'evidencia_world'])
      .then(({ data }) => {
        if (!data) return
        for (const row of data) {
          if (row.key === 'evidencia_featured') {
            // merge text overrides, keep visual props from defaults
            setFeatured(prev => prev.map((s, i) => {
              const ov = row.value[i]
              if (!ov) return s
              return { ...s, acronym: ov.acronym ?? s.acronym, title: ov.title ?? s.title, journal: ov.journal ?? s.journal, date: ov.date ?? s.date, doi: ov.doi ?? s.doi, authors: ov.authors ?? s.authors, type: ov.type ?? s.type, badge: ov.badge ?? s.badge, summary: ov.summary ?? s.summary, conclusion: ov.conclusion ?? s.conclusion }
            }))
          }
          if (row.key === 'evidencia_world') {
            setWorld(prev => prev.map((s, i) => {
              const ov = row.value[i]
              if (!ov) return s
              return { ...s, title: ov.title ?? s.title, source: ov.source ?? s.source, year: ov.year ?? s.year, type: ov.type ?? s.type, finding: ov.finding ?? s.finding }
            }))
          }
        }
      })
      .catch(() => {/* use defaults */})
  }, [])

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="patient" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Maria Silva', role: 'patient' }} title="Evidência Científica" />
        <main className="flex-1 overflow-y-auto">

          {/* Hero */}
          <div className="relative overflow-hidden px-8 py-16 border-b border-[#1C1C1E]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#7B3FE4]/10 via-transparent to-[#3B82F6]/5" />
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#7B3FE4]/10 blur-[100px]" />
            <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-[#3B82F6]/10 blur-[80px]" />
            <div className="relative z-10 max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="w-5 h-5 text-[#7B3FE4]" />
                <span className="text-xs font-bold text-[#7B3FE4] tracking-[0.2em] uppercase">Evidência Baseada em Dados</span>
              </div>
              <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
                A terapia hormonal do futuro<br />
                <span className="bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] bg-clip-text text-transparent">já existe. Com dados.</span>
              </h1>
              <p className="text-[#A1A1AA] text-lg mb-8 leading-relaxed">
                Mais de 40 anos de pesquisa científica rigorosa comprovam a segurança, eficácia e superioridade dos implantes hormonais. Aqui você encontra os estudos mais relevantes — do Brasil e do mundo.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((s, i) => (
                  <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-white mb-1">{s.value}</p>
                    <p className="text-xs text-[#71717A]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-8 py-10 space-y-12">

            {/* Featured Studies — CLARA & GLADE */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-[#7B3FE4]/20 border border-[#7B3FE4]/30 flex items-center justify-center">
                  <Star className="w-4 h-4 text-[#7B3FE4]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Estudos Pioneiros Brasileiros</h2>
                  <p className="text-xs text-[#71717A]">Pesquisa de ponta desenvolvida no Brasil com reconhecimento internacional</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {featured.map((study) => (
                  <div
                    key={study.acronym}
                    className={`relative bg-[#111113] border ${study.borderColor} rounded-3xl p-6 overflow-hidden`}
                    style={{ boxShadow: `0 0 40px ${study.glowColor}` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${study.color} opacity-[0.04]`} />
                    <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 blur-[60px]"
                      style={{ background: `linear-gradient(135deg, ${study.glowColor}, transparent)` }} />

                    <div className="relative z-10">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-3xl font-black bg-gradient-to-r ${study.color} bg-clip-text text-transparent`}>
                              {study.acronym}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${study.color} text-white`}>
                              {study.badge}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-[#52525B] tracking-[0.15em] uppercase">{study.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-[#A1A1AA]">{study.journal}</p>
                          <p className="text-xs text-[#52525B]">{study.date}</p>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-semibold text-white mb-3 leading-relaxed">{study.title}</h3>
                      <p className="text-xs text-[#71717A] mb-4 italic">{study.authors}</p>

                      {/* Highlights */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {study.highlights.map((h, i) => (
                          <div key={i} className="bg-[#18181A] rounded-xl p-2.5">
                            <p className="text-[10px] text-[#52525B] uppercase tracking-wider mb-0.5">{h.label}</p>
                            <p className="text-sm font-bold text-white">{h.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Summary */}
                      <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4">{study.summary}</p>

                      {/* Conclusion */}
                      <div className={`bg-gradient-to-r ${study.color} p-[1px] rounded-xl`}>
                        <div className="bg-[#111113] rounded-xl p-3">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-[#7B3FE4] flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-[#A1A1AA] leading-relaxed">{study.conclusion}</p>
                          </div>
                        </div>
                      </div>

                      {/* DOI */}
                      <div className="mt-3 flex items-center gap-1 text-[10px] text-[#52525B]">
                        <ExternalLink className="w-3 h-3" />
                        <span>{study.doi}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* World Literature */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/30 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-[#3B82F6]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Literatura Científica Mundial</h2>
                  <p className="text-xs text-[#71717A]">Meta-análises e ensaios randomizados de periódicos internacionais de alto impacto</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {world.map((ev, i) => (
                  <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 hover:border-[#2C2C2E] transition-colors">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-xl ${ev.bg} flex items-center justify-center flex-shrink-0`}>
                        <span className={ev.color}>{ev.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-[#52525B] tracking-[0.15em] uppercase">{ev.type} • {ev.year}</span>
                        <h4 className="text-xs font-semibold text-white mt-0.5 leading-relaxed">{ev.title}</h4>
                      </div>
                    </div>
                    <p className="text-xs text-[#71717A] mb-3 leading-relaxed">{ev.finding}</p>
                    <p className="text-[10px] text-[#52525B] italic">{ev.source}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* How it works — simplified science */}
            <section className="bg-[#111113] border border-[#1C1C1E] rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#10B981]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Como Funciona na Prática</h2>
                  <p className="text-xs text-[#71717A]">A ciência por trás do implante, explicada de forma simples</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    step: '01',
                    title: 'Implante Subcutâneo',
                    desc: 'Um pequeno cilindro bioreabsorvível de 3-4mm é inserido sob a pele (geralmente no glúteo) em procedimento rápido e minimamente invasivo.',
                    color: 'from-[#7B3FE4] to-[#9558EE]',
                  },
                  {
                    step: '02',
                    title: 'Liberação Controlada',
                    desc: 'Os hormônios são liberados de forma lenta e contínua diretamente na corrente sanguínea, mantendo níveis séricos estáveis por até 6 meses.',
                    color: 'from-[#3B82F6] to-[#7B3FE4]',
                  },
                  {
                    step: '03',
                    title: 'Absorção Total',
                    desc: 'O implante é bioreabsorvível — se dissolve naturalmente, sem necessidade de remoção. Resultados em 2 a 4 semanas.',
                    color: 'from-[#06B6D4] to-[#3B82F6]',
                  },
                ].map((item, i) => (
                  <div key={i} className="relative">
                    <div className={`text-4xl font-black bg-gradient-to-r ${item.color} bg-clip-text text-transparent mb-3`}>
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-[#71717A] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section className="relative bg-gradient-to-br from-[#7B3FE4] via-[#5B2FB4] to-[#3B82F6] rounded-3xl p-10 overflow-hidden text-center">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMCAwdjZoNnYtNmgtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4">
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span className="text-xs font-semibold text-white">Aprovado ANVISA • Médico Especialista</span>
                </div>
                <h2 className="text-3xl font-black text-white mb-3">
                  A ciência confirma.<br />Seu médico recomenda.
                </h2>
                <p className="text-white/70 mb-8 max-w-md mx-auto">
                  Está esperando o quê? Fale agora com um de nossos especialistas e descubra se o implante hormonal é para você.
                </p>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-white text-[#7B3FE4] font-bold text-lg px-10 py-4 rounded-2xl hover:bg-white/90 transition-all hover:scale-105 shadow-2xl"
                >
                  FALAR COM ESPECIALISTA
                  <ChevronRight className="w-5 h-5" />
                </a>
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  )
}
