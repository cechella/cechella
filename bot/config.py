import os
from dotenv import load_dotenv

load_dotenv()

BINANCE_API_KEY  = os.getenv('BINANCE_API_KEY', '')
BINANCE_SECRET   = os.getenv('BINANCE_SECRET', '')

MIN_PROFIT_PCT    = 0.15   # % minimo liquido para executar ciclo
CAPITAL_PER_CYCLE = 1000   # USDT por ciclo
DAILY_STOP_LOSS   = 30     # Para o bot se perder $30 no dia

TRIANGLES = [
    ('BTC/USDT', 'ETH/BTC', 'ETH/USDT'),
    ('ETH/USDT', 'SOL/ETH', 'SOL/USDT'),
]
