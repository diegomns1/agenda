"use server";

import { revalidatePath } from "next/cache";
import { ehAdmin, obterUsuario } from "@/lib/auth";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { WhatsappContato, WhatsappMensagem } from "@/types/database";
import { erroDeJanela } from "./janela";
import { apagarArquivosDoContato, linksTemporarios } from "./midia";
import { bloquearNaMeta, enviarModelo, enviarTexto, saudeDoEnvio } from "./meta";
import { registrarEnvio } from "@/features/ativacao/enviar";
import { MODELOS, type IdModelo } from "./modelos";
import { primeiroNome } from "@/lib/texto";

/*
 * Central do WhatsApp (só admin): kanban de contatos, conversa, assumir / devolver ao robô e responder.
 * Tudo com o cliente admin (as tabelas whatsapp_* não têm política para usuário comum).
 */

export type ContatoCentral = WhatsappContato & {
  /** profissional ligada (cadastro com o mesmo número ou assistente conectada) */
  profissional: { nome: string; plano: string; conectada: boolean } | null;
  ultima: { de: string; texto: string } | null;
};

export type MensagemCentral = Pick<
  WhatsappMensagem,
  "id" | "de" | "texto" | "criado_em" | "tipo" | "midia_mime" | "midia_nome" | "transcricao" | "status"
> & {
  /** por que a Meta não entregou (status "falhou") */
  erro?: string | null;
  /** link temporário (1 h) do arquivo; null se não tem arquivo ou já foi apagado (90 dias) */
  url: string | null;
  /** tinha arquivo, mas não está mais disponível */
  semArquivo: boolean;
};

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
  type Linha = Omit<MensagemCentral, "url" | "semArquivo"> & { midia_path: string | null };
  const comErro = await admin
    .from("whatsapp_mensagens")
    .select("id, de, texto, criado_em, tipo, midia_path, midia_mime, midia_nome, transcricao, status, erro")
    .eq("telefone", telefone)
    .order("criado_em", { ascending: false })
    .limit(300);
  let linhas = (comErro.data ?? []) as Linha[];
  if (comErro.error) {
    // sem a migração 0031 a coluna "erro" não existe: busca sem ela
    const { data } = await admin
      .from("whatsapp_mensagens")
      .select("id, de, texto, criado_em, tipo, midia_path, midia_mime, midia_nome, transcricao, status")
      .eq("telefone", telefone)
      .order("criado_em", { ascending: false })
      .limit(300);
    linhas = (data ?? []) as Linha[];
  }
  await admin.from("whatsapp_contatos").update({ nao_lidas: 0 }).eq("telefone", telefone);
  const links = await linksTemporarios(admin, linhas.map((m) => m.midia_path).filter((x): x is string => Boolean(x)));
  return linhas
    .map(({ midia_path, ...m }) => ({
      ...m,
      url: midia_path ? (links.get(midia_path) ?? null) : null,
      semArquivo: !midia_path && m.tipo !== "texto" && m.tipo !== "localizacao" && m.tipo !== "contato",
    }))
    .reverse();
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
  const janela = await erroDeJanela(admin, telefone);
  if (janela) return { ok: false, erro: janela };
  if (!(await enviarTexto(telefone, limpo))) return { ok: false, erro: "A Meta não aceitou a mensagem. Tente de novo; se continuar, me mande um print." };
  await admin.from("whatsapp_mensagens").insert({ telefone, de: "equipe", texto: limpo });
  await admin
    .from("whatsapp_contatos")
    .update({ atendimento: "humano", ultima_msg_em: new Date().toISOString(), nao_lidas: 0 })
    .eq("telefone", telefone);
  return { ok: true };
}

// ---------------------------------------------------------------- opções da conversa (14/11/2026)

/**
 * Mensagem pronta (modelo aprovado pela Meta): funciona mesmo depois das 24 h. {{1}} = primeiro nome.
 * Quem tem conta e recebe ajuda/feedback também fica registrada na ativação (não recebe de novo no automático).
 */
export async function mandarMensagemPronta(telefone: string, id: IdModelo): Promise<{ ok: boolean; erro?: string }> {
  const admin = await exigirAdmin();
  const modelo = MODELOS[id];
  if (!modelo) return { ok: false, erro: "Mensagem pronta desconhecida." };
  const { data: c } = await admin.from("whatsapp_contatos").select("nome, nome_whatsapp, profissional_id, bloqueado").eq("telefone", telefone).maybeSingle();
  if (!c) return { ok: false, erro: "Contato não encontrado." };
  if (c.bloqueado) return { ok: false, erro: "Este contato está bloqueado. Desbloqueie para mandar mensagem." };
  const saude = await saudeDoEnvio();
  if (saude?.bloqueado) {
    return { ok: false, erro: `A Meta está bloqueando as mensagens prontas: ${saude.motivos[0] ?? "a conta do WhatsApp não pode iniciar conversas"}.` };
  }
  const nome = primeiroNome(c.nome || c.nome_whatsapp || "").replace(/[^\p{L}' -]/gu, "") || "tudo bem";
  const r = await enviarModelo(telefone, modelo.nome, [nome]);
  if (!r) return { ok: false, erro: `A Meta recusou. O modelo "${modelo.nome}" já está Ativo no WhatsApp Manager?` };
  await admin.from("whatsapp_mensagens").insert({ telefone, de: "equipe", texto: modelo.texto(nome), wamid: r.wamid && r.wamid !== "simulado" ? r.wamid : null, status: "enviada" });
  await admin.from("whatsapp_contatos").update({ ultima_msg_em: new Date().toISOString(), nao_lidas: 0 }).eq("telefone", telefone);
  if (c.profissional_id && (id === "ajuda_inicio" || id === "feedback_teste")) {
    await registrarEnvio(admin, { id: c.profissional_id }, id, "whatsapp", true, null, true, r.wamid);
  }
  return { ok: true };
}

/**
 * Bloquear: o robô ignora a pessoa e a Meta bloqueia o número (ela não consegue mais escrever).
 * A Meta só bloqueia quem escreveu nas últimas 24 h; fora disso, o bloqueio vale só no painel (o robô ignora).
 */
export async function bloquearContato(telefone: string, bloquear: boolean): Promise<{ ok: boolean; aviso?: string }> {
  const admin = await exigirAdmin();
  const meta = await bloquearNaMeta(telefone, bloquear);
  await admin
    .from("whatsapp_contatos")
    .update(bloquear ? { bloqueado: true, bloqueado_em: new Date().toISOString(), atendimento: "humano" } : { bloqueado: false, bloqueado_em: null })
    .eq("telefone", telefone);
  await admin.from("whatsapp_mensagens").insert({
    telefone,
    de: "sistema",
    texto: bloquear ? `🚫 Contato bloqueado${meta.ok ? "" : ` só no painel (${meta.erro})`}` : "✅ Contato desbloqueado",
  });
  revalidatePath("/admin/whatsapp");
  return { ok: true, aviso: meta.ok ? undefined : `Bloqueado só no painel: ${meta.erro}. O robô não responde mais essa pessoa.` };
}

/** Limpar: apaga as mensagens e os arquivos da conversa; o contato (card) continua. */
export async function limparConversa(telefone: string): Promise<{ ok: boolean }> {
  const admin = await exigirAdmin();
  await apagarArquivosDoContato(admin, telefone);
  const { error } = await admin.from("whatsapp_mensagens").delete().eq("telefone", telefone);
  await admin.from("whatsapp_contatos").update({ nao_lidas: 0 }).eq("telefone", telefone);
  revalidatePath("/admin/whatsapp");
  return { ok: !error };
}

/** Excluir: apaga o contato, a conversa e os arquivos. Se a pessoa escrever de novo, vira um card novo. */
export async function excluirContato(telefone: string): Promise<{ ok: boolean }> {
  const admin = await exigirAdmin();
  await apagarArquivosDoContato(admin, telefone);
  const { error } = await admin.from("whatsapp_contatos").delete().eq("telefone", telefone); // mensagens saem junto (cascade)
  revalidatePath("/admin/whatsapp");
  return { ok: !error };
}
