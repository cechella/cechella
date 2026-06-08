'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Badge } from '@/components/ui/Badge'
import { MessageSquare, ThumbsUp, Eye, Plus, Users, Clock, Pin, Tag } from 'lucide-react'

const threads = [
  {
    id: 1,
    pinned: true,
    category: 'Discussão Clínica',
    categoryVariant: 'purple' as const,
    title: 'Manejo de eritrocitose em pacientes em TRT com implantes — quando suspender?',
    author: 'Dr. Marcelo Andrade',
    specialty: 'Endocrinologista',
    time: '2h atrás',
    replies: 24,
    likes: 47,
    views: 312,
    excerpt: 'Tenho observado elevação do hematócrito acima de 52% em alguns pacientes após 6 meses de implante de testosterona 200mg. Gostaria de discutir os critérios para flebotomia vs redução de dose...',
    tags: ['TRT', 'Eritrocitose', 'Complicações'],
  },
  {
    id: 2,
    category: 'Caso Clínico',
    categoryVariant: 'blue' as const,
    title: 'Paciente 58F pós-histerectomia com falha ao implante estradiol 75mg — Conduta?',
    author: 'Dra. Fernanda Costa',
    specialty: 'Ginecologista',
    time: '5h atrás',
    replies: 18,
    likes: 31,
    views: 218,
    excerpt: 'Paciente 58 anos, pós-histerectomia total há 2 anos. Inserimos implante de estradiol 75mg e após 8 semanas ainda apresenta fogachos moderados. Estradiol sérico: 42 pg/mL. Pensando em...',
    tags: ['Estradiol', 'Menopausa Cirúrgica', 'TRH'],
  },
  {
    id: 3,
    category: 'Pergunta',
    categoryVariant: 'yellow' as const,
    title: 'Intervalo ideal entre implantes de testosterona masculinos: 4 vs 6 meses?',
    author: 'Dr. Paulo Siqueira',
    specialty: 'Medicina do Esporte',
    time: '1 dia atrás',
    replies: 32,
    likes: 58,
    views: 445,
    excerpt: 'Na minha prática tenho usado 6 meses como intervalo padrão para implantes 150mg-200mg. Porém alguns pacientes relatam queda sintomática a partir de 4.5 meses...',
    tags: ['Testosterona', 'Protocolo', 'Intervalo'],
  },
  {
    id: 4,
    category: 'Compartilhamento',
    categoryVariant: 'green' as const,
    title: 'Minha experiência com 500+ inserções de implantes — Lições aprendidas',
    author: 'Dr. Roberto Figueiredo',
    specialty: 'Endocrinologista',
    time: '2 dias atrás',
    replies: 67,
    likes: 134,
    views: 1203,
    excerpt: 'Após 3 anos e mais de 500 procedimentos de inserção de implantes hormonais, quero compartilhar as principais lições que aprendi, incluindo erros que cometi no início e como evitá-los...',
    tags: ['Técnica', 'Experiência', 'Inserção'],
  },
  {
    id: 5,
    category: 'Discussão Clínica',
    categoryVariant: 'purple' as const,
    title: 'DHEA + Testosterona combinados em mulheres: evidências e protocolos',
    author: 'Dra. Camila Torres',
    specialty: 'Endocrinologista',
    time: '3 dias atrás',
    replies: 15,
    likes: 29,
    views: 189,
    excerpt: 'Tenho utilizado a combinação de DHEA oral 25mg + implante de testosterona 25mg em mulheres com baixa libido refratária. Os resultados têm sido muito promissores...',
    tags: ['DHEA', 'Testosterona Feminina', 'Libido'],
  },
]

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState('forum')

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Comunidade Médica" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Header with stats */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-emerald-400">47 médicos online agora</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#71717A]">
                <Users className="w-4 h-4" />
                <span>1.284 membros</span>
              </div>
            </div>
            <button className="flex items-center gap-2 bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(123,63,228,0.3)]">
              <Plus className="w-4 h-4" /> Nova Discussão
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {[
              { id: 'forum', label: 'Fórum' },
              { id: 'cases', label: 'Casos Clínicos' },
              { id: 'qa', label: 'Perguntas & Respostas' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#7B3FE4]/15 border-[#7B3FE4]/30 text-white'
                    : 'bg-[#111113] border-[#1C1C1E] text-[#71717A] hover:text-white hover:border-[#27272A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Threads */}
          <div className="space-y-3">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className={`bg-[#111113] border rounded-2xl p-5 hover:border-[#7B3FE4]/30 transition-all cursor-pointer group ${
                  thread.pinned ? 'border-[#7B3FE4]/20' : 'border-[#1C1C1E]'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-lg">
                    {thread.author.split(' ')[1]?.[0] || thread.author[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {thread.pinned && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                          <Pin className="w-2.5 h-2.5" /> Fixado
                        </span>
                      )}
                      <Badge variant={thread.categoryVariant} size="sm">{thread.category}</Badge>
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-[#9558EE] transition-colors leading-snug">
                      {thread.title}
                    </h3>
                    <p className="text-xs text-[#71717A] mb-2 line-clamp-2 leading-relaxed">{thread.excerpt}</p>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-[#A1A1AA]">{thread.author}</span>
                        <span className="text-xs text-[#52525B]">• {thread.specialty}</span>
                        <span className="text-xs text-[#52525B] flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {thread.time}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[#52525B]">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> {thread.replies}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" /> {thread.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {thread.views}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {thread.tags.map((tag) => (
                        <span key={tag} className="flex items-center gap-1 text-[10px] text-[#52525B] bg-[#18181A] border border-[#1C1C1E] px-2 py-0.5 rounded-full">
                          <Tag className="w-2 h-2" /> {tag}
                        </span>
                      ))}
                    </div>
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
