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

state = {
    'total': 0, 'profitable': 0, 'pnl': 0.0,
    'lat': 45.0, 'start': datetime.now(timezone.utc),
    'last_trade': None,
}
TRIANGLES = ['BTC->ETH->USDT', 'ETH->SOL->USDT', 'BTC->SOL->USDT']


def build_data():
    elapsed = (datetime.now(timezone.utc) - state['start']).total_seconds()
    hit = (state['profitable'] / state['total'] * 100) if state['total'] else 0
    return json.dumps({
        'total':      state['total'],
        'profitable': state['profitable'],
        'pnl':        round(state['pnl'], 4),
        'hit_rate':   round(hit, 4),
        'lat_cur':    round(state['lat'], 1),
        'lat_avg':    55.0,
        'lat_min':    28.0,
        'lat_max':    92.0,
        'elapsed_s':  elapsed,
        'last_trade': state['last_trade'],
    }).encode()


def serve_http():
    base = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base)
    class H(SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
        def do_GET(self):
            if self.path == '/data':
                data = build_data()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data)
            else:
                super().do_GET()
    HTTPServer(('0.0.0.0', 8080), H).serve_forever()



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
            state['last_trade'] = new_trade
            print(f"[{ts}] +${profit:.4f} | {new_trade['triangle']} | PnL: ${state['pnl']:.4f}")

        if state['total'] % 30 == 0:
            print(f"ciclos:{state['total']} | opps:{state['profitable']} | pnl:${state['pnl']:.4f}")

        await asyncio.sleep(1)


async def main():
    Thread(target=serve_http, daemon=True).start()
    print("Servidor HTTP iniciado na porta 8080")
    await trading_loop()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\nEncerrado. PnL simulado: ${state['pnl']:.4f}")
