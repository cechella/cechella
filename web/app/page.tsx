'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Users, Stethoscope, TrendingUp, ChevronRight, Eye, EyeOff, Shield, Award, Zap, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LandingPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activePortal, setActivePortal] = useState<string | null>(null)

  const portals = [
    { id: 'patient', icon: <Users className="w-6 h-6" />, title: 'Pacientes', subtitle: 'Portal do Paciente', description: 'Acesse conteúdos exclusivos e monitore seu progresso.', gradient: 'from-[#7B3FE4] to-[#9558EE]', href: '/patient/dashboard' },
    { id: 'medical', icon: <Stethoscope className="w-6 h-6" />, title: 'Médicos', subtitle: 'Hormone Academy', description: 'Trilhas de formação e biblioteca científica de elite.', gradient: 'from-[#3B82F6] to-[#7B3FE4]', href: '/medical/dashboard' },
    { id: 'sales', icon: <TrendingUp className="w-6 h-6" />, title: 'Consultores', subtitle: 'Sales Academy', description: 'CRM pipeline, ranking e treinamento comercial.', gradient: 'from-[#06B6D4] to-[#3B82F6]', href: '/sales/dashboard' },
  ]

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    const role = profile?.role || 'patient'
    const redirectMap: Record<string, string> = {
      patient: '/patient/dashboard',
      doctor: '/medical/dashboard',
      sales: '/sales/dashboard',
      admin: '/admin/dashboard',
    }
    router.push(redirectMap[role] || '/patient/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-[#7B3FE4]/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-[#3B82F6]/8 blur-[120px]" />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center shadow-[0_0_30px_rgba(123,63,228,0.5)]">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-[0.2em] text-white uppercase">Hormone</h1>
              <p className="text-xs tracking-[0.35em] text-[#7B3FE4] uppercase font-medium">Ecosystem</p>
            </div>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
            O maior{' '}
            <span className="bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] bg-clip-text text-transparent">ecossistema digital</span>
            <br />de implantes hormonais
          </h2>
          <p className="text-lg text-[#A1A1AA] max-w-2xl mx-auto">Uma plataforma única para pacientes, médicos e consultores.</p>
          <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
            {[{ icon: <Shield className="w-4 h-4" />, text: 'LGPD Compliant' }, { icon: <Award className="w-4 h-4" />, text: 'CFM Regulamentado' }, { icon: <Zap className="w-4 h-4" />, text: '+10.000 Pacientes' }].map(b => (
              <div key={b.text} className="flex items-center gap-2 text-sm text-[#71717A]"><span className="text-[#7B3FE4]">{b.icon}</span><span>{b.text}</span></div>
            ))}
          </div>
        </div>
        <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-2 gap-8 items-start">
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-3xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
            <h3 className="text-xl font-semibold text-white mb-2">Entrar na plataforma</h3>
            <p className="text-[#71717A] text-sm mb-6">Acesse seu portal personalizado</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#A1A1AA] mb-2">E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com"
                  className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-4 py-3 text-white placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#A1A1AA] mb-2">Senha</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-4 py-3 pr-12 text-white placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Entrando...</> : 'Acessar plataforma'}
              </button>
              <p className="text-center text-sm text-[#71717A]">Não tem conta?{' '}<a href="/register" className="text-[#7B3FE4] font-medium">Solicitar acesso</a></p>
            </form>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-[#71717A] font-medium uppercase tracking-wider mb-4">Escolha seu portal</p>
            {portals.map(portal => (
              <a key={portal.id} href={portal.href} onMouseEnter={() => setActivePortal(portal.id)} onMouseLeave={() => setActivePortal(null)}
                className={`block bg-[#111113] border rounded-2xl p-5 transition-all duration-300 ${activePortal === portal.id ? 'border-[#7B3FE4]/50' : 'border-[#1C1C1E] hover:border-[#7B3FE4]/30'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${portal.gradient} flex items-center justify-center flex-shrink-0 shadow-lg text-white`}>{portal.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white">{portal.title}</h4>
                      <span className="text-xs text-[#7B3FE4] bg-[#7B3FE4]/10 px-2 py-0.5 rounded-full">{portal.subtitle}</span>
                    </div>
                    <p className="text-sm text-[#71717A] mt-0.5">{portal.description}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${activePortal === portal.id ? 'text-[#7B3FE4] translate-x-1' : 'text-[#71717A]'}`} />
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
