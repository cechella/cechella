'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Play, FileText, GraduationCap, BookOpen, Upload, Edit, Trash2, Eye, MoreHorizontal } from 'lucide-react'

const tabs = [
  { id: 'videos', label: 'Vídeos', icon: <Play className="w-4 h-4" /> },
  { id: 'pdfs', label: 'PDFs', icon: <FileText className="w-4 h-4" /> },
  { id: 'courses', label: 'Cursos', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'articles', label: 'Artigos', icon: <BookOpen className="w-4 h-4" /> },
]

const videos = [
  { id: 1, title: 'O que são Implantes Hormonais?', category: 'Implantes', status: 'Publicado', views: 2847, duration: '15:22', date: '10 Jun 2024' },
  { id: 2, title: 'Menopausa: Sintomas e Tratamentos', category: 'Menopausa', status: 'Publicado', views: 1923, duration: '24:15', date: '8 Jun 2024' },
  { id: 3, title: 'Técnica de Inserção do Implante Femoral', category: 'Procedimento', status: 'Publicado', views: 1456, duration: '31:08', date: '5 Jun 2024' },
  { id: 4, title: 'TRT: Guia Completo para Médicos', category: 'Formação', status: 'Rascunho', views: 0, duration: '48:30', date: 'Hoje' },
  { id: 5, title: 'Andropausa: Diagnóstico e Manejo', category: 'Andropausa', status: 'Publicado', views: 1102, duration: '28:44', date: '1 Jun 2024' },
  { id: 6, title: 'Performance e Hormônios', category: 'Performance', status: 'Agendado', views: 0, duration: '33:20', date: '20 Jun 2024' },
]

const pdfs = [
  { id: 1, title: 'Guideline TRT 2024 — ISSM', category: 'Guideline', status: 'Publicado', downloads: 342, size: '2.4 MB', date: '1 Jun 2024' },
  { id: 2, title: 'Protocolo de Inserção de Implantes', category: 'Protocolo', status: 'Publicado', downloads: 284, size: '1.8 MB', date: '15 Mai 2024' },
  { id: 3, title: 'Meta-análise TRT Cardiovascular 2023', category: 'Meta-análise', status: 'Publicado', downloads: 198, size: '3.1 MB', date: '10 Mai 2024' },
]

const statusColors: Record<string, string> = {
  'Publicado': 'bg-emerald-500/10 text-emerald-400',
  'Rascunho': 'bg-[#27272A] text-[#71717A]',
  'Agendado': 'bg-amber-500/10 text-amber-400',
}

function ContentTable({ items, columns }: { items: any[]; columns: string[] }) {
  return (
    <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1C1C1E] bg-[#18181A]">
              {columns.map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-medium text-[#52525B] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[#1C1C1E]/50 last:border-0 hover:bg-[#18181A]/50 transition-colors group">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-7 rounded-lg bg-gradient-to-br from-[#7B3FE4]/20 to-[#3B82F6]/20 flex items-center justify-center flex-shrink-0">
                      <Play className="w-3 h-3 text-[#7B3FE4]" />
                    </div>
                    <span className="text-sm font-medium text-white line-clamp-1">{item.title}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-xs bg-[#18181A] border border-[#1C1C1E] text-[#71717A] px-2 py-0.5 rounded-full">{item.category}</span>
                </td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[item.status]}`}>{item.status}</span>
                </td>
                <td className="px-5 py-4 text-sm text-[#71717A]">{item.views?.toLocaleString('pt-BR') || item.downloads?.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-4 text-sm text-[#71717A]">{item.duration || item.size}</td>
                <td className="px-5 py-4 text-sm text-[#52525B]">{item.date}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-7 h-7 rounded-lg hover:bg-[#18181A] flex items-center justify-center text-[#71717A] hover:text-[#7B3FE4] transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button className="w-7 h-7 rounded-lg hover:bg-[#18181A] flex items-center justify-center text-[#71717A] hover:text-white transition-colors">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-[#71717A] hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState('videos')

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin Master', role: 'admin' }} title="Gestão de Conteúdo" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Vídeos', value: '147', icon: <Play className="w-4 h-4" /> },
              { label: 'PDFs', value: '84', icon: <FileText className="w-4 h-4" /> },
              { label: 'Cursos', value: '8', icon: <GraduationCap className="w-4 h-4" /> },
              { label: 'Artigos', value: '213', icon: <BookOpen className="w-4 h-4" /> },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#7B3FE4]/10 border border-[#7B3FE4]/20 flex items-center justify-center text-[#7B3FE4]">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-[#71717A]">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs + upload button */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#7B3FE4]/15 border-[#7B3FE4]/30 text-white'
                      : 'bg-[#111113] border-[#1C1C1E] text-[#71717A] hover:text-white hover:border-[#27272A]'
                  }`}
                >
                  <span className={activeTab === tab.id ? 'text-[#7B3FE4]' : ''}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
            <Button variant="primary" leftIcon={<Upload className="w-4 h-4" />} size="md">
              Fazer Upload
            </Button>
          </div>

          {activeTab === 'videos' && (
            <ContentTable
              items={videos}
              columns={['Título', 'Categoria', 'Status', 'Visualizações', 'Duração', 'Data', 'Ações']}
            />
          )}
          {activeTab === 'pdfs' && (
            <ContentTable
              items={pdfs}
              columns={['Título', 'Categoria', 'Status', 'Downloads', 'Tamanho', 'Data', 'Ações']}
            />
          )}
          {activeTab !== 'videos' && activeTab !== 'pdfs' && (
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-12 text-center">
              <p className="text-[#71717A]">Conteúdo de {tabs.find(t => t.id === activeTab)?.label} disponível em breve.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
