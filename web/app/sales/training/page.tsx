'use client'

import { useState } from 'react'
import { Zap, MessageCircle, Phone, Users, Kanban, TrendingUp, MessageSquare, Star, Award, Play, Lock, Flame } from 'lucide-react'

const modules = [
  { id: 1, title: 'Introdução ao Ecossistema Hormonal', description: 'Fundamentos do negócio, proposta de valor e posicionamento de mercado.', icon: <Zap className="w-4 h-4" />, lessons: 8, duration: '2h 30min', progress: 100, points: 450, unlocked: true },
  { id: 2, title: 'Objeções e Como Superá-las', description: 'As 12 principais objeções de pacientes e scripts testados para cada uma.', icon: <MessageCircle className="w-4 h-4" />, lessons: 10, duration: '3h 00min', progress: 80, points: 320, unlocked: true },
  { id: 3, title: 'Atendimento Consultivo de Alta Performance', description: 'Metodologia de vendas consultivas para serviços médicos premium.', icon: <Users className="w-4 h-4" />, lessons: 12, duration: '3h 45min', progress: 45, points: 180, unlocked: true },
  { id: 4, title: 'Follow-up Estratégico', description: 'Sequências de follow-up que convertem sem ser invasivo.', icon: <Phone className="w-4 h-4" />, lessons: 6, duration: '2h 00min', progress: 20, points: 0, unlocked: true },
  { id: 5, title: 'CRM e Gestão de Pipeline', description: 'Organização do funil de vendas e gestão profissional de leads.', icon: <Kanban className="w-4 h-4" />, lessons: 8, duration: '2h 30min', progress: 0, points: 0, unlocked: true },
  { id: 6, title: 'Construção de Funil de Vendas', description: 'Criar e otimizar funis de captação digital para clínicas hormonais.', icon: <TrendingUp className="w-4 h-4" />, lessons: 10, duration: '3h 15min', progress: 0, points: 0, unlocked: true },
  { id: 7, title: 'WhatsApp: Conversão e Automação', description: 'Técnicas de conversão via WhatsApp e fluxos automáticos de nurturing.', icon: <MessageSquare className="w-4 h-4" />, lessons: 8, duration: '2h 45min', progress: 0, points: 0, unlocked: false },
  { id: 8, title: 'Pós-venda e Fidelização', description: 'Aumentar LTV do paciente, indicações e renovação de tratamentos.', icon: <Star className="w-4 h-4" />, lessons: 6, duration: '2h 00min', progress: 0, points: 0, unlocked: false },
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
    <>
      {/* XP Header */}
      <div className="bg-gradient-to-r from-[#7C3AED]/08 to-[#06B6D4]/06 border border-[#7C3AED]/15 rounded-2xl p-4 mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Progress ring */}
          <div className="relative w-[56px] h-[56px] flex-shrink-0">
            <svg width="56" height="56" viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
              <circle cx="28" cy="28" r="23" fill="none" stroke="#27272A" strokeWidth="4.5" />
              <circle cx="28" cy="28" r="23" fill="none" stroke="url(#xpg)" strokeWidth="4.5"
                strokeDasharray={`${2 * Math.PI * 23}`}
                strokeDashoffset={`${2 * Math.PI * 23 * (1 - levelProgress / 100)}`}
                strokeLinecap="round" />
              <defs>
                <linearGradient id="xpg" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7C3AED" /><stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[17px] font-black text-[#FAFAFA] leading-none">{level}</span>
              <span className="text-[7px] font-semibold text-[#7C3AED] uppercase tracking-[.5px]">nív</span>
            </div>
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#FAFAFA]">Consultor Sênior</p>
            <p className="text-[12px] text-[#71717A] mt-0.5">{totalPoints} XP · {nextLevel - totalPoints} para nível {level + 1}</p>
            <div className="mt-1.5 h-1 w-44 bg-[#27272A] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4]" style={{ width: `${levelProgress}%` }} />
            </div>
          </div>
        </div>
        <div className="flex gap-2.5">
          {[
            { value: <><Flame className="w-3.5 h-3.5 text-orange-400 inline" /> 12</>, label: 'streak dias', color: 'text-[#F59E0B]' },
            { value: badges.filter(b => b.earned).length, label: 'badges', color: 'text-[#A78BFA]' },
            { value: `${modules.filter(m => m.progress === 100).length}/${modules.length}`, label: 'módulos', color: 'text-[#FAFAFA]' },
          ].map((s, i) => (
            <div key={i} className="bg-white/04 border border-[#27272A] rounded-xl px-3.5 py-2 text-center min-w-[60px]">
              <p className={`text-[15px] font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-[#71717A]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Badges */}
      <div className="bg-[#111113] border border-[#27272A] rounded-xl p-4 mb-4">
        <p className="text-[11px] font-semibold text-[#71717A] uppercase tracking-[.6px] mb-3">Suas Conquistas</p>
        <div className="flex gap-2 flex-wrap">
          {badges.map(b => (
            <div key={b.name} className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border transition-all ${
              b.earned ? 'bg-[#7C3AED]/08 border-[#7C3AED]/20' : 'bg-[#18181B] border-[#27272A] opacity-40'
            }`}>
              <span className="text-[22px]">{b.emoji}</span>
              <span className="text-[9px] text-[#71717A] text-center leading-tight max-w-[58px]">{b.name}</span>
              {b.earned && <span className="text-[8px] text-[#10B981] font-bold">✓ Obtido</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Modules */}
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-4 h-4 text-[#06B6D4]" />
        <span className="text-[12px] font-semibold text-[#71717A] uppercase tracking-[.6px]">Módulos de Treinamento</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {modules.map(m => (
          <div key={m.id}
            className={`bg-[#111113] border rounded-xl p-4 transition-all ${
              m.unlocked ? 'border-[#27272A] hover:border-[#3F3F46] hover:-translate-y-px cursor-pointer' : 'border-[#27272A] opacity-50 cursor-not-allowed'
            }`}>
            <div className="flex items-start justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  m.progress === 100 ? 'bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981]'
                  : m.progress > 0 ? 'bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#A78BFA]'
                  : 'bg-[#18181B] border border-[#27272A] text-[#52525B]'
                }`}>
                  {m.unlocked ? m.icon : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-[10px] text-[#71717A]">Módulo {m.id}</p>
                  <p className="text-[13px] font-semibold text-[#FAFAFA] leading-tight">{m.title}</p>
                </div>
              </div>
              {m.points > 0 && (
                <span className="text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-full px-2 py-0.5 flex-shrink-0">
                  +{m.points} XP
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#71717A] mb-2.5 leading-relaxed">{m.description}</p>
            <div className="flex items-center justify-between text-[10px] text-[#52525B] mb-2">
              <span>{m.lessons} aulas</span><span>{m.duration}</span>
            </div>
            <div className="h-[3px] bg-[#1C1C1E] rounded-full overflow-hidden mb-2.5">
              <div className={`h-full rounded-full transition-all duration-700 ${m.progress === 100 ? 'bg-[#10B981]' : 'bg-gradient-to-r from-[#7C3AED] to-[#06B6D4]'}`}
                style={{ width: `${m.progress}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#71717A]">{m.progress}% concluído</span>
              <button disabled={!m.unlocked} className={`flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all ${
                !m.unlocked ? 'text-[#52525B] cursor-not-allowed' :
                m.progress === 100 ? 'text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20' :
                m.progress > 0 ? 'text-[#A78BFA] bg-[#7C3AED]/10 border border-[#7C3AED]/20 hover:bg-[#7C3AED]/20' :
                'bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white hover:opacity-90'
              }`}>
                {m.progress === 100 ? '✓ Concluído' : m.progress > 0 ? <><Play className="w-3 h-3" /> Continuar</> : m.unlocked ? <><Play className="w-3 h-3" /> Iniciar</> : '🔒 Bloqueado'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
