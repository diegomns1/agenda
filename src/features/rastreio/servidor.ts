import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { URL_APP } from "@/lib/constantes";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { OrigemAnuncio, Profile } from "@/types/database";
import { COOKIE_CONSENTIMENTO, COOKIE_ORIGEM, lerOrigemCookie } from "./comum";

/*
 * API de Conversões da Meta (eventos mandados pelo servidor), 11/11/2026.
 * Variáveis na VPS: META_PIXEL_ID, META_CAPI_TOKEN (segredo), META_TEST_EVENT_CODE (só para testar no Gerenciador de Eventos).
 * Funil: Lead (cadastro) → StartTrial (o Diego aprova = lead qualificado) → Subscribe (primeiro pagamento).
 * Só manda para quem aceitou os cookies de medição (origem.consentiu). Dados pessoais vão com hash SHA-256, como a Meta pede.
 */

const VERSAO = "v23.0";
type Evento = "Lead" | "StartTrial" | "Subscribe";
const CHAVE: Record<Evento, "lead" | "start_trial" | "subscribe"> = { Lead: "lead", StartTrial: "start_trial", Subscribe: "subscribe" };

const hash = (v: string) => createHash("sha256").update(v).digest("hex");
const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

export function capiConfigurada() {
  return Boolean(process.env.META_PIXEL_ID && process.env.META_CAPI_TOKEN);
}

/** Lê, no pedido de cadastro, de onde a pessoa veio: cookie de origem, cookies da Meta, consentimento, IP e navegador. */
export async function origemDoPedido(): Promise<OrigemAnuncio> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  const o = lerOrigemCookie(c.get(COOKIE_ORIGEM)?.value) ?? {};
  const fbp = c.get("_fbp")?.value;
  // sem o cookie _fbc (pixel recusado ou ainda não carregado), monta pelo fbclid do link do anúncio
  const fbc = c.get("_fbc")?.value ?? (o.fbclid ? `fb.1.${o.em ?? Date.now()}.${o.fbclid}` : undefined);
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || undefined;
  return {
    utm_source: o.utm_source,
    utm_medium: o.utm_medium,
    utm_campaign: o.utm_campaign,
    utm_content: o.utm_content,
    utm_term: o.utm_term,
    fbclid: o.fbclid,
    fbc,
    fbp,
    consentiu: c.get(COOKIE_CONSENTIMENTO)?.value === "sim",
    ip,
    navegador: h.get("user-agent")?.slice(0, 400) ?? undefined,
    pagina: o.pagina ?? h.get("referer") ?? undefined,
    capturado_em: new Date().toISOString(),
  };
}

type Pessoa = Pick<Profile, "id" | "email" | "telefone" | "nome">;

/** Manda um evento para a Meta. Nunca lança. */
async function enviar(evento: Evento, eventId: string, pessoa: Pessoa, origem: OrigemAnuncio | null, valor?: number) {
  if (!origem?.consentiu) return { enviado: false, motivo: "sem consentimento" };
  const userData: Record<string, unknown> = { external_id: [hash(pessoa.id)] };
  if (pessoa.email) userData.em = [hash(pessoa.email.trim().toLowerCase())];
  if (pessoa.telefone) userData.ph = [hash(pessoa.telefone.replace(/\D/g, ""))];
  const primeiro = semAcento(pessoa.nome?.split(/\s+/)[0] ?? "");
  if (primeiro) userData.fn = [hash(primeiro)];
  if (origem.ip) userData.client_ip_address = origem.ip;
  if (origem.navegador) userData.client_user_agent = origem.navegador;
  if (origem.fbc) userData.fbc = origem.fbc;
  if (origem.fbp) userData.fbp = origem.fbp;

  const corpo = {
    data: [
      {
        event_name: evento,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: origem.pagina ?? `${URL_APP}/cadastro`,
        user_data: userData,
        ...(valor != null ? { custom_data: { value: Number(valor.toFixed(2)), currency: "BRL" } } : {}),
      },
    ],
    ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
  };

  if (!capiConfigurada()) {
    console.log(`[meta simulado] ${evento} ${eventId}`);
    return { enviado: false, motivo: "API de Conversões não configurada" };
  }
  try {
    const r = await fetch(`https://graph.facebook.com/${VERSAO}/${process.env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(process.env.META_CAPI_TOKEN!)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      console.error("[meta] evento recusado", evento, r.status, (await r.text()).slice(0, 400));
      return { enviado: false, motivo: `Meta respondeu ${r.status}` };
    }
    return { enviado: true };
  } catch (e) {
    console.error("[meta] falha ao enviar", evento, e);
    return { enviado: false, motivo: "falha de rede" };
  }
}

/** Manda o evento uma vez só por profissional (marca em eventos_meta). */
async function enviarUmaVez(profissionalId: string, evento: Evento, valor?: number, eventId?: string) {
  const admin = criarClienteAdmin();
  const { data: p } = await admin.from("profiles").select("id, email, telefone, nome, origem_anuncio, eventos_meta").eq("id", profissionalId).maybeSingle();
  if (!p) return;
  const chave = CHAVE[evento];
  const ja = (p.eventos_meta ?? {}) as Profile["eventos_meta"];
  if (ja[chave]) return;
  const r = await enviar(evento, eventId ?? `${chave}:${p.id}`, p as Pessoa, p.origem_anuncio as OrigemAnuncio | null, valor);
  if (r.enviado) await admin.from("profiles").update({ eventos_meta: { ...ja, [chave]: new Date().toISOString() } }).eq("id", p.id);
}

/** Cadastro: guarda a origem no perfil e manda o Lead (mesmo eventId do pixel do navegador). */
export async function registrarCadastro(profissionalId: string, origem: OrigemAnuncio, eventId: string | null) {
  const admin = criarClienteAdmin();
  await admin.from("profiles").update({ origem_anuncio: origem }).eq("id", profissionalId);
  await enviarUmaVez(profissionalId, "Lead", undefined, eventId || undefined);
}

/** O Diego aprovou a conta: lead qualificado (StartTrial, porque o teste grátis começa aí). */
export async function registrarAprovacao(profissionalId: string) {
  await enviarUmaVez(profissionalId, "StartTrial");
}

/** Primeiro pagamento confirmado pelo Asaas: virou cliente (Subscribe com o valor). */
export async function registrarPrimeiroPagamento(profissionalId: string, valor: number) {
  await enviarUmaVez(profissionalId, "Subscribe", valor);
}
