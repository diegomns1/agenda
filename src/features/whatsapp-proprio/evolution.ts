import "server-only";

/*
 * Evolution API (15/11/2026): conecta o WhatsApp da PRÓPRIA profissional (QR Code ou código de 8 letras)
 * para os lembretes saírem do número dela. Roda em Docker no mesmo servidor (deploy/vps/instalar-evolution.sh),
 * só acessível por 127.0.0.1. Uma "instância" por profissional.
 * Variáveis (na VPS, /root/vaguinha/config/env, gravadas pelo script):
 *   EVOLUTION_URL             http://127.0.0.1:8080
 *   EVOLUTION_API_KEY         chave global da Evolution (segredo)
 *   EVOLUTION_WEBHOOK_SECRET  vai no cabeçalho dos avisos da Evolution para o painel (segredo)
 * Não é o WhatsApp oficial (Meta): é o mesmo caminho do "WhatsApp Web". A profissional aceita o risco ao conectar.
 */

export function evolutionConfigurada() {
  return Boolean(process.env.EVOLUTION_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_WEBHOOK_SECRET);
}

/** Nome da conexão da profissional na Evolution. */
export function nomeInstancia(profissionalId: string) {
  return `vg-${profissionalId}`;
}

/** O que a Evolution devolve enquanto espera a conexão: imagem do QR e/ou código para digitar no celular. */
export type QrEvolution = { pairingCode?: string | null; code?: string | null; base64?: string | null; count?: number };

export type EstadoEvolution = "open" | "connecting" | "close" | "inexistente";

async function chamar<T>(metodo: "GET" | "POST" | "DELETE", caminho: string, corpo?: unknown): Promise<{ ok: boolean; status: number; dados: T | null }> {
  if (!evolutionConfigurada()) return { ok: false, status: 0, dados: null };
  try {
    const r = await fetch(`${process.env.EVOLUTION_URL}${caminho}`, {
      method: metodo,
      headers: { apikey: process.env.EVOLUTION_API_KEY!, ...(corpo ? { "Content-Type": "application/json" } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    const dados = (await r.json().catch(() => null)) as T | null;
    if (!r.ok) console.error("[evolution]", metodo, caminho.replace(/vg-[\w-]+/, "vg-…"), r.status, JSON.stringify(dados).slice(0, 300));
    return { ok: r.ok, status: r.status, dados };
  } catch (e) {
    console.error("[evolution] sem resposta", metodo, e instanceof Error ? e.message : e);
    return { ok: false, status: 0, dados: null };
  }
}

const enc = encodeURIComponent;

/**
 * Avisos que a Evolution manda para o painel. Versão 2 (fase 3): conexão + mensagens recebidas.
 * As mensagens chegam todas, mas o painel só usa a resposta de quem recebeu lembrete; o resto é descartado na hora.
 */
export const VERSAO_AVISOS = 2;
const EVENTOS_AVISOS = ["CONNECTION_UPDATE", "MESSAGES_UPSERT"];

function configAvisos(urlAvisos: string) {
  return {
    enabled: true,
    url: urlAvisos,
    byEvents: false,
    base64: false,
    headers: { "x-vaguinha-token": process.env.EVOLUTION_WEBHOOK_SECRET },
    events: EVENTOS_AVISOS,
  };
}

/** Atualiza os avisos de uma conexão que já existe (conexões criadas antes da fase 3). */
export async function configurarAvisos(nome: string, urlAvisos: string): Promise<boolean> {
  const r = await chamar("POST", `/webhook/set/${enc(nome)}`, { webhook: configAvisos(urlAvisos) });
  return r.ok;
}

/**
 * Cria a conexão e já pede o QR Code. Com `numero`, a Evolution também gera o código de 8 letras
 * (WhatsApp → Dispositivos conectados → Conectar com número de telefone).
 * Configurada para não atrapalhar o celular dela: não marca nada como lido, não fica "online", ignora grupos,
 * não puxa o histórico. Avisa o painel da conexão e das mensagens recebidas (ver VERSAO_AVISOS).
 */
export async function criarInstancia(nome: string, numero: string | null, urlAvisos: string): Promise<QrEvolution | null> {
  const r = await chamar<{ qrcode?: QrEvolution }>("POST", "/instance/create", {
    instanceName: nome,
    integration: "WHATSAPP-BAILEYS",
    qrcode: true,
    ...(numero ? { number: numero } : {}),
    rejectCall: false,
    groupsIgnore: true,
    alwaysOnline: false,
    readMessages: false,
    readStatus: false,
    syncFullHistory: false,
    webhook: configAvisos(urlAvisos),
  });
  return r.ok ? (r.dados?.qrcode ?? {}) : null;
}

/** QR/código mais recente enquanto conecta (a Evolution troca o QR a cada ~30 s). */
export async function qrAtual(nome: string): Promise<QrEvolution | null> {
  const r = await chamar<QrEvolution & { instance?: unknown }>("GET", `/instance/connect/${enc(nome)}`);
  return r.ok && r.dados && !("instance" in r.dados) ? r.dados : null;
}

export async function estadoInstancia(nome: string): Promise<EstadoEvolution> {
  const r = await chamar<{ instance?: { state?: string } }>("GET", `/instance/connectionState/${enc(nome)}`);
  if (r.status === 404) return "inexistente";
  const s = r.dados?.instance?.state;
  return s === "open" || s === "connecting" ? s : r.ok && s ? "close" : "inexistente";
}

/** Número e nome do perfil do WhatsApp conectado. */
export async function infoInstancia(nome: string): Promise<{ numero: string | null; nomePerfil: string | null }> {
  const r = await chamar<{ ownerJid?: string | null; profileName?: string | null }[]>("GET", `/instance/fetchInstances?instanceName=${enc(nome)}`);
  const i = r.dados?.[0];
  return { numero: i?.ownerJid?.split("@")[0]?.replace(/\D/g, "") || null, nomePerfil: i?.profileName ?? null };
}

/** Desconecta do WhatsApp (some de "Dispositivos conectados" no celular dela) e apaga a conexão. */
export async function apagarInstancia(nome: string) {
  await chamar("DELETE", `/instance/logout/${enc(nome)}`);
  await chamar("DELETE", `/instance/delete/${enc(nome)}`);
}

/**
 * Manda texto pelo WhatsApp dela. `numero` só com dígitos e 55. `digitandoMs`: tempo de "digitando…" antes de sair.
 * A Evolution confere se o número tem WhatsApp (sem WhatsApp = erro 400).
 */
export async function enviarTextoProprio(nome: string, numero: string, texto: string, digitandoMs = 0): Promise<{ ok: boolean; erro?: string }> {
  const r = await chamar<{ response?: { message?: unknown } }>("POST", `/message/sendText/${enc(nome)}`, {
    number: numero,
    text: texto,
    ...(digitandoMs > 0 ? { delay: digitandoMs } : {}),
  });
  if (r.ok) return { ok: true };
  const msg = JSON.stringify(r.dados?.response?.message ?? "");
  return { ok: false, erro: r.status === 400 && /exists.{0,4}false/i.test(msg) ? "número sem WhatsApp" : r.status ? `erro ${r.status}` : "sem resposta" };
}
