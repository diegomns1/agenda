#!/bin/bash
# Preparação única da VPS para o Vaguinha (pode rodar de novo sem estragar nada).
set -euo pipefail

# 1) memória extra (swap de 2 GB): o build do Next precisa, e protege os outros sistemas
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -q vm.swappiness=10
  grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
  echo "swap: criado"
else
  echo "swap: já existia"
fi

# 2) pastas
mkdir -p /root/vaguinha/releases /root/vaguinha/config /root/vaguinha/backups
chmod 700 /root/vaguinha/config /root/vaguinha/backups
echo "pastas: ok"

# 3) nginx (só porta 80 por enquanto; não mexe nos outros sites)
cp /root/vaguinha/nginx-vaguinha.conf /etc/nginx/sites-available/vaguinha
ln -sfn /etc/nginx/sites-available/vaguinha /etc/nginx/sites-enabled/vaguinha
nginx -t && systemctl reload nginx && echo "nginx: ok"

free -h | head -3
