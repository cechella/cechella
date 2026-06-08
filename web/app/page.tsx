'use client'

import { useState } from 'react'
import { Activity, Users, Stethoscope, TrendingUp, ChevronRight, Eye, EyeOff, Zap, Shield, Award } from 'lucide-react'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [activePortal, setActivePortal] = useState<string | null>(null)

  const portals = [
    {
      id: 'patient',
      icon: <Users className="w-6 h-6" />,
      title: 'Pacientes',
      subtitle: 'Acompanhe sua jornada hormonal',
      description: 'Acesse conteúdos exclusivos, monitore seu progresso e conecte-se com seu médico.',
      gradient: 'from-[#7B3FE4] to-[#9558EE]',
      href: '/patient/dashboard',
    },
    {
      id: 'medical',
      icon: <Stethoscope className="w-6 h-6" />,
      title: 'Médicos',
      subtitle: 'Hormone Academy',
      description: 'Trilhas de formação, biblioteca científica e comunidade médica de elite.',
      gradient: 'from-[#3B82F6] to-[#7B3FE4]',
      href: '/medical/dashboard',
    },
    {
      id: 'sales',
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Consultores',
      subtitle: 'Hormone Sales Academy',
      description: 'Treinamento comercial, CRM pipeline e ranking de performance.',
      gradient: 'from-[#06B6D4] to-[#3B82F6]',
      href: '/sales/dashboard',
    },
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0B] relative overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-[#7B3FE4]/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-[#3B82F6]/8 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#7B3FE4]/5 blur-[160px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16">
        {/* Logo & Hero */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center shadow-[0_0_30px_rgba(123,63,228,0.5)]">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-[0.2em] text-white uppercase">
                Hormone
              </h1>
              <p className="text-xs tracking-[0.35em] text-[#7B3FE4] uppercase font-medium">
                Ecosystem
              </p>
            </div>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            O maior{' '}
            <span className="bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] bg-clip-text text-transparent">
              ecossistema digital
            </span>
            <br />
            de implantes hormonais
          </h2>
          <p className="text-lg text-[#A1A1AA] max-w-2xl mx-auto">
            Uma plataforma única para pacientes, médicos e consultores. Educação, acompanhamento clínico e excelência em um só lugar.
          </p>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
            {[
              { icon: <Shield className="w-4 h-4" />, text: 'LGPD Compliant' },
              { icon: <Award className="w-4 h-4" />, text: 'CFM Regulamentado' },
              { icon: <Zap className="w-4 h-4" />, text: '+10.000 Pacientes' },
            ].map((badge) => (
              <div key={badge.text} className="flex items-center gap-2 text-sm text-[#71717A]">
                <span className="text-[#7B3FE4]">{badge.icon}</span>
                <span>{badge.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-2 gap-8 items-start">
          {/* Login Form */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-3xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
            <h3 className="text-xl font-semibold text-white mb-2">Entrar na plataforma</h3>
            <p className="text-[#71717A] text-sm mb-6">Acesse seu portal personalizado</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#A1A1AA] mb-2">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-4 py-3 text-white placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] focus:ring-1 focus:ring-[#7B3FE4] transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A1A1AA] mb-2">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-4 py-3 pr-12 text-white placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] focus:ring-1 focus:ring-[#7B3FE4] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-[#A1A1AA] cursor-pointer">
                  <input type="checkbox" className="accent-[#7B3FE4]" />
                  Lembrar acesso
                </label>
                <a href="#" className="text-[#7B3FE4] hover:text-[#9558EE] transition-colors">
                  Esqueci minha senha
                </a>
              </div>

              <button className="w-full bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] hover:from-[#6325C8] hover:to-[#2563EB] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(123,63,228,0.3)] hover:shadow-[0_0_30px_rgba(123,63,228,0.5)]">
                Acessar plataforma
              </button>

              <p className="text-center text-sm text-[#71717A]">
                Não tem conta?{' '}
                <a href="#" className="text-[#7B3FE4] hover:text-[#9558EE] transition-colors font-medium">
                  Solicitar acesso
                </a>
              </p>
            </div>
          </div>

          {/* Portal Cards */}
          <div className="space-y-4">
            <p className="text-sm text-[#71717A] font-medium uppercase tracking-wider mb-4">Escolha seu portal</p>
            {portals.map((portal) => (
              <a
                key={portal.id}
                href={portal.href}
                onMouseEnter={() => setActivePortal(portal.id)}
                onMouseLeave={() => setActivePortal(null)}
                className={`block bg-[#111113] border rounded-2xl p-5 transition-all duration-300 cursor-pointer group ${
                  activePortal === portal.id
                    ? 'border-[#7B3FE4]/50 shadow-[0_0_20px_rgba(123,63,228,0.15)]'
                    : 'border-[#1C1C1E] hover:border-[#7B3FE4]/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${portal.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    {portal.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white">{portal.title}</h4>
                      <span className="text-xs text-[#7B3FE4] bg-[#7B3FE4]/10 px-2 py-0.5 rounded-full">
                        {portal.subtitle}
                      </span>
                    </div>
                    <p className="text-sm text-[#71717A] mt-0.5 line-clamp-1">{portal.description}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-[#71717A] transition-all duration-300 flex-shrink-0 ${activePortal === portal.id ? 'text-[#7B3FE4] translate-x-1' : ''}`} />
                </div>
              </a>
            ))}

            <div className="bg-gradient-to-r from-[#7B3FE4]/10 to-[#3B82F6]/10 border border-[#7B3FE4]/20 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#7B3FE4]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="w-4 h-4 text-[#7B3FE4]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">Plataforma Segura</h4>
                  <p className="text-xs text-[#71717A] leading-relaxed">
                    Todos os dados são protegidos em conformidade com a LGPD. Suas informações de saúde são criptografadas e nunca compartilhadas sem seu consentimento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-xs text-[#52525B]">
          <p>© 2024 Hormone Ecosystem. Todos os direitos reservados.</p>
          <p className="mt-1">
            <a href="#" className="hover:text-[#71717A] transition-colors">Termos de Uso</a>
            {' · '}
            <a href="#" className="hover:text-[#71717A] transition-colors">Política de Privacidade</a>
            {' · '}
            <a href="#" className="hover:text-[#71717A] transition-colors">LGPD</a>
          </p>
        </div>
      </div>
    </div>
  )
}
