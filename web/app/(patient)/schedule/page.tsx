'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Calendar, Clock, MessageCircle, Video, Phone, ChevronLeft, ChevronRight, Check } from 'lucide-react'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const timeSlots = [
  { time: '08:00', available: true },
  { time: '08:30', available: false },
  { time: '09:00', available: true },
  { time: '09:30', available: true },
  { time: '10:00', available: false },
  { time: '10:30', available: true },
  { time: '11:00', available: true },
  { time: '11:30', available: false },
  { time: '14:00', available: true },
  { time: '14:30', available: true },
  { time: '15:00', available: false },
  { time: '15:30', available: true },
  { time: '16:00', available: true },
  { time: '16:30', available: false },
  { time: '17:00', available: true },
]

const consultationTypes = [
  { id: 'video', icon: <Video className="w-5 h-5" />, label: 'Telemedicina', description: 'Consulta por videochamada', price: 'Incluído no plano' },
  { id: 'phone', icon: <Phone className="w-5 h-5" />, label: 'Ligação', description: 'Consulta por telefone', price: 'Incluído no plano' },
  { id: 'whatsapp', icon: <MessageCircle className="w-5 h-5" />, label: 'WhatsApp', description: 'Dúvidas rápidas', price: 'Incluído no plano' },
]

export default function SchedulePage() {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [selectedDay, setSelectedDay] = useState(now.getDate())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState('video')
  const [step, setStep] = useState(1) // 1: select date/time, 2: confirm

  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="patient" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Maria Silva', role: 'patient' }} title="Agendamento" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2 space-y-6">
              {/* Consultation type */}
              <div>
                <h3 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider mb-3">Tipo de Consulta</h3>
                <div className="grid grid-cols-3 gap-3">
                  {consultationTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        selectedType === type.id
                          ? 'bg-[#7B3FE4]/10 border-[#7B3FE4]/40 text-white'
                          : 'bg-[#111113] border-[#1C1C1E] text-[#71717A] hover:border-[#27272A] hover:text-white'
                      }`}
                    >
                      <div className={`mb-2 ${selectedType === type.id ? 'text-[#7B3FE4]' : ''}`}>
                        {type.icon}
                      </div>
                      <p className="text-sm font-semibold">{type.label}</p>
                      <p className="text-xs text-[#71717A] mt-0.5">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-white">{MONTHS[currentMonth]} {currentYear}</h3>
                  <div className="flex gap-2">
                    <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-[#18181A] border border-[#1C1C1E] flex items-center justify-center text-[#71717A] hover:text-white transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-[#18181A] border border-[#1C1C1E] flex items-center justify-center text-[#71717A] hover:text-white transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DAYS.map(d => (
                    <div key={d} className="text-center text-xs font-medium text-[#52525B] py-1">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const isToday = day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear()
                    const isSelected = day === selectedDay
                    const isPast = new Date(currentYear, currentMonth, day) < new Date(now.getFullYear(), now.getMonth(), now.getDate())
                    return (
                      <button
                        key={day}
                        disabled={isPast}
                        onClick={() => setSelectedDay(day)}
                        className={`aspect-square rounded-xl text-sm font-medium transition-all ${
                          isPast ? 'text-[#27272A] cursor-not-allowed' :
                          isSelected ? 'bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] text-white shadow-[0_0_10px_rgba(123,63,228,0.3)]' :
                          isToday ? 'bg-[#7B3FE4]/10 text-[#7B3FE4] border border-[#7B3FE4]/30' :
                          'text-[#A1A1AA] hover:bg-[#18181A] hover:text-white'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Time slots */}
              <div>
                <h3 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider mb-3">
                  Horários disponíveis — {selectedDay} de {MONTHS[currentMonth]}
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                        !slot.available ? 'bg-[#111113] border-[#1C1C1E] text-[#27272A] cursor-not-allowed line-through' :
                        selectedTime === slot.time ? 'bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white border-transparent shadow-[0_0_10px_rgba(123,63,228,0.3)]' :
                        'bg-[#111113] border-[#1C1C1E] text-[#A1A1AA] hover:border-[#7B3FE4]/40 hover:text-white'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar CTAs */}
            <div className="space-y-4">
              {/* Booking summary */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#7B3FE4]" />
                  Resumo do Agendamento
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#71717A]">Data</span>
                    <span className="text-white font-medium">{selectedDay} {MONTHS[currentMonth]}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#71717A]">Horário</span>
                    <span className="text-white font-medium">{selectedTime || 'Não selecionado'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#71717A]">Tipo</span>
                    <span className="text-white font-medium">
                      {consultationTypes.find(t => t.id === selectedType)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#71717A]">Médico</span>
                    <span className="text-white font-medium">Dr. Carlos Mendes</span>
                  </div>
                  <div className="border-t border-[#1C1C1E] pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#71717A]">Valor</span>
                      <span className="text-emerald-400 font-bold">Incluído no plano</span>
                    </div>
                  </div>
                </div>
                <button
                  disabled={!selectedTime}
                  className="w-full mt-4 bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Confirmar Agendamento
                </button>
              </div>

              {/* Quick CTAs */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider mb-3">Atendimento Rápido</h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/15 transition-colors text-sm font-medium">
                    <MessageCircle className="w-4 h-4" />
                    Falar no WhatsApp
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#7B3FE4]/10 border border-[#7B3FE4]/20 text-[#9558EE] hover:bg-[#7B3FE4]/15 transition-colors text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    Falar com Consultor
                  </button>
                </div>
              </div>

              {/* Upcoming */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider mb-3">Próximas Consultas</h3>
                <div className="space-y-3">
                  {[
                    { date: '18 Jun', time: '14:30', type: 'Telemedicina', doctor: 'Dr. Carlos Mendes' },
                    { date: '15 Jul', time: '10:00', type: 'Retorno', doctor: 'Dr. Carlos Mendes' },
                  ].map((appt, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#7B3FE4]/10 border border-[#7B3FE4]/20 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-[#7B3FE4] leading-none">{appt.date.split(' ')[0]}</span>
                        <span className="text-[9px] text-[#7B3FE4]/70 leading-none">{appt.date.split(' ')[1]}</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">{appt.type}</p>
                        <p className="text-[10px] text-[#71717A]">{appt.time} • {appt.doctor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* WhatsApp FAB */}
      <a
        href="https://wa.me/5511999999999"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-[#25D366] flex items-center justify-center shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:shadow-[0_0_30px_rgba(37,211,102,0.6)] hover:scale-105 transition-all z-50"
      >
        <MessageCircle className="w-7 h-7 text-white" fill="white" />
      </a>
    </div>
  )
}
