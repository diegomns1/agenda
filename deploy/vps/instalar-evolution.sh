#!/bin/bash
# Instala a Evolution API (conexão do WhatsApp da profissional por QR Code / código), 15/11/2026.
# Uso (o Diego roda no terminal):  ssh -t root@179.198.107.151 bash /root/vaguinha/atual/deploy/vps/instalar-evolution.sh
#
# - Roda em Docker, só acessível de dentro do servidor (127.0.0.1:8080). Nada fica aberto na internet.
# - NÃO guarda mensagens, conversas nem contatos de ninguém: só o necessário para manter a conexão.
# - Cria as chaves sozinho e grava em /root/vaguinha/config/env (ninguém precisa copiar nada).
# - Pode rodar de novo sem medo: mantém as chaves e as conexões que já existem.
set -euo pipefail

VERSAO_EVOLUTION="v2.3.7"
DIR=/root/evolution
ENV_VAGUINHA=/root/vaguinha/config/env

echo "== Memória do servidor"
free -h | sed -n 1,2p
livre_mb=$(free -m | awk '/^Mem:/ {print $7}')
if [ "${livre_mb:-0}" -lt 600 ]; then
  echo "   Atenção: só ${livre_mb} MB livres. A Evolution usa uns 300-500 MB. Se o painel ficar lento, me avise."
fi

echo
echo "== Docker"
if ! command -v docker >/dev/null 2>&1; then
  echo "   Instalando o Docker (pelo apt do Ubuntu)..."
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io docker-compose-v2 >/dev/null
  systemctl enable --now docker >/dev/null
fi
docker --version
docker compose version

mkdir -p "$DIR"
chmod 700 "$DIR"
touch "$ENV_VAGUINHA"
chmod 600 "$ENV_VAGUINHA"

atual() { grep -E "^$1=" "$2" 2>/dev/null | head -1 | cut -d= -f2- || true; }
gravar() {
  local arq="$1" nome="$2" valor="$3" tmp
  tmp=$(mktemp)
  grep -vE "^$nome=" "$arq" > "$tmp" 2>/dev/null || true
  printf '%s=%s\n' "$nome" "$valor" >> "$tmp"
  cat "$tmp" > "$arq"
  rm -f "$tmp"
}
aleatorio() { openssl rand -hex "$1"; }

# Chaves: reaproveita as que já existem
CHAVE_API=$(atual EVOLUTION_API_KEY "$ENV_VAGUINHA");        [ -n "$CHAVE_API" ] || CHAVE_API=$(aleatorio 24)
SEGREDO_WEBHOOK=$(atual EVOLUTION_WEBHOOK_SECRET "$ENV_VAGUINHA"); [ -n "$SEGREDO_WEBHOOK" ] || SEGREDO_WEBHOOK=$(aleatorio 24)
SENHA_BANCO=$(atual POSTGRES_PASSWORD "$DIR/.env");          [ -n "$SENHA_BANCO" ] || SENHA_BANCO=$(aleatorio 18)

cat > "$DIR/.env" <<EOF
SERVER_TYPE=http
SERVER_PORT=8080
SERVER_URL=http://127.0.0.1:8080
TELEMETRY_ENABLED=false
LOG_LEVEL=ERROR,WARN
LOG_COLOR=false
LOG_BAILEYS=error
DEL_INSTANCE=false
LANGUAGE=pt-BR
CORS_ORIGIN=*

AUTHENTICATION_API_KEY=$CHAVE_API
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=false

POSTGRES_DATABASE=evolution
POSTGRES_USERNAME=evolution
POSTGRES_PASSWORD=$SENHA_BANCO
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution:$SENHA_BANCO@evolution-postgres:5432/evolution?schema=evolution_api
DATABASE_CONNECTION_CLIENT_NAME=vaguinha
# Privacidade: guarda só a conexão. Nada de mensagens, conversas, contatos ou histórico.
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=false
DATABASE_SAVE_MESSAGE_UPDATE=false
DATABASE_SAVE_DATA_CONTACTS=false
DATABASE_SAVE_DATA_CHATS=false
DATABASE_SAVE_DATA_LABELS=false
DATABASE_SAVE_DATA_HISTORIC=false
DATABASE_SAVE_IS_ON_WHATSAPP=false
DATABASE_DELETE_MESSAGE=true

# Sem Redis (economiza memória): cache na própria Evolution
CACHE_REDIS_ENABLED=false
CACHE_LOCAL_ENABLED=true

WEBHOOK_GLOBAL_ENABLED=false
WEBSOCKET_ENABLED=false
RABBITMQ_ENABLED=false
SQS_ENABLED=false
PUSHER_ENABLED=false
KAFKA_ENABLED=false
S3_ENABLED=false
CHATWOOT_ENABLED=false
TYPEBOT_ENABLED=false
OPENAI_ENABLED=false
DIFY_ENABLED=false
N8N_ENABLED=false
EVOAI_ENABLED=false

CONFIG_SESSION_PHONE_CLIENT=Vaguinha
CONFIG_SESSION_PHONE_NAME=Chrome
QRCODE_LIMIT=30
QRCODE_COLOR=#702D50
EOF
chmod 600 "$DIR/.env"

cat > "$DIR/docker-compose.yml" <<EOF
services:
  api:
    container_name: evolution_api
    image: evoapicloud/evolution-api:$VERSAO_EVOLUTION
    restart: always
    depends_on:
      - evolution-postgres
    ports:
      - "127.0.0.1:8080:8080"
    volumes:
      - evolution_instances:/evolution/instances
    env_file:
      - .env
    mem_limit: 700m

  evolution-postgres:
    container_name: evolution_postgres
    image: postgres:15-alpine
    restart: always
    environment:
      - POSTGRES_DB=evolution
      - POSTGRES_USER=evolution
      - POSTGRES_PASSWORD=$SENHA_BANCO
    volumes:
      - postgres_data:/var/lib/postgresql/data
    mem_limit: 256m

volumes:
  evolution_instances:
  postgres_data:
EOF
chmod 600 "$DIR/docker-compose.yml"

echo
echo "== Subindo a Evolution API $VERSAO_EVOLUTION (a primeira vez baixa uns 500 MB, pode levar alguns minutos)"
cd "$DIR"
docker compose pull -q
docker compose up -d

echo -n "   Esperando responder"
for _ in $(seq 1 60); do
  code=$(curl -s -m 5 -o /dev/null -w "%{http_code}" -H "apikey: $CHAVE_API" http://127.0.0.1:8080/instance/fetchInstances || true)
  [ "$code" = "200" ] && break
  echo -n "."
  sleep 3
done
echo
if [ "$code" != "200" ]; then
  echo "   A Evolution não respondeu (HTTP $code). Últimas linhas do registro:"
  docker compose logs --tail 40 api | sed -E "s#postgresql://[^ '\"]+#postgresql://***#g"
  exit 1
fi
echo "   Evolution respondendo (HTTP 200)."

echo
echo "== Ligando o Vaguinha à Evolution"
gravar "$ENV_VAGUINHA" EVOLUTION_URL "http://127.0.0.1:8080"
gravar "$ENV_VAGUINHA" EVOLUTION_API_KEY "$CHAVE_API"
gravar "$ENV_VAGUINHA" EVOLUTION_WEBHOOK_SECRET "$SEGREDO_WEBHOOK"
echo "   ok (chaves gravadas em $ENV_VAGUINHA, sem aparecer na tela)"

pm2 reload /root/vaguinha/ecosystem.config.cjs --update-env >/dev/null
sleep 4
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: painel.vaguinha.app" "http://[::1]:3020/login" || true)
echo "Painel respondendo: HTTP $code (200 = tudo certo)"
echo
free -h | sed -n 1,2p
echo "Pronto. Pode avisar o Claude."
