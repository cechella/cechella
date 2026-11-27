# Hospedagem fora da Vercel

Desde 27/11/2026 o site `hormoneecosystem.com` (pasta `web/`, Next.js 14) roda na VM **hormone-agent** (GCP `pelagic-hope-342518`, zona `us-central1-f`, IP `35.255.229.131`, e2-standard-2 / 8 GB). Motivo: a Vercel (plano Hobby) bloqueou o projeto em 17/11 por `FAIR_USE_LIMITS_EXCEEDED` (Fast Origin Transfer).

## Na VM

| Item | Onde |
|---|---|
| Site | PM2 `hormone-web` → `next start -p 3000` (limite 1,5 GB, reinicia sozinho) |
| Variáveis | `~/cechella/web/.env.production` (não versionado; permissão 600) |
| Proxy | nginx `/etc/nginx/sites-available/hormone-web` (`hormoneecosystem.com`, `www`) → `127.0.0.1:3000` |
| Agendamentos | crontab do `vcechella` → `~/hormone-cron.sh` (VERVE a cada minuto; relatório da Ana segunda 08:00 BRT). `CRON_SECRET` em `~/.hormone-cron.env`. Log em `~/hormone-cron.log` |
| Deploy | `bash ~/cechella/infra/deploy-hormone-web.sh` |
| Ana (voz/WhatsApp) | PM2 `ana-master` (porta 3001), inalterado |

## Memória

O navegador do ATLAS (`surf.service`, Chromium) que roda nesta VM causou travamento por falta de memória em 27/11. Ele tem um teto em `/etc/systemd/system/surf.service.d/limite-memoria.conf` (MemoryHigh 1 GB, MemoryMax 1,5 GB, OOMScoreAdjust 800, reinício automático): se passar, só ele é encerrado.

## DNS

O domínio é registrado na **GoDaddy**, mas os nameservers são da **Vercel** (`ns1/ns2.vercel-dns.com`); todos os registros (ana-master, n8n, atlas-*, MailerSend, DMARC, OpenAI) estão no DNS da Vercel. Para sair de vez: recriar todos os registros no DNS da GoDaddy (com `@` e `www` → `35.255.229.131`) e só depois trocar os nameservers.

## Variáveis que faltam

A Vercel não devolve variáveis sensíveis. Ainda precisam ser colocadas em `web/.env.production`: `INSTAGRAM_ACCESS_TOKEN` (VERVE), `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` (vídeos), `MAILERSEND_API_KEY`, `RESEND_API_KEY` (e-mail), `BLOB_READ_WRITE_TOKEN` (imagens do VERVE, Vercel Blob), `ATLAS_WEBHOOK_SECRET`, `MERCADOPAGO_TOKEN`/`MP_ACCESS_TOKEN` (hoje o código usa um token embutido). Depois de editar: `pm2 restart hormone-web --update-env` (para `NEXT_PUBLIC_*`, refazer o build).
