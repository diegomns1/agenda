"use server";

import { revalidatePath } from "next/cache";
import { ehAdmin, obterUsuario } from "@/lib/auth";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { WhatsappContato, WhatsappMensagem } from "@/types/database";
import { erroDeJanela } from "./janela";
import { apagarArquivosDoContato, linksTemporarios } from "./midia";
import { bloquearNaMeta, enviarModelo, enviarTexto, enviarVideoPorLink, saudeDoEnvio } from "./meta";
import { TUTORIAIS } from "@/features/tutoriais/conteudo";
import { textoDoTutorial, videoDoTutorial } from "@/features/tutoriais/whatsapp";
import { registrarEnvio } from "@/features/ativacao/enviar";
import { MODELOS, type IdModelo } from "./modelos";
import { primeiroNome } from "@/lib/texto";
import { DIAS_SEM_RESPOSTA } from "./prazos";
import { seloDaEtapa, usoDasContasGuardado } from "@/features/admin/uso";
import { contaVencida } from "@/lib/datas";

/*
 * Central do WhatsApp (só admin): kanban de contatos, conversa, assumir / devolver ao robô e responder.
 * Tudo com o cliente admin (as tabelas whatsapp_* não têm política para usuário comum).
 */

export type ContatoCentral = WhatsappContato & {
  /**
   * profissional ligada (cadastro com o mesmo número ou assistente conectada).
   * `etapa`: em que etapa de uso a conta está (Só entrou, Configurando, Usando, Parou de configurar/usar).
   * `testeAcabou`: está no teste grátis e ele já venceu (o cartão vai para "Teste acabou").
   */
  profissional: {
    nome: string;
    plano: string;
    conectada: boolean;
    testeAcabou: boolean;
    etapa: { nivel: string; rotulo: string; tom: string; dias: number | null } | null;
  } | null;
  /** `status`: "falhou" quando a Meta avisou que a última mensagem enviada não foi entregue */
  ultima: { de: string; texto: string; status?: string | null } | null;
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

const ETAPAS = ["robo", "link", "cadastrou", "assinou", "sem_resposta", "spam"] as const;

async function exigirAdmin() {
  if (!ehAdmin(await obterUsuario())) throw new Error("Só o admin pode usar a Central do WhatsApp.");
  return criarClienteAdmin();
}

/** Contatos mais recentes, com a última mensagem e a profissional ligada. Leads parados há 1 dia viram "sem resposta". */
export async function listarContatos(): Promise<ContatoCentral[]> {
  const admin = await exigirAdmin();
  const { data: contatos } = await admin.from("whatsapp_contatos").select("*").order("ultima_msg_em", { ascending: false }).limit(400);
  const lista = (contatos ?? []) as WhatsappContato[];

  // esfriou: lead que não escreve há 1 dia e ainda está com o robô
  const limite = Date.now() - DIAS_SEM_RESPOSTA * 86_400_000;
  const esfriaram = lista.filter(
    (c) => (c.etapa === "robo" || c.etapa === "link") && c.atendimento === "robo" && new Date(c.ultima_do_contato_em ?? c.criado_em).getTime() < limite,
  );
  if (esfriaram.length) {
    await admin.from("whatsapp_contatos").update({ etapa: "sem_resposta" }).in("telefone", esfriaram.map((c) => c.telefone));
    esfriaram.forEach((c) => (c.etapa = "sem_resposta"));
  }

  const ids = [...new Set(lista.map((c) => c.profissional_id).filter((x): x is string => Boolean(x)))];
  const telefones = lista.map((c) => c.telefone);
  const [perfis, vinculos, ultimas, uso] = await Promise.all([
    ids.length ? admin.from("profiles").select("id, nome, plano, ativa_ate").in("id", ids) : Promise.resolve({ data: [] }),
    ids.length ? admin.from("whatsapp_vinculos").select("profissional_id").in("profissional_id", ids) : Promise.resolve({ data: [] }),
    // última mensagem de cada um (busca as recentes e fica com a primeira de cada telefone)
    telefones.length
      ? admin.from("whatsapp_mensagens").select("telefone, de, texto, criado_em, status").in("telefone", telefones).order("criado_em", { ascending: false }).limit(1500)
      : Promise.resolve({ data: [] }),
    // etapa de uso de cada conta (a conta pesada é guardada por 2 min; se falhar, os cartões saem sem o selo)
    ids.length ? usoDasContasGuardado().catch(() => null) : Promise.resolve(null),
  ]);
  const perfilPorId = new Map((perfis.data ?? []).map((p) => [p.id, p]));
  const conectadas = new Set((vinculos.data ?? []).map((v) => v.profissional_id));
  const ultimaPorTel = new Map<string, { de: string; texto: string; status?: string | null }>();
  for (const m of (ultimas.data ?? []) as { telefone: string; de: string; texto: string; status: string | null }[]) {
    if (!ultimaPorTel.has(m.telefone)) ultimaPorTel.set(m.telefone, { de: m.de, texto: m.texto, status: m.status });
  }

  return lista.map((c) => {
    const p = c.profissional_id ? perfilPorId.get(c.profissional_id) : null;
    return {
      ...c,
      profissional: p
        ? {
            nome: p.nome,
            plano: p.plano,
            conectada: conectadas.has(p.id),
            testeAcabou: p.plano === "teste" && contaVencida(p.ativa_ate),
            etapa: uso?.get(p.id) ? seloDaEtapa(uso.get(p.id)!) : null,
          }
        : null,
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
  // estava em "Robôs e spam": assumir ou devolver ao robô tira de lá (senão o cartão continuaria na coluna de spam)
  if (!error) await admin.from("whatsapp_contatos").update({ etapa: "robo" }).eq("telefone", telefone).eq("etapa", "spam");
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

/**
 * Arrastar o card de coluna. "precisa"/"humano" mexem no atendimento; o resto, na etapa do funil.
 * "spam" (Robôs e spam): a IA para de responder (atendimento "humano") e o cartão fica guardado nessa coluna.
 */
export async function moverContato(telefone: string, coluna: string): Promise<{ ok: boolean }> {
  const admin = await exigirAdmin();
  // "Teste acabou" não existe no banco: é "Cadastrou" com o teste vencido
  if (coluna === "teste_acabou") coluna = "cadastrou";
  let mudar: Partial<Omit<WhatsappContato, "telefone">>;
  if (coluna === "spam") mudar = { etapa: "spam", atendimento: "humano", nao_lidas: 0 };
  else if (coluna === "precisa" || coluna === "humano") mudar = { atendimento: coluna };
  else if ((ETAPAS as readonly string[]).includes(coluna)) mudar = { etapa: coluna as WhatsappContato["etapa"], atendimento: "robo", motivo_ajuda: null };
  else return { ok: false };
  const { error } = await admin.from("whatsapp_contatos").update(mudar).eq("telefone", telefone);
  // saiu de "Robôs e spam" para uma coluna sua: volta a ser um contato normal
  if (!error && (coluna === "precisa" || coluna === "humano")) {
    await admin.from("whatsapp_contatos").update({ etapa: "robo" }).eq("telefone", telefone).eq("etapa", "spam");
  }
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
  if (c.profissional_id && (id === "ajuda_inicio" || id === "feedback_teste" || id === "parou")) {
    await registrarEnvio(admin, { id: c.profissional_id }, id, "whatsapp", true, null, true, r.wamid);
  }
  return { ok: true };
}

/**
 * Tutorial com um toque (27/11/2026): manda o passo a passo da tela Tutoriais e, se houver, o vídeo.
 * É mensagem livre: só vai dentro das 24 h (72 h se veio de anúncio) depois da última mensagem da pessoa.
 * Não muda quem atende a conversa (robô ou Diego).
 */
export async function mandarTutorial(telefone: string, id: string): Promise<{ ok: boolean; erro?: string }> {
  const admin = await exigirAdmin();
  const tutorial = TUTORIAIS.find((t) => t.id === id);
  if (!tutorial) return { ok: false, erro: "Tutorial não encontrado." };
  const janela = await erroDeJanela(admin, telefone);
  if (janela) return { ok: false, erro: janela };

  const video = videoDoTutorial(tutorial);
  if (video) {
    const wamid = await enviarVideoPorLink(telefone, video, tutorial.titulo);
    if (!wamid) return { ok: false, erro: "A Meta não aceitou o vídeo. Tente de novo; se continuar, me mande um print." };
    await admin.from("whatsapp_mensagens").insert({
      telefone,
      de: "equipe",
      texto: `🎥 Vídeo: ${tutorial.titulo}`,
      wamid: wamid === "simulado" ? null : wamid,
      status: "enviada",
    });
  }
  const texto = textoDoTutorial(tutorial);
  if (!(await enviarTexto(telefone, texto))) {
    return { ok: false, erro: video ? "O vídeo foi, mas o texto não. Tente mandar de novo." : "A Meta não aceitou a mensagem. Tente de novo." };
  }
  await admin.from("whatsapp_mensagens").insert({ telefone, de: "equipe", texto });
  await admin.from("whatsapp_contatos").update({ ultima_msg_em: new Date().toISOString(), nao_lidas: 0 }).eq("telefone", telefone);
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
