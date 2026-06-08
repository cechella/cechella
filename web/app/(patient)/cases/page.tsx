'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Badge } from '@/components/ui/Badge'
import { Shield, ChevronDown, ChevronUp, Filter } from 'lucide-react'

const cases = [
  {
    id: 1,
    label: 'Caso #HE-2024-001',
    age: 52,
    gender: 'F',
    hormoneType: 'Estradiol + Testosterona',
    ageGroup: '50-60',
    outcome: 'Excelente',
    complaint: 'Fogachos intensos, insônia grave, queda de libido e fadiga crônica há 18 meses. FSH: 112 mIU/mL. Estradiol: 8 pg/mL.',
    conduct: 'Implante de estradiol 50mg + testosterona 75mg. Orientações sobre estilo de vida. Retorno em 90 dias.',
    evolution: 'Remissão completa dos fogachos em 3 semanas. Melhora significativa do sono. Libido normalizada em 45 dias. Paciente relata qualidade de vida excelente no retorno de 90 dias.',
    tags: ['Menopausa', 'TRH', 'Implante Combinado'],
  },
  {
    id: 2,
    label: 'Caso #HE-2024-002',
    age: 48,
    gender: 'M',
    hormoneType: 'Testosterona',
    ageGroup: '40-50',
    outcome: 'Muito Bom',
    complaint: 'Queda de libido, disfunção erétil, ganho de gordura abdominal, irritabilidade. Testosterona total: 280 ng/dL.',
    conduct: 'Implante de testosterona 150mg. Orientações dietéticas. Programa de exercícios resistidos.',
    evolution: 'Testosterona atingiu 720 ng/dL em 45 dias. Melhora significativa da função erétil e libido. Perda de 4kg de gordura em 90 dias. Humor estabilizado.',
    tags: ['Andropausa', 'TRT', 'Testosterona'],
  },
  {
    id: 3,
    label: 'Caso #HE-2024-003',
    age: 38,
    gender: 'F',
    hormoneType: 'Testosterona',
    ageGroup: '30-40',
    outcome: 'Bom',
    complaint: 'Baixa libido, fadiga persistente, dificuldade de concentração, anedonia. Testosterona livre: 0.4 pg/mL (ref: 0.6-3.8).',
    conduct: 'Implante de testosterona 25mg (dose feminina). Suplementação de vitamina D. Acompanhamento mensal.',
    evolution: 'Melhora gradual em 60 dias. Libido normalizada. Energia significativamente melhor. Paciente retomou atividades físicas regulares.',
    tags: ['Saúde Feminina', 'Testosterona Feminina', 'Baixa Libido'],
  },
  {
    id: 4,
    label: 'Caso #HE-2024-004',
    age: 55,
    gender: 'M',
    hormoneType: 'Testosterona + DHEA',
    ageGroup: '50-60',
    outcome: 'Excelente',
    complaint: 'Sarcopenia progressiva, osteopenia, fadiga muscular, depressão leve. Testosterona: 210 ng/dL. DHEA-S: 85 mcg/dL.',
    conduct: 'Implante testosterona 200mg + suplementação oral DHEA 25mg/dia. Programa de musculação supervisionado.',
    evolution: 'Aumento de massa muscular visível em 3 meses. Densitometria óssea melhorou 4.2% em 6 meses. Humor e vitalidade excelentes. Paciente relata se sentir 10 anos mais jovem.',
    tags: ['Andropausa', 'Sarcopenia', 'DHEA', 'Saúde Óssea'],
  },
  {
    id: 5,
    label: 'Caso #HE-2024-005',
    age: 44,
    gender: 'F',
    hormoneType: 'Estradiol',
    ageGroup: '40-50',
    outcome: 'Muito Bom',
    complaint: 'Menopausa cirúrgica pós-histerectomia. Fogachos severos, ressecamento vaginal, instabilidade emocional intensa.',
    conduct: 'Implante estradiol 75mg. Estrogênio tópico vaginal. Suporte psicológico recomendado.',
    evolution: 'Remissão dos fogachos em 2 semanas. Ressecamento vaginal em resolução com tópico. Humor significativamente melhorado. Qualidade de vida restaurada.',
    tags: ['Menopausa Cirúrgica', 'Estradiol', 'Saúde Feminina'],
  },
  {
    id: 6,
    label: 'Caso #HE-2024-006',
    age: 62,
    gender: 'M',
    hormoneType: 'Testosterona',
    ageGroup: '60+',
    outcome: 'Bom',
    complaint: 'Perda de massa muscular, fraqueza, depressão, disfunção cognitiva leve. Testosterona: 190 ng/dL.',
    conduct: 'Implante testosterona 100mg (dose ajustada pela idade). Monitoramento cardíaco. Fisioterapia motora.',
    evolution: 'Melhora gradual em 4 meses. Força muscular aumentou 30%. Cognição melhorada. Sem eventos adversos cardiovasculares.',
    tags: ['Andropausa Tardia', 'Cognição', 'Sarcopenia'],
  },
]

const outcomeColors: Record<string, 'green' | 'blue' | 'yellow'> = {
  'Excelente': 'green',
  'Muito Bom': 'blue',
  'Bom': 'yellow',
}

const filters = {
  hormone: ['Todos', 'Estradiol', 'Testosterona', 'DHEA', 'Combinado'],
  outcome: ['Todos', 'Excelente', 'Muito Bom', 'Bom'],
  ageGroup: ['Todos', '30-40', '40-50', '50-60', '60+'],
}

export default function CasesPage() {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [hormoneFilter, setHormoneFilter] = useState('Todos')
  const [outcomeFilter, setOutcomeFilter] = useState('Todos')

  const filtered = cases.filter(c => {
    const matchH = hormoneFilter === 'Todos' || c.hormoneType.includes(hormoneFilter)
    const matchO = outcomeFilter === 'Todos' || c.outcome === outcomeFilter
    return matchH && matchO
  })

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="patient" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Maria Silva', role: 'patient' }} title="Casos Clínicos" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* LGPD Notice */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 mb-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Privacidade e Proteção de Dados</h3>
              <p className="text-sm text-[#71717A] leading-relaxed">
                Todos os casos clínicos apresentados nesta seção têm <strong className="text-[#A1A1AA]">identidades completamente anonimizadas</strong> em conformidade com a{' '}
                <strong className="text-emerald-400">LGPD (Lei Geral de Proteção de Dados)</strong> e as resoluções do{' '}
                <strong className="text-emerald-400">CFM (Conselho Federal de Medicina)</strong>. Nenhuma informação pessoal identificável é exibida.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#71717A]" />
              <span className="text-sm text-[#71717A]">Filtrar por:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {filters.hormone.map((f) => (
                <button
                  key={f}
                  onClick={() => setHormoneFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                    hormoneFilter === f
                      ? 'bg-[#7B3FE4]/20 border border-[#7B3FE4]/40 text-[#9558EE]'
                      : 'bg-[#111113] border border-[#1C1C1E] text-[#71717A] hover:border-[#27272A] hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {filters.outcome.map((f) => (
                <button
                  key={f}
                  onClick={() => setOutcomeFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                    outcomeFilter === f
                      ? 'bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#60A5FA]'
                      : 'bg-[#111113] border border-[#1C1C1E] text-[#71717A] hover:border-[#27272A] hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Cases */}
          <div className="space-y-4">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden hover:border-[#27272A] transition-all"
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#18181A] border border-[#1C1C1E] flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">{c.gender === 'F' ? '👩' : '👨'}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-[#71717A]">{c.label}</span>
                          <Badge variant={outcomeColors[c.outcome] || 'gray'}>{c.outcome}</Badge>
                        </div>
                        <p className="font-semibold text-white text-sm">
                          Paciente Anônimo(a) • {c.age} anos • Sexo {c.gender === 'F' ? 'Feminino' : 'Masculino'}
                        </p>
                        <p className="text-xs text-[#71717A] mt-0.5">Protocolo: {c.hormoneType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="hidden sm:flex gap-1 flex-wrap justify-end max-w-[200px]">
                        {c.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="gray" size="sm">{tag}</Badge>
                        ))}
                      </div>
                      {expanded === c.id ? <ChevronUp className="w-4 h-4 text-[#71717A]" /> : <ChevronDown className="w-4 h-4 text-[#71717A]" />}
                    </div>
                  </div>
                </div>

                {expanded === c.id && (
                  <div className="border-t border-[#1C1C1E] p-5 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Queixa Principal</h4>
                      <p className="text-sm text-[#71717A] leading-relaxed">{c.complaint}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Conduta Adotada</h4>
                      <p className="text-sm text-[#71717A] leading-relaxed">{c.conduct}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Evolução Clínica</h4>
                      <p className="text-sm text-emerald-400/80 leading-relaxed">{c.evolution}</p>
                    </div>
                    <div className="flex gap-1 flex-wrap pt-1 border-t border-[#1C1C1E]">
                      {c.tags.map((tag) => (
                        <Badge key={tag} variant="gray" size="sm">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
