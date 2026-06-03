"""
Paper trading com precos REAIS via CoinGecko (gratuito, sem bloqueio no Replit).
Tenta Binance primeiro (API key). Se bloqueado, usa CoinGecko.
Nunca executa ordens reais — apenas detecta oportunidades e registra.
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
CAPITAL        = 1000.0 # capital simulado por ciclo (USD)
FEE_PER_ORDER  = 0.075  # % taxa Binance com BNB (3 ordens = 0.225% total)

BINANCE_API_KEY = os.getenv('BINANCE_API_KEY', '')

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

# CoinGecko IDs para cada moeda
COINGECKO_IDS = {
    'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin',
    'SOL': 'solana',  'XRP': 'ripple',   'ADA': 'cardano',
    'LINK': 'chainlink',
}
SPREAD = 0.0003  # 0.03% spread bid/ask estimado para pares liquidos

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode    = ssl.CERT_NONE

state = {
    'total': 0, 'profitable': 0, 'pnl': 0.0,
    'latencies': [], 'lat_cur': 0.0,
    'start': datetime.now(timezone.utc),
    'last_trade': None,
    'source': 'CONECTANDO...',
    'prices_snapshot': {},
}
_source_mode = None  # 'binance' | 'coingecko' | 'sim'


# ----------------------------------------------------------------
# Fonte 1: Binance REST (com API key)
# ----------------------------------------------------------------
def fetch_binance() -> dict:
    syms = json.dumps(BINANCE_SYMBOLS)
    url  = f'https://api.binance.com/api/v3/ticker/bookTicker?symbols={urllib.parse.quote(syms)}'
    headers = {'User-Agent': 'Mozilla/5.0'}
    if BINANCE_API_KEY:
        headers['X-MBX-APIKEY'] = BINANCE_API_KEY
    req = urllib.request.Request(url, headers=headers)
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
# Fonte 2: CoinGecko (funciona no Replit)
# ----------------------------------------------------------------
def fetch_coingecko() -> dict:
    ids = ','.join(COINGECKO_IDS.values())
    url = f'https://api.coingecko.com/api/v3/simple/price?ids={ids}&vs_currencies=usd,btc,eth'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=8) as r:
        raw = json.loads(r.read())

    # Mapeia: {'bitcoin': {'usd': 67000, 'btc': 1, 'eth': 19.2}, ...}
    prices_usd = {}
    for coin, gid in COINGECKO_IDS.items():
        if gid in raw:
            prices_usd[coin] = {
                'usd': raw[gid].get('usd', 0),
                'btc': raw[gid].get('btc', 0),
                'eth': raw[gid].get('eth', 0),
            }

    def make_ticker(mid):
        return {'bid': mid * (1 - SPREAD), 'ask': mid * (1 + SPREAD)}

    tickers = {}
    for coin, data in prices_usd.items():
        if data['usd']:
            tickers[f'{coin}/USDT'] = make_ticker(data['usd'])
        if data['btc'] and coin != 'BTC':
            tickers[f'{coin}/BTC'] = make_ticker(data['btc'])
        if data['eth'] and coin not in ('BTC', 'ETH'):
            tickers[f'{coin}/ETH'] = make_ticker(data['eth'])

    # ETH/BTC via divisao
    if 'ETH' in prices_usd and prices_usd['ETH']['btc']:
        tickers['ETH/BTC'] = make_ticker(prices_usd['ETH']['btc'])

    return tickers


# ----------------------------------------------------------------
# Fonte 3: Simulacao realista (ultimo recurso)
# ----------------------------------------------------------------
BASE_PRICES = {
    'BTC/USDT': 67000.0, 'ETH/USDT': 3500.0,  'BNB/USDT': 580.0,
    'SOL/USDT': 150.0,   'XRP/USDT': 0.52,     'ADA/USDT': 0.45,
    'LINK/USDT': 14.0,
    'ETH/BTC': 0.0522,   'BNB/BTC': 0.00866,   'SOL/BTC': 0.00224,
    'XRP/BTC': 0.0000078,'ADA/BTC': 0.0000067, 'LINK/BTC': 0.000209,
    'BNB/ETH': 0.1657,   'SOL/ETH': 0.0429,    'XRP/ETH': 0.000149,
    'LINK/ETH': 0.004,
}
sim_prices = {k: v for k, v in BASE_PRICES.items()}

def fetch_simulated() -> dict:
    for pair in sim_prices:
        sim_prices[pair] *= math.exp(random.gauss(0, 0.0003))
    return {p: {'bid': v*(1-SPREAD), 'ask': v*(1+SPREAD)} for p, v in sim_prices.items()}


# ----------------------------------------------------------------
# Seletor de fonte com cache de modo
# ----------------------------------------------------------------
_fail_counts = {'binance': 0, 'coingecko': 0}

def get_tickers():
    global _source_mode

    # Tenta Binance
    if _source_mode in (None, 'binance') and _fail_counts['binance'] < 3:
        try:
            t = fetch_binance()
            _source_mode = 'binance'
            _fail_counts['binance'] = 0
            return t, 'BINANCE LIVE 🟢'
        except Exception:
            _fail_counts['binance'] += 1

    # Tenta CoinGecko
    if _source_mode in (None, 'binance', 'coingecko') and _fail_counts['coingecko'] < 5:
        try:
            t = fetch_coingecko()
            _source_mode = 'coingecko'
            _fail_counts['coingecko'] = 0
            return t, 'COINGECKO LIVE 🟡'
        except Exception:
            _fail_counts['coingecko'] += 1

    # Fallback simulacao
    _source_mode = 'sim'
    return fetch_simulated(), 'SIMULACAO 🔴'


# ----------------------------------------------------------------
# Detector de arbitragem
# ----------------------------------------------------------------
def check_triangle(tickers: dict, triangle: tuple):
    """
    Rota: USDT -> A -> B -> USDT
    leg1: compra A/USDT  (ask)
    leg2: compra B/A     (ask)
    leg3: vende B/USDT   (bid)
    Retorna % lucro liquido ou None.
    """
    ab_usdt, a_b, b_usdt = triangle
    if ab_usdt not in tickers or a_b not in tickers or b_usdt not in tickers:
        return None

    fee = 1 - FEE_PER_ORDER / 100

    ask1 = tickers[ab_usdt]['ask']
    if not ask1: return None
    qty_a = CAPITAL / ask1 * fee        # USDT -> A

    ask2 = tickers[a_b]['ask']
    if not ask2: return None
    qty_b = qty_a / ask2 * fee          # A -> B

    bid3 = tickers[b_usdt]['bid']
    if not bid3: return None
    final = qty_b * bid3 * fee          # B -> USDT

    return (final - CAPITAL) / CAPITAL * 100


# ----------------------------------------------------------------
# HTTP server com endpoint /data
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
            elif self.path == '/':
                self.send_response(302)
                self.send_header('Location', '/dashboard.html')
                self.end_headers()
            else:
                super().do_GET()
    HTTPServer(('0.0.0.0', 8081), H).serve_forever()


# ----------------------------------------------------------------
# Loop principal
# ----------------------------------------------------------------
async def trading_loop():
    print('=' * 55)
    print('  CECHELLA — PAPER TRADING COM PRECOS REAIS')
    print('  Dashboard: aba Preview -> /dashboard.html')
    print(f'  Capital: ${CAPITAL} | Spread min: {MIN_PROFIT_PCT}%')
    print(f'  Triangulos: {len(TRIANGLES)}')
    print(f'  API Key: {"configurada" if BINANCE_API_KEY else "nao configurada"}')
    print('=' * 55)

    coingecko_interval = 0  # CoinGecko: limite de 30 req/min, busca a cada 2s

    while True:
        try:
            t0 = datetime.now(timezone.utc)

            # CoinGecko nao precisa ser chamado todo segundo (rate limit)
            if _source_mode == 'coingecko':
                coingecko_interval += 1
                if coingecko_interval % 2 != 0:
                    await asyncio.sleep(1)
                    continue

            tickers, source_label = get_tickers()
            lat_ms = (datetime.now(timezone.utc) - t0).total_seconds() * 1000

            state['lat_cur'] = lat_ms
            state['latencies'].append(lat_ms)
            if len(state['latencies']) > 500:
                state['latencies'].pop(0)
            state['source'] = source_label

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
                    print(f"[{ts}] OPORTUNIDADE +${profit:.4f} ({net_pct:.3f}%) | {trade['triangle']} | {source_label}")

            if state['total'] % 60 == 0:
                lats = state['latencies']
                avg  = sum(lats) / len(lats) if lats else 0
                ts   = datetime.now(timezone.utc).strftime('%H:%M:%S')
                print(f"[{ts}] ciclos:{state['total']} opps:{state['profitable']} pnl:${state['pnl']:.4f} lat:{avg:.0f}ms | {source_label}")

        except Exception as e:
            print(f"Erro: {e}")

        await asyncio.sleep(1)


async def main():
    Thread(target=serve_http, daemon=True).start()
    print("Servidor HTTP na porta 8081")
    await trading_loop()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        lats = state['latencies']
        avg  = sum(lats) / len(lats) if lats else 0
        hit  = (state['profitable'] / state['total'] * 100) if state['total'] else 0
        print(f"\n{'='*50}")
        print(f"  RESUMO — PAPER TRADING 2 SEMANAS")
        print(f"  Fonte: {state['source']}")
        print(f"  Ciclos: {state['total']} | Opps: {state['profitable']}")
        print(f"  Taxa de acerto: {hit:.2f}%")
        print(f"  PnL simulado: ${state['pnl']:.4f}")
        print(f"  Lat. media: {avg:.0f}ms")
        print(f"{'='*50}")
