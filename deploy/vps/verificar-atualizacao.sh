#!/bin/bash
# Roda a cada 5 minutos (cron). Se o GitHub (main) tiver versão nova, publica com atualizar.sh.
# Assim o fluxo continua o mesmo de antes: o Diego dá push e, em alguns minutos, está no ar.
set -uo pipefail
BASE=/root/vaguinha
exec 9>"$BASE/.atualizando.lock"
flock -n 9 || exit 0   # já tem uma publicação em andamento

remoto=$(git ls-remote https://github.com/diegomns1/agenda.git refs/heads/main 2>/dev/null | cut -f1)
[ -n "$remoto" ] || exit 0
atual=$(cat "$BASE/versao-publicada" 2>/dev/null || true)
if [ -z "$atual" ] && [ -d "$BASE/atual/.git" ]; then atual=$(git -C "$BASE/atual" rev-parse HEAD); echo "$atual" > "$BASE/versao-publicada"; fi
[ "$remoto" = "$atual" ] && exit 0

if bash "$BASE/atualizar.sh"; then
  git -C "$BASE/atual" rev-parse HEAD > "$BASE/versao-publicada"
else
  echo "$(date '+%F %T') publicação de $remoto falhou; o site continua na versão anterior" >> "$BASE/atualizacoes.log"
  echo "$remoto" > "$BASE/versao-publicada"   # não tenta de novo a mesma versão quebrada a cada 5 min
fi
