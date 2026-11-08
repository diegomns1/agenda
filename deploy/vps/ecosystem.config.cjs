// PM2: o Vaguinha roda da pasta /root/vaguinha/atual (atalho para a versão publicada), só para o nginx (127.0.0.1).
module.exports = {
  apps: [
    {
      name: "vaguinha",
      cwd: "/root/vaguinha/atual",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3020 -H 127.0.0.1",
      env: { NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" },
      max_memory_restart: "700M",
      kill_timeout: 8000,
    },
  ],
};
