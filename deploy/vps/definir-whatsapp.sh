#!/bin/bash
# Grava as variáveis da assistente no WhatsApp na VPS e reinicia o Vaguinha (sem montar de novo).
# Uso (o Diego roda no terminal):  ssh -t root@179.198.107.151 bash /root/vaguinha/definir-whatsapp.sh
# - Segredos são digitados sem aparecer na tela; Enter sem digitar mantém o que já estava.
# - A senha do webhook (WHATSAPP_VERIFY_TOKEN) é criada aqui e mostrada UMA vez, para colar na Meta.
set -euo pipefail

ARQ=/root/vaguinha/config/env
touch "$ARQ"
chmod 600 "$ARQ"

atual() { grep -E "^$1=" "$ARQ" | head -1 | cut -d= -f2- || true; }

gravar() {
  local nome="$1" valor="$2" tmp
  tmp=$(mktemp)
  grep -vE "^$nome=" "$ARQ" > "$tmp" || true
  printf '%s=%s\n' "$nome" "${valor//\$/\\\$}" >> "$tmp"
  cat "$tmp" > "$ARQ"
  rm -f "$tmp"
}

pergunta() {
  local nome="$1" onde="$2" segredo="$3" valor ja
  ja=$(atual "$nome")
  echo
  echo "== $nome"
  echo "   Onde pegar: $onde"
  if [ "$segredo" = "sim" ]; then
    [ -n "$ja" ] && echo "   (já definido; Enter mantém)" || echo "   (ainda vazio)"
    read -r -s -p "   Cole e tecle Enter (não aparece na tela): " valor; echo
  else
    [ -n "$ja" ] && echo "   Atual: $ja (Enter mantém)"
    read -r -p "   Valor: " valor
  fi
  valor="$(echo -n "$valor" | tr -d '\r' | sed 's/^ *//;s/ *$//')"
  if [ -n "$valor" ]; then gravar "$nome" "$valor"; echo "   ok, gravado"; fi
}

echo "Assistente no WhatsApp: variáveis da Meta. Pode rodar quantas vezes quiser."

pergunta WHATSAPP_NUMERO_ASSISTENTE "o número que vai receber as mensagens (agora o de TESTE da Meta; depois 5514998023550). Só números, com 55." nao
pergunta WHATSAPP_PHONE_NUMBER_ID "Meta > WhatsApp > Configuração da API: 'Identificação do número de telefone' (Phone number ID) do MESMO número acima" nao
pergunta WHATSAPP_TOKEN "Meta > WhatsApp > Configuração da API: 'Gerar token de acesso' (o de teste vale 24 h; depois trocamos pelo permanente)" sim
pergunta WHATSAPP_APP_SECRET "Meta > Configurações do app > Básico > 'Chave secreta do app' > Mostrar" sim

if [ -z "$(atual WHATSAPP_VERIFY_TOKEN)" ]; then
  gravar WHATSAPP_VERIFY_TOKEN "$(openssl rand -hex 20)"
fi
echo
echo "=================================================================="
echo " Para colar na Meta (WhatsApp > Configuração > Webhook > Editar):"
echo "   URL de callback:      https://painel.vaguinha.app/api/webhooks/whatsapp"
echo "   Verificar token:      $(atual WHATSAPP_VERIFY_TOKEN)"
echo "=================================================================="

echo
echo "Reiniciando o Vaguinha para ler as variáveis novas..."
pm2 reload /root/vaguinha/ecosystem.config.cjs --update-env >/dev/null
sleep 4
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: painel.vaguinha.app" "http://[::1]:3020/login" || true)
echo "Painel respondendo: HTTP $code (200 = tudo certo)"
