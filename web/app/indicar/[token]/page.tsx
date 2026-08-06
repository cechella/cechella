'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2, Send, CheckCircle, Phone, User, Briefcase, Heart, BookUser, Sparkles, MessageCircle } from 'lucide-react'

interface Contato {
  id: number
  nome: string
  telefone: string
  profissao: string
  hobby: string
}

const supportsContactsPicker = () =>
  typeof window !== 'undefined' && 'contacts' in navigator && typeof (navigator as any).contacts?.select === 'function'

export default function PaginaIndicacao() {
  const { token } = useParams<{ token: string }>()
  const [indicador, setIndicador] = useState<{ nome: string | null } | null>(null)
  const [jaEnviados, setJaEnviados] = useState<Contato[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [enviandoMsg, setEnviandoMsg] = useState<Record<string, boolean>>({})
  const [msgEnviada, setMsgEnviada] = useState<Record<string, boolean>>({})
  const [enviandoTodas, setEnviandoTodas] = useState(false)
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [temContacts, setTemContacts] = useState(false)
  const [importandoWpp, setImportandoWpp] = useState(false)
  const [aguardandoContatos, setAguardandoContatos] = useState(false)
  const [timeoutContatos, setTimeoutContatos] = useState(false)
  const [contatos, setContatos] = useState<Contato[]>(
    Array.from({ length: 20 }, (_, i) => ({ id: i + 1, nome: '', telefone: '', profissao: '', hobby: '' }))
  )
  const primeiroVazioRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState<string | null>(null)

  const abrirWhatsAppImport = () => {
    const msg = encodeURIComponent(`REF-${token}`)
    window.open(`https://wa.me/5547988507977?text=${msg}`, '_blank')
    setImportandoWpp(true)
  }

  const mergeSessaoContatos = (apiContatos: any[], jaEnviadosAtual?: Contato[]) => {
    if (!apiContatos?.length) return
    setContatos(prev => {
      const existentes = prev.filter(x => x.nome || x.telefone)
      const mapExistentes = new Map(existentes.map(x => [x.telefone, x]))
      const merged: Contato[] = apiContatos.map((c: any, i: number) => {
        const existente = mapExistentes.get(c.telefone)
        return {
          id: existente?.id ?? Date.now() + i,
          nome: c.nome || existente?.nome || '',
          telefone: c.telefone || '',
          profissao: c.profissao || existente?.profissao || '',
          hobby: c.hobby || existente?.hobby || '',
        }
      })
      const telsApi = new Set(apiContatos.map((c: any) => c.telefone))
      const extras = existentes.filter(x => !telsApi.has(x.telefone))
      const todos = [...merged, ...extras].slice(0, 20)

      // Auto-submit se o total (já enviados + novos do WhatsApp) chega a 20
      const enviados = jaEnviadosAtual ?? []
      const telsEnviados = new Set(enviados.map(e => String(e.telefone).replace(/\D/g, '')))
      const novosValidos = todos.filter(c => {
        const tel = String(c.telefone).replace(/\D/g, '')
        return tel.length >= 8 && !telsEnviados.has(tel)
      })
      const totalComNovos = enviados.length + novosValidos.length
      if (totalComNovos >= 20 && novosValidos.length > 0) {
        setTimeout(() => autoEnviar(todos), 300)
      }

      return todos
    })
    setImportandoWpp(false)
  }

  const autoEnviar = async (contatosParaEnviar: Contato[]) => {
    const validos = contatosParaEnviar.filter(c => String(c.telefone).replace(/\D/g, '').length >= 8)
    if (!validos.length) return
    const semDados = validos.filter(c => !c.profissao || !c.hobby)
    if (semDados.length) {
      setContatos(validos)
      return
    }
    setEnviando(true)
    try {
      const res = await fetch('/api/indicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, contatos: validos }),
      })
      const data = await res.json()
      if (data.ok) {
        setJaEnviados(prev => {
          const telsExistentes = new Set(prev.map(x => x.telefone.replace(/\D/g, '')))
          const novos = validos
            .filter((v: Contato) => !telsExistentes.has(v.telefone.replace(/\D/g, '')))
            .map((v: Contato) => ({ ...v, telefone: v.telefone.replace(/\D/g, '') }))
          const resultado = [...prev, ...novos].slice(0, 20)
          if (resultado.length >= 20) setSucesso(true)
          return resultado
        })
      }
    } catch {}
    finally { setEnviando(false) }
  }

  // Polling ativo quando importandoWpp=true (clicou botão verde)
  useEffect(() => {
    if (!importandoWpp) return
    setAguardandoContatos(true)

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/indicar/sessao?token=${token}&_t=${Date.now()}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
        const data = await res.json()
        if (data.contatos?.length) {
          setAguardandoContatos(false)
          mergeSessaoContatos(data.contatos, jaEnviados)
        }
      } catch {}
    }, 2500)

    const timer = setTimeout(() => {
      clearInterval(interval)
      setAguardandoContatos(false)
      setTimeoutContatos(true)
    }, 30000)

    return () => { clearInterval(interval); clearTimeout(timer) }
  }, [importandoWpp, token, jaEnviados])

  // Problema 3: quando página volta ao foco (saiu do WhatsApp e voltou), recarrega contatos
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const res = await fetch(`/api/indicar/sessao?token=${token}&_t=${Date.now()}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
        const data = await res.json()
        if (data.contatos?.length) mergeSessaoContatos(data.contatos)
      } catch {}
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [token])

  const fetchFresh = (url: string) =>
    fetch(`${url}&_t=${Date.now()}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })

  useEffect(() => {
    setTemContacts(supportsContactsPicker())

    // Carrega tudo em paralelo antes de mostrar a página
    Promise.all([
      fetchFresh(`/api/indicar?token=${token}`).then(r => r.json()).catch(() => ({ error: 'Erro ao carregar' })),
      fetchFresh(`/api/indicar/sessao?token=${token}`).then(r => r.json()).catch(() => ({ contatos: [] })),
    ]).then(([indicarData, sessaoData]) => {
      if (indicarData.error) {
        setErro(indicarData.error)
        return
      }

      setIndicador(indicarData)

      const enviados: any[] = indicarData.jaEnviados || []
      const sessaoContatos: any[] = sessaoData.contatos || []

      // Mapeia jaEnviados
      const mappedEnviados: Contato[] = enviados.map((c: any, i: number) => ({
        id: Date.now() + i,
        nome: c.nome || '',
        telefone: String(c.telefone || '').replace(/\D/g, ''),
        profissao: c.profissao || '',
        hobby: c.hobby || '',
      }))
      setJaEnviados(mappedEnviados)

      if (mappedEnviados.length >= 20) {
        setSucesso(true)
        return
      }

      // Mescla sessao_wpp com jaEnviados para popular formulário
      if (sessaoContatos.length || enviados.length) {
        const profHobbyMap = new Map(enviados.map((e: any) => [String(e.telefone).replace(/\D/g, ''), e]))
        const merged: Contato[] = sessaoContatos.map((c: any, i: number) => {
          const tel = String(c.telefone || '').replace(/\D/g, '')
          const db = profHobbyMap.get(tel)
          return {
            id: Date.now() + i + 100,
            nome: c.nome || '',
            telefone: tel,
            profissao: db?.profissao || c.profissao || '',
            hobby: db?.hobby || c.hobby || '',
          }
        })
        const telsWpp = new Set(sessaoContatos.map((c: any) => String(c.telefone).replace(/\D/g, '')))
        const soEnviados = enviados
          .filter((e: any) => !telsWpp.has(String(e.telefone).replace(/\D/g, '')))
          .map((e: any, i: number) => ({
            id: Date.now() + sessaoContatos.length + i + 200,
            nome: e.nome || '',
            telefone: String(e.telefone).replace(/\D/g, ''),
            profissao: e.profissao || '',
            hobby: e.hobby || '',
          }))
        const todos = [...merged, ...soEnviados].slice(0, 20)
        if (todos.length) {
          setContatos(todos)

          // Se total de novos válidos + já enviados = 20, auto-submit
          const telsEnviados = new Set(mappedEnviados.map(e => e.telefone))
          const novosValidos = todos.filter(c => c.telefone.length >= 8 && !telsEnviados.has(c.telefone))
          if (mappedEnviados.length + novosValidos.length >= 20 && novosValidos.length > 0) {
            setTimeout(() => autoEnviar(todos), 500)
          }
        }
      }
    }).catch(() => setErro('Erro ao carregar'))
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
    const semDados = validos.filter(c => !c.profissao || !c.hobby)
    if (semDados.length) {
      alert(`Preencha profissão e hobby de ${semDados.length === 1 ? 'uma amiga' : `${semDados.length} amigas`} antes de enviar.`)
      return
    }
    setEnviando(true)
    try {
      const res = await fetch('/api/indicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, contatos: validos }),
      })
      const data = await res.json()
      if (data.ok) {
        // Atualiza jaEnviados com os enviados agora
        const novoJaEnviados = await new Promise<Contato[]>(resolve => {
          setJaEnviados(prev => {
            const telsExistentes = new Set(prev.map(x => x.telefone.replace(/\D/g, '')))
            const novos = validos
              .filter((v: Contato) => !telsExistentes.has(v.telefone.replace(/\D/g, '')))
              .map((v: Contato) => ({ ...v, telefone: v.telefone.replace(/\D/g, '') }))
            const atualizados = prev.map(p => {
              const match = validos.find((v: Contato) => v.telefone.replace(/\D/g, '') === p.telefone.replace(/\D/g, ''))
              return match ? { ...p, profissao: match.profissao, hobby: match.hobby } : p
            })
            const resultado = [...atualizados, ...novos].slice(0, 20)
            resolve(resultado)
            return resultado
          })
        })

        if (novoJaEnviados.length >= 20) {
          setSucesso(true)
          return
        }

        const faltamSlots = Math.max(0, 20 - novoJaEnviados.length)

        // Contatos que ainda precisam de profissão/hobby
        const semDados = novoJaEnviados
          .filter(c => !c.profissao || !c.hobby)
          .map(c => ({ ...c, id: Date.now() + Math.random() }))

        // Slots em branco para novos contatos (máx 3 de uma vez)
        const slots = Array.from({ length: Math.min(faltamSlots, 3) }, (_, i) => ({
          id: Date.now() + i + 1000,
          nome: '', telefone: '', profissao: '', hobby: '',
        }))

        setContatos([...semDados, ...slots])

        if (semDados.length > 0) {
          // Ainda há contatos incompletos → rola direto até o primeiro deles
          setTimeout(() => {
            primeiroVazioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            primeiroVazioRef.current?.focus()
          }, 300)
        } else {
          // Todos têm profissão/hobby → parabéns, fica no topo para adicionar mais
          // setTimeout garante que o scroll roda APÓS o React re-renderizar o DOM
          setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }), 50)
          const msg = faltamSlots > 0
            ? `🎉 Ótimo! Dados completos. Adicione mais ${faltamSlots} amiga${faltamSlots !== 1 ? 's' : ''} para chegar em 20!`
            : '🎉 Meta atingida! 20 indicações enviadas!'
          setToast(msg)
          setTimeout(() => setToast(null), 5000)
        }
      } else {
        alert(data.error || 'Erro ao enviar')
      }
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

  if (aguardandoContatos) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0D0B14 0%, #120D1F 100%)' }}>
      <div className="text-center max-w-xs w-full">
        <div className="w-16 h-16 rounded-full bg-[#1C1528] border border-[#2D2040] flex items-center justify-center mx-auto mb-5">
          <span className="text-2xl">🌿</span>
        </div>
        <h2 className="text-white font-semibold text-lg mb-2">Aguarde, seus contatos estão sendo carregados...</h2>
        <p className="text-[#6B7280] text-sm mb-6">Isso leva alguns segundos.</p>
        <div className="w-full bg-[#1C1528] rounded-full h-2 overflow-hidden">
          <div className="h-full rounded-full bg-[#7C3AED] animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  )

  if (timeoutContatos) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0D0B14 0%, #120D1F 100%)' }}>
      <div className="text-center max-w-xs">
        <div className="w-16 h-16 rounded-full bg-[#1C1528] border border-[#2D2040] flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔍</span>
        </div>
        <h2 className="text-white font-semibold text-lg mb-2">Não encontramos seus contatos ainda.</h2>
        <p className="text-[#6B7280] text-sm mb-6">Se você já enviou seus contatos pelo WhatsApp, tente atualizar a página.</p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
        >
          Atualizar página
        </button>
      </div>
    </div>
  )

  const enviarMensagemAuto = async (contato: Contato) => {
    const tel = contato.telefone.replace(/\D/g, '')
    if (enviandoMsg[tel] || msgEnviada[tel]) return
    setEnviandoMsg(prev => ({ ...prev, [tel]: true }))
    try {
      const res = await fetch('/api/indicar/enviar-mensagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, telefone_referido: tel }),
      })
      const data = await res.json()
      if (data.ok) setMsgEnviada(prev => ({ ...prev, [tel]: true }))
      else alert(data.error || 'Erro ao enviar')
    } catch {
      alert('Erro ao enviar mensagem')
    } finally {
      setEnviandoMsg(prev => ({ ...prev, [tel]: false }))
    }
  }

  const toggleSelecionada = (tel: string) => {
    setSelecionadas(prev => {
      const next = new Set(prev)
      next.has(tel) ? next.delete(tel) : next.add(tel)
      return next
    })
  }

  const toggleTodasSelecionadas = () => {
    const pendentes = jaEnviados
      .filter(c => !msgEnviada[c.telefone.replace(/\D/g, '')])
      .map(c => c.telefone.replace(/\D/g, ''))
    const todasMarcadas = pendentes.every(t => selecionadas.has(t))
    setSelecionadas(todasMarcadas ? new Set() : new Set(pendentes))
  }

  const enviarSelecionadas = async () => {
    if (enviandoTodas || selecionadas.size === 0) return
    setEnviandoTodas(true)
    const paraEnviar = jaEnviados.filter(c => selecionadas.has(c.telefone.replace(/\D/g, '')))
    await Promise.all(paraEnviar.map(c => enviarMensagemAuto(c)))
    setSelecionadas(new Set())
    setEnviandoTodas(false)
  }

  const enviarParaTodas = async () => {
    if (enviandoTodas) return
    setEnviandoTodas(true)
    const pendentes = jaEnviados.filter(c => {
      const tel = c.telefone.replace(/\D/g, '')
      return !msgEnviada[tel] && !enviandoMsg[tel]
    })
    await Promise.all(pendentes.map(c => enviarMensagemAuto(c)))
    setSelecionadas(new Set())
    setEnviandoTodas(false)
  }

  if (sucesso) {
    const contatosMissao = jaEnviados
    const totalEnviados = Object.values(msgEnviada).filter(Boolean).length
    return (
      <div className="min-h-screen pb-20" style={{ background: 'linear-gradient(135deg, #0D0B14 0%, #120D1F 100%)' }}>
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full opacity-30"
              style={{ background: 'radial-gradient(ellipse, #10B981 0%, transparent 70%)' }} />
          </div>
          <div className="relative pt-14 pb-8 px-6 text-center">
            <div className="relative mx-auto mb-5 w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-emerald-400" />
              </div>
            </div>
            <h1 className="text-white text-2xl font-bold tracking-tight mb-2">Missão completa! 🎉</h1>
            <p className="text-[#9CA3AF] text-sm leading-relaxed max-w-xs mx-auto">
              Envie para todas de uma vez ou individualmente — 1 clique por amiga!
            </p>
            {totalEnviados > 0 && (
              <p className="text-emerald-400 text-sm font-semibold mt-2">
                ✅ {totalEnviados} de {contatosMissao.length} enviadas
              </p>
            )}
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 pb-2 space-y-2">
          {totalEnviados < contatosMissao.length && (
            <>
              {/* Botão enviar todas */}
              <button
                onClick={enviarParaTodas}
                disabled={enviandoTodas}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-95 disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
              >
                {enviandoTodas && selecionadas.size === 0 ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando... {totalEnviados}/{contatosMissao.length}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Enviar para todas as {contatosMissao.length - totalEnviados} pendentes
                  </>
                )}
              </button>

              {/* Linha de seleção */}
              <div className="flex items-center justify-between px-1">
                <button onClick={toggleTodasSelecionadas} className="text-[#A78BFA] text-xs font-medium">
                  {selecionadas.size > 0 ? 'Desmarcar todas' : 'Selecionar todas'}
                </button>
                {selecionadas.size > 0 && (
                  <button
                    onClick={enviarSelecionadas}
                    disabled={enviandoTodas}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-70"
                    style={{ background: 'linear-gradient(135deg, #25D366, #1DA851)' }}
                  >
                    {enviandoTodas ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <MessageCircle className="w-3.5 h-3.5" />
                    )}
                    Enviar para {selecionadas.size} selecionada{selecionadas.size !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </>
          )}
          {totalEnviados === contatosMissao.length && contatosMissao.length > 0 && (
            <div className="w-full py-4 rounded-2xl text-center bg-emerald-900/30 border border-emerald-500/30">
              <p className="text-emerald-400 font-bold">🎊 Todas as {contatosMissao.length} mensagens enviadas!</p>
            </div>
          )}
        </div>

        <div className="max-w-lg mx-auto px-4 space-y-3 mt-3">
          {contatosMissao.map((contato, idx) => {
            const tel = contato.telefone.replace(/\D/g, '')
            const enviando = enviandoMsg[tel]
            const enviado = msgEnviada[tel]
            return (
            <div key={contato.id} className={`rounded-2xl border overflow-hidden transition-all ${enviado ? 'border-emerald-500/40' : selecionadas.has(tel) ? 'border-[#7C3AED]/60' : 'border-[#1F1935]'}`}
              style={{ background: enviado ? 'linear-gradient(160deg, #0D1F16 0%, #0a1a12 100%)' : selecionadas.has(tel) ? 'linear-gradient(160deg, #1a1035 0%, #130d28 100%)' : 'linear-gradient(160deg, #131020 0%, #0F0D1A 100%)' }}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  {/* Checkbox de seleção */}
                  {!enviado && (
                    <button onClick={() => toggleSelecionada(tel)} className="flex-shrink-0">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selecionadas.has(tel) ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-[#4B5563]'}`}>
                        {selecionadas.has(tel) && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                    </button>
                  )}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${enviado ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-[#7C3AED]/20 border border-[#7C3AED]/30'}`}>
                    {enviado
                      ? <span className="text-emerald-400 text-sm">✅</span>
                      : <span className="text-[11px] text-[#A78BFA] font-bold">{idx + 1}</span>
                    }
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{contato.nome || 'Amiga'}</p>
                    <p className={`text-xs ${enviado ? 'text-emerald-500' : 'text-[#4B5563]'}`}>
                      {enviado ? 'Mensagem enviada ✓' : contato.telefone}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => enviarMensagemAuto(contato)}
                  disabled={enviando || enviado}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
                  style={{ background: enviado ? '#1a3d2b' : 'linear-gradient(135deg, #25D366, #1DA851)' }}
                >
                  {enviando
                    ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : enviado
                      ? <span>Enviado ✅</span>
                      : <><MessageCircle className="w-3.5 h-3.5" />Enviar</>
                  }
                </button>
              </div>
            </div>
          )})}

          <div className="bg-[#1A1528] border border-[#2D2040] rounded-2xl px-4 py-3.5 mt-2">
            <p className="text-[#9CA3AF] text-xs leading-relaxed text-center">
              Avisa suas amigas que vão receber uma ligação do número{' '}
              <strong className="text-white">+55 17 2786-2778</strong>
              {' '}— pode atender com tranquilidade! 📞
            </p>
          </div>
        </div>
      </div>
    )
  }

  const nomeIndicador = indicador?.nome?.split(' ')[0] || 'você'
  const totalValidos = contatos.filter(c => c.telefone.replace(/\D/g, '').length >= 8).length
  const totalJaEnviados = jaEnviados.length

  // Contatos no formulário que ainda não foram confirmados no banco
  const telefonesConfirmados = new Set(jaEnviados.map(c => c.telefone.replace(/\D/g, '')))
  const pendentesNoForm = contatos.filter(c => {
    const tel = c.telefone.replace(/\D/g, '')
    return tel.length >= 8 && !telefonesConfirmados.has(tel)
  }).length

  const totalConhecidos = totalJaEnviados + pendentesNoForm
  const faltam = Math.max(0, 20 - totalConhecidos)

  // Problema 2: conta sem prof/hobby tanto os confirmados quanto os pendentes no formulário
  const semProfHobbyConfirmados = jaEnviados.filter(c => !c.profissao || !c.hobby).length
  const semProfHobbyPendentes = contatos.filter(c => {
    const tel = c.telefone.replace(/\D/g, '')
    return tel.length >= 8 && !telefonesConfirmados.has(tel) && (!c.profissao || !c.hobby)
  }).length
  const semProfHobby = semProfHobbyConfirmados + semProfHobbyPendentes

  // Problema 1: botão mostra só os que vão ser NOVOS ou atualizados com prof/hobby
  const novosNoForm = contatos.filter(c => {
    const tel = c.telefone.replace(/\D/g, '')
    return tel.length >= 8 && !telefonesConfirmados.has(tel)
  }).length
  const atualizandoProfHobby = contatos.filter(c => {
    const tel = c.telefone.replace(/\D/g, '')
    return tel.length >= 8 && telefonesConfirmados.has(tel) && (c.profissao || c.hobby)
  }).length
  const totalBotao = novosNoForm + atualizandoProfHobby || totalValidos

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

        {/* Banner de progresso */}
        {totalConhecidos > 0 && (
          <div className="bg-[#1A1528] border border-[#3D2D6B] rounded-2xl px-4 py-3.5 space-y-2">
            <p className="text-white text-sm font-semibold">
              {totalConhecidos >= 20
                ? '🎉 Meta atingida! 20 indicações enviadas'
                : `✅ ${totalConhecidos} de 20 · faltam ${faltam} para completar`}
            </p>
            <div className="w-full bg-[#0D0B14] rounded-full h-1.5">
              <div className="bg-[#7C3AED] h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (totalConhecidos / 20) * 100)}%` }} />
            </div>
            {pendentesNoForm > 0 && (
              <p className="text-[#A78BFA] text-xs">
                📋 {totalJaEnviados} confirmadas · {pendentesNoForm} aguardando envio
              </p>
            )}
            {semProfHobby > 0 && (
              <p className="text-[#F59E0B] text-xs">
                ⚠️ {semProfHobby} amiga{semProfHobby !== 1 ? 's' : ''} sem profissão/hobby — preencha abaixo para Ana personalizar o contato
              </p>
            )}
          </div>
        )}

        {/* Toast de parabéns após completar dados */}
        {toast && (
          <div className="bg-emerald-900/40 border border-emerald-500/30 rounded-2xl px-4 py-3 text-center">
            <p className="text-emerald-300 text-sm font-medium">{toast}</p>
          </div>
        )}

        {/* CTA principal: agenda nativa se disponível, WhatsApp como fallback */}
        {temContacts ? (
          <button
            onClick={importarMultiplos}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
          >
            <BookUser className="w-4 h-4" />
            Selecionar amigas da agenda
          </button>
        ) : (
          <>
            <button
              onClick={abrirWhatsAppImport}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #25D366, #1DA851)', boxShadow: '0 4px 20px rgba(37,211,102,0.35)' }}
            >
              <MessageCircle className="w-4 h-4" />
              {importandoWpp ? 'Aguardando contatos...' : 'Importar amigas pelo WhatsApp'}
            </button>

            {importandoWpp && (
              <div className="bg-[#1A1528] border border-[#25D366]/20 rounded-2xl px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
                  <p className="text-white text-sm font-medium">Aguardando seus contatos...</p>
                </div>
                <p className="text-[#6B7280] text-xs">
                  No WhatsApp: toque em <strong className="text-white">Anexar → Contato</strong>, selecione suas amigas e envie
                </p>
              </div>
            )}
          </>
        )}

        <p className="text-[#4B5563] text-xs text-center py-1">
          — ou preencha manualmente abaixo —
        </p>

        {/* Cards de contato */}
        {contatos.map((contato, idx) => {
          const precisaCompletar = !!contato.telefone && (!contato.profissao || !contato.hobby)
          return (
          <div key={contato.id}
            className={`rounded-2xl border overflow-hidden transition-all ${precisaCompletar ? 'border-[#F59E0B]/40' : 'border-[#1F1935]'}`}
            style={{ background: 'linear-gradient(160deg, #131020 0%, #0F0D1A 100%)' }}>
            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1F1935]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center">
                  <span className="text-[10px] text-[#A78BFA] font-bold">{idx + 1}</span>
                </div>
                <span className="text-[#9CA3AF] text-xs font-medium">
                  {contato.nome || `Amiga ${idx + 1}`}
                </span>
                {precisaCompletar && (
                  <span className="text-[#F59E0B] text-[10px] font-medium">completar dados</span>
                )}
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
                    ref={precisaCompletar && idx === contatos.findIndex(c => !!c.telefone && (!c.profissao || !c.hobby)) ? primeiroVazioRef : undefined}
                    className={`w-full bg-[#0D0B14] border rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#374151] focus:outline-none focus:border-[#7C3AED] transition-colors ${precisaCompletar ? 'border-[#F59E0B]/50' : 'border-[#1F1935]'}`}
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
          )
        })}

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
              ? `Enviar ${totalConhecidos} indicaç${totalConhecidos !== 1 ? 'ões' : 'ão'}`
              : 'Preencha ao menos um telefone'}
        </button>

        <p className="text-center text-[#374151] text-xs pb-6">
          WhatsApp é obrigatório · Profissão e hobby ajudam Ana a personalizar
        </p>
      </div>
    </div>
  )
}
