"use server";

import { revalidatePath } from "next/cache";
import { ehAdmin, obterUsuario } from "@/lib/auth";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { WhatsappContato } from "@/types/database";
import { enviarTexto } from "./meta";

/*
 * Central do WhatsApp (só admin): kanban de contatos, conversa, assumir / devolver ao robô e responder.
 * Tudo com o cliente admin (as tabelas whatsapp_* não têm política para usuário comum).
 */

export type ContatoCentral = WhatsappContato & {
  /** profissional ligada (cadastro com o mesmo número ou assistente conectada) */
  profissional: { nome: string; plano: string; conectada: boolean } | null;
  ultima: { de: string; texto: string } | null;
};

export type MensagemCentral = { id: number; de: "contato" | "robo" | "equipe" | "sistema"; texto: string; criado_em: string };

const DIAS_ESFRIAR = 3;
const ETAPAS = ["robo", "link", "cadastrou", "assinou", "sem_resposta"] as const;

async function exigirAdmin() {
  if (!ehAdmin(await obterUsuario())) throw new Error("Só o admin pode usar a Central do WhatsApp.");
  return criarClienteAdmin();
}

/** Contatos mais recentes, com a última mensagem e a profissional ligada. Leads parados há 3 dias viram "sem resposta". */
export async function listarContatos(): Promise<ContatoCentral[]> {
  const admin = await exigirAdmin();
  const { data: contatos } = await admin.from("whatsapp_contatos").select("*").order("ultima_msg_em", { ascending: false }).limit(400);
  const lista = (contatos ?? []) as WhatsappContato[];

  // esfriou: lead que não escreve há 3 dias e ainda está com o robô
  const limite = Date.now() - DIAS_ESFRIAR * 86_400_000;
  const esfriaram = lista.filter(
    (c) => (c.etapa === "robo" || c.etapa === "link") && c.atendimento === "robo" && new Date(c.ultima_do_contato_em ?? c.criado_em).getTime() < limite,
  );
  if (esfriaram.length) {
    await admin.from("whatsapp_contatos").update({ etapa: "sem_resposta" }).in("telefone", esfriaram.map((c) => c.telefone));
    esfriaram.forEach((c) => (c.etapa = "sem_resposta"));
  }

  const ids = [...new Set(lista.map((c) => c.profissional_id).filter((x): x is string => Boolean(x)))];
  const telefones = lista.map((c) => c.telefone);
  const [perfis, vinculos, ultimas] = await Promise.all([
    ids.length ? admin.from("profiles").select("id, nome, plano").in("id", ids) : Promise.resolve({ data: [] }),
    ids.length ? admin.from("whatsapp_vinculos").select("profissional_id").in("profissional_id", ids) : Promise.resolve({ data: [] }),
    // última mensagem de cada um (busca as recentes e fica com a primeira de cada telefone)
    telefones.length
      ? admin.from("whatsapp_mensagens").select("telefone, de, texto, criado_em").in("telefone", telefones).order("criado_em", { ascending: false }).limit(1500)
      : Promise.resolve({ data: [] }),
  ]);
  const perfilPorId = new Map((perfis.data ?? []).map((p) => [p.id, p]));
  const conectadas = new Set((vinculos.data ?? []).map((v) => v.profissional_id));
  const ultimaPorTel = new Map<string, { de: string; texto: string }>();
  for (const m of (ultimas.data ?? []) as { telefone: string; de: string; texto: string }[]) {
    if (!ultimaPorTel.has(m.telefone)) ultimaPorTel.set(m.telefone, { de: m.de, texto: m.texto });
  }

  return lista.map((c) => {
    const p = c.profissional_id ? perfilPorId.get(c.profissional_id) : null;
    return {
      ...c,
      profissional: p ? { nome: p.nome, plano: p.plano, conectada: conectadas.has(p.id) } : null,
      ultima: ultimaPorTel.get(c.telefone) ?? null,
    };
  });
}

/** Mensagens da conversa (marca como lidas). */
export async function abrirConversa(telefone: string): Promise<MensagemCentral[]> {
  const admin = await exigirAdmin();
  const { data } = await admin
    .from("whatsapp_mensagens")
    .select("id, de, texto, criado_em")
    .eq("telefone", telefone)
    .order("criado_em", { ascending: false })
    .limit(300);
  await admin.from("whatsapp_contatos").update({ nao_lidas: 0 }).eq("telefone", telefone);
  return ((data ?? []) as MensagemCentral[]).reverse();
}

/** Assumir (o robô fica quieto) ou devolver ao robô. */
export async function mudarAtendimento(telefone: string, atendimento: "humano" | "robo"): Promise<{ ok: boolean }> {
  const admin = await exigirAdmin();
  const mudar = atendimento === "robo" ? { atendimento, motivo_ajuda: null } : { atendimento };
  const { error } = await admin.from("whatsapp_contatos").update(mudar).eq("telefone", telefone);
  if (!error) {
    await admin.from("whatsapp_mensagens").insert({
      telefone,
      de: "sistema",
      texto: atendimento === "robo" ? "🤖 Conversa devolvida ao robô" : "👤 Você assumiu a conversa (o robô fica quieto)",
    });
  }
  revalidatePath("/admin/whatsapp");
  return { ok: !error };
}

/** Arrastar o card de coluna. "precisa"/"humano" mexem no atendimento; o resto, na etapa do funil. */
export async function moverContato(telefone: string, coluna: string): Promise<{ ok: boolean }> {
  const admin = await exigirAdmin();
  let mudar: Partial<Omit<WhatsappContato, "telefone">>;
  if (coluna === "precisa" || coluna === "humano") mudar = { atendimento: coluna };
  else if ((ETAPAS as readonly string[]).includes(coluna)) mudar = { etapa: coluna as WhatsappContato["etapa"], atendimento: "robo", motivo_ajuda: null };
  else return { ok: false };
  const { error } = await admin.from("whatsapp_contatos").update(mudar).eq("telefone", telefone);
  return { ok: !error };
}

/**
 * Responder pela Central: sai pelo WhatsApp oficial e o robô sai da conversa (atendimento "humano").
 * A Meta só deixa mandar texto livre até 24 h depois da última mensagem da pessoa (72 h se veio de anúncio).
 */
export async function responderContato(telefone: string, texto: string): Promise<{ ok: boolean; erro?: string }> {
  const admin = await exigirAdmin();
  const limpo = texto.trim().slice(0, 4000);
  if (!limpo) return { ok: false, erro: "Escreva a mensagem." };
  const { data: c } = await admin.from("whatsapp_contatos").select("ultima_do_contato_em, origem").eq("telefone", telefone).maybeSingle();
  if (!c) return { ok: false, erro: "Contato não encontrado." };
  const janelaH = c.origem ? 72 : 24;
  const ultima = c.ultima_do_contato_em ? new Date(c.ultima_do_contato_em).getTime() : 0;
  if (Date.now() - ultima > janelaH * 3_600_000) {
    return { ok: false, erro: `Passaram mais de ${janelaH} h desde a última mensagem dessa pessoa: a Meta só deixa responder depois que ela escrever de novo.` };
  }
  if (!(await enviarTexto(telefone, limpo))) return { ok: false, erro: "A Meta não aceitou a mensagem. Tente de novo; se continuar, me mande um print." };
  await admin.from("whatsapp_mensagens").insert({ telefone, de: "equipe", texto: limpo });
  await admin
    .from("whatsapp_contatos")
    .update({ atendimento: "humano", ultima_msg_em: new Date().toISOString(), nao_lidas: 0 })
    .eq("telefone", telefone);
  return { ok: true };
}
