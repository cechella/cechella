'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { SimuladorContent } from './SimuladorContent'

export default function SimuladorVozPage() {
  return (
    <div className="flex h-screen bg-[#0A0A0B] text-white overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <div className="flex-1 overflow-hidden">
          <SimuladorContent />
        </div>
      </div>
    </div>
  )
}
