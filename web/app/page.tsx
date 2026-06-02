import { DashboardHeader } from '@/components/DashboardHeader'
import { BalanceCard } from '@/components/BalanceCard'
import { ProfitChart } from '@/components/ProfitChart'
import { TradesFeed } from '@/components/TradesFeed'
import { BotStatus } from '@/components/BotStatus'
import { AffiliateCard } from '@/components/AffiliateCard'

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <DashboardHeader />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <BalanceCard />
        <BotStatus />
        <AffiliateCard />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <ProfitChart />
        <TradesFeed />
      </div>
    </main>
  )
}
