'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Badge } from '@/components/ui/Badge'
import { Search, Clock, ArrowRight, Bookmark, TrendingUp } from 'lucide-react'

const categories = ['Todos', 'Implantes Hormonais', 'Menopausa', 'Andropausa', 'Performance', 'Libido', 'Saúde Feminina', 'Nutrição', 'Exercício']

const articles = [
  {
    id: 1,
    category: 'Implantes Hormonais',
    categoryVariant: 'purple' as const,
    title: 'Tudo que você precisa saber sobre implantes hormonais de testosterona',
    excerpt: 'Os implantes hormonais de testosterona representam uma revolução na medicina regenerativa. Neste artigo completo, exploramos mecanismo de ação, indicações, contraindicações e resultados clínicos.',
    readTime: '8 min',
    date: '15 Jun 2024',
    featured: true,
  },
  {
    id: 2,
    category: 'Menopausa',
    categoryVariant: 'blue' as const,
    title: 'Menopausa e qualidade de vida: como a TRH transforma o bem-estar',
    excerpt: 'Estudos recentes demonstram que a Terapia de Reposição Hormonal (TRH) pode melhorar significativamente a qualidade de vida de mulheres na menopausa.',
    readTime: '6 min',
    date: '12 Jun 2024',
  },
  {
    id: 3,
    category: 'Performance',
    categoryVariant: 'yellow' as const,
    title: 'O papel do GH na recuperação muscular e longevidade',
    excerpt: 'O Hormônio do Crescimento (GH) é fundamental para a recuperação muscular, saúde óssea e metabolismo. Entenda como otimizar seus níveis.',
    readTime: '5 min',
    date: '10 Jun 2024',
  },
  {
    id: 4,
    category: 'Andropausa',
    categoryVariant: 'blue' as const,
    title: 'Sinais de deficiência de testosterona que muitos homens ignoram',
    excerpt: 'A deficiência de testosterona afeta milhões de homens, mas muitos não reconhecem os sintomas. Aprenda a identificar os sinais precoces.',
    readTime: '7 min',
    date: '8 Jun 2024',
  },
  {
    id: 5,
    category: 'Libido',
    categoryVariant: 'purple' as const,
    title: 'Hormônios e desejo sexual: a conexão que você precisa entender',
    excerpt: 'O desejo sexual é regulado por um complexo sistema hormonal. Descubra como o equilíbrio hormonal influencia diretamente sua vida íntima.',
    readTime: '4 min',
    date: '5 Jun 2024',
  },
  {
    id: 6,
    category: 'Saúde Feminina',
    categoryVariant: 'green' as const,
    title: 'DHEA na mulher: benefícios além da libido',
    excerpt: 'A DHEA é um hormônio precursor com múltiplos benefícios para a saúde feminina. Conheça seu papel no bem-estar geral e como a suplementação pode ajudar.',
    readTime: '6 min',
    date: '2 Jun 2024',
  },
  {
    id: 7,
    category: 'Nutrição',
    categoryVariant: 'gray' as const,
    title: 'Alimentação e saúde hormonal: o que comer para equilibrar seus hormônios',
    excerpt: 'A dieta tem impacto direto na produção e equilíbrio hormonal. Descubra os alimentos que favorecem sua saúde hormonal.',
    readTime: '9 min',
    date: '1 Jun 2024',
  },
  {
    id: 8,
    category: 'Exercício',
    categoryVariant: 'green' as const,
    title: 'Treino de força e otimização hormonal natural',
    excerpt: 'O exercício de resistência é um dos mais potentes moduladores hormonais disponíveis. Aprenda como estruturar seus treinos para maximizar os benefícios.',
    readTime: '7 min',
    date: '28 Mai 2024',
  },
]

export default function ContentPage() {
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [search, setSearch] = useState('')

  const featured = articles[0]
  const filtered = articles.filter(a => {
    const matchCat = activeCategory === 'Todos' || a.category === activeCategory
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.excerpt.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  }).slice(1)

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="patient" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Maria Silva', role: 'patient' }} title="Conteúdo Educativo" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Featured Article */}
          <div className="relative bg-gradient-to-r from-[#7B3FE4]/20 to-[#3B82F6]/10 border border-[#7B3FE4]/20 rounded-3xl p-8 mb-8 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#7B3FE4]/10 blur-[80px]" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-[#7B3FE4]" />
                <span className="text-xs font-bold text-[#7B3FE4] uppercase tracking-wider">Artigo em Destaque</span>
              </div>
              <Badge variant="purple" className="mb-3">{featured.category}</Badge>
              <h2 className="text-2xl font-bold text-white mb-3 max-w-2xl leading-tight">{featured.title}</h2>
              <p className="text-[#A1A1AA] text-sm mb-4 max-w-xl leading-relaxed">{featured.excerpt}</p>
              <div className="flex items-center gap-4">
                <button className="bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity">
                  Ler artigo <ArrowRight className="w-4 h-4" />
                </button>
                <span className="text-xs text-[#71717A] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {featured.readTime} de leitura
                </span>
                <span className="text-xs text-[#52525B]">{featured.date}</span>
              </div>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
              <input
                type="text"
                placeholder="Buscar artigos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#111113] border border-[#1C1C1E] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
              />
            </div>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white shadow-[0_0_10px_rgba(123,63,228,0.3)]'
                    : 'bg-[#111113] border border-[#1C1C1E] text-[#71717A] hover:text-white hover:border-[#27272A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Articles Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((article) => (
              <article
                key={article.id}
                className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 hover:border-[#7B3FE4]/30 transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_24px_rgba(0,0,0,0.3)] group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge variant={article.categoryVariant}>{article.category}</Badge>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Bookmark className="w-4 h-4 text-[#71717A] hover:text-[#7B3FE4] transition-colors" />
                  </button>
                </div>
                <h3 className="font-semibold text-white mb-2 leading-tight group-hover:text-[#9558EE] transition-colors line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-xs text-[#71717A] leading-relaxed mb-4 line-clamp-3">{article.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-[#52525B]">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {article.readTime}</span>
                    <span>{article.date}</span>
                  </div>
                  <button className="text-xs text-[#7B3FE4] hover:text-[#9558EE] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    Ler <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
