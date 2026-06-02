from fastapi import APIRouter

router = APIRouter()


@router.get('/stats')
async def get_stats():
    return {
        'balance': 1311.90,
        'profit_today': 17.30,
        'profit_pct_today': 1.73,
        'profit_month': 311.90,
        'profit_pct_month': 31.19,
        'bot_status': 'active',
        'uptime_pct': 99.8,
        'latency_ms': 12,
        'cycles_today': 47,
        'trades_today': 12,
    }


@router.get('/trades/recent')
async def get_recent_trades(limit: int = 20):
    return []
