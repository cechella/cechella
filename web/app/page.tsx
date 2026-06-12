'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronRight, Play, Star, Shield, Award, Users, ArrowRight, CheckCircle, Instagram, MessageCircle, Phone, Lock } from 'lucide-react'
import Link from 'next/link'

const DEPOIMENTOS_VIDEO = [
  {
    nome: 'Adriana Mendes',
    categoria: 'IMPLANTES HORMONAIS',
    duracao: '1:15',
    thumbnail: 'https://pub-7091151189544b0980e12e81533a5213.r2.dev/thumbnails/528f0138-6230-40fc-b797-442c62cfa6fd/thumb.jpg',
    destaque: '"Recuperei minha energia em 3 semanas"',
  },
  {
    nome: 'Márcia Oliveira',
    categoria: 'IMPLANTES HORMONAIS',
    duracao: '1:42',
    thumbnail: '/depoimentos/marcia-oliveira.jpg',
    destaque: '"Minha libido voltou completamente"',
  },
]

const DEPOIMENTOS_TEXTO = [
  {
    nome: 'Fernanda Costa',
    cidade: 'Curitiba, PR',
    foto: '/depoimentos/fernanda-costa.jpg',
    horario: '14:32',
    mensagem: 'Acordava cansada, dormia cansada. Depois do implante com o Dr. Vinícius Cechella, na primeira semana já senti diferença no sono. Na segunda semana, a energia no trabalho voltou. Hoje durmo profundamente e acordo com vontade de conquistar o dia. Mudou minha vida! 🙏',
    avaliacao: 5,
  },
  {
    nome: 'Patricia Mendes',
    cidade: 'Porto Alegre, RS',
    foto: '/depoimentos/patricia-mendes.jpg',
    horario: '09:17',
    mensagem: 'Tentei de tudo para perder peso. Nada funcionava. Com o implante do Dr. Vinícius Cechella, em 3 meses perdi 8 quilos sem dieta restritiva. O metabolismo voltou a funcionar. Hoje com 58 anos uso calça que não usava com 48. Não é milagre — é ciência hormonal! ✨',
    avaliacao: 5,
  },
]

const BENEFICIOS = [
  { icon: '⚡', titulo: 'Energia de volta', desc: 'Recupere sua disposição e vitalidade em semanas' },
  { icon: '😴', titulo: 'Sono reparador', desc: 'Durma profundamente e acorde renovada' },
  { icon: '🔥', titulo: 'Libido restaurada', desc: 'Reconecte-se com seu corpo e prazer' },
  { icon: '💪', titulo: 'Força e músculo', desc: 'Mantenha massa muscular e reduza gordura' },
  { icon: '🧠', titulo: 'Foco e memória', desc: 'Clareza mental e concentração no dia a dia' },
  { icon: '❤️', titulo: 'Humor estável', desc: 'Adeus ansiedade, irritabilidade e tristeza' },
]

const NUMEROS = [
  { valor: '2.847', label: 'Pacientes transformadas' },
  { valor: '98%', label: 'Satisfação comprovada' },
  { valor: '6 meses', label: 'De proteção por implante' },
  { valor: '15 anos', label: 'De experiência clínica' },
]

const WHATSAPP_NUMBER = '5547988507977'
const WHATSAPP_MSG = encodeURIComponent('Olá! Vim pelo Instagram e quero saber mais sobre os implantes hormonais.')

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white overflow-x-hidden">

      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0A0A0B]/95 backdrop-blur border-b border-[#1C1C1E]' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm tracking-widest uppercase">Hormone</p>
              <p className="text-[#7B3FE4] text-[10px] tracking-widest uppercase">Ecosystem</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[#A1A1AA] text-sm hover:text-white transition-colors">Entrar</Link>
            <button
              onClick={scrollToForm}
              className="bg-gradient-to-r from-[#7B3FE4] to-[#9558EE] text-white text-sm font-semibold px-5 py-2 rounded-full hover:opacity-90 transition-opacity"
            >
              Quero meu implante
            </button>
          </div>
        </div>
      </nav>

      {/* HERO + FORMULÁRIO */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[700px] h-[700px] rounded-full bg-[#7B3FE4]/12 blur-[140px]" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-[#3B82F6]/8 blur-[120px]" />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Texto lado esquerdo */}
            <div>
              <div className="inline-flex items-center gap-2 bg-[#7B3FE4]/10 border border-[#7B3FE4]/30 rounded-full px-4 py-1.5 text-sm text-[#9D6FF0] mb-8">
                <Instagram className="w-3.5 h-3.5" />
                <span>Bem-vinda à sua transformação</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold leading-[1.08] mb-6 tracking-tight">
                Recupere sua{' '}
                <span className="bg-gradient-to-r from-[#7B3FE4] to-[#9558EE] bg-clip-text text-transparent">energia,</span>
                <br />libido e qualidade
                <br />de vida
              </h1>
              <p className="text-lg text-[#A1A1AA] mb-8 leading-relaxed">
                Milhares de mulheres já transformaram sua saúde hormonal com implantes bioidenticos.
                Descubra como em menos de 30 minutos.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {NUMEROS.map(n => (
                  <div key={n.label} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{n.valor}</p>
                    <p className="text-xs text-[#71717A] mt-1">{n.label}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Formulário lado direito */}
            <div ref={formRef} id="cadastro">
              <LeadForm />
            </div>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">O que você vai recuperar</h2>
            <p className="text-[#71717A] text-lg">Sintomas que somem em semanas com a terapia de implante hormonal</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {BENEFICIOS.map(b => (
              <div key={b.titulo} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 hover:border-[#7B3FE4]/40 transition-colors">
                <div className="text-3xl mb-3">{b.icon}</div>
                <h3 className="font-semibold text-white mb-1">{b.titulo}</h3>
                <p className="text-sm text-[#71717A] leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section id="depoimentos" className="py-20 px-4 bg-[#0D0D0F]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Depoimentos Reais</h2>
            <p className="text-[#71717A] text-lg">Pacientes que já transformaram suas vidas</p>
          </div>

          {/* 2 vídeos */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {DEPOIMENTOS_VIDEO.map(d => (
              <div key={d.nome} className="group">
                <div className="relative aspect-[9/16] bg-[#1C1C1E] rounded-2xl overflow-hidden mb-3">
                  {d.thumbnail && (
                    <img src={d.thumbnail} alt={d.nome} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur border border-white/20 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-white/80" />
                      </div>
                      <span className="text-[10px] text-white/70 font-medium text-center px-2">Exclusivo para pacientes</span>
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-[10px] text-[#9D6FF0] font-semibold tracking-wider">{d.categoria}</p>
                    <p className="text-xs font-bold text-white leading-tight">{d.nome}</p>
                  </div>
                  <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">{d.duracao}</div>
                </div>
                <p className="text-xs text-[#A1A1AA] italic px-1">{d.destaque}</p>
              </div>
            ))}
          </div>

          {/* 2 depoimentos estilo WhatsApp Business real */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {DEPOIMENTOS_TEXTO.map(d => (
              <div key={d.nome} className="rounded-2xl overflow-hidden shadow-2xl" style={{fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'}}>
                {/* Header — igual WhatsApp Business */}
                <div className="flex items-center gap-3 px-3 py-2" style={{background: '#1f2c34'}}>
                  <div className="text-white/70 text-lg">‹</div>
                  <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-[#6b7c85]">
                    <img src="/depoimentos/dr-vinicius.jpg" alt="Dr. Vinícius Cechella" className="w-full h-full object-cover" style={{objectPosition: '50% 10%'}} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-white text-sm font-semibold leading-tight">Dr. Vinícius Cechella</p>
                      {/* Selo verificado WhatsApp Business */}
                      <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none">
                        <circle cx="12" cy="12" r="12" fill="#25D366"/>
                        <path d="M6.5 12.5L10 16L17.5 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <p className="text-[#8696a0] text-[11px]">Suporte Dr. Vinícius Cechella</p>
                  </div>
                  <div className="flex gap-4 text-[#aebac1]">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M15.9 14.3H15l-.3-.3c1-1.1 1.6-2.7 1.6-4.3C16.3 5.9 13.4 3 9.8 3S3.3 5.9 3.3 9.7s2.9 6.7 6.5 6.7c1.6 0 3-.6 4.1-1.6l.3.3v.8l5.1 5.1 1.5-1.5-5-5.2zm-6.1 0C7.2 14.3 4.8 11.9 4.8 9s2.4-5.3 5.3-5.3S15.4 6.1 15.4 9s-2.7 5.3-5.6 5.3z"/></svg>
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"/></svg>
                  </div>
                </div>

                {/* Corpo da conversa com wallpaper */}
                <div className="relative p-3 pb-2" style={{
                  background: '#0b141a',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182229' fill-opacity='0.8'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}>
                  {/* Data */}
                  <div className="flex justify-center mb-3">
                    <span className="text-[#8696a0] text-[11px] bg-[#182229] px-3 py-1 rounded-full">hoje</span>
                  </div>

                  {/* Mensagem recebida — da paciente (esquerda) */}
                  <div className="flex items-end gap-2 mb-2">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex-shrink-0">
                      <img src={d.foto} alt={d.nome} className="w-full h-full object-cover" style={{objectPosition: '50% 5%'}} />
                    </div>
                    <div className="max-w-[82%] rounded-lg rounded-bl-sm px-3 py-2" style={{background: '#202c33'}}>
                      <p className="text-[#25d366] text-xs font-semibold mb-0.5">{d.nome}</p>
                      <p className="text-[#e9edef] text-[13px] leading-relaxed">{d.mensagem}</p>
                      <div className="flex justify-end mt-1">
                        <span className="text-[#8696a0] text-[10px]">{d.horario}</span>
                      </div>
                    </div>
                  </div>

                  {/* Resposta do Dr. — enviada (direita) */}
                  <div className="flex justify-end mb-1">
                    <div className="max-w-[75%] rounded-lg rounded-br-sm px-3 py-2" style={{background: '#005c4b'}}>
                      <p className="text-[#e9edef] text-[13px] leading-relaxed">Que notícia incrível! 🙏 Fico muito feliz com seu resultado. Obrigada por confiar no nosso trabalho!</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[#8696a0] text-[10px]">{d.horario}</span>
                        <svg className="w-4 h-3" viewBox="0 0 16 11" fill="none">
                          <path d="M11 1L5 8.5L1 5" stroke="#53bdeb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M15 1L9 8.5L7 6.5" stroke="#53bdeb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer com avaliação */}
                <div className="px-4 py-2.5 flex items-center justify-between" style={{background: '#1f2c34'}}>
                  <div className="flex gap-0.5">
                    {[...Array(d.avaliacao)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <span className="text-[#8696a0] text-xs">{d.cidade}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button onClick={scrollToForm} className="inline-flex items-center gap-2 bg-gradient-to-r from-[#7B3FE4] to-[#9558EE] text-white font-bold px-8 py-4 rounded-2xl hover:opacity-90 transition-opacity shadow-[0_0_40px_rgba(123,63,228,0.3)]">
              ⚡ QUERO MEU IMPLANTE
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* CREDIBILIDADE */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Shield className="w-8 h-8 text-[#7B3FE4]" />, titulo: 'LGPD Compliant', desc: 'Seus dados são protegidos com criptografia AES-256 e nunca compartilhados.' },
              { icon: <Award className="w-8 h-8 text-[#7B3FE4]" />, titulo: 'CFM Regulamentado', desc: 'Todos os procedimentos seguem rigorosamente as normas do Conselho Federal de Medicina.' },
              { icon: <Users className="w-8 h-8 text-[#7B3FE4]" />, titulo: '+2.800 Pacientes', desc: 'Uma comunidade de mulheres que já transformaram sua saúde hormonal.' },
            ].map(c => (
              <div key={c.titulo} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6 flex gap-4">
                <div className="flex-shrink-0 w-14 h-14 bg-[#7B3FE4]/10 rounded-xl flex items-center justify-center">{c.icon}</div>
                <div>
                  <h3 className="font-bold text-white mb-1">{c.titulo}</h3>
                  <p className="text-sm text-[#71717A] leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1C1C1E] py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center">
              <span className="text-white font-bold text-xs">H</span>
            </div>
            <span className="text-white font-semibold">Hormone Ecosystem</span>
          </div>
          <p className="text-[#52525B] text-sm">© 2025 Hormone Ecosystem. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`} target="_blank" rel="noopener noreferrer" className="text-[#71717A] hover:text-green-400 transition-colors">
              <MessageCircle className="w-5 h-5" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-[#71717A] hover:text-[#7B3FE4] transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>

      {/* CTA FLUTUANTE MOBILE */}
      <div className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
        <button
          onClick={scrollToForm}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#7B3FE4] to-[#9558EE] text-white font-bold py-4 rounded-2xl shadow-[0_8px_40px_rgba(123,63,228,0.5)] hover:opacity-90 transition-opacity"
        >
          ⚡ QUERO MEU IMPLANTE
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

function LeadForm() {
  const [form, setForm] = useState({ nome: '', email: '', telefone: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const formatTelefone = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar')
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-[#111113] border border-green-500/30 rounded-3xl p-10 text-center">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Acesso enviado! 🎉</h3>
        <p className="text-[#A1A1AA] mb-2">Enviamos seu <strong className="text-white">login e senha</strong> para o seu e-mail.</p>
        <p className="text-sm text-[#71717A] mb-6">Não encontrou? Verifique a caixa de <strong className="text-[#9D6FF0]">Spam / Promoções</strong>.</p>
        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#7B3FE4] to-[#9558EE] text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
        >
          📧 Abrir meu e-mail
          <ArrowRight className="w-4 h-4" />
        </a>
        <p className="mt-4 text-xs text-[#52525B]">
          Já tem login e senha?{' '}
          <a href="/login" className="text-[#7B3FE4] hover:underline">Entrar na plataforma</a>
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[#111113] border border-[#1C1C1E] rounded-3xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#A1A1AA] mb-2">Seu nome completo</label>
          <input
            type="text"
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            required
            placeholder="Maria da Silva"
            className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-4 py-3 text-white placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#A1A1AA] mb-2">E-mail</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
            placeholder="maria@email.com"
            className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-4 py-3 text-white placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#A1A1AA] mb-2">WhatsApp</label>
          <input
            type="tel"
            value={form.telefone}
            onChange={e => setForm(f => ({ ...f, telefone: formatTelefone(e.target.value) }))}
            required
            placeholder="(47) 99999-9999"
            className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-4 py-3 text-white placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
          />
        </div>
        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#7B3FE4] to-[#9558EE] disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(123,63,228,0.3)]"
        >
          {loading ? (
            <><span className="animate-spin">⚡</span> Criando seu acesso...</>
          ) : (
            <>⚡ ACESSAR A PLATAFORMA GRÁTIS <ArrowRight className="w-5 h-5" /></>
          )}
        </button>
        <p className="text-center text-xs text-[#52525B]">
          🔒 Seus dados estão seguros. Sem spam, sem compartilhamento.
        </p>
      </form>
      <div className="mt-6 pt-6 border-t border-[#1C1C1E] flex items-center justify-center gap-6 text-xs text-[#71717A]">
        {[
          { icon: <Shield className="w-3.5 h-3.5" />, text: 'LGPD Compliant' },
          { icon: <Award className="w-3.5 h-3.5" />, text: 'CFM Regulamentado' },
          { icon: <CheckCircle className="w-3.5 h-3.5" />, text: 'Acesso imediato' },
        ].map(b => (
          <div key={b.text} className="flex items-center gap-1.5 text-[#7B3FE4]">
            {b.icon}<span className="text-[#71717A]">{b.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
