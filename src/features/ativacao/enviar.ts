import "server-only";
import { enviarEmail } from "@/lib/email";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { normalizarTelefone, variacoesCelular } from "@/lib/telefone";
import { primeiroNome } from "@/lib/texto";
import { emailAjudaInicio, emailFeedbackTeste } from "@/features/emails/modelos";
import { enviarModelo } from "@/features/whatsapp/meta";
import type { Profile } from "@/types/database";

/*
 * Mensagens de ativação (13/11/2026): chamar quem criou a conta e não usou.
 *   ajuda_inicio   — 1 dia depois do cadastro, para quem não cadastrou nada.
 *   feedback_teste — no último dia do teste grátis, perguntando o que faltou.
 * WhatsApp por MODELO aprovado pela Meta (a pessoa nunca escreveu para o número, então mensagem livre não pode).
 * Sem telefone, ou se a Meta recusar (modelo ainda não aprovado), vai por e-mail.
 * A resposta da pessoa cai na Central e a Serena atende no modo suporte (o número bate com o cadastro).
 * Cada conta recebe cada tipo uma vez só (tabela ativacao_envios, migração 0024).
 */

export type TipoAtivacao = "ajuda_inicio" | "feedback_teste";
type Admin = ReturnType<typeof criarClienteAdmin>;
type Pessoa = Pick<Profile, "id" | "nome" | "email" | "telefone">;

/** Nomes dos modelos cadastrados no WhatsApp Manager (dá para trocar pela VPS sem mexer no código). */
export const MODELO_WHATSAPP: Record<TipoAtivacao, string> = {
  ajuda_inicio: process.env.WHATSAPP_MODELO_AJUDA || "vaguinha_ajuda_inicio",
  feedback_teste: process.env.WHATSAPP_MODELO_FEEDBACK || "vaguinha_feedback_teste",
};

/**
 * Texto dos modelos, IGUAL ao cadastrado na Meta ({{1}} = primeiro nome). Serve para a conversa aparecer na Central
 * e para a Serena saber o que foi perguntado quando a pessoa responder.
 */
export const TEXTO_MODELO: Record<TipoAtivacao, (nome: string) => string> = {
  ajuda_inicio: (nome) =>
    `Oi, ${nome}! Aqui é a Serena, da Vaguinha 😊 Vi que você criou sua conta. Conseguiu cadastrar seus serviços e marcar o primeiro horário? Se travou em alguma parte, me responde aqui que eu te ajudo.`,
  feedback_teste: (nome) =>
    `Oi, ${nome}! Seu teste grátis da Vaguinha termina hoje. Posso te pedir 1 minutinho? O que faltou pra agenda funcionar pra você? Sua resposta ajuda muito a gente a melhorar.`,
};

export type ResultadoAtivacao = { canal: "whatsapp" | "email" | null; ok: boolean; erro?: string };

/** Já recebeu este tipo (com sucesso, por qualquer canal)? */
export async function jaRecebeu(admin: Admin, profissionalId: string, tipo: TipoAtivacao) {
  const { count } = await admin.from("ativacao_envios").select("id", { count: "exact", head: true }).eq("profissional_id", profissionalId).eq("tipo", tipo).eq("ok", true);
  return (count ?? 0) > 0;
}

async function registrarEnvio(admin: Admin, p: Pessoa, tipo: TipoAtivacao, canal: "whatsapp" | "email", ok: boolean, erro: string | null, manual: boolean) {
  await admin.from("ativacao_envios").insert({ profissional_id: p.id, tipo, canal, ok, erro, manual });
}

/** A mensagem enviada aparece na Central (conversa e card), como resposta do robô. */
async function registrarNaCentral(admin: Admin, p: Pessoa, numeroPedido: string, waId: string | null, texto: string, wamid: string) {
  // usa o número como a Meta identifica a pessoa (às vezes sem o 9); se já existe conversa com alguma variação, usa ela
  const { data: existentes } = await admin.from("whatsapp_contatos").select("telefone").in("telefone", [...new Set([waId, ...variacoesCelular(numeroPedido)].filter((x): x is string => Boolean(x)))]);
  const telefone = existentes?.[0]?.telefone ?? waId ?? numeroPedido;
  const agora = new Date().toISOString();
  if (!existentes?.length) {
    await admin.from("whatsapp_contatos").insert({ telefone, nome: p.nome.slice(0, 80), profissional_id: p.id, etapa: "cadastrou", ultima_msg_em: agora });
  } else {
    await admin.from("whatsapp_contatos").update({ profissional_id: p.id, ultima_msg_em: agora }).eq("telefone", telefone);
  }
  await admin.from("whatsapp_mensagens").insert({ telefone, de: "robo", texto, wamid: wamid && wamid !== "simulado" ? wamid : null, status: "enviada" });
}

/**
 * Manda a mensagem de ativação: WhatsApp se tiver número (e a Meta aceitar o modelo), senão e-mail.
 * `manual`: mandada pelo botão do Admin (manda mesmo se já recebeu antes).
 */
export async function enviarAtivacao(admin: Admin, p: Pessoa, tipo: TipoAtivacao, manual = false): Promise<ResultadoAtivacao> {
  if (!manual && (await jaRecebeu(admin, p.id, tipo))) return { canal: null, ok: false, erro: "já recebeu" };
  const nome = primeiroNome(p.nome) || "tudo bem";
  const numero = normalizarTelefone(p.telefone);

  if (numero) {
    const r = await enviarModelo(numero, MODELO_WHATSAPP[tipo], [nome]);
    if (r) {
      await registrarNaCentral(admin, p, numero, r.waId, TEXTO_MODELO[tipo](nome), r.wamid);
      await registrarEnvio(admin, p, tipo, "whatsapp", true, null, manual);
      return { canal: "whatsapp", ok: true };
    }
    await registrarEnvio(admin, p, tipo, "whatsapp", false, "a Meta recusou (modelo não aprovado ou número inválido)", manual);
  }

  if (!p.email) return { canal: null, ok: false, erro: "sem WhatsApp aceito e sem e-mail" };
  const email = tipo === "ajuda_inicio" ? emailAjudaInicio(p.email, p.nome) : emailFeedbackTeste(p.email, p.nome);
  const r = await enviarEmail(email);
  await registrarEnvio(admin, p, tipo, "email", r.enviado, r.enviado ? null : (r.motivo ?? "falhou"), manual);
  return r.enviado ? { canal: "email", ok: true } : { canal: "email", ok: false, erro: r.motivo ?? "o e-mail falhou" };
}
