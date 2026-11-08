#!/bin/bash
# Instala as tarefas automáticas do Vaguinha na VPS (o Diego roda uma vez):
#   ssh root@179.198.107.151 bash /root/vaguinha/instalar-tarefas.sh
# - a cada 5 min: se tiver push novo no GitHub, publica (verificar-atualizacao.sh)
# - todo dia às 3h (Brasília): backup dos dados (backup-banco.mjs), guarda 14 dias
# Não mexe nas outras tarefas do cron.
set -euo pipefail
cd /root/vaguinha
chmod +x verificar-atualizacao.sh atualizar.sh
git -C /root/vaguinha/atual rev-parse HEAD > /root/vaguinha/versao-publicada
( crontab -l 2>/dev/null | grep -v '/root/vaguinha/' || true
  echo '*/5 * * * * bash /root/vaguinha/verificar-atualizacao.sh >/dev/null 2>&1 # vaguinha: publica push novo'
  echo '0 6 * * * node /root/vaguinha/backup-banco.mjs >> /root/vaguinha/backups/backup.log 2>&1 # vaguinha: backup 3h BRT'
) | crontab -
echo "Tarefas instaladas:"
crontab -l | grep vaguinha
echo
echo "Testando o backup agora..."
node /root/vaguinha/backup-banco.mjs
echo
echo "Pronto. Pode avisar o Claude."
