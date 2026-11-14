import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { URL_APP } from "@/lib/constantes";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { OrigemAnuncio, Profile } from "@/types/database";
import type { NivelUso } from "@/features/admin/uso";
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

/** Dados da pessoa para a Meta achar quem é (e-mail, telefone e nome com hash; cookies da Meta; IP e navegador). */
function dadosDaPessoa(pessoa: Pessoa, origem: OrigemAnuncio) {
  const userData: Record<string, unknown> = { external_id: [hash(pessoa.id)] };
  if (pessoa.email) userData.em = [hash(pessoa.email.trim().toLowerCase())];
  if (pessoa.telefone) userData.ph = [hash(pessoa.telefone.replace(/\D/g, ""))];
  const primeiro = semAcento(pessoa.nome?.split(/\s+/)[0] ?? "");
  if (primeiro) userData.fn = [hash(primeiro)];
  if (origem.ip) userData.client_ip_address = origem.ip;
  if (origem.navegador) userData.client_user_agent = origem.navegador;
  if (origem.fbc) userData.fbc = origem.fbc;
  if (origem.fbp) userData.fbp = origem.fbp;
  return userData;
}

/** Posta um lote de eventos na API de Conversões. Nunca lança. */
async function postarEventos(nome: string, data: Record<string, unknown>[]): Promise<{ enviado: boolean; motivo?: string }> {
  if (!data.length) return { enviado: true };
  if (!capiConfigurada()) {
    console.log(`[meta simulado] ${nome} (${data.length})`);
    return { enviado: false, motivo: "API de Conversões não configurada" };
  }
  const corpo = { data, ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}) };
  try {
    const r = await fetch(`https://graph.facebook.com/${VERSAO}/${process.env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(process.env.META_CAPI_TOKEN!)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) {
      console.error("[meta] evento recusado", nome, r.status, (await r.text()).slice(0, 400));
      return { enviado: false, motivo: `Meta respondeu ${r.status}` };
    }
    return { enviado: true };
  } catch (e) {
    console.error("[meta] falha ao enviar", nome, e);
    return { enviado: false, motivo: "falha de rede" };
  }
}

/** Manda um evento do site (Lead, StartTrial, Subscribe) para a Meta. Nunca lança. */
async function enviar(evento: Evento, eventId: string, pessoa: Pessoa, origem: OrigemAnuncio | null, valor?: number) {
  if (!origem?.consentiu) return { enviado: false, motivo: "sem consentimento" };
  return postarEventos(evento, [
    {
      event_name: evento,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: "website",
      event_source_url: origem.pagina ?? `${URL_APP}/cadastro`,
      user_data: dadosDaPessoa(pessoa, origem),
      ...(valor != null ? { custom_data: { value: Number(valor.toFixed(2)), currency: "BRL" } } : {}),
    },
  ]);
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

/*
 * Etapas do funil para a Meta ("conectar o CRM", 14/11/2026). A Meta só via o cadastro (Lead); com as etapas,
 * a campanha pode otimizar por "leads qualificados": gente parecida com quem USA a agenda, não com quem só se cadastra.
 * Formato de CRM da API de Conversões: action_source "system_generated", custom_data.event_source "crm" e o nome
 * da etapa como event_name. As etapas são escolhidas no Gerenciador de Eventos (conjunto "Vaguinha Site" → CRM).
 * Mesma regra dos outros eventos: só de quem aceitou os cookies de medição. Nenhum dado da agenda vai junto, só a etapa.
 */

export const ETAPAS_CRM = [
  { chave: "crm_cadastrou", nome: "Cadastrou" },
  { chave: "crm_configurando", nome: "Configurando" },
  { chave: "crm_usando", nome: "Usando" },
  { chave: "crm_assinou", nome: "Assinou" },
] as const;

/** Até onde a conta chegou no funil (índice em ETAPAS_CRM). Etapa não volta: quem "Parou" já passou por "Configurando". */
export function etapaAlcancada(nivel: NivelUso | undefined, assinou: boolean) {
  if (assinou) return 3;
  if (nivel === "usando") return 2;
  if (nivel && nivel !== "so_entrou") return 1;
  return 0;
}

/** Só olha contas recentes: lead velho não ajuda a Meta a aprender. */
const DIAS_FUNIL = 60;

/**
 * Manda para a Meta as etapas novas de cada conta (uma vez por etapa, marcado em eventos_meta).
 * Chamado pela tarefa de 5 em 5 min, mas só age uma vez por hora (minutos 0 a 4).
 */
export async function sincronizarEtapasCrm(admin: ReturnType<typeof criarClienteAdmin>, nivelDe: (id: string) => NivelUso | undefined) {
  const desde = new Date(Date.now() - DIAS_FUNIL * 86_400_000).toISOString();
  const { data: perfis } = await admin
    .from("profiles")
    .select("id, email, telefone, nome, origem_anuncio, eventos_meta")
    .gte("created_at", desde)
    .not("origem_anuncio", "is", null);

  const agora = Math.floor(Date.now() / 1000);
  const eventos: Record<string, unknown>[] = [];
  const marcar: { id: string; eventos: Profile["eventos_meta"] }[] = [];
  for (const p of perfis ?? []) {
    const origem = p.origem_anuncio as OrigemAnuncio | null;
    if (!origem?.consentiu) continue;
    const ja = (p.eventos_meta ?? {}) as Profile["eventos_meta"];
    const ate = etapaAlcancada(nivelDe(p.id), Boolean(ja.subscribe));
    const novas = ETAPAS_CRM.slice(0, ate + 1).filter((e) => !ja[e.chave]);
    if (!novas.length) continue;
    const userData = dadosDaPessoa(p as Pessoa, origem);
    const quando = new Date().toISOString();
    novas.forEach((e, i) => {
      eventos.push({
        event_name: e.nome,
        // etapas na ordem do funil, com 1 s de diferença
        event_time: agora - (novas.length - 1 - i),
        event_id: `${e.chave}:${p.id}`,
        action_source: "system_generated",
        user_data: userData,
        custom_data: { event_source: "crm", lead_event_source: "Vaguinha" },
      });
    });
    marcar.push({ id: p.id, eventos: { ...ja, ...Object.fromEntries(novas.map((e) => [e.chave, quando])) } });
  }

  let enviadas = 0;
  // a Meta aceita até 1000 eventos por pedido
  for (let i = 0; i < eventos.length; i += 500) {
    const r = await postarEventos("etapas CRM", eventos.slice(i, i + 500));
    if (!r.enviado) return { enviadas, erro: r.motivo };
    enviadas += Math.min(500, eventos.length - i);
  }
  for (const m of marcar) await admin.from("profiles").update({ eventos_meta: m.eventos }).eq("id", m.id);
  return { enviadas, contas: marcar.length };
}
