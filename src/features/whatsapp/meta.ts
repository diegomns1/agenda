import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * WhatsApp oficial (Cloud API da Meta) — só o necessário para a assistente.
 * Variáveis (na VPS, /root/vaguinha/config/env):
 *   WHATSAPP_TOKEN            chave permanente do "usuário do sistema" (segredo)
 *   WHATSAPP_APP_SECRET       "Chave secreta do app" (segredo; confere que o aviso veio mesmo da Meta)
 *   WHATSAPP_VERIFY_TOKEN     senha combinada no cadastro do webhook (segredo)
 *   WHATSAPP_PHONE_NUMBER_ID  id do número na Meta (não é segredo)
 *   WHATSAPP_NUMERO_ASSISTENTE / WHATSAPP_ABERTO  ver numero.ts
 *   WHATSAPP_GRAPH_VERSION    opcional (padrão abaixo)
 * Sem a chave/ID, as mensagens de saída só aparecem no log ("modo simulado"), para testar sem a Meta.
 */

const VERSAO = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
const LIMITE_TEXTO = 4000; // a Meta aceita 4096
const LIMITE_CORPO_BOTOES = 1000; // a Meta aceita 1024

export function envioConfigurado() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Confere o cabeçalho X-Hub-Signature-256 (HMAC do corpo com o App Secret). */
export function assinaturaValida(corpo: string, cabecalho: string | null): boolean {
  const segredo = process.env.WHATSAPP_APP_SECRET;
  if (!segredo || !cabecalho?.startsWith("sha256=")) return false;
  const esperado = createHmac("sha256", segredo).update(corpo, "utf8").digest();
  const recebido = Buffer.from(cabecalho.slice(7), "hex");
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

async function chamarMeta(corpo: Record<string, unknown>): Promise<boolean> {
  if (!envioConfigurado()) {
    console.log("[whatsapp simulado] →", JSON.stringify(corpo));
    return true;
  }
  try {
    const r = await fetch(`https://graph.facebook.com/${VERSAO}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...corpo }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) console.error("[whatsapp] envio recusado", r.status, (await r.text()).slice(0, 500));
    return r.ok;
  } catch (e) {
    console.error("[whatsapp] falha no envio", e);
    return false;
  }
}

/**
 * Baixa um arquivo recebido (foto, áudio, documento): a Meta manda só o id; o endereço do arquivo vale por
 * alguns minutos e também pede a chave. null se não deu (sem chave, arquivo grande demais ou fora do ar).
 */
export async function baixarMidia(mediaId: string, limiteBytes = 16 * 1024 * 1024): Promise<{ dados: Buffer; mime: string } | null> {
  if (!envioConfigurado()) return null;
  const auth = { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` };
  try {
    const info = await fetch(`https://graph.facebook.com/${VERSAO}/${encodeURIComponent(mediaId)}`, { headers: auth, signal: AbortSignal.timeout(15_000) });
    if (!info.ok) {
      console.error("[whatsapp] mídia: info recusada", info.status, (await info.text()).slice(0, 300));
      return null;
    }
    const { url, mime_type, file_size } = (await info.json()) as { url?: string; mime_type?: string; file_size?: number };
    if (!url || (file_size && file_size > limiteBytes)) return null;
    const arquivo = await fetch(url, { headers: auth, signal: AbortSignal.timeout(60_000) });
    if (!arquivo.ok) {
      console.error("[whatsapp] mídia: download recusado", arquivo.status);
      return null;
    }
    const dados = Buffer.from(await arquivo.arrayBuffer());
    if (dados.length > limiteBytes) return null;
    return { dados, mime: (mime_type || arquivo.headers.get("content-type") || "application/octet-stream").split(";")[0].trim() };
  } catch (e) {
    console.error("[whatsapp] mídia: falha ao baixar", e);
    return null;
  }
}

/** Corta em pedaços sem quebrar no meio de uma linha, quando possível. */
function emPedacos(texto: string, limite: number) {
  const pedacos: string[] = [];
  let resto = texto.trim();
  while (resto.length > limite) {
    let corte = resto.lastIndexOf("\n", limite);
    if (corte < limite / 2) corte = limite;
    pedacos.push(resto.slice(0, corte).trim());
    resto = resto.slice(corte).trim();
  }
  if (resto) pedacos.push(resto);
  return pedacos;
}

/** true = a Meta aceitou todas as partes. */
export async function enviarTexto(para: string, texto: string): Promise<boolean> {
  let ok = true;
  for (const parte of emPedacos(texto, LIMITE_TEXTO)) {
    ok = (await chamarMeta({ to: para, type: "text", text: { body: parte, preview_url: false } })) && ok;
  }
  return ok;
}

export type Botao = { id: string; titulo: string };

/** Mensagem com até 3 botões de resposta (títulos de até 20 letras). */
export async function enviarBotoes(para: string, texto: string, botoes: Botao[]): Promise<boolean> {
  let corpo = texto.trim();
  if (corpo.length > LIMITE_CORPO_BOTOES) {
    // texto longo vai antes, numa mensagem comum; os botões seguem com o final
    const partes = emPedacos(corpo, LIMITE_CORPO_BOTOES);
    corpo = partes.pop()!;
    await enviarTexto(para, partes.join("\n"));
  }
  return chamarMeta({
    to: para,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: corpo },
      action: { buttons: botoes.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: b.titulo.slice(0, 20) } })) },
    },
  });
}

/** Marca como lida (risquinhos azuis) e mostra "digitando…" enquanto a assistente pensa. Falha em silêncio. */
export async function mostrarDigitando(wamid: string) {
  await chamarMeta({ status: "read", message_id: wamid, typing_indicator: { type: "text" } });
}
