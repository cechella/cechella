'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Stage = 'loading' | 'form' | 'processing' | 'success' | 'recovery' | 'options' | 'error'

export default function PagarPage() {
  const { token } = useParams<{ token: string }>()
  const [stage, setStage] = useState<Stage>('loading')
  const [leadNome, setLeadNome] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [valid, setValid] = useState<Record<string, boolean>>({})
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [installments, setInstallments] = useState(1)
  const [debugLog, setDebugLog] = useState<string[]>([])

  function log(msg: string) {
    setDebugLog(p => [...p, msg])
  }

  useEffect(() => {
    if (!token) return
    fetch(`/api/pagar?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valido) { setLeadNome(data.nome || ''); setStage('form') }
        else { setErrorMsg('Link inválido ou expirado.'); setStage('error') }
      })
      .catch(() => { setErrorMsg('Erro ao carregar. Tente novamente.'); setStage('error') })
  }, [token])

  function maskCardNumber(v: string) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  function maskExpiry(v: string) {
    const digits = v.replace(/\D/g, '').slice(0, 4)
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2)
    return digits
  }

  function maskCpf(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length > 9) return d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9)
    if (d.length > 6) return d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6)
    if (d.length > 3) return d.slice(0,3)+'.'+d.slice(3)
    return d
  }

  const allValid = (() => {
    if (cardNumber.replace(/\D/g, '').length !== 16) return false
    const parts = expiry.split('/')
    const m = parseInt(parts[0] || '0')
    const y = parseInt('20' + (parts[1] || '0'))
    const now = new Date()
    if (!parts[1] || parts[1].length < 2 || m < 1 || m > 12 || y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1)) return false
    if (cvv.length < 3) return false
    if (!nome || nome.trim().length < 2) return false
    if (cpf.replace(/\D/g, '').length !== 11) return false
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return false
    return true
  })()

  async function handlePagar() {
    setFormError('')
    setDebugLog([])

    const erros: Record<string, string> = {}
    if (cardNumber.replace(/\D/g, '').length !== 16) erros['cardNumber'] = 'Número inválido'
    const parts = expiry.split('/')
    const m = parseInt(parts[0] || '0')
    const y = parseInt('20' + (parts[1] || '0'))
    const now = new Date()
    if (!parts[1] || parts[1].length < 2 || m < 1 || m > 12 || y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1)) erros['expiry'] = 'Validade inválida'
    if (cvv.length < 3) erros['cvv'] = 'CVV inválido'
    if (!nome || nome.trim().length < 2) erros['nome'] = 'Informe o nome'
    if (cpf.replace(/\D/g, '').length !== 11) erros['cpf'] = 'CPF deve ter 11 dígitos'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) erros['email'] = 'E-mail inválido'
    if (Object.keys(erros).length > 0) { setFieldErrors(erros); return }
    setFieldErrors({})

    setStage('processing')
    await processarPagamento('avista')
  }

  async function chamarApi(metodo: 'avista' | 'recorrente'): Promise<any> {
    const parts = expiry.split('/')
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 9000)
    try {
      const resp = await fetch('/api/pagar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          metodo,
          email: email.trim(),
          cardNumber: cardNumber.replace(/\D/g, ''),
          cardholderName: nome.trim(),
          cardExpirationMonth: parts[0],
          cardExpirationYear: '20' + parts[1],
          securityCode: cvv,
          identificationType: 'CPF',
          identificationNumber: cpf.replace(/\D/g, ''),
          installments: metodo === 'avista' ? installments : 1,
        }),
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      try { return await resp.json() } catch { return {} }
    } catch {
      clearTimeout(timer)
      return { aprovado: false, _erro: 'conexao' }
    }
  }

  async function processarPagamento(metodo: 'avista' | 'recorrente') {
    const r1 = await chamarApi(metodo)
    log(`[${metodo}] ${JSON.stringify(r1)}`)

    if (r1.aprovado) { setStage('success'); return }

    if (r1._erro) {
      setErrorMsg('Erro de conexão. Tente novamente.')
      setStage('error')
      return
    }

    if (metodo === 'avista' && r1.proxima === 'recorrente') {
        return processarPagamento('recorrente')
    }

    if (r1.recuperacao === 'outro_cartao') { setStage('recovery'); return }
    if (r1.recuperacao === 'opcoes') { setStage('options'); return }

    setErrorMsg(r1.mensagem || 'Pagamento não aprovado.')
    setStage('error')
  }

  function resetForm() {
    setCardNumber(''); setExpiry(''); setCvv(''); setNome(''); setCpf(''); setEmail('')
    setValid({}); setFieldErrors({}); setFormError(''); setDebugLog([])
    setStage('form')
  }

  const inputCls = (field: string) => {
    let cls = 'pay-input'
    if (fieldErrors[field]) cls += ' inp-error'
    else if (valid[field]) cls += ' inp-valid'
    return cls
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">H</div>
          <h1 className="text-white font-semibold text-lg">Hormone Ecosystem</h1>
          <p className="text-zinc-400 text-sm mt-1">Programa Hormonal — Dr. Vinícius Cechella</p>
        </div>

        {stage === 'loading' && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400 text-sm">Carregando...</p>
          </div>
        )}

        {stage === 'form' && (
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6">
            {leadNome && (
              <p className="text-zinc-400 text-sm mb-5">
                Olá, <span className="text-white font-medium">{leadNome.split(' ')[0]}</span>! Finalize seu acesso abaixo.
              </p>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Número do cartão</label>
                <div className="relative">
                  <input type="tel" inputMode="numeric" placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={e => {
                      const v = maskCardNumber(e.target.value)
                      setCardNumber(v)
                      setValid(p => ({ ...p, cardNumber: v.replace(/\D/g, '').length === 16 }))
                    }}
                    className={inputCls('cardNumber')} />
                  {valid['cardNumber'] && <span className="mp-check">✓</span>}
                </div>
                {fieldErrors['cardNumber'] && <p className="text-red-400 text-xs mt-1">{fieldErrors['cardNumber']}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Validade</label>
                  <div className="relative">
                    <input type="tel" inputMode="numeric" placeholder="MM/AA"
                      value={expiry}
                      onChange={e => {
                        const v = maskExpiry(e.target.value)
                        setExpiry(v)
                        const parts = v.split('/')
                        const m = parseInt(parts[0] || '0')
                        const y = parseInt('20' + (parts[1] || '0'))
                        const now = new Date()
                        const ok = parts[1]?.length === 2 && m >= 1 && m <= 12 && (y > now.getFullYear() || (y === now.getFullYear() && m >= now.getMonth() + 1))
                        setValid(p => ({ ...p, expiry: ok }))
                      }}
                      className={inputCls('expiry')} />
                    {valid['expiry'] && <span className="mp-check">✓</span>}
                  </div>
                  {fieldErrors['expiry'] && <p className="text-red-400 text-xs mt-1">{fieldErrors['expiry']}</p>}
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">CVV</label>
                  <div className="relative">
                    <input type="tel" inputMode="numeric" placeholder="123" maxLength={4}
                      value={cvv}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                        setCvv(v)
                        setValid(p => ({ ...p, cvv: v.length >= 3 }))
                      }}
                      className={inputCls('cvv')} />
                    {valid['cvv'] && <span className="mp-check">✓</span>}
                  </div>
                  {fieldErrors['cvv'] && <p className="text-red-400 text-xs mt-1">{fieldErrors['cvv']}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Nome no cartão</label>
                <div className="relative">
                  <input type="text" placeholder="Nome como no cartão"
                    value={nome}
                    onKeyDown={e => { if (/[\d!@#$%^&*()_+=[\]{};:'",.<>?/\\|`~]/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault() }}
                    onChange={e => {
                      setNome(e.target.value)
                      setValid(p => ({ ...p, nome: e.target.value.trim().length >= 2 }))
                    }}
                    className={inputCls('nome')} />
                  {valid['nome'] && <span className="mp-check">✓</span>}
                </div>
                {fieldErrors['nome'] && <p className="text-red-400 text-xs mt-1">{fieldErrors['nome']}</p>}
              </div>

              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">CPF</label>
                <div className="relative">
                  <input type="tel" inputMode="numeric" placeholder="000.000.000-00"
                    value={cpf}
                    onChange={e => {
                      const v = maskCpf(e.target.value)
                      setCpf(v)
                      setValid(p => ({ ...p, cpf: v.replace(/\D/g, '').length === 11 }))
                    }}
                    className={inputCls('cpf')} />
                  {valid['cpf'] && <span className="mp-check">✓</span>}
                </div>
                {fieldErrors['cpf'] && <p className="text-red-400 text-xs mt-1">{fieldErrors['cpf']}</p>}
              </div>

              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">E-mail</label>
                <div className="relative">
                  <input type="email" placeholder="E-mail"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value)
                      setValid(p => ({ ...p, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value.trim()) }))
                    }}
                    className={inputCls('email')} />
                  {valid['email'] && <span className="mp-check">✓</span>}
                </div>
                {fieldErrors['email'] && <p className="text-red-400 text-xs mt-1">{fieldErrors['email']}</p>}
              </div>

              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Parcelas</label>
                <select
                  value={installments}
                  onChange={e => setInstallments(Number(e.target.value))}
                  className="pay-input"
                  style={{ paddingRight: '14px' }}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>
                      {n}x de R$ {(1.00 / n).toFixed(2).replace('.', ',')} {n === 1 ? '(sem juros)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formError && <p className="text-red-400 text-sm text-center mt-3">{formError}</p>}

            <button type="button" onClick={handlePagar} disabled={!allValid}
              className={`w-full mt-4 py-4 rounded-xl font-semibold text-base transition-all ${allValid ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white active:opacity-80' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'}`}>
              Finalizar pagamento
            </button>

            <p className="text-center text-zinc-600 text-xs mt-4 flex items-center justify-center gap-1">
              <span>🔒</span> Pagamento 100% seguro — Mercado Pago
            </p>
          </div>
        )}

        {stage === 'processing' && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">Processando pagamento...</p>
            <p className="text-zinc-500 text-sm mt-2">Aguarde, isso leva alguns segundos.</p>
          </div>
        )}

        {stage === 'success' && (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Dados recebidos com sucesso!</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Seu pagamento está sendo processado.<br />
              Em breve você receberá uma confirmação no WhatsApp. 💜
            </p>
          </div>
        )}

        {stage === 'recovery' && (
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">😅</div>
            <h2 className="text-white font-semibold text-lg mb-2">Tivemos um pequeno problema</h2>
            <p className="text-zinc-400 text-sm mb-6">Não foi possível processar com esse cartão. Tem outro disponível?</p>
            <button onClick={resetForm} className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold text-sm">
              Tentar com outro cartão
            </button>
          </div>
        )}

        {stage === 'options' && (
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6">
            <div className="text-3xl mb-3 text-center">💜</div>
            <h2 className="text-white font-semibold text-lg mb-1 text-center">Preparamos opções especiais</h2>
            <p className="text-zinc-400 text-sm mb-5 text-center">Nossa equipe separou condições exclusivas para você:</p>
            <div className="space-y-3">
              <button onClick={() => window.location.href = 'https://wa.me/message/ana'} className="w-full py-3 px-4 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] text-left">
                <div className="text-white font-medium text-sm">PIX + parcelamento</div>
                <div className="text-zinc-500 text-xs mt-0.5">Entrada no PIX + restante em parcelas</div>
              </button>
              <button onClick={() => window.location.href = 'https://wa.me/message/ana'} className="w-full py-3 px-4 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] text-left">
                <div className="text-white font-medium text-sm">Débito automático mensal</div>
                <div className="text-zinc-500 text-xs mt-0.5">6 cobranças automáticas no cartão</div>
              </button>
              <button onClick={resetForm} className="w-full py-3 px-4 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] text-left">
                <div className="text-white font-medium text-sm">Tentar outro cartão</div>
                <div className="text-zinc-500 text-xs mt-0.5">Use um cartão diferente</div>
              </button>
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div className="text-center py-10">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-white font-medium mb-2">Não foi possível continuar</p>
            <p className="text-zinc-400 text-sm mb-4">{errorMsg}</p>
          </div>
        )}

      </div>

      <style jsx global>{`
        .pay-input {
          display: block; width: 100%; height: 52px;
          background: #ffffff; border: 1px solid #D1D5DB;
          border-radius: 10px; padding: 0 44px 0 14px;
          color: #111111; font-size: 16px;
          font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
          outline: none; transition: border-color 0.2s;
          box-sizing: border-box; -webkit-appearance: none;
        }
        .pay-input:focus { border-color: #7B3FE4; }
        .pay-input::placeholder { color: #9CA3AF; }
        .inp-valid { border-color: #22c55e !important; }
        .inp-error { border-color: #ef4444 !important; }
        .mp-check {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%);
          color: #22c55e; font-weight: bold; font-size: 16px; pointer-events: none;
        }
      `}</style>
    </div>
  )
}
