'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2, Send, CheckCircle, Phone, User, Briefcase, Heart, BookUser, Sparkles } from 'lucide-react'

interface Contato {
  id: number
  nome: string
  telefone: string
  profissao: string
  hobby: string
}

const supportsContactsPicker = () =>
  typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window

export default function PaginaIndicacao() {
  const { token } = useParams<{ token: string }>()
  const [indicador, setIndicador] = useState<{ nome: string | null } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [temContacts, setTemContacts] = useState(false)
  const [contatos, setContatos] = useState<Contato[]>(
    Array.from({ length: 20 }, (_, i) => ({ id: i + 1, nome: '', telefone: '', profissao: '', hobby: '' }))
  )

  useEffect(() => {
    setTemContacts(supportsContactsPicker())
    fetch(`/api/indicar?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setErro(d.error)
        else setIndicador(d)
      })
      .catch(() => setErro('Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [token])

  const importarDoCelular = async (contatoId: number) => {
    if (!supportsContactsPicker()) return
    try {
      // @ts-ignore
      const results = await navigator.contacts.select(['name', 'tel'], { multiple: false })
      if (!results?.length) return
      const c = results[0]
      setContatos(prev => prev.map(x =>
        x.id === contatoId ? { ...x, nome: c.name?.[0] || '', telefone: c.tel?.[0] || '' } : x
      ))
    } catch {}
  }

  const importarMultiplos = async () => {
    if (!supportsContactsPicker()) return
    try {
      // @ts-ignore
      const results = await navigator.contacts.select(['name', 'tel'], { multiple: true })
      if (!results?.length) return
      const novos: Contato[] = results.map((c: any) => ({
        id: Date.now() + Math.random(),
        nome: c.name?.[0] || '',
        telefone: c.tel?.[0] || '',
        profissao: '',
        hobby: '',
      }))
      setContatos(prev => {
        const temVazio = prev.length === 1 && !prev[0].nome && !prev[0].telefone
        return temVazio ? novos : [...prev, ...novos]
      })
    } catch {}
  }

  const adicionarContato = () => {
    setContatos(prev => [...prev, { id: Date.now(), nome: '', telefone: '', profissao: '', hobby: '' }])
  }

  const removerContato = (id: number) => {
    if (contatos.length === 1) return
    setContatos(prev => prev.filter(c => c.id !== id))
  }

  const atualizarContato = (id: number, campo: keyof Contato, valor: string) => {
    setContatos(prev => prev.map(c => c.id === id ? { ...c, [campo]: valor } : c))
  }

  const enviar = async () => {
    const validos = contatos.filter(c => c.telefone.replace(/\D/g, '').length >= 8)
    if (!validos.length) return alert('Adicione ao menos um contato com telefone válido')
    setEnviando(true)
    try {
      const res = await fetch('/api/indicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, contatos: validos }),
      })
      const data = await res.json()
      if (data.ok) setSucesso(true)
      else alert(data.error || 'Erro ao enviar')
    } catch {
      alert('Erro ao enviar')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0D0B14 0%, #120D1F 100%)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#6B7280] text-sm">Carregando...</p>
      </div>
    </div>
  )

  if (erro) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0D0B14 0%, #120D1F 100%)' }}>
      <div className="text-center max-w-xs">
        <div className="w-16 h-16 rounded-full bg-[#1C1528] border border-[#2D2040] flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔗</span>
        </div>
        <h2 className="text-white font-semibold text-lg mb-1">Link inválido</h2>
        <p className="text-[#6B7280] text-sm">Este link expirou ou não existe. Peça um novo para quem te enviou.</p>
      </div>
    </div>
  )

  if (sucesso) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0D0B14 0%, #120D1F 100%)' }}>
      <div className="text-center max-w-sm">
        <div className="relative mx-auto mb-6 w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle className="w-9 h-9 text-emerald-400" />
          </div>
        </div>
        <h2 className="text-white text-2xl font-semibold mb-2">Indicações enviadas!</h2>
        <p className="text-[#9CA3AF] text-sm leading-relaxed">
          Nossa consultora <strong className="text-white">Ana</strong> vai entrar em contato com cada uma das suas amigas em breve. 🌸
        </p>
        <div className="mt-5 bg-[#1A1528] border border-[#2D2040] rounded-2xl px-4 py-3">
          <p className="text-[#9CA3AF] text-xs leading-relaxed">
            Avisa elas que vão receber uma ligação do número{' '}
            <strong className="text-white font-medium">+55 17 2786-2778</strong>
            {' '}— pode atender com tranquilidade! 📞
          </p>
        </div>
      </div>
    </div>
  )

  const nomeIndicador = indicador?.nome?.split(' ')[0] || 'você'
  const totalValidos = contatos.filter(c => c.telefone.replace(/\D/g, '').length >= 8).length

  return (
    <div className="min-h-screen pb-20" style={{ background: 'linear-gradient(135deg, #0D0B14 0%, #120D1F 100%)' }}>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full opacity-30"
            style={{ background: 'radial-gradient(ellipse, #7C3AED 0%, transparent 70%)' }} />
        </div>
        <div className="relative pt-14 pb-10 px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-[#1E1530] border border-[#3D2D6B] rounded-full px-3 py-1 mb-5">
            <Sparkles className="w-3 h-3 text-[#A78BFA]" />
            <span className="text-[#A78BFA] text-xs font-medium">Portal de Indicações</span>
          </div>
          <div className="w-18 h-18 mx-auto mb-4">
            <div className="w-[72px] h-[72px] rounded-2xl border border-[#3D2D6B] flex items-center justify-center mx-auto"
              style={{ background: 'linear-gradient(135deg, #1E1530, #2D1F4E)' }}>
              <span className="text-3xl">🌿</span>
            </div>
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Hormone Ecosystem</h1>
          <p className="text-[#6B7280] text-sm mt-1 mb-5">Transformando saúde hormonal feminina</p>

          <div className="max-w-sm mx-auto bg-[#1A1528]/80 backdrop-blur border border-[#2D2040] rounded-2xl px-4 py-3.5 text-left">
            <p className="text-[#9CA3AF] text-sm leading-relaxed">
              <strong className="text-white">{nomeIndicador}</strong> te convidou para indicar amigas que podem se beneficiar do implante hormonal. 💜
            </p>
            <p className="text-[#6B7280] text-xs mt-1.5">
              Cada indicação é uma amiga cuidando da outra.
            </p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="max-w-lg mx-auto px-4 space-y-3">

        {/* Botão importar agenda — só aparece quando a API está disponível (Safari/Chrome nativos) */}
        {temContacts && (
          <button
            onClick={importarMultiplos}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}
          >
            <BookUser className="w-4 h-4" />
            Importar amigas da agenda
          </button>
        )}

        <p className="text-[#4B5563] text-xs text-center py-1">
          {temContacts ? '— ou preencha manualmente abaixo —' : 'Tente preencher as 20 amigas — quanto mais, melhor!'}
        </p>

        {/* Cards de contato */}
        {contatos.map((contato, idx) => (
          <div key={contato.id}
            className="rounded-2xl border border-[#1F1935] overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #131020 0%, #0F0D1A 100%)' }}>
            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1F1935]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center">
                  <span className="text-[10px] text-[#A78BFA] font-bold">{idx + 1}</span>
                </div>
                <span className="text-[#9CA3AF] text-xs font-medium">Amiga {idx + 1}</span>
              </div>
              <div className="flex items-center gap-2">
                {temContacts && (
                  <button
                    onClick={() => importarDoCelular(contato.id)}
                    className="flex items-center gap-1 text-[#7C3AED] hover:text-[#A78BFA] transition-colors text-xs"
                  >
                    <BookUser className="w-3.5 h-3.5" />
                    <span>Agenda</span>
                  </button>
                )}
                {contatos.length > 1 && (
                  <button onClick={() => removerContato(contato.id)}
                    className="text-[#374151] hover:text-red-400 transition-colors ml-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Campos */}
            <div className="p-4 space-y-2.5">
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#374151]" />
                <input
                  type="text"
                  placeholder="Nome completo"
                  autoComplete="name"
                  value={contato.nome}
                  onChange={e => atualizarContato(contato.id, 'nome', e.target.value)}
                  className="w-full bg-[#0D0B14] border border-[#1F1935] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#374151] focus:outline-none focus:border-[#7C3AED] transition-colors"
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#374151]" />
                <input
                  type="tel"
                  placeholder="WhatsApp *"
                  autoComplete="tel"
                  value={contato.telefone}
                  onChange={e => atualizarContato(contato.id, 'telefone', e.target.value)}
                  className="w-full bg-[#0D0B14] border border-[#1F1935] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#374151] focus:outline-none focus:border-[#7C3AED] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#374151]" />
                  <input
                    type="text"
                    placeholder="Profissão"
                    value={contato.profissao}
                    onChange={e => atualizarContato(contato.id, 'profissao', e.target.value)}
                    className="w-full bg-[#0D0B14] border border-[#1F1935] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#374151] focus:outline-none focus:border-[#7C3AED] transition-colors"
                  />
                </div>
                <div className="relative">
                  <Heart className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#374151]" />
                  <input
                    type="text"
                    placeholder="Hobby"
                    value={contato.hobby}
                    onChange={e => atualizarContato(contato.id, 'hobby', e.target.value)}
                    className="w-full bg-[#0D0B14] border border-[#1F1935] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#374151] focus:outline-none focus:border-[#7C3AED] transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Adicionar mais */}
        <button
          onClick={adicionarContato}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#1F1935] rounded-2xl text-sm text-[#4B5563] hover:text-[#9CA3AF] hover:border-[#3D2D6B] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar mais uma amiga
        </button>

        {/* Botão enviar */}
        <button
          onClick={enviar}
          disabled={enviando || totalValidos === 0}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 4px 24px rgba(124,58,237,0.4)' }}
        >
          <Send className="w-4 h-4" />
          {enviando
            ? 'Enviando...'
            : totalValidos > 0
              ? `Enviar ${totalValidos} indicação${totalValidos !== 1 ? 'ões' : ''}`
              : 'Preencha ao menos um telefone'}
        </button>

        <p className="text-center text-[#374151] text-xs pb-6">
          WhatsApp é obrigatório · Profissão e hobby ajudam Ana a personalizar
        </p>
      </div>
    </div>
  )
}
