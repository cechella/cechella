import asyncio
import ccxt.pro as ccxt
from detector import OpportunityDetector
from executor import TradeExecutor
from config import (
    BINANCE_API_KEY, BINANCE_SECRET,
    MIN_PROFIT_PCT, CAPITAL_PER_CYCLE, DAILY_STOP_LOSS, TRIANGLES
)


class ArbitrageEngine:
    def __init__(self):
        self.exchange = ccxt.binance({
            'apiKey': BINANCE_API_KEY,
            'secret': BINANCE_SECRET,
            'enableRateLimit': True,
            'options': {'defaultType': 'spot'},
        })
        self.detector = OpportunityDetector()
        self.executor = TradeExecutor(self.exchange, CAPITAL_PER_CYCLE)
        self.running = False
        self.daily_pnl = 0.0

    async def start(self):
        self.running = True
        symbols = list({s for t in TRIANGLES for s in t})
        print(f"Bot iniciado — monitorando {len(TRIANGLES)} triangulos...")

        await asyncio.gather(
            self._watch(symbols),
            self._heartbeat(),
        )

    async def _watch(self, symbols: list[str]):
        while self.running:
            if self.daily_pnl <= -DAILY_STOP_LOSS:
                print(f"Stop loss diario atingido (${self.daily_pnl:.2f}). Pausando ate amanha.")
                await asyncio.sleep(3600)
                continue

            try:
                tickers = await self.exchange.watch_tickers(symbols)
                for triangle in TRIANGLES:
                    opp = self.detector.check(tickers, triangle)
                    if opp and opp['net_profit_pct'] >= MIN_PROFIT_PCT:
                        result = await self.executor.execute(opp)
                        if result:
                            profit = CAPITAL_PER_CYCLE * opp['net_profit_pct'] / 100
                            self.daily_pnl += profit
            except Exception as e:
                print(f"Erro: {e}")
                await asyncio.sleep(1)

    async def _heartbeat(self):
        while self.running:
            await asyncio.sleep(60)
            print(f"Heartbeat — PnL hoje: ${self.daily_pnl:.2f}")

    async def stop(self):
        self.running = False
        await self.exchange.close()


if __name__ == '__main__':
    engine = ArbitrageEngine()
    asyncio.run(engine.start())
