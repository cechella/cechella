from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import auth, trades, dashboard, affiliates
from api.websocket.manager import ws_router

app = FastAPI(title='Cechella API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router,       prefix='/auth',       tags=['auth'])
app.include_router(trades.router,     prefix='/trades',     tags=['trades'])
app.include_router(dashboard.router,  prefix='/dashboard',  tags=['dashboard'])
app.include_router(affiliates.router, prefix='/affiliates', tags=['affiliates'])
app.include_router(ws_router)


@app.get('/health')
def health():
    return {'status': 'ok', 'version': '1.0.0'}
