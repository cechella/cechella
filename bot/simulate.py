"""
Modo simulacao — dashboard ao vivo sem precisar de API de exchange.
Gera trades realistas para testar a interface.
"""
import asyncio
import json
import random
import os
from datetime import datetime, timezone
from http.server import HTTPServer, SimpleHTTPRequestHandler
from threading import Thread

try:
    import websockets
    HAS_WS = True
except ImportError:
    HAS_WS = False

state = {
    'total': 0, 'profitable': 0, 'pnl': 0.0,
    'lat': 45.0, 'start': datetime.now(timezone.utc)
}
clients = set()
TRIANGLES = ['BTC->ETH->USDT', 'ETH->SOL->USDT', 'BTC->SOL->USDT']


def serve_http():
    base = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base)
    class H(SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    HTTPServer(('0.0.0.0', 8080), H).serve_forever()


async def ws_handler(websocket):
    clients.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        clients.discard(websocket)


async def broadcast(msg):
    for c in list(clients):
        try:
            await c.send(msg)
        except Exception:
            clients.discard(c)


async def trading_loop():
    print('=' * 55)
    print('  CECHELLA — SIMULACAO LIVE')
    print('  Dashboard: aba Preview → /dashboard.html')
    print('=' * 55)

    while True:
        state['total'] += 1
        state['lat'] = random.gauss(55, 15)

        new_trade = None
        # ~8% de chance de oportunidade por ciclo
        if random.random() < 0.08:
            pct    = random.uniform(0.15, 0.50)
            profit = 1000 * pct / 100
            state['profitable'] += 1
            state['pnl']        += profit
            ts = datetime.now(timezone.utc).strftime('%H:%M:%S')
            new_trade = {
                'triangle': random.choice(TRIANGLES),
                'time':     ts,
                'profit':   profit,
                'pct':      pct,
            }
            print(f"[{ts}] +${profit:.4f} | {new_trade['triangle']} | PnL: ${state['pnl']:.4f}")

        elapsed = (datetime.now(timezone.utc) - state['start']).total_seconds()
        hit     = (state['profitable'] / state['total'] * 100) if state['total'] else 0
        msg = json.dumps({
            'total':      state['total'],
            'profitable': state['profitable'],
            'pnl':        round(state['pnl'], 4),
            'hit_rate':   round(hit, 4),
            'lat_cur':    round(state['lat'], 1),
            'lat_avg':    55.0,
            'lat_min':    28.0,
            'lat_max':    92.0,
            'elapsed_s':  elapsed,
            'new_trade':  new_trade,
        })
        await broadcast(msg)

        if state['total'] % 30 == 0:
            print(f"ciclos:{state['total']} | opps:{state['profitable']} | pnl:${state['pnl']:.4f}")

        await asyncio.sleep(1)


async def main():
    Thread(target=serve_http, daemon=True).start()
    print("Servidor HTTP iniciado na porta 8080")

    if HAS_WS:
        srv = await websockets.serve(ws_handler, '0.0.0.0', 8765)
        print("WebSocket iniciado na porta 8765")
        await asyncio.gather(trading_loop(), srv.serve_forever())
    else:
        await trading_loop()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\nEncerrado. PnL simulado: ${state['pnl']:.4f}")
