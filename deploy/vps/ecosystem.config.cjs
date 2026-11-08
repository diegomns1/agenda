// PM2: o Vaguinha roda da pasta /root/vaguinha/atual (atalho para a versão publicada), só para o nginx (127.0.0.1).
module.exports = {
  apps: [
    {
      name: "vaguinha",
      cwd: "/root/vaguinha/atual",
      script: "node_modules/next/dist/bin/next",
      // "localhost" e não "127.0.0.1": o Next troca 127.0.0.1 por localhost ao montar a URL do proxy.ts; com nomes
      // diferentes, o rewrite do site (/ → /site) vira "externo" e quebra com erro 500 (EPROTO).
      args: "start -p 3020 -H localhost",
      env: { NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" },
      max_memory_restart: "700M",
      kill_timeout: 8000,
    },
  ],
};
