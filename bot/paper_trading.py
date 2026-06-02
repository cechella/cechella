"""
Paper trading — detecta oportunidades reais sem executar ordens.
Rode por 7 dias para validar a estrategia antes de usar dinheiro real.
"""
import asyncio
import ssl
import json
import urllib.request
from datetime import datetime, timezone
from detector import OpportunityDetector
from config import TRIANGLES, CAPITAL_PER_CYCLE, MIN_PROFIT_PCT

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ETHBTC', 'BNBBTC', 'SOLETH']


def fetch_tickers() -> dict:
    url = 'https://api.binance.com/api/v3/ticker/bookTicker'
    with urllib.request.urlopen(url, context=SSL_CTX, timeout=5) as r:
        data = json.loads(r.read())
    result = {}
    for t in data:
        sym = t['symbol']
        if sym in SYMBOLS:
            base = sym[:-4] if sym.endswith('USDT') else (sym[:-3] if sym.endswith('BTC') else sym[:-3])
            quote = sym[-4:] if sym.endswith('USDT') else sym[-3:]
            pair = f"{base}/{quote}"
            result[pair] = {
                'bid': float(t['bidPrice']),
                'ask': float(t['askPrice']),
            }
    return result


async def main():
    detector = OpportunityDetector()
    stats = {'total': 0, 'profitable': 0, 'simulated_pnl': 0.0, 'latencies': []}

    print("=== PAPER TRADING INICIADO ===")
    print(f"Capital por ciclo: ${CAPITAL_PER_CYCLE}")
    print(f"Spread minimo:     {MIN_PROFIT_PCT}%")
    print(f"Triangulos:        {len(TRIANGLES)}")
    print()

    try:
        while True:
            try:
                t_start = datetime.now(timezone.utc)
                tickers = fetch_tickers()
                t_fetch = (datetime.now(timezone.utc) - t_start).total_seconds() * 1000

                stats['latencies'].append(t_fetch)
                avg_lat = sum(stats['latencies']) / len(stats['latencies'])

                for triangle in TRIANGLES:
                    opp = detector.check(tickers, triangle)
                    stats['total'] += 1
                    if opp and opp['net_profit_pct'] >= MIN_PROFIT_PCT:
                        stats['profitable'] += 1
                        profit = CAPITAL_PER_CYCLE * opp['net_profit_pct'] / 100
                        stats['simulated_pnl'] += profit
                        ts = datetime.now(timezone.utc).strftime('%H:%M:%S')
                        print(
                            f"[{ts}] OPORTUNIDADE DETECTADA"
                            f"\n  Triangulo:      {triangle[0]} -> {triangle[1]} -> {triangle[2]}"
                            f"\n  Lucro liquido:  +{opp['net_profit_pct']:.4f}%"
                            f"\n  Lucro $:        +${profit:.4f}"
                            f"\n  PnL acumulado:  +${stats['simulated_pnl']:.4f}"
                            f"\n  Latencia atual: {t_fetch:.0f}ms"
                            f"\n  Latencia media: {avg_lat:.0f}ms"
                            f"\n"
                        )

                # Status a cada 30 ciclos
                if stats['total'] % 30 == 0:
                    ts = datetime.now(timezone.utc).strftime('%H:%M:%S')
                    print(f"[{ts}] STATUS | Ciclos: {stats['total']} | "
                          f"Oportunidades: {stats['profitable']} | "
                          f"PnL: +${stats['simulated_pnl']:.4f} | "
                          f"Latencia media: {avg_lat:.0f}ms")

                await asyncio.sleep(1)
            except Exception as e:
                print(f"Erro: {e}")
                await asyncio.sleep(3)

    except KeyboardInterrupt:
        hit_rate = (stats['profitable'] / stats['total'] * 100) if stats['total'] else 0
        avg_lat = sum(stats['latencies']) / len(stats['latencies']) if stats['latencies'] else 0
        min_lat = min(stats['latencies']) if stats['latencies'] else 0
        max_lat = max(stats['latencies']) if stats['latencies'] else 0

        print(f"\n========== RESUMO FINAL ==========")
        print(f"Ciclos analisados:     {stats['total']}")
        print(f"Oportunidades reais:   {stats['profitable']}")
        print(f"Taxa de oportunidade:  {hit_rate:.4f}%")
        print(f"PnL simulado total:    ${stats['simulated_pnl']:.4f}")
        print(f"")
        print(f"--- LATENCIA DA SUA CONEXAO ---")
        print(f"Media:  {avg_lat:.0f}ms")
        print(f"Minima: {min_lat:.0f}ms")
        print(f"Maxima: {max_lat:.0f}ms")
        print(f"")
        if avg_lat < 100:
            print(f"Avaliacao: EXCELENTE — sua conexao e rapida o suficiente")
        elif avg_lat < 300:
            print(f"Avaliacao: BOM — funcional mas VPS Tokyo melhoraria resultados")
        else:
            print(f"Avaliacao: LENTO — VPS Tokyo necessario para ser competitivo")


if __name__ == '__main__':
    asyncio.run(main())
