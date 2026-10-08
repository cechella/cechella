'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { SimuladorGoldContent } from './SimuladorGoldContent'

export default function SimuladorVozPage() {
  return (
    <div className="flex h-screen bg-[#0A0A0B] text-white overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-[#0A0A0B]">
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${
              'bg-amber-500 text-black'
            }`}
          >
            <span>✦</span> ANA MASTER
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <SimuladorGoldContent />
        </div>
      </div>
    </div>
  )
}
