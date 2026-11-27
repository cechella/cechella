#!/bin/bash
# Atualiza e reinicia o site (Next.js) na VM hormone-agent. Rodar como vcechella.
set -euo pipefail
cd ~/cechella
git fetch -q origin main
git merge -q --ff-only origin/main
cd web
npm ci --no-audit --no-fund
NODE_OPTIONS=--max-old-space-size=3072 npx next build
pm2 restart hormone-web --update-env
echo "✅ hormone-web atualizado: $(git log --oneline -1)"
