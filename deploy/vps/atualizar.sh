#!/bin/bash
# Publica a versão mais nova do GitHub (main) na VPS, sem derrubar o site durante o build:
# cada versão é montada numa pasta própria (releases/AAAAMMDD-HHMMSS) e só depois o atalho "atual" troca.
# Uso: bash /root/vaguinha/atualizar.sh
set -euo pipefail

BASE=/root/vaguinha
REPO=https://github.com/diegomns1/agenda.git
NOVA="$BASE/releases/$(date +%Y%m%d-%H%M%S)"
LOG="$BASE/atualizacoes.log"

exec > >(tee -a "$LOG") 2>&1
echo "=== $(date '+%F %T') publicando em $NOVA"

[ -s "$BASE/config/env" ] || { echo "Falta $BASE/config/env: rode definir-variaveis.sh"; exit 1; }

mkdir -p "$BASE/releases"
git clone --quiet --depth 1 "$REPO" "$NOVA"
ln -s "$BASE/config/env" "$NOVA/.env.production.local"
cd "$NOVA"
echo "versão: $(git log -1 --format='%h %s')"

npm ci --no-audit --no-fund --loglevel=error
NODE_OPTIONS=--max-old-space-size=2048 NEXT_TELEMETRY_DISABLED=1 npm run build

ln -sfn "$NOVA" "$BASE/atual"
if pm2 describe vaguinha >/dev/null 2>&1; then
  pm2 reload "$BASE/ecosystem.config.cjs" --update-env
else
  pm2 start "$BASE/ecosystem.config.cjs"
fi
pm2 save >/dev/null

# confere se respondeu
sleep 4
code=$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: painel.vaguinha.app' 'http://[::1]:3020/login' || true)
echo "teste local /login: HTTP $code"

# guarda só as 3 versões mais novas
ls -1dt "$BASE"/releases/*/ | tail -n +4 | xargs -r rm -rf
echo "=== ok"
