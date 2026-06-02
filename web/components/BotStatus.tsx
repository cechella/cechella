'use client'
import { useEffect, useState } from 'react'

export function BotStatus() {
  const [latency, setLatency] = useState(12)
  const [cycles, setCycles] = useState(47)

  useEffect(() => {
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/user123`)
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.bot_latency_ms) setLatency(data.bot_latency_ms)
    }
    return () => ws.close()
  }, [])

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        <p className="font-semibold">Bot Ativo</p>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Latencia VPS</span>
          <span className="font-mono text-sm">{latency}ms</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Uptime</span>
          <span className="text-green-400 font-mono text-sm">99.8%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Ciclos hoje</span>
          <span className="font-mono text-sm">{cycles}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Exchange</span>
          <span className="text-yellow-400 font-mono text-sm">Binance</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Servidor</span>
          <span className="font-mono text-sm">Tokyo</span>
        </div>
      </div>
    </div>
  )
}
