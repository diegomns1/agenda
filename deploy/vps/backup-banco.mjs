// Backup diário dos dados do Vaguinha (roda na VPS pelo cron às 3h).
// Usa a chave de serviço que já está em /root/vaguinha/config/env (nada de senha nova) e a API do Supabase:
// copia cada tabela e a lista de contas (sem senhas) para /root/vaguinha/backups/AAAA-MM-DD.json.gz.
// Guarda os últimos 14 dias. A estrutura das tabelas está no repositório (supabase/migrations).
import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";

const DIR = "/root/vaguinha/backups";
const MANTER = 14;
const TABELAS = ["profiles", "servicos", "clientes", "agendamentos", "agendamento_eventos", "push_subscriptions", "cobrancas", "assistente_uso"];

const env = Object.fromEntries(
  readFileSync("/root/vaguinha/config/env", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/\\\$/g, "$")]),
);
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = env.SUPABASE_SERVICE_ROLE_KEY;
const cab = { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` };

async function tabela(nome) {
  const linhas = [];
  for (let de = 0; ; de += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${nome}?select=*`, { headers: { ...cab, Range: `${de}-${de + 999}`, "Range-Unit": "items" } });
    if (!r.ok && r.status !== 206) throw new Error(`${nome}: HTTP ${r.status}`);
    const parte = await r.json();
    linhas.push(...parte);
    if (parte.length < 1000) break;
  }
  return linhas;
}

async function contas() {
  const lista = [];
  for (let pagina = 1; ; pagina++) {
    const r = await fetch(`${URL_BASE}/auth/v1/admin/users?page=${pagina}&per_page=1000`, { headers: cab });
    if (!r.ok) throw new Error(`contas: HTTP ${r.status}`);
    const { users } = await r.json();
    lista.push(...users.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, app_metadata: u.app_metadata, user_metadata: u.user_metadata })));
    if (users.length < 1000) break;
  }
  return lista;
}

const inicio = Date.now();
const dados = { gerado_em: new Date().toISOString(), tabelas: {}, contas: [] };
const erros = [];
for (const t of TABELAS) {
  try {
    dados.tabelas[t] = await tabela(t);
  } catch (e) {
    erros.push(String(e.message));
  }
}
try {
  dados.contas = await contas();
} catch (e) {
  erros.push(String(e.message));
}

mkdirSync(DIR, { recursive: true });
const dia = new Date().toISOString().slice(0, 10);
const arquivo = `${DIR}/${dia}.json.gz`;
writeFileSync(arquivo, gzipSync(JSON.stringify(dados)), { mode: 0o600 });

// apaga os mais antigos
const antigos = readdirSync(DIR).filter((f) => f.endsWith(".json.gz")).sort().reverse().slice(MANTER);
for (const f of antigos) unlinkSync(`${DIR}/${f}`);

const resumo = Object.entries(dados.tabelas).map(([t, l]) => `${t}=${l.length}`).join(" ");
console.log(`${new Date().toISOString()} backup ${arquivo} contas=${dados.contas.length} ${resumo} (${Date.now() - inicio} ms)${erros.length ? ` ERROS: ${erros.join("; ")}` : ""}`);
if (erros.length) process.exitCode = 1;
