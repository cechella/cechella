'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { PhoneCall, PhoneOff, Loader2, CheckCircle2, XCircle } from 'lucide-react'

const VAPI_API_KEY = 'e3bc519a-7466-4450-bcfc-2ae9566d9e2f'
const ASSISTANT_ID = 'f2ab9277-dcf3-4fe5-9ac4-5cd0c45229c5'
const PHONE_NUMBER_ID = '41636d14-3f1f-4343-8d1c-f16327403690'

export default function VozTestPage() {
  const [telefone, setTelefone] = useState('+5548988416899')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [callId, setCallId] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const dispararLigacao = async () => {
    setStatus('loading')
    setCallId('')
    setErrorMsg('')

    try {
      const res = await fetch('https://api.vapi.ai/call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantId: ASSISTANT_ID,
          phoneNumberId: PHONE_NUMBER_ID,
          customer: { number: telefone },
        }),
      })

      const data = await res.json()

      if (res.ok && data.id) {
        setCallId(data.id)
        setStatus('success')
      } else {
        setErrorMsg(data.message || data.error || JSON.stringify(data))
        setStatus('error')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro desconhecido')
      setStatus('error')
    }
  }

  return (
    <div className="flex h-screen bg-[#0A0A0B]">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Agente IA Voz — Teste" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-lg mx-auto mt-8">

            {/* Card */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center shadow-[0_0_15px_rgba(123,63,228,0.3)]">
                  <PhoneCall className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-base">Disparar Ligação PTL</h2>
                  <p className="text-[#71717A] text-xs">Ana — Agente IA Voz</p>
                </div>
              </div>

              {/* Input */}
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                Número do lead (formato internacional)
              </label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="+5548988416899"
                className="w-full bg-[#18181A] border border-[#2C2C2E] rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#3F3F46] focus:outline-none focus:border-[#7B3FE4] transition-colors mb-4"
              />

              {/* Botão */}
              <button
                onClick={dispararLigacao}
                disabled={status === 'loading' || !telefone}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(123,63,228,0.3)]"
              >
                {status === 'loading' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Ligando...</>
                ) : (
                  <><PhoneCall className="w-4 h-4" /> Ligar Agora</>
                )}
              </button>

              {/* Status */}
              {status === 'success' && (
                <div className="mt-4 flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-emerald-400 font-medium text-sm">Ligação criada com sucesso!</p>
                    <p className="text-emerald-400/70 text-xs mt-0.5 font-mono break-all">ID: {callId}</p>
                    <p className="text-[#71717A] text-xs mt-1">Aguarde a chamada no número {telefone}</p>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="mt-4 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium text-sm">Erro ao criar ligação</p>
                    <p className="text-red-400/70 text-xs mt-0.5 break-all">{errorMsg}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="mt-4 bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
              <p className="text-[#3F3F46] text-xs font-mono">Assistente: Agente IA ana</p>
              <p className="text-[#3F3F46] text-xs font-mono mt-1">ID: {ASSISTANT_ID}</p>
              <p className="text-[#3F3F46] text-xs font-mono mt-1">Número Twilio: +17196742872</p>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
