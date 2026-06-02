export function DashboardHeader() {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cechella</h1>
        <p className="text-gray-400 text-sm">Arbitragem Triangular • Binance</p>
      </div>
      <div className="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-full border border-gray-800">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="text-green-400 text-sm font-medium">LIVE</span>
      </div>
    </header>
  )
}
