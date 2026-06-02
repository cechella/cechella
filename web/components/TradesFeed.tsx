'use client'
import { useEffect, useState } from 'react'

interface Trade {
  time: string
  triangle: string
  profit: number
  status: 'success' | 'failed'
}

export function TradesFeed() {
  const [trades, setTrades] = useState<Trade[]>([])

  useEffect(() => {
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/user123`)
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'new_trade') {
        setTrades(prev => [data as Trade, ...prev].slice(0, 50))
      }
    }
    return () => ws.close()
  }, [])

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h3 className="font-semibold mb-4">Ultimos Trades</h3>
      <div className="space-y-1 max-h-72 overflow-y-auto">
        {trades.map((t, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
            <div>
              <p className="text-sm font-mono text-gray-300">{t.triangle}</p>
              <p className="text-xs text-gray-500">{t.time}</p>
            </div>
            <span className={`font-semibold text-sm ${
              t.status === 'success' ? 'text-green-400' : 'text-red-400'
            }`}>
              {t.status === 'success' ? '+' : ''}{t.profit.toFixed(2)} USDT
            </span>
          </div>
        ))}
        {trades.length === 0 && (
          <p className="text-gray-500 text-sm py-8 text-center">
            Aguardando trades...
          </p>
        )}
      </div>
    </div>
  )
}
