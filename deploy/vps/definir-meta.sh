#!/bin/bash
# Grava a chave da API de Conversões da Meta na VPS e reinicia o Vaguinha (sem montar de novo).
# Uso (o Diego roda no terminal):  ssh -t root@179.198.107.151 bash /root/vaguinha/definir-meta.sh
# - A chave é digitada sem aparecer na tela; Enter sem digitar mantém o que já estava.
# - O código de teste (opcional) faz os eventos aparecerem em "Testar eventos" no Gerenciador de Eventos.
#   Depois do teste, rode de novo e digite "-" nele para apagar.
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

echo "Pixel configurado: $(atual META_PIXEL_ID)"
echo
echo "== META_CAPI_TOKEN"
echo "   Onde pegar: Gerenciador de Eventos > Vaguinha Site > Configurações > API de Conversões > Gerar token de acesso"
[ -n "$(atual META_CAPI_TOKEN)" ] && echo "   (já definido; Enter mantém)" || echo "   (ainda vazio)"
read -r -s -p "   Cole e tecle Enter (não aparece na tela): " valor; echo
valor="$(echo -n "$valor" | tr -d '\r' | sed 's/^ *//;s/ *$//')"
[ -n "$valor" ] && gravar META_CAPI_TOKEN "$valor" && echo "   ok, gravado"

echo
echo "== META_TEST_EVENT_CODE (opcional, só para testar)"
echo "   Onde pegar: Gerenciador de Eventos > Vaguinha Site > Testar eventos > código (ex.: TEST12345). \"-\" apaga."
echo "   Atual: $(atual META_TEST_EVENT_CODE)"
read -r -p "   Valor: " teste
teste="$(echo -n "$teste" | tr -d '\r' | sed 's/^ *//;s/ *$//')"
if [ "$teste" = "-" ]; then gravar META_TEST_EVENT_CODE ""; echo "   apagado"; elif [ -n "$teste" ]; then gravar META_TEST_EVENT_CODE "$teste"; echo "   ok, gravado"; fi

echo
echo "Reiniciando o Vaguinha para ler as variáveis novas..."
pm2 reload /root/vaguinha/ecosystem.config.cjs --update-env >/dev/null
sleep 4
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: painel.vaguinha.app" "http://[::1]:3020/login" || true)
echo "Painel respondendo: HTTP $code (200 = tudo certo)"
