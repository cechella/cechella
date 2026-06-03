"""
Paper trading com precos REAIS da Binance (API publica).
Se a Binance estiver bloqueada (ex: Replit free), usa simulacao realista.
Dashboard: porta 8080 /dashboard.html
"""
import asyncio
import ssl
import json
import urllib.request
import urllib.parse
import os
import math
import random
from datetime import datetime, timezone
from http.server import HTTPServer, SimpleHTTPRequestHandler
from threading import Thread

# --- Configuracao ---
MIN_PROFIT_PCT = 0.15   # % minimo apos taxas
CAPITAL        = 1000.0 # capital por ciclo (USD)
FEE_PER_ORDER  = 0.075  # % taxa Binance com BNB

TRIANGLES = [
    ('BTC/USDT', 'ETH/BTC',  'ETH/USDT'),
    ('BTC/USDT', 'BNB/BTC',  'BNB/USDT'),
    ('ETH/USDT', 'SOL/ETH',  'SOL/USDT'),
    ('BTC/USDT', 'SOL/BTC',  'SOL/USDT'),
    ('BTC/USDT', 'XRP/BTC',  'XRP/USDT'),
    ('ETH/USDT', 'BNB/ETH',  'BNB/USDT'),
    ('BTC/USDT', 'ADA/BTC',  'ADA/USDT'),
    ('ETH/USDT', 'LINK/ETH', 'LINK/USDT'),
    ('BTC/USDT', 'LINK/BTC', 'LINK/USDT'),
    ('ETH/USDT', 'XRP/ETH',  'XRP/USDT'),
]

def to_binance(pair): return pair.replace('/', '')
BINANCE_SYMBOLS = list({to_binance(p) for tri in TRIANGLES for p in tri})

# Precos base realistas (referencia atual)
BASE_PRICES = {
    'BTC/USDT': 67000.0, 'ETH/USDT': 3500.0,  'BNB/USDT': 580.0,
    'SOL/USDT': 150.0,   'XRP/USDT': 0.52,     'ADA/USDT': 0.45,
    'LINK/USDT': 14.0,
    'ETH/BTC':  0.0522,  'BNB/BTC':  0.00866,  'SOL/BTC':  0.00224,
    'XRP/BTC':  0.0000078, 'ADA/BTC': 0.0000067, 'LINK/BTC': 0.000209,
    'BNB/ETH':  0.1657,  'SOL/ETH':  0.0429,   'XRP/ETH':  0.000149,
    'LINK/ETH': 0.004,
}
sim_prices = {k: v for k, v in BASE_PRICES.items()}

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode    = ssl.CERT_NONE

state = {
    'total': 0, 'profitable': 0, 'pnl': 0.0,
    'latencies': [], 'lat_cur': 0.0,
    'start': datetime.now(timezone.utc),
    'last_trade': None,
    'source': 'INICIANDO...',
}
_binance_available = None  # None=nao testado, True/False


# ----------------------------------------------------------------
# Fetch real
# ----------------------------------------------------------------
def fetch_binance() -> dict:
    syms = json.dumps(BINANCE_SYMBOLS)
    url  = f'https://api.binance.com/api/v3/ticker/bookTicker?symbols={urllib.parse.quote(syms)}'
    req  = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=5) as r:
        data = json.loads(r.read())

    sym_to_pair = {}
    for tri in TRIANGLES:
        for p in tri:
            sym_to_pair[to_binance(p)] = p

    result = {}
    for t in data:
        pair = sym_to_pair.get(t['symbol'])
        if pair and t['bidPrice'] and t['askPrice']:
            result[pair] = {'bid': float(t['bidPrice']), 'ask': float(t['askPrice'])}
    return result


# ----------------------------------------------------------------
# Simulacao realista (fallback)
# ----------------------------------------------------------------
_t = 0
def fetch_simulated() -> dict:
    global _t, sim_prices
    _t += 1
    spread = 0.0002  # 0.02% spread bid/ask

    # Random walk nos precos base
    for pair in sim_prices:
        sim_prices[pair] *= math.exp(random.gauss(0, 0.0003))

    result = {}
    for pair, mid in sim_prices.items():
        result[pair] = {
            'bid': mid * (1 - spread),
            'ask': mid * (1 + spread),
        }
    return result


def get_tickers():
    global _binance_available
    if _binance_available is False:
        return fetch_simulated(), False
    try:
        tickers = fetch_binance()
        _binance_available = True
        return tickers, True
    except Exception:
        _binance_available = False
        return fetch_simulated(), False


# ----------------------------------------------------------------
# Arbitragem
# ----------------------------------------------------------------
def check_triangle(tickers: dict, triangle: tuple):
    """USDT -> A -> B -> USDT, retorna % lucro liquido ou None."""
    ab_usdt, a_b, b_usdt = triangle
    if ab_usdt not in tickers or a_b not in tickers or b_usdt not in tickers:
        return None

    fee = 1 - FEE_PER_ORDER / 100

    ask1 = tickers[ab_usdt]['ask']
    if ask1 == 0: return None
    qty_a = CAPITAL / ask1 * fee     # USDT -> A (compra A/USDT)

    ask2 = tickers[a_b]['ask']
    if ask2 == 0: return None
    qty_b = qty_a / ask2 * fee       # A -> B (compra B/A)

    bid3 = tickers[b_usdt]['bid']
    if bid3 == 0: return None
    final = qty_b * bid3 * fee       # B -> USDT (vende B/USDT)

    return (final - CAPITAL) / CAPITAL * 100


# ----------------------------------------------------------------
# HTTP server
# ----------------------------------------------------------------
def build_data() -> bytes:
    lats    = state['latencies']
    elapsed = (datetime.now(timezone.utc) - state['start']).total_seconds()
    hit     = (state['profitable'] / state['total'] * 100) if state['total'] else 0
    return json.dumps({
        'total':      state['total'],
        'profitable': state['profitable'],
        'pnl':        round(state['pnl'], 4),
        'hit_rate':   round(hit, 4),
        'lat_cur':    round(state['lat_cur'], 1),
        'lat_avg':    round(sum(lats) / len(lats), 1) if lats else 0,
        'lat_min':    round(min(lats), 1) if lats else 0,
        'lat_max':    round(max(lats), 1) if lats else 0,
        'elapsed_s':  elapsed,
        'last_trade': state['last_trade'],
        'source':     state['source'],
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


# ----------------------------------------------------------------
# Loop principal
# ----------------------------------------------------------------
async def trading_loop():
    print('=' * 55)
    print('  CECHELLA — PAPER TRADING')
    print('  Dashboard: aba Preview → /dashboard.html')
    print(f'  Capital: ${CAPITAL} | Spread min: {MIN_PROFIT_PCT}%')
    print(f'  Triangulos: {len(TRIANGLES)}')
    print('=' * 55)

    while True:
        try:
            t0 = datetime.now(timezone.utc)
            tickers, is_live = get_tickers()
            lat_ms = (datetime.now(timezone.utc) - t0).total_seconds() * 1000

            state['lat_cur'] = lat_ms
            state['latencies'].append(lat_ms)
            if len(state['latencies']) > 500:
                state['latencies'].pop(0)

            state['source'] = 'BINANCE LIVE' if is_live else 'SIMULACAO'

            for triangle in TRIANGLES:
                state['total'] += 1
                net_pct = check_triangle(tickers, triangle)

                if net_pct is not None and net_pct >= MIN_PROFIT_PCT:
                    profit = CAPITAL * net_pct / 100
                    state['profitable'] += 1
                    state['pnl']        += profit
                    ts = datetime.now(timezone.utc).strftime('%H:%M:%S')
                    trade = {
                        'triangle': f"{triangle[0]}->{triangle[1]}->{triangle[2]}",
                        'time':     ts,
                        'profit':   round(profit, 4),
                        'pct':      round(net_pct, 4),
                    }
                    state['last_trade'] = trade
                    src = 'LIVE' if is_live else 'SIM'
                    print(f"[{ts}][{src}] +${profit:.4f} ({net_pct:.3f}%) | {trade['triangle']}")

            if state['total'] % 50 == 0:
                lats = state['latencies']
                avg  = sum(lats) / len(lats) if lats else 0
                ts   = datetime.now(timezone.utc).strftime('%H:%M:%S')
                print(f"[{ts}] ciclos:{state['total']} opps:{state['profitable']} pnl:${state['pnl']:.4f} lat:{avg:.0f}ms [{state['source']}]")

        except Exception as e:
            print(f"Erro no loop: {e}")

        await asyncio.sleep(1)


async def main():
    Thread(target=serve_http, daemon=True).start()
    print("Servidor HTTP iniciado na porta 8080")
    await trading_loop()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        lats = state['latencies']
        avg  = sum(lats) / len(lats) if lats else 0
        hit  = (state['profitable'] / state['total'] * 100) if state['total'] else 0
        print(f"\n{'='*50}")
        print(f"  RESUMO FINAL — PAPER TRADING")
        print(f"  Fonte: {state['source']}")
        print(f"  Ciclos: {state['total']} | Opps: {state['profitable']}")
        print(f"  Taxa: {hit:.2f}% | PnL: ${state['pnl']:.4f}")
        print(f"  Lat. media: {avg:.0f}ms")
        print(f"{'='*50}")
