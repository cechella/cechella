import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: {
    value: number
    label?: string
  }
  subtitle?: string
  gradient?: boolean
}

export function StatsCard({ title, value, icon, trend, subtitle, gradient }: StatsCardProps) {
  const isPositive = trend && trend.value > 0
  const isNegative = trend && trend.value < 0

  return (
    <div className={`rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-1 ${
      gradient
        ? 'bg-gradient-to-br from-[#7B3FE4]/20 to-[#3B82F6]/20 border-[#7B3FE4]/30'
        : 'bg-[#111113] border-[#1C1C1E] hover:border-[#27272A]'
    } shadow-[0_4px_24px_rgba(0,0,0,0.4)]`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          gradient ? 'bg-white/10' : 'bg-gradient-to-br from-[#7B3FE4]/20 to-[#3B82F6]/20'
        }`}>
          <span className="text-[#7B3FE4]">{icon}</span>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400' :
            isNegative ? 'bg-red-500/10 text-red-400' :
            'bg-[#27272A] text-[#71717A]'
          }`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> :
             isNegative ? <TrendingDown className="w-3 h-3" /> :
             <Minus className="w-3 h-3" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-[#A1A1AA] mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-[#71717A] mt-1">{subtitle}</p>}
        {trend?.label && <p className="text-xs text-[#52525B] mt-1">{trend.label}</p>}
      </div>
    </div>
  )
}
