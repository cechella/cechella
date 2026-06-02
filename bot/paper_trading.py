"""
Paper trading — detecta oportunidades reais sem executar ordens.
Rode por 7 dias para validar a estrategia antes de usar dinheiro real.
"""
import asyncio
import ccxt.pro as ccxt
from datetime import datetime, timezone
from detector import OpportunityDetector
from config import TRIANGLES, CAPITAL_PER_CYCLE, MIN_PROFIT_PCT


async def main():
    exchange = ccxt.binance({'enableRateLimit': True})
    detector = OpportunityDetector()
    symbols = list({s for t in TRIANGLES for s in t})

    stats = {'total': 0, 'profitable': 0, 'simulated_pnl': 0.0}

    print("=== PAPER TRADING INICIADO ===")
    print(f"Monitorando: {symbols}")
    print(f"Spread minimo: {MIN_PROFIT_PCT}%\n")

    try:
        while True:
            tickers = await exchange.watch_tickers(symbols)
            for triangle in TRIANGLES:
                opp = detector.check(tickers, triangle)
                stats['total'] += 1
                if opp and opp['net_profit_pct'] >= MIN_PROFIT_PCT:
                    stats['profitable'] += 1
                    profit = CAPITAL_PER_CYCLE * opp['net_profit_pct'] / 100
                    stats['simulated_pnl'] += profit
                    ts = datetime.now(timezone.utc).strftime('%H:%M:%S')
                    print(
                        f"[{ts}] OPORTUNIDADE: "
                        f"{triangle[0]}->{triangle[1]}->{triangle[2]} | "
                        f"+{opp['net_profit_pct']:.4f}% | "
                        f"Lucro simulado: +${profit:.2f} | "
                        f"Total acumulado: ${stats['simulated_pnl']:.2f}"
                    )
    except KeyboardInterrupt:
        print(f"\n=== RESUMO ===")
        print(f"Ciclos analisados:     {stats['total']}")
        print(f"Oportunidades reais:   {stats['profitable']}")
        print(f"PnL simulado total:    ${stats['simulated_pnl']:.2f}")
        hit_rate = (stats['profitable'] / stats['total'] * 100) if stats['total'] else 0
        print(f"Taxa de acerto:        {hit_rate:.2f}%")
    finally:
        await exchange.close()


if __name__ == '__main__':
    asyncio.run(main())
