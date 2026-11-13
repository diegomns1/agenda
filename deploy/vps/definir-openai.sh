#!/bin/bash
# Grava a chave da OpenAI (transcrição dos áudios do WhatsApp) na VPS e reinicia o Vaguinha (sem montar de novo).
# Uso (o Diego roda no terminal):  ssh -t root@179.198.107.151 bash /root/vaguinha/atual/deploy/vps/definir-openai.sh
# - A chave é digitada sem aparecer na tela; Enter sem digitar mantém o que já estava.
set -euo pipefail

ARQ=/root/vaguinha/config/env
touch "$ARQ"
chmod 600 "$ARQ"

atual() { grep -E "^$1=" "$ARQ" | head -1 | cut -d= -f2- || true; }
gravar() {
  local nome="$1" valor="$2" tmp
  tmp=$(mktemp)
  grep -vE "^$nome=" "$ARQ" > "$tmp" || true
  [ -n "$valor" ] && printf '%s=%s\n' "$nome" "${valor//\$/\\\$}" >> "$tmp"
  cat "$tmp" > "$ARQ"
  rm -f "$tmp"
}

echo "== OPENAI_API_KEY (transcrever os áudios do WhatsApp)"
echo "   Onde pegar: platform.openai.com > API keys > Create new secret key (começa com sk-)"
[ -n "$(atual OPENAI_API_KEY)" ] && echo "   (já definida; Enter mantém)" || echo "   (ainda vazia)"
read -r -s -p "   Cole e tecle Enter (não aparece na tela): " valor; echo
valor="$(echo -n "$valor" | tr -d '\r' | sed 's/^ *//;s/ *$//')"
if [ -n "$valor" ]; then
  case "$valor" in
    sk-*) gravar OPENAI_API_KEY "$valor"; echo "   ok, gravada (${#valor} caracteres)" ;;
    *) echo "   Isso não parece uma chave da OpenAI (devia começar com sk-). Nada foi gravado."; exit 1 ;;
  esac
fi

echo
echo "Reiniciando o Vaguinha para ler a variável nova..."
pm2 reload /root/vaguinha/ecosystem.config.cjs --update-env >/dev/null
sleep 4
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: painel.vaguinha.app" "http://[::1]:3020/login" || true)
echo "Painel respondendo: HTTP $code (200 = tudo certo)"
