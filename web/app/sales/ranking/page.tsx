import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Trophy, TrendingUp, Award, Star, Medal } from 'lucide-react'

const topThree = [
  { rank: 1, name: 'Fernanda Souza', city: 'São Paulo, SP', conversions: 34, revenue: 'R$ 163.200', points: 8420, badge: '👑', color: 'from-[#F59E0B] to-[#D97706]', borderColor: '#F59E0B' },
  { rank: 2, name: 'Rodrigo Santos', city: 'Rio de Janeiro, RJ', conversions: 28, revenue: 'R$ 134.400', points: 7180, badge: '🥈', color: 'from-[#94A3B8] to-[#64748B]', borderColor: '#94A3B8' },
  { rank: 3, name: 'Carolina Alves', city: 'Belo Horizonte, MG', conversions: 25, revenue: 'R$ 120.000', points: 6290, badge: '🥉', color: 'from-[#CD7C3A] to-[#B45309]', borderColor: '#CD7C3A' },
]

const fullRanking = [
  { rank: 4, name: 'Juliana Martins', city: 'Curitiba, PR', conversions: 18, revenue: 'R$ 86.400', points: 4820, isMe: true },
  { rank: 5, name: 'Marcos Ferreira', city: 'Porto Alegre, RS', conversions: 16, revenue: 'R$ 76.800', points: 4210 },
  { rank: 6, name: 'Priscila Lima', city: 'Salvador, BA', conversions: 15, revenue: 'R$ 72.000', points: 3980 },
  { rank: 7, name: 'André Costa', city: 'Fortaleza, CE', conversions: 13, revenue: 'R$ 62.400', points: 3450 },
  { rank: 8, name: 'Camila Torres', city: 'Manaus, AM', conversions: 11, revenue: 'R$ 52.800', points: 2920 },
  { rank: 9, name: 'Lucas Oliveira', city: 'Recife, PE', conversions: 10, revenue: 'R$ 48.000', points: 2640 },
  { rank: 10, name: 'Beatriz Rocha', city: 'Belém, PA', conversions: 9, revenue: 'R$ 43.200', points: 2380 },
]

const myBadges = [
  { name: 'Iniciante', emoji: '⭐', earned: true, description: 'Primeira conversão' },
  { name: 'Consistente', emoji: '🔥', earned: true, description: '7 dias consecutivos' },
  { name: 'Expert', emoji: '💎', earned: true, description: '10 conversões no mês' },
  { name: 'Top 5', emoji: '🏅', earned: false, description: 'Top 5 do ranking' },
  { name: 'Campeão', emoji: '🏆', earned: false, description: '#1 do ranking' },
  { name: 'Lenda', emoji: '👑', earned: false, description: '3 meses no top 3' },
]

export default function RankingPage() {
  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="sales" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Juliana Martins', role: 'sales' }} title="Ranking de Consultores" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold text-white">Ranking — Junho 2024</h2>
            </div>
            <p className="text-sm text-[#71717A]">28 consultores ativos • Resetado dia 1º de cada mês</p>
          </div>

          {/* Podium */}
          <div className="flex items-end justify-center gap-4 mb-10">
            {/* 2nd place */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#94A3B8]/20 to-[#64748B]/20 border border-[#94A3B8]/30 flex items-center justify-center text-3xl mb-2 shadow-lg">
                👤
              </div>
              <p className="text-sm font-bold text-white">{topThree[1].name.split(' ')[0]}</p>
              <p className="text-xs text-[#71717A]">{topThree[1].city.split(',')[0]}</p>
              <div className="w-24 mt-3 bg-[#94A3B8]/15 border border-[#94A3B8]/30 rounded-t-xl pt-4 pb-3 text-center" style={{ height: '80px' }}>
                <span className="text-2xl">🥈</span>
                <p className="text-xs font-bold text-white mt-1">{topThree[1].conversions} conv.</p>
              </div>
            </div>

            {/* 1st place */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F59E0B]/20 to-[#D97706]/20 border border-[#F59E0B]/40 flex items-center justify-center text-4xl mb-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                👤
              </div>
              <p className="text-base font-bold text-white">{topThree[0].name.split(' ')[0]}</p>
              <p className="text-xs text-[#71717A]">{topThree[0].city.split(',')[0]}</p>
              <div className="w-28 mt-3 bg-amber-500/15 border border-amber-500/30 rounded-t-xl pt-4 pb-3 text-center" style={{ height: '110px' }}>
                <span className="text-3xl">👑</span>
                <p className="text-sm font-bold text-amber-400 mt-1">{topThree[0].conversions} conv.</p>
                <p className="text-xs text-amber-400/70">{topThree[0].revenue}</p>
              </div>
            </div>

            {/* 3rd place */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#CD7C3A]/20 to-[#B45309]/20 border border-[#CD7C3A]/30 flex items-center justify-center text-2xl mb-2 shadow-lg">
                👤
              </div>
              <p className="text-sm font-bold text-white">{topThree[2].name.split(' ')[0]}</p>
              <p className="text-xs text-[#71717A]">{topThree[2].city.split(',')[0]}</p>
              <div className="w-20 mt-3 bg-[#CD7C3A]/10 border border-[#CD7C3A]/25 rounded-t-xl pt-4 pb-3 text-center" style={{ height: '65px' }}>
                <span className="text-xl">🥉</span>
                <p className="text-xs font-bold text-white mt-1">{topThree[2].conversions} conv.</p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Full ranking */}
            <div className="lg:col-span-2">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Medal className="w-4 h-4 text-[#7B3FE4]" /> Classificação Completa
              </h3>
              <div className="space-y-2">
                {fullRanking.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      entry.isMe
                        ? 'bg-[#7B3FE4]/10 border-[#7B3FE4]/30 shadow-[0_0_15px_rgba(123,63,228,0.15)]'
                        : 'bg-[#111113] border-[#1C1C1E] hover:border-[#27272A]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                      entry.rank <= 3 ? 'bg-amber-400/10 text-amber-400' : 'bg-[#18181A] text-[#71717A]'
                    }`}>
                      #{entry.rank}
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7B3FE4]/20 to-[#3B82F6]/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {entry.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{entry.name}</p>
                        {entry.isMe && <span className="text-[10px] font-bold text-[#7B3FE4] bg-[#7B3FE4]/10 px-1.5 py-0.5 rounded-full border border-[#7B3FE4]/20">Você</span>}
                      </div>
                      <p className="text-xs text-[#71717A]">{entry.city}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-emerald-400">{entry.revenue}</p>
                      <p className="text-xs text-[#71717A]">{entry.conversions} conversões</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-400">{entry.points}</p>
                      <p className="text-xs text-[#71717A]">pontos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* My stats + badges */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-[#7B3FE4]/10 to-[#3B82F6]/10 border border-[#7B3FE4]/20 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" /> Minha Performance
                </h3>
                <div className="text-center mb-4">
                  <p className="text-5xl font-black text-white">#4</p>
                  <p className="text-sm text-[#71717A]">posição atual</p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Conversões', value: '18', icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> },
                    { label: 'Receita Gerada', value: 'R$ 86.400', icon: <Award className="w-3.5 h-3.5 text-[#7B3FE4]" /> },
                    { label: 'Pontos XP', value: '4.820', icon: <Star className="w-3.5 h-3.5 text-amber-400" /> },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between py-2 border-b border-[#1C1C1E] last:border-0">
                      <div className="flex items-center gap-2 text-xs text-[#71717A]">
                        {stat.icon} {stat.label}
                      </div>
                      <span className="text-sm font-bold text-white">{stat.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-[#111113]/60 rounded-xl p-3">
                  <p className="text-xs text-[#71717A] mb-0.5">Para subir ao #3</p>
                  <p className="text-sm font-bold text-white">+3 conversões = R$ 14.400</p>
                </div>
              </div>

              {/* Badges */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Minhas Conquistas</h3>
                <div className="grid grid-cols-3 gap-2">
                  {myBadges.map((badge) => (
                    <div
                      key={badge.name}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center ${
                        badge.earned
                          ? 'bg-[#7B3FE4]/10 border-[#7B3FE4]/20'
                          : 'bg-[#18181A] border-[#1C1C1E] opacity-40'
                      }`}
                    >
                      <span className="text-xl">{badge.emoji}</span>
                      <span className="text-[9px] text-[#71717A] leading-tight">{badge.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
