"""
Paper trading com dashboard web em tempo real.
Abre automaticamente no browser ao iniciar.
"""
import asyncio
import ssl
import json
import urllib.request
import webbrowser
import os
from datetime import datetime, timezone
from detector import OpportunityDetector
from config import TRIANGLES, CAPITAL_PER_CYCLE, MIN_PROFIT_PCT

try:
    import websockets
    HAS_WS = True
except ImportError:
    HAS_WS = False

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ETHBTC', 'BNBBTC', 'SOLETH']

# Estado global compartilhado entre tasks
state = {
    'total': 0,
    'profitable': 0,
    'pnl': 0.0,
    'latencies': [],
    'lat_cur': 0.0,
    'trades': [],
    'new_trade': None,
    'start_time': None,
}

connected_clients = set()


def fetch_tickers() -> dict:
    url = 'https://api.binance.com/api/v3/ticker/bookTicker'
    with urllib.request.urlopen(url, context=SSL_CTX, timeout=5) as r:
        data = json.loads(r.read())
    result = {}
    sym_map = {
        'BTCUSDT': 'BTC/USDT', 'ETHUSDT': 'ETH/USDT', 'BNBUSDT': 'BNB/USDT',
        'SOLUSDT': 'SOL/USDT', 'ETHBTC':  'ETH/BTC',  'BNBBTC':  'BNB/BTC',
        'SOLETH':  'SOL/ETH',
    }
    for t in data:
        pair = sym_map.get(t['symbol'])
        if pair:
            result[pair] = {
                'bid': float(t['bidPrice']),
                'ask': float(t['askPrice']),
            }
    return result


def build_message(new_trade=None) -> str:
    lats = state['latencies']
    elapsed = (datetime.now(timezone.utc) - state['start_time']).total_seconds() if state['start_time'] else 0
    hit_rate = (state['profitable'] / state['total'] * 100) if state['total'] else 0
    return json.dumps({
        'total':     state['total'],
        'profitable': state['profitable'],
        'pnl':       state['pnl'],
        'hit_rate':  hit_rate,
        'lat_cur':   state['lat_cur'],
        'lat_avg':   sum(lats) / len(lats) if lats else 0,
        'lat_min':   min(lats) if lats else 0,
        'lat_max':   max(lats) if lats else 0,
        'elapsed_s': elapsed,
        'new_trade': new_trade,
    })


async def ws_handler(websocket):
    connected_clients.add(websocket)
    try:
        await websocket.send(build_message())
        await websocket.wait_closed()
    finally:
        connected_clients.discard(websocket)


async def broadcast(new_trade=None):
    if connected_clients:
        msg = build_message(new_trade)
        await asyncio.gather(*[c.send(msg) for c in list(connected_clients)], return_exceptions=True)


async def trading_loop():
    detector = OpportunityDetector()
    state['start_time'] = datetime.now(timezone.utc)

    print("=" * 50)
    print("  CECHELLA — PAPER TRADING")
    print("=" * 50)
    print(f"  Capital por ciclo: ${CAPITAL_PER_CYCLE}")
    print(f"  Spread minimo:     {MIN_PROFIT_PCT}%")
    print(f"  Dashboard:         http://localhost:8765")
    print(f"  Abra o arquivo:    bot/dashboard.html no browser")
    print("=" * 50)
    print()

    while True:
        try:
            t0 = datetime.now(timezone.utc)
            tickers = fetch_tickers()
            lat = (datetime.now(timezone.utc) - t0).total_seconds() * 1000

            state['lat_cur'] = lat
            state['latencies'].append(lat)
            if len(state['latencies']) > 500:
                state['latencies'].pop(0)

            new_trade = None
            for triangle in TRIANGLES:
                opp = detector.check(tickers, triangle)
                state['total'] += 1

                if opp and opp['net_profit_pct'] >= MIN_PROFIT_PCT:
                    state['profitable'] += 1
                    profit = CAPITAL_PER_CYCLE * opp['net_profit_pct'] / 100
                    state['pnl'] += profit
                    ts = datetime.now(timezone.utc).strftime('%H:%M:%S')
                    new_trade = {
                        'triangle': f"{triangle[0]}->{triangle[1]}->{triangle[2]}",
                        'time': ts,
                        'profit': profit,
                        'pct': opp['net_profit_pct'],
                    }
                    print(f"[{ts}] +${profit:.4f} | {new_trade['triangle']} | lat:{lat:.0f}ms | PnL:${state['pnl']:.4f}")

            await broadcast(new_trade)

            if state['total'] % 30 == 0:
                lats = state['latencies']
                avg  = sum(lats) / len(lats) if lats else 0
                ts   = datetime.now(timezone.utc).strftime('%H:%M:%S')
                print(f"[{ts}] ciclos:{state['total']} | opps:{state['profitable']} | pnl:${state['pnl']:.4f} | lat_avg:{avg:.0f}ms")

            await asyncio.sleep(1)

        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Erro: {e}")
            await asyncio.sleep(3)


async def main():
    # Abre o dashboard no browser
    html_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'dashboard.html'))
    webbrowser.open(f'file://{html_path}')

    if HAS_WS:
        server = await websockets.serve(ws_handler, 'localhost', 8765)
        print("WebSocket server iniciado na porta 8765")
        await asyncio.gather(trading_loop(), server.serve_forever())
    else:
        print("websockets nao instalado — rodando sem dashboard")
        await trading_loop()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        lats = state['latencies']
        avg  = sum(lats) / len(lats) if lats else 0
        hit  = (state['profitable'] / state['total'] * 100) if state['total'] else 0
        print(f"\n{'='*50}")
        print(f"  RESUMO FINAL")
        print(f"{'='*50}")
        print(f"  Ciclos:        {state['total']}")
        print(f"  Oportunidades: {state['profitable']}")
        print(f"  Taxa:          {hit:.4f}%")
        print(f"  PnL simulado:  ${state['pnl']:.4f}")
        print(f"  Lat. media:    {avg:.0f}ms")
        if avg < 100:
            print(f"  Avaliacao:     EXCELENTE — pronto para live trading")
        elif avg < 300:
            print(f"  Avaliacao:     BOM — VPS Tokyo recomendado")
        else:
            print(f"  Avaliacao:     LENTO — VPS Tokyo necessario")
        print(f"{'='*50}")
