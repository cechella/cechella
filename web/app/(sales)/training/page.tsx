'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Badge } from '@/components/ui/Badge'
import { ProgressRing } from '@/components/ui/ProgressRing'
import {
  Zap, MessageCircle, Phone, Users, Kanban, TrendingUp,
  MessageSquare, Star, Award, ChevronRight, Play, Lock, Flame
} from 'lucide-react'

const modules = [
  {
    id: 1,
    title: 'Introdução ao Ecossistema Hormonal',
    description: 'Fundamentos do negócio, proposta de valor e posicionamento de mercado.',
    icon: <Zap className="w-5 h-5" />,
    lessons: 8,
    duration: '2h 30min',
    progress: 100,
    points: 450,
    unlocked: true,
  },
  {
    id: 2,
    title: 'Objeções e Como Superá-las',
    description: 'As 12 principais objeções de pacientes e scripts testados para cada uma.',
    icon: <MessageCircle className="w-5 h-5" />,
    lessons: 10,
    duration: '3h 00min',
    progress: 80,
    points: 320,
    unlocked: true,
  },
  {
    id: 3,
    title: 'Atendimento Consultivo de Alta Performance',
    description: 'Metodologia de vendas consultivas para serviços médicos premium.',
    icon: <Users className="w-5 h-5" />,
    lessons: 12,
    duration: '3h 45min',
    progress: 45,
    points: 180,
    unlocked: true,
  },
  {
    id: 4,
    title: 'Follow-up Estratégico',
    description: 'Sequências de follow-up que convertem sem ser invasivo.',
    icon: <Phone className="w-5 h-5" />,
    lessons: 6,
    duration: '2h 00min',
    progress: 20,
    points: 0,
    unlocked: true,
  },
  {
    id: 5,
    title: 'CRM e Gestão de Pipeline',
    description: 'Organização do funil de vendas e gestão profissional de leads.',
    icon: <Kanban className="w-5 h-5" />,
    lessons: 8,
    duration: '2h 30min',
    progress: 0,
    points: 0,
    unlocked: true,
  },
  {
    id: 6,
    title: 'Construção de Funil de Vendas',
    description: 'Criar e otimizar funis de captação digital para clínicas hormonais.',
    icon: <TrendingUp className="w-5 h-5" />,
    lessons: 10,
    duration: '3h 15min',
    progress: 0,
    points: 0,
    unlocked: false,
  },
  {
    id: 7,
    title: 'WhatsApp: Conversão e Automação',
    description: 'Técnicas de conversão via WhatsApp e fluxos automáticos de nurturing.',
    icon: <MessageSquare className="w-5 h-5" />,
    lessons: 8,
    duration: '2h 45min',
    progress: 0,
    points: 0,
    unlocked: false,
  },
  {
    id: 8,
    title: 'Pós-venda e Fidelização',
    description: 'Aumentar LTV do paciente, indicações e renovação de tratamentos.',
    icon: <Star className="w-5 h-5" />,
    lessons: 6,
    duration: '2h 00min',
    progress: 0,
    points: 0,
    unlocked: false,
  },
]

const badges = [
  { name: 'Primeiro Módulo', emoji: '🎯', earned: true },
  { name: 'Expert em Objeções', emoji: '💬', earned: true },
  { name: 'Streak 7 Dias', emoji: '🔥', earned: true },
  { name: 'Top Converter', emoji: '🏆', earned: false },
  { name: 'CRM Master', emoji: '📊', earned: false },
  { name: 'Campeão do Mês', emoji: '👑', earned: false },
]

export default function TrainingPage() {
  const totalPoints = modules.reduce((acc, m) => acc + m.points, 0)
  const level = Math.floor(totalPoints / 500) + 1
  const nextLevel = level * 500
  const levelProgress = (totalPoints % 500) / 500 * 100

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="sales" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Juliana Martins', role: 'sales' }} title="Hormone Sales Academy" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Gamification header */}
          <div className="relative bg-gradient-to-r from-[#06B6D4]/10 to-[#3B82F6]/10 border border-[#06B6D4]/20 rounded-3xl p-5 mb-6 overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#06B6D4]/8 blur-[60px]" />
            <div className="relative z-10 flex items-center justify-between gap-6 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <ProgressRing progress={levelProgress} size={72} strokeWidth={5}>
                    <div className="text-center">
                      <p className="text-lg font-black text-white leading-none">{level}</p>
                      <p className="text-[8px] text-[#7B3FE4] leading-none">nível</p>
                    </div>
                  </ProgressRing>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">Consultor Sênior</p>
                  <p className="text-sm text-[#71717A]">{totalPoints} XP • {nextLevel - totalPoints} para próximo nível</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="bg-[#111113]/80 border border-[#1C1C1E] rounded-xl px-4 py-2.5 text-center">
                  <p className="text-base font-bold text-amber-400 flex items-center gap-1 justify-center">
                    <Flame className="w-4 h-4 text-orange-400" /> 12
                  </p>
                  <p className="text-xs text-[#71717A]">streak dias</p>
                </div>
                <div className="bg-[#111113]/80 border border-[#1C1C1E] rounded-xl px-4 py-2.5 text-center">
                  <p className="text-base font-bold text-[#7B3FE4]">{badges.filter(b => b.earned).length}</p>
                  <p className="text-xs text-[#71717A]">badges</p>
                </div>
                <div className="bg-[#111113]/80 border border-[#1C1C1E] rounded-xl px-4 py-2.5 text-center">
                  <p className="text-base font-bold text-white">{modules.filter(m => m.progress === 100).length}/{modules.length}</p>
                  <p className="text-xs text-[#71717A]">módulos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider mb-3">Suas Conquistas</h3>
            <div className="flex gap-3 flex-wrap">
              {badges.map((badge) => (
                <div
                  key={badge.name}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                    badge.earned
                      ? 'bg-[#7B3FE4]/10 border-[#7B3FE4]/20'
                      : 'bg-[#18181A] border-[#1C1C1E] opacity-40'
                  }`}
                >
                  <span className="text-2xl">{badge.emoji}</span>
                  <span className="text-[10px] text-[#71717A] text-center leading-tight max-w-[60px]">{badge.name}</span>
                  {badge.earned && <span className="text-[9px] text-emerald-400 font-bold">✓ Obtido</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-[#06B6D4]" /> Módulos de Treinamento
              </h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {modules.map((module) => (
                <div
                  key={module.id}
                  className={`bg-[#111113] border rounded-2xl p-5 transition-all ${
                    module.unlocked
                      ? 'border-[#1C1C1E] hover:border-[#7B3FE4]/30 hover:-translate-y-0.5'
                      : 'border-[#1C1C1E] opacity-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        module.progress === 100
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : module.progress > 0
                          ? 'bg-[#7B3FE4]/10 border border-[#7B3FE4]/20 text-[#7B3FE4]'
                          : 'bg-[#18181A] border border-[#1C1C1E] text-[#52525B]'
                      }`}>
                        {module.unlocked ? module.icon : <Lock className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-xs text-[#71717A]">Módulo {module.id}</p>
                        <h4 className="text-sm font-semibold text-white leading-tight">{module.title}</h4>
                      </div>
                    </div>
                    {module.points > 0 && (
                      <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                        +{module.points} XP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#71717A] mb-3 leading-relaxed">{module.description}</p>
                  <div className="flex items-center justify-between text-xs text-[#52525B] mb-3">
                    <span>{module.lessons} aulas</span>
                    <span>{module.duration}</span>
                  </div>
                  <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        module.progress === 100
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6]'
                      }`}
                      style={{ width: `${module.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#71717A]">{module.progress}% concluído</span>
                    <button
                      disabled={!module.unlocked}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        !module.unlocked ? 'text-[#52525B] cursor-not-allowed' :
                        module.progress === 100 ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' :
                        module.progress > 0 ? 'text-[#7B3FE4] bg-[#7B3FE4]/10 border border-[#7B3FE4]/20 hover:bg-[#7B3FE4]/20' :
                        'bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white hover:opacity-90'
                      }`}
                    >
                      {module.progress === 100 ? '✓ Concluído' : module.progress > 0 ? <><Play className="w-3 h-3" /> Continuar</> : <><Play className="w-3 h-3" /> Iniciar</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
