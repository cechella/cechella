"""
Paper trading com dashboard web em tempo real.
Acesse o dashboard na URL gerada pelo Replit (ou localhost:8080).
"""
import asyncio
import ssl
import json
import urllib.request
import os
from datetime import datetime, timezone
from http.server import HTTPServer, SimpleHTTPRequestHandler
from threading import Thread
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
SYMBOLS_OKX = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'ETH-BTC', 'SOL-ETH']

state = {
    'total': 0,
    'profitable': 0,
    'pnl': 0.0,
    'latencies': [],
    'lat_cur': 0.0,
    'start_time': None,
}

connected_clients = set()


def fetch_tickers() -> dict:
    url = 'https://www.okx.com/api/v5/market/tickers?instType=SPOT'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=5) as r:
        data = json.loads(r.read())['data']
    sym_map = {
        'BTC-USDT': 'BTC/USDT', 'ETH-USDT': 'ETH/USDT',
        'SOL-USDT': 'SOL/USDT', 'ETH-BTC':  'ETH/BTC',
        'SOL-ETH':  'SOL/ETH',
    }
    result = {}
    for t in data:
        pair = sym_map.get(t['instId'])
        if pair:
            result[pair] = {
                'bid': float(t['bidPx']) if t['bidPx'] else 0,
                'ask': float(t['askPx']) if t['askPx'] else 0,
            }
    return result


def build_message(new_trade=None) -> str:
    lats = state['latencies']
    elapsed = (datetime.now(timezone.utc) - state['start_time']).total_seconds() if state['start_time'] else 0
    hit_rate = (state['profitable'] / state['total'] * 100) if state['total'] else 0
    return json.dumps({
        'total':      state['total'],
        'profitable': state['profitable'],
        'pnl':        state['pnl'],
        'hit_rate':   hit_rate,
        'lat_cur':    state['lat_cur'],
        'lat_avg':    sum(lats) / len(lats) if lats else 0,
        'lat_min':    min(lats) if lats else 0,
        'lat_max':    max(lats) if lats else 0,
        'elapsed_s':  elapsed,
        'new_trade':  new_trade,
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
        await asyncio.gather(
            *[c.send(msg) for c in list(connected_clients)],
            return_exceptions=True
        )


def serve_dashboard():
    """Serve o dashboard.html via HTTP na porta 8080."""
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *args): pass  # silencia logs HTTP
    server = HTTPServer(('0.0.0.0', 8080), Handler)
    server.serve_forever()


async def trading_loop():
    detector = OpportunityDetector()
    state['start_time'] = datetime.now(timezone.utc)

    host = os.getenv('REPL_SLUG', 'localhost')
    owner = os.getenv('REPL_OWNER', '')
    if owner:
        url = f"https://{host}.{owner}.repl.co"
    else:
        url = "http://localhost:8080"

    print("=" * 55)
    print("  CECHELLA — PAPER TRADING LIVE")
    print("=" * 55)
    print(f"  Dashboard:  {url}/dashboard.html")
    print(f"  Capital:    ${CAPITAL_PER_CYCLE}")
    print(f"  Spread min: {MIN_PROFIT_PCT}%")
    print(f"  Triangulos: {len(TRIANGLES)}")
    print("=" * 55)
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
                    print(f"[{ts}] OPORTUNIDADE +${profit:.4f} | {new_trade['triangle']} | lat:{lat:.0f}ms")

            await broadcast(new_trade)

            if state['total'] % 30 == 0:
                lats = state['latencies']
                avg  = sum(lats) / len(lats) if lats else 0
                ts   = datetime.now(timezone.utc).strftime('%H:%M:%S')
                print(f"[{ts}] ciclos:{state['total']} | opps:{state['profitable']} | pnl:${state['pnl']:.4f} | lat:{avg:.0f}ms")

            await asyncio.sleep(1)

        except Exception as e:
            print(f"Erro: {e}")
            await asyncio.sleep(3)


async def main():
    # Inicia servidor HTTP em thread separada
    t = Thread(target=serve_dashboard, daemon=True)
    t.start()

    if HAS_WS:
        server = await websockets.serve(ws_handler, '0.0.0.0', 8765)
        await asyncio.gather(trading_loop(), server.serve_forever())
    else:
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
        print(f"{'='*50}")
