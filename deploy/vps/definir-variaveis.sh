#!/bin/bash
# Grava as variáveis do Vaguinha na VPS, sem que elas passem por chat nenhum.
# Uso (o Diego roda no terminal):  ssh -t root@179.198.107.151 bash /root/vaguinha/definir-variaveis.sh
# - Mostra o valor atual só dos itens públicos; segredos aparecem como "(já definido)".
# - Enter sem digitar nada mantém o valor que já estava.
# - Segredos são digitados sem aparecer na tela.
set -euo pipefail

ARQ=/root/vaguinha/config/env
mkdir -p "$(dirname "$ARQ")"
touch "$ARQ"
chmod 600 "$ARQ"

atual() { grep -E "^$1=" "$ARQ" | head -1 | cut -d= -f2- || true; }

gravar() {
  local nome="$1" valor="$2" tmp
  tmp=$(mktemp)
  grep -vE "^$nome=" "$ARQ" > "$tmp" || true
  printf '%s=%s\n' "$nome" "$valor" >> "$tmp"
  cat "$tmp" > "$ARQ"
  rm -f "$tmp"
}

# pergunta NOME "onde pegar" segredo(sim/nao) [padrão]
pergunta() {
  local nome="$1" onde="$2" segredo="$3" padrao="${4:-}" valor ja
  ja=$(atual "$nome")
  [ -z "$ja" ] && [ -n "$padrao" ] && ja="$padrao" && gravar "$nome" "$padrao"
  echo
  echo "== $nome"
  echo "   Onde pegar: $onde"
  if [ "$segredo" = "sim" ]; then
    [ -n "$ja" ] && echo "   (já definido; Enter mantém)" || echo "   (ainda vazio)"
    read -r -s -p "   Cole e tecle Enter: " valor; echo
  else
    [ -n "$ja" ] && echo "   Atual: $ja (Enter mantém)"
    read -r -p "   Valor: " valor
  fi
  if [ -n "$valor" ]; then gravar "$nome" "$valor"; echo "   ok, gravado"; fi
}

echo "Variáveis do Vaguinha. Pode rodar quantas vezes quiser: Enter mantém o que já está."

pergunta NEXT_PUBLIC_APP_URL "endereço do painel" nao "https://painel.vaguinha.app"
pergunta NEXT_PUBLIC_SUPABASE_URL "Vercel: SUPABASE_URL (ou Supabase > Project Settings > API)" nao "https://bdiefcuoomhtspmktksz.supabase.co"
pergunta NEXT_PUBLIC_SUPABASE_ANON_KEY "Vercel: SUPABASE_PUBLISHABLE_KEY (Supabase > Project Settings > API Keys > publishable)" sim
pergunta SUPABASE_SERVICE_ROLE_KEY "Vercel: SUPABASE_SERVICE_ROLE_KEY (Supabase > Project Settings > API Keys > secret/service_role)" sim
pergunta NEXT_PUBLIC_VAPID_PUBLIC_KEY "Vercel: NEXT_PUBLIC_VAPID_PUBLIC_KEY" nao
pergunta VAPID_PRIVATE_KEY "Vercel: VAPID_PRIVATE_KEY" sim
pergunta VAPID_SUBJECT "Vercel: VAPID_SUBJECT" nao
pergunta CRON_SECRET "Vercel: CRON_SECRET (tem que ser o MESMO da Vercel: o agendador do Supabase usa ele)" sim
pergunta EMAIL_REMETENTE "remetente dos e-mails" nao "Vaguinha <contato@vaguinha.app>"
pergunta EMAIL_ADMIN "Vercel: EMAIL_ADMIN (seu e-mail para o aviso de cadastro novo)" nao
pergunta RESEND_API_KEY "Resend > API Keys > Create API key (Sending access). Uma chave nova serve." sim
pergunta ANTHROPIC_API_KEY "console.anthropic.com > API Keys > Create Key. Uma chave nova serve." sim
pergunta ASAAS_AMBIENTE "producao" nao "producao"
pergunta ASAAS_API_KEY "Asaas > Integrações > Chave de API. SÓ NA HORA DA VIRADA (gerar nova desliga a da Vercel)" sim
pergunta ASAAS_WEBHOOK_TOKEN "o mesmo token do webhook no Asaas. SÓ NA HORA DA VIRADA" sim

echo
echo "Pronto. Itens preenchidos:"
cut -d= -f1 "$ARQ" | sed 's/^/  - /'
echo "Para valer: o Claude gera a versão de novo (ou rode: bash /root/vaguinha/atualizar.sh)."
