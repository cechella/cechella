'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  CalendarDays, Play, Lock, CheckCircle2, Clock, Download,
  ChevronRight, Star, BookOpen, Video, FileText, Mic,
  Trophy, Target, TrendingUp, Users
} from 'lucide-react'

const months = [
  {
    month: 1, title: 'Fundação do Negócio Hormonal',
    sessions: [
      { id: 1, title: 'Kickoff: Diagnóstico do seu consultório atual', type: 'live', duration: '2h', done: true, date: '2024-01-15' },
      { id: 2, title: 'Posicionamento e nicho hormonal', type: 'video', duration: '1h 20min', done: true, date: '2024-01-22' },
      { id: 3, title: 'Estrutura jurídica e compliance CFM', type: 'video', duration: '45min', done: true, date: '2024-01-29' },
    ]
  },
  {
    month: 2, title: 'Protocolo Clínico de Elite',
    sessions: [
      { id: 4, title: 'TRT Masculina: protocolo avançado Vinícius', type: 'live', duration: '2h 30min', done: true, date: '2024-02-12' },
      { id: 5, title: 'TRH Feminina: estradiol + testosterona + DHEA', type: 'video', duration: '1h 45min', done: true, date: '2024-02-19' },
      { id: 6, title: 'Implantes Pellet: técnica e dosimetria', type: 'live', duration: '3h', done: false, date: '2024-02-26' },
    ]
  },
  {
    month: 3, title: 'Aquisição de Pacientes com IA',
    sessions: [
      { id: 7, title: 'ANA: como configurar seu agente de vendas', type: 'live', duration: '2h', done: false, date: '2024-03-11' },
      { id: 8, title: 'Funil consultivo high ticket para médicos', type: 'video', duration: '1h 30min', done: false, date: '2024-03-18' },
      { id: 9, title: 'WhatsApp Business API + automação', type: 'video', duration: '1h', done: false, date: '2024-03-25' },
    ]
  },
  {
    month: 4, title: 'Escala e Multiplicação de Receita',
    sessions: [
      { id: 10, title: 'Precificação high ticket: do R$800 ao R$8.000', type: 'live', duration: '2h', done: false, date: '2024-04-08' },
      { id: 11, title: 'Time de apoio e delegação eficiente', type: 'video', duration: '1h 15min', done: false, date: '2024-04-15' },
      { id: 12, title: 'Segundo consultório: expansão geográfica', type: 'video', duration: '1h', done: false, date: '2024-04-22' },
    ]
  },
]

const nextSession = {
  title: 'Implantes Pellet: técnica e dosimetria',
  date: 'Ter, 26 Fev · 19h00',
  mentor: 'Dr. Vinícius Cechella',
  type: 'Sessão ao Vivo',
  link: 'https://meet.google.com',
}

const milestones = [
  { label: 'Primeiro paciente hormonal fechado', done: true },
  { label: 'Protocolo TRT implementado', done: true },
  { label: 'ANA configurada e ativa', done: false },
  { label: 'R$50k/mês de faturamento hormonal', done: false },
  { label: 'R$100k/mês conquistado', done: false },
  { label: 'Segundo consultório aberto', done: false },
]

export default function MentoriaPage() {
  const [activeMonth, setActiveMonth] = useState(1)
  const totalSessions = months.flatMap(m => m.sessions).length
  const doneSessions = months.flatMap(m => m.sessions).filter(s => s.done).length

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Minha Mentoria" />
        <main className="flex-1 overflow-y-auto px-6 py-6">

          {/* Hero card */}
          <div className="relative bg-gradient-to-r from-[#3B82F6]/15 to-[#7B3FE4]/15 border border-[#3B82F6]/25 rounded-3xl p-6 mb-6 overflow-hidden">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#7B3FE4]/10 blur-[60px]" />
            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Mentoria Ativa — Plano 12 Meses</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">Hormone Business Mentoring</h2>
                <p className="text-sm text-[#71717A]">Mentorado por Dr. Vinícius Cechella · Turma Jan/2024</p>
              </div>
              <div className="flex gap-3">
                {[
                  { label: 'Sessões', value: `${doneSessions}/${totalSessions}` },
                  { label: 'Progresso', value: `${Math.round((doneSessions / totalSessions) * 100)}%` },
                  { label: 'Mês', value: `${activeMonth}/12` },
                ].map(s => (
                  <div key={s.label} className="bg-[#111113]/80 border border-[#1C1C1E] rounded-2xl px-4 py-3 text-center min-w-[70px]">
                    <p className="text-lg font-bold text-white">{s.value}</p>
                    <p className="text-[10px] text-[#71717A]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Progress bar */}
            <div className="relative z-10 mt-5">
              <div className="h-2 bg-[#1C1C1E] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#7B3FE4] transition-all duration-700"
                  style={{ width: `${Math.round((doneSessions / totalSessions) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: month tabs + sessions */}
            <div className="lg:col-span-2 space-y-5">

              {/* Next session CTA */}
              <div className="bg-[#111113] border border-[#7B3FE4]/30 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(123,63,228,0.3)]">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[#7B3FE4] uppercase tracking-wider">{nextSession.type}</span>
                      <h3 className="font-semibold text-white text-sm">{nextSession.title}</h3>
                      <p className="text-xs text-[#71717A] mt-0.5">{nextSession.date} · {nextSession.mentor}</p>
                    </div>
                  </div>
                  <a
                    href={nextSession.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 flex items-center gap-2 bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(123,63,228,0.3)]"
                  >
                    Entrar <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Month tabs */}
              <div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
                  {months.map(m => {
                    const done = m.sessions.filter(s => s.done).length
                    const total = m.sessions.length
                    const pct = Math.round((done / total) * 100)
                    return (
                      <button
                        key={m.month}
                        onClick={() => setActiveMonth(m.month)}
                        className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          activeMonth === m.month
                            ? 'bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white border-transparent shadow-[0_0_10px_rgba(123,63,228,0.2)]'
                            : 'bg-[#111113] border-[#1C1C1E] text-[#71717A] hover:text-white hover:border-[#27272A]'
                        }`}
                      >
                        Mês {m.month} <span className="ml-1 text-xs opacity-70">{pct}%</span>
                      </button>
                    )
                  })}
                </div>

                {months.filter(m => m.month === activeMonth).map(m => (
                  <div key={m.month}>
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#3B82F6]" />
                      {m.title}
                    </h3>
                    <div className="space-y-2">
                      {m.sessions.map(session => (
                        <div
                          key={session.id}
                          className={`bg-[#111113] border rounded-2xl p-4 flex items-center gap-4 transition-all group ${
                            session.done
                              ? 'border-[#1C1C1E] opacity-70'
                              : 'border-[#1C1C1E] hover:border-[#7B3FE4]/30'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            session.done ? 'bg-emerald-500/15' : 'bg-[#18181A]'
                          }`}>
                            {session.done
                              ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              : session.type === 'live'
                                ? <Video className="w-5 h-5 text-[#3B82F6]" />
                                : <Play className="w-5 h-5 text-[#7B3FE4]" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-white group-hover:text-[#9558EE] transition-colors">{session.title}</h4>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                                session.type === 'live' ? 'text-[#3B82F6]' : 'text-[#7B3FE4]'
                              }`}>{session.type === 'live' ? 'Ao Vivo' : 'Gravação'}</span>
                              <span className="text-[10px] text-[#52525B] flex items-center gap-1">
                                <Clock className="w-3 h-3" />{session.duration}
                              </span>
                              <span className="text-[10px] text-[#52525B]">{session.date}</span>
                            </div>
                          </div>
                          {session.done ? (
                            <button className="flex-shrink-0 flex items-center gap-1.5 text-xs text-[#71717A] bg-[#18181A] border border-[#1C1C1E] px-3 py-1.5 rounded-lg hover:text-white transition-colors">
                              <Play className="w-3 h-3" /> Rever
                            </button>
                          ) : (
                            <div className="flex-shrink-0">
                              <Lock className="w-4 h-4 text-[#52525B]" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">

              {/* Milestones */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" /> Marcos da Jornada
                </h3>
                <div className="space-y-2.5">
                  {milestones.map((m, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        m.done ? 'bg-emerald-500/20' : 'bg-[#18181A] border border-[#27272A]'
                      }`}>
                        {m.done && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <p className={`text-xs ${m.done ? 'text-[#A1A1AA] line-through' : 'text-[#71717A]'}`}>{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resources */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#3B82F6]" /> Materiais da Mentoria
                </h3>
                <div className="space-y-2">
                  {[
                    { name: 'Workbook 12 Meses', size: '4.2 MB' },
                    { name: 'Planilha de Metas', size: '1.1 MB' },
                    { name: 'Templates de Protocolo', size: '2.8 MB' },
                    { name: 'Script de Vendas High Ticket', size: '0.9 MB' },
                  ].map((f, i) => (
                    <button key={i} className="w-full flex items-center justify-between text-xs py-2 px-3 bg-[#18181A] rounded-xl hover:bg-[#1C1C1E] transition-colors group">
                      <span className="text-[#A1A1AA] group-hover:text-white transition-colors">{f.name}</span>
                      <span className="flex items-center gap-1 text-[#52525B]">
                        {f.size} <Download className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mentor */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" /> Seu Mentor
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    V
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">Dr. Vinícius Cechella</p>
                    <p className="text-[10px] text-[#71717A]">Fundador Hormone Ecosystem</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: <Users className="w-3.5 h-3.5" />, label: '+200 médicos' },
                    { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'ROI médio 8x' },
                    { icon: <Target className="w-3.5 h-3.5" />, label: '12 anos exp.' },
                    { icon: <Mic className="w-3.5 h-3.5" />, label: 'Speaker nacional' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-[#71717A]">
                      <span className="text-[#7B3FE4]">{s.icon}</span>{s.label}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
