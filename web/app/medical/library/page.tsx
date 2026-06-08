'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Badge } from '@/components/ui/Badge'
import { Search, Download, ExternalLink, FileText, BookOpen, Filter } from 'lucide-react'

const docTypes = ['Todos', 'PDFs', 'Artigos', 'Guidelines', 'Meta-análises', 'Protocolos']

const documents = [
  {
    id: 1,
    type: 'Guideline',
    typeVariant: 'blue' as const,
    title: 'Global Consensus Position Statement on the Use of Testosterone Therapy for Women — ISSWSH 2024',
    authors: 'Davis SR, Baber RJ, Panay N, et al.',
    year: '2024',
    hormone: 'Testosterona',
    abstract: 'Consenso internacional sobre uso de testosterona em mulheres, incluindo indicações, contraindicações, dosagem e monitoramento. Baseado em revisão sistemática de 258 estudos.',
    pages: 42,
  },
  {
    id: 2,
    type: 'Meta-análise',
    typeVariant: 'purple' as const,
    title: 'Efficacy and Safety of Subcutaneous Testosterone Implants in Hypogonadal Men',
    authors: 'Pastuszak AW, Lipshultz LI, Khera M.',
    year: '2023',
    hormone: 'Testosterona',
    abstract: 'Meta-análise de 23 estudos randomizados avaliando eficácia e segurança dos implantes subcutâneos de testosterona em homens com hipogonadismo. n=2.847.',
    pages: 18,
  },
  {
    id: 3,
    type: 'Protocolo',
    typeVariant: 'green' as const,
    title: 'Protocolo Clínico para Inserção de Implantes Hormonais — Hormone Ecosystem 2024',
    authors: 'Equipe Clínica Hormone Ecosystem',
    year: '2024',
    hormone: 'Múltiplos',
    abstract: 'Protocolo padronizado para inserção de implantes hormonais incluindo preparo do paciente, técnica cirúrgica, cuidados pós-procedimento e critérios de acompanhamento.',
    pages: 28,
  },
  {
    id: 4,
    type: 'Artigo',
    typeVariant: 'yellow' as const,
    title: 'Estradiol Implants in the Management of Menopausal Symptoms: A 5-Year Follow-Up Study',
    authors: 'Notelovitz M, Martin D, Tesar R, et al.',
    year: '2023',
    hormone: 'Estradiol',
    abstract: 'Estudo longitudinal de 5 anos avaliando eficácia dos implantes de estradiol no controle de sintomas menopausais. Análise de 412 mulheres de 45-65 anos.',
    pages: 12,
  },
  {
    id: 5,
    type: 'Guideline',
    typeVariant: 'blue' as const,
    title: 'Endocrine Society Clinical Practice Guideline: Testosterone Therapy in Men with Hypogonadism',
    authors: 'Bhasin S, Brito JP, Cunningham GR, et al.',
    year: '2022',
    hormone: 'Testosterona',
    abstract: 'Guideline da Endocrine Society com recomendações baseadas em evidências para diagnóstico e tratamento do hipogonadismo masculino.',
    pages: 56,
  },
  {
    id: 6,
    type: 'PDF',
    typeVariant: 'gray' as const,
    title: 'DHEA: Physiological and Clinical Aspects — Comprehensive Review',
    authors: 'Labrie F, Martel C, Balser J.',
    year: '2023',
    hormone: 'DHEA',
    abstract: 'Revisão abrangente da fisiologia da DHEA, seu papel como precursor hormonal, evidências clínicas de suplementação e safety profile.',
    pages: 35,
  },
  {
    id: 7,
    type: 'Meta-análise',
    typeVariant: 'purple' as const,
    title: 'Hormone Therapy and Cardiovascular Risk: Updated Systematic Review and Meta-Analysis',
    authors: 'Salpeter SR, Walsh JM, Greyber E, et al.',
    year: '2023',
    hormone: 'Múltiplos',
    abstract: 'Meta-análise atualizada sobre risco cardiovascular da TRH, analisando dados de 26 RCTs e 140.000+ pacientes com follow-up médio de 6.8 anos.',
    pages: 24,
  },
  {
    id: 8,
    type: 'Protocolo',
    typeVariant: 'green' as const,
    title: 'Protocolo de Monitoramento Laboratorial em Terapia Hormonal de Reposição',
    authors: 'Sociedade Brasileira de Endocrinologia e Metabologia',
    year: '2024',
    hormone: 'Múltiplos',
    abstract: 'Recomendações brasileiras para monitoramento laboratorial antes, durante e após terapia hormonal. Inclui timing, exames, valores de referência e ajustes de dose.',
    pages: 20,
  },
]

export default function LibraryPage() {
  const [activeType, setActiveType] = useState('Todos')
  const [search, setSearch] = useState('')

  const filtered = documents.filter(d => {
    const matchType = activeType === 'Todos' || d.type === activeType.replace(/s$/, '')
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.authors.toLowerCase().includes(search.toLowerCase()) ||
      d.abstract.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Biblioteca Científica" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Header */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                <input
                  type="text"
                  placeholder="Buscar por título, autor, hormônio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <select className="bg-[#18181A] border border-[#1C1C1E] rounded-xl py-2.5 px-3 text-sm text-[#A1A1AA] focus:outline-none focus:border-[#7B3FE4]">
                  <option value="">Todos os hormônios</option>
                  <option>Testosterona</option>
                  <option>Estradiol</option>
                  <option>DHEA</option>
                  <option>Múltiplos</option>
                </select>
                <select className="bg-[#18181A] border border-[#1C1C1E] rounded-xl py-2.5 px-3 text-sm text-[#A1A1AA] focus:outline-none focus:border-[#7B3FE4]">
                  <option value="">Todos os anos</option>
                  <option>2024</option>
                  <option>2023</option>
                  <option>2022</option>
                </select>
              </div>
            </div>
          </div>

          {/* Type tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
            {docTypes.map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`flex-shrink-0 text-sm font-medium px-4 py-2 rounded-xl border transition-all ${
                  activeType === type
                    ? 'bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white border-transparent shadow-[0_0_10px_rgba(123,63,228,0.2)]'
                    : 'bg-[#111113] border-[#1C1C1E] text-[#71717A] hover:text-white hover:border-[#27272A]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <p className="text-sm text-[#71717A] mb-4">{filtered.length} documentos encontrados</p>

          {/* Documents */}
          <div className="space-y-3">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 hover:border-[#7B3FE4]/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#18181A] border border-[#1C1C1E] flex items-center justify-center flex-shrink-0 mt-0.5">
                      {doc.type === 'PDF' || doc.type === 'Protocolo' ? (
                        <FileText className="w-5 h-5 text-[#71717A]" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-[#71717A]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant={doc.typeVariant} size="sm">{doc.type}</Badge>
                        <span className="text-xs text-[#52525B]">{doc.year}</span>
                        <span className="text-xs bg-[#7B3FE4]/10 text-[#7B3FE4] px-2 py-0.5 rounded-full border border-[#7B3FE4]/20">
                          {doc.hormone}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-[#9558EE] transition-colors leading-snug">
                        {doc.title}
                      </h3>
                      <p className="text-xs text-[#71717A] mb-2">{doc.authors}</p>
                      <p className="text-xs text-[#52525B] line-clamp-2 leading-relaxed">{doc.abstract}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button className="flex items-center gap-1.5 text-xs font-medium text-[#7B3FE4] bg-[#7B3FE4]/10 border border-[#7B3FE4]/20 px-3 py-1.5 rounded-lg hover:bg-[#7B3FE4]/20 transition-colors">
                      <Download className="w-3 h-3" /> Baixar
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-medium text-[#71717A] bg-[#18181A] border border-[#1C1C1E] px-3 py-1.5 rounded-lg hover:text-white hover:border-[#27272A] transition-colors">
                      <ExternalLink className="w-3 h-3" /> Visualizar
                    </button>
                    <span className="text-[10px] text-[#52525B] text-center">{doc.pages} pág.</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
