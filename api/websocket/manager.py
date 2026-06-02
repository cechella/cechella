from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio

ws_router = APIRouter()

_connections: dict[str, WebSocket] = {}


@ws_router.websocket('/ws/{user_id}')
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    _connections[user_id] = websocket
    try:
        while True:
            await asyncio.sleep(2)
            await websocket.send_json(_live_snapshot())
    except WebSocketDisconnect:
        _connections.pop(user_id, None)


def _live_snapshot() -> dict:
    return {
        'type': 'stats_update',
        'balance': 1311.90,
        'profit_today': 17.30,
        'profit_pct_today': 1.73,
        'bot_latency_ms': 12,
        'last_trade': {
            'time': '14:32:07',
            'triangle': 'BTC->ETH->USDT',
            'profit': 1.30,
            'status': 'success',
        },
    }


async def broadcast_trade(trade: dict):
    for ws in list(_connections.values()):
        try:
            await ws.send_json({'type': 'new_trade', **trade})
        except Exception:
            pass
