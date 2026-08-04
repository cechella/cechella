'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2, Send, CheckCircle, Phone, User, Briefcase, Heart, BookUser } from 'lucide-react'

interface Contato {
  id: number
  nome: string
  telefone: string
  profissao: string
  hobby: string
}

const supportsContactsPicker = () =>
  typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window

const isMobile = () =>
  typeof window !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent)

export default function PaginaIndicacao() {
  const { token } = useParams<{ token: string }>()
  const [indicador, setIndicador] = useState<{ nome: string | null } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [temContacts, setTemContacts] = useState(false)
  const [mostraAbrirNavegador, setMostraAbrirNavegador] = useState(false)
  const [contatos, setContatos] = useState<Contato[]>([
    { id: 1, nome: '', telefone: '', profissao: '', hobby: '' }
  ])

  useEffect(() => {
    const hasContacts = supportsContactsPicker()
    setTemContacts(hasContacts)
    // Mostra banner "abrir no navegador" em celulares que não suportam a Contacts API
    setMostraAbrirNavegador(!hasContacts && isMobile())
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
      const nome = c.name?.[0] || ''
      const tel = c.tel?.[0] || ''
      setContatos(prev => prev.map(x =>
        x.id === contatoId ? { ...x, nome, telefone: tel } : x
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
        // substitui o primeiro vazio se existir, senão adiciona
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
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (erro) return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-2xl mb-2">😕</p>
        <p className="text-white font-medium">Link inválido ou expirado</p>
        <p className="text-[#71717A] text-sm mt-1">Peça um novo link para quem te enviou</p>
      </div>
    </div>
  )

  if (sucesso) return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-white text-xl font-semibold mb-2">Indicações enviadas!</h2>
        <p className="text-[#71717A] text-sm">
          Nossa consultora Ana vai entrar em contato com cada uma das suas amigas em breve. 🌸
        </p>
        <p className="text-[#71717A] text-sm mt-3">
          Enquanto isso, avisa elas que receberão uma ligação do número <strong className="text-white">+55 17 2786-2778</strong> — pode atender com tranquilidade!
        </p>
      </div>
    </div>
  )

  const nomeIndicador = indicador?.nome?.split(' ')[0] || 'você'

  return (
    <div className="min-h-screen bg-[#0A0A0B] pb-16">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#7B3FE4]/20 to-transparent pt-12 pb-8 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#7B3FE4]/20 border border-[#7B3FE4]/30 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🌿</span>
        </div>
        <h1 className="text-white text-xl font-semibold">Hormone Ecosystem</h1>
        <p className="text-[#A78BFA] text-sm mt-1">Portal de Indicações</p>
        <div className="mt-4 bg-[#111113] border border-[#1C1C1E] rounded-2xl px-4 py-3 max-w-sm mx-auto">
          <p className="text-[#A1A1AA] text-sm">
            <strong className="text-white">{nomeIndicador}</strong> te convidou para indicar amigas que podem se beneficiar do implante hormonal. 💜
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="max-w-lg mx-auto px-4 space-y-4">
        {mostraAbrirNavegador && (
          <div className="bg-[#111113] border border-[#7B3FE4]/30 rounded-2xl px-4 py-3 flex items-start gap-3">
            <BookUser className="w-5 h-5 text-[#A78BFA] mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">Importar contatos da agenda</p>
              <p className="text-[#71717A] text-xs mt-0.5">Para importar direto da agenda, abra este link no Safari ou Chrome.</p>
              <button
                onClick={() => window.open(window.location.href, '_blank')}
                className="mt-2 text-xs text-[#A78BFA] underline underline-offset-2"
              >
                Abrir no navegador
              </button>
            </div>
          </div>
        )}

        {temContacts && (
          <button
            onClick={importarMultiplos}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#7B3FE4]/15 border border-[#7B3FE4]/40 hover:bg-[#7B3FE4]/25 text-[#A78BFA] rounded-2xl text-sm font-medium transition-colors"
          >
            <BookUser className="w-4 h-4" />
            Importar amigas do celular
          </button>
        )}

        <p className="text-[#71717A] text-xs text-center">
          {temContacts ? 'ou preencha manualmente abaixo' : 'Preencha os dados de cada amiga que você quer indicar'}
        </p>

        {contatos.map((contato, idx) => (
          <div key={contato.id} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#71717A] font-medium">Amiga {idx + 1}</span>
              <div className="flex items-center gap-2">
                {temContacts && (
                  <button
                    onClick={() => importarDoCelular(contato.id)}
                    className="text-[#7B3FE4] hover:text-[#A78BFA] transition-colors"
                    title="Importar contato do celular"
                  >
                    <BookUser className="w-3.5 h-3.5" />
                  </button>
                )}
                {contatos.length > 1 && (
                  <button onClick={() => removerContato(contato.id)} className="text-[#71717A] hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525B]" />
              <input
                type="text"
                placeholder="Nome completo"
                value={contato.nome}
                onChange={e => atualizarContato(contato.id, 'nome', e.target.value)}
                className="w-full bg-[#18181A] border border-[#2C2C2E] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4]"
              />
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525B]" />
              <input
                type="tel"
                placeholder="Telefone (WhatsApp) *"
                value={contato.telefone}
                onChange={e => atualizarContato(contato.id, 'telefone', e.target.value)}
                className="w-full bg-[#18181A] border border-[#2C2C2E] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525B]" />
                <input
                  type="text"
                  placeholder="Profissão"
                  value={contato.profissao}
                  onChange={e => atualizarContato(contato.id, 'profissao', e.target.value)}
                  className="w-full bg-[#18181A] border border-[#2C2C2E] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4]"
                />
              </div>
              <div className="relative">
                <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525B]" />
                <input
                  type="text"
                  placeholder="Hobby"
                  value={contato.hobby}
                  onChange={e => atualizarContato(contato.id, 'hobby', e.target.value)}
                  className="w-full bg-[#18181A] border border-[#2C2C2E] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4]"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={adicionarContato}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#2C2C2E] rounded-2xl text-sm text-[#71717A] hover:text-white hover:border-[#7B3FE4]/50 transition-colors"
        >
          <Plus className="w-4 h-4" /> Adicionar mais uma amiga
        </button>

        <button
          onClick={enviar}
          disabled={enviando}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#7B3FE4] hover:bg-[#6B2FD4] disabled:opacity-50 text-white rounded-2xl text-sm font-medium transition-colors"
        >
          <Send className="w-4 h-4" />
          {enviando ? 'Enviando...' : `Enviar ${contatos.length} indicação${contatos.length !== 1 ? 'ões' : ''}`}
        </button>

        <p className="text-center text-[#52525B] text-xs pb-4">
          Telefone é obrigatório • Profissão e hobby ajudam Ana a personalizar a abordagem
        </p>
      </div>
    </div>
  )
}
