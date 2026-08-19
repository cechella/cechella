'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { SimuladorContent } from './SimuladorContent'
import { SimuladorGoldContent } from './SimuladorGoldContent'

type Mode = 'controller' | 'gold'

export default function SimuladorVozPage() {
  const [mode, setMode] = useState<Mode>('controller')

  return (
    <div className="flex h-screen bg-[#0A0A0B] text-white overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-[#0A0A0B]">
          <button
            onClick={() => setMode('controller')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${
              mode === 'controller'
                ? 'bg-blue-600 text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <span>⚙</span> Controller
          </button>
          <button
            onClick={() => setMode('gold')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${
              mode === 'gold'
                ? 'bg-amber-500 text-black'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <span>✦</span> Gold
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {mode === 'controller' ? <SimuladorContent /> : <SimuladorGoldContent />}
        </div>
      </div>
    </div>
  )
}
