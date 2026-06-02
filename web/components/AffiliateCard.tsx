'use client'
import { useState } from 'react'

export function AffiliateCard() {
  const [copied, setCopied] = useState(false)
  const referralUrl = 'https://cechella.app/ref/USER123'

  const copy = () => {
    navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h3 className="font-semibold">Rede de Afiliados</h3>
      <p className="text-gray-400 text-xs mt-1 mb-4">
        Ganhe 10% do lucro dos seus indicados
      </p>
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Nivel 1 (10%)</span>
          <span className="text-sm">0 usuarios</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Nivel 2 (3%)</span>
          <span className="text-sm">0 usuarios</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Ganhos este mes</span>
          <span className="text-green-400 text-sm">$0.00</span>
        </div>
      </div>
      <button
        onClick={copy}
        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2 rounded-lg text-sm transition-colors"
      >
        {copied ? 'Link copiado!' : 'Copiar link de indicacao'}
      </button>
    </div>
  )
}
