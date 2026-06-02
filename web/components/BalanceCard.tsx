'use client'
import { useEffect, useState } from 'react'

interface Stats {
  balance: number
  profit_today: number
  profit_pct_today: number
  profit_month?: number
  profit_pct_month?: number
}

export function BalanceCard() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/user123`)
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'stats_update') setStats(data)
    }
    return () => ws.close()
  }, [])

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <p className="text-gray-400 text-sm">Saldo Total</p>
      <p className="text-4xl font-bold mt-1">
        ${stats?.balance.toFixed(2) ?? '---'}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-400 text-xs">Hoje</p>
          <p className="text-green-400 font-semibold text-sm">
            +${stats?.profit_today.toFixed(2)} (+{stats?.profit_pct_today.toFixed(2)}%)
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Este mes</p>
          <p className="text-green-400 font-semibold text-sm">
            +${stats?.profit_month?.toFixed(2) ?? '0.00'}
          </p>
        </div>
      </div>
    </div>
  )
}
