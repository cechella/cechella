'use client'
import { useEffect, useRef } from 'react'

export function ProfitChart() {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // TradingView Lightweight Charts — inicializado aqui
    // Dados via WebSocket em tempo real
  }, [])

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h3 className="font-semibold mb-4">Evolucao do Saldo</h3>
      <div
        ref={chartRef}
        className="h-64 flex items-center justify-center text-gray-500 text-sm border border-gray-800 rounded-lg"
      >
        Grafico em tempo real (TradingView Lightweight Charts)
      </div>
    </div>
  )
}
