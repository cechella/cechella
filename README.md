# Cechella — Arbitrage Bot Platform

Plataforma automatizada de arbitragem triangular na Binance com dashboard web em tempo real, app mobile (iOS/Android) e sistema de afiliados.

## Stack

| Camada | Tecnologia |
|---|---|
| Bot Engine | Python + asyncio + ccxt |
| Backend API | FastAPI + WebSocket |
| Frontend Web | Next.js 14 + Tailwind CSS |
| Mobile | React Native + Expo |
| Banco de Dados | PostgreSQL + Redis |
| Infra | Docker + VPS Tokyo |

## Estrutura

```
cechella/
├── bot/         # Motor de arbitragem triangular (Python)
├── api/         # Backend FastAPI + WebSocket
├── web/         # Dashboard Next.js (tempo real)
├── mobile/      # App React Native (iOS + Android)
└── infra/       # Docker Compose + Nginx
```

## Fases

- **Fase 1** — Bot + Dashboard web (MVP)
- **Fase 2** — App mobile + Sistema de afiliados
- **Fase 3** — Multi-exchange + Planos de assinatura

## Setup Rápido

```bash
cp .env.example .env
# Preencha as chaves da Binance no .env
docker-compose -f infra/docker-compose.yml up -d
```

## Triângulos Monitorados

| Triângulo | Volume diário |
|---|---|
| USDT → BTC → ETH → USDT | $2B+ |
| USDT → BTC → BNB → USDT | $500M |
| USDT → ETH → SOL → USDT | $200M |
