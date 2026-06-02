import asyncio
from datetime import datetime, timezone


class TradeExecutor:
    def __init__(self, exchange, capital_per_cycle: float = 1000):
        self.exchange = exchange
        self.capital = capital_per_cycle
        self.trade_log: list[dict] = []

    async def execute(self, opportunity: dict) -> dict | None:
        pair1, pair2, pair3 = opportunity['triangle']
        ts = datetime.now(timezone.utc).isoformat()
        print(f"[{ts}] {pair1}->{pair2}->{pair3} | "
              f"esperado: +{opportunity['net_profit_pct']:.4f}%")

        try:
            # Passo 1: USDT -> moeda A
            o1 = await self.exchange.create_market_buy_order(
                pair1, amount=None, params={'quoteOrderQty': self.capital}
            )
            await asyncio.sleep(0.05)

            # Passo 2: moeda A -> moeda B
            o2 = await self.exchange.create_market_buy_order(
                pair2, amount=float(o1['filled'])
            )
            await asyncio.sleep(0.05)

            # Passo 3: moeda B -> USDT
            o3 = await self.exchange.create_market_sell_order(
                pair3, amount=float(o2['filled'])
            )

            result = {
                'timestamp': ts,
                'triangle': opportunity['triangle'],
                'expected_pct': opportunity['net_profit_pct'],
                'order_ids': [o1['id'], o2['id'], o3['id']],
                'status': 'completed',
            }
            self.trade_log.append(result)
            return result

        except Exception as e:
            print(f"Erro na execucao: {e}")
            return None
