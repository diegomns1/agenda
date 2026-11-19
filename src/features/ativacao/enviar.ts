import "server-only";
import { enviarEmail } from "@/lib/email";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { normalizarTelefone, variacoesCelular } from "@/lib/telefone";
import { primeiroNome } from "@/lib/texto";
import { emailAjudaInicio, emailFeedbackTeste } from "@/features/emails/modelos";
import { enviarModelo, saudeDoEnvio } from "@/features/whatsapp/meta";
import { PREFIXO_BLOQUEIO } from "@/features/whatsapp/entrega";
import { MODELOS } from "@/features/whatsapp/modelos";
import type { Profile } from "@/types/database";

/*
 * Mensagens de ativação (13/11/2026): chamar quem criou a conta e não usou.
 *   ajuda_inicio   — 1 dia depois do cadastro, para quem não cadastrou nada.
 *   feedback_teste — no último dia do teste grátis, perguntando o que faltou.
 *   parou          — quem começou a configurar e parou (19/11/2026). Só WhatsApp, uma vez por conta.
 * WhatsApp por MODELO aprovado pela Meta (a pessoa nunca escreveu para o número, então mensagem livre não pode).
 * Sem telefone, ou se a Meta recusar (modelo ainda não aprovado), vai por e-mail.
 * A resposta da pessoa cai na Central e a Serena atende no modo suporte (o número bate com o cadastro).
 * Cada conta recebe cada tipo uma vez só (tabela ativacao_envios, migração 0024).
 */

export type TipoAtivacao = "ajuda_inicio" | "feedback_teste" | "parou";
type Admin = ReturnType<typeof criarClienteAdmin>;
type Pessoa = Pick<Profile, "id" | "nome" | "email" | "telefone">;

/** Nomes dos modelos no WhatsApp Manager (dá para trocar pela VPS sem mexer no código). Textos em whatsapp/modelos.ts. */
export const MODELO_WHATSAPP: Record<TipoAtivacao, string> = {
  ajuda_inicio: process.env.WHATSAPP_MODELO_AJUDA || MODELOS.ajuda_inicio.nome,
  feedback_teste: process.env.WHATSAPP_MODELO_FEEDBACK || MODELOS.feedback_teste.nome,
  parou: process.env.WHATSAPP_MODELO_PAROU || MODELOS.parou.nome,
};

/** Texto dos modelos, IGUAL ao cadastrado na Meta (fica em whatsapp/modelos.ts, um lugar só). */
export const TEXTO_MODELO: Record<TipoAtivacao, (nome: string) => string> = {
  ajuda_inicio: MODELOS.ajuda_inicio.texto,
  feedback_teste: MODELOS.feedback_teste.texto,
  parou: MODELOS.parou.texto,
};

export type ResultadoAtivacao = { canal: "whatsapp" | "email" | null; ok: boolean; erro?: string };

/** Já recebeu este tipo (com sucesso, por qualquer canal)? */
export async function jaRecebeu(admin: Admin, profissionalId: string, tipo: TipoAtivacao, canal?: "whatsapp" | "email") {
  let q = admin.from("ativacao_envios").select("id", { count: "exact", head: true }).eq("profissional_id", profissionalId).eq("tipo", tipo).eq("ok", true);
  if (canal) q = q.eq("canal", canal);
  const { count } = await q;
  return (count ?? 0) > 0;
}

/**
 * Quantas vezes a Meta recusou o WhatsApp para esta conta (o automático desiste depois de 3).
 * Bloqueio da conta inteira (ex.: forma de pagamento) não conta: a culpa não é do número da pessoa.
 */
async function falhasWhatsapp(admin: Admin, profissionalId: string, tipo: TipoAtivacao) {
  const { data } = await admin
    .from("ativacao_envios")
    .select("erro")
    .eq("profissional_id", profissionalId)
    .eq("tipo", tipo)
    .eq("canal", "whatsapp")
    .eq("ok", false);
  return (data ?? []).filter((e) => !e.erro?.startsWith(PREFIXO_BLOQUEIO)).length;
}

/**
 * O automático deve mandar? Quem tem WhatsApp precisa receber POR WhatsApp (o e-mail de quando o modelo ainda
 * não estava aprovado não conta), mas desiste depois de 3 recusas da Meta. Sem WhatsApp: basta ter recebido o e-mail.
 */
export async function precisaReceber(admin: Admin, p: Pessoa, tipo: TipoAtivacao) {
  if (!normalizarTelefone(p.telefone)) return !(await jaRecebeu(admin, p.id, tipo));
  if (await jaRecebeu(admin, p.id, tipo, "whatsapp")) return false;
  return (await falhasWhatsapp(admin, p.id, tipo)) < 3;
}

/**
 * Anota o envio. `wamid` (id da mensagem na Meta) permite marcar "não foi" se a Meta avisar depois que não entregou.
 */
export async function registrarEnvio(
  admin: Admin,
  p: { id: string },
  tipo: TipoAtivacao,
  canal: "whatsapp" | "email",
  ok: boolean,
  erro: string | null,
  manual: boolean,
  wamid: string | null = null,
) {
  const linha = { profissional_id: p.id, tipo, canal, ok, erro, manual };
  if (wamid && wamid !== "simulado") {
    const { error } = await admin.from("ativacao_envios").insert({ ...linha, wamid });
    if (!error) return;
    // sem a migração 0031 a coluna "wamid" não existe: anota sem ela (senão o automático mandaria de novo)
  }
  await admin.from("ativacao_envios").insert(linha);
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
export async function enviarAtivacao(
  admin: Admin,
  p: Pessoa,
  tipo: TipoAtivacao,
  manual = false,
  /** só WhatsApp: se a Meta recusar, NÃO cai no e-mail */
  soWhatsapp = false,
): Promise<ResultadoAtivacao> {
  // "parou" não tem versão por e-mail: é só WhatsApp
  if (tipo === "parou") soWhatsapp = true;
  if (!manual && !(await precisaReceber(admin, p, tipo))) return { canal: null, ok: false, erro: "já recebeu" };
  const nome = primeiroNome(p.nome) || "tudo bem";
  const numero = normalizarTelefone(p.telefone);

  // A Meta está barrando as mensagens que a gente inicia (ex.: forma de pagamento)? Ela aceitaria o envio e
  // descartaria depois. Então nem tenta: o botão do admin avisa, e o automático vai por e-mail (uma vez) e
  // volta a tentar o WhatsApp quando o bloqueio acabar (nada fica anotado contra a conta).
  const saude = numero ? await saudeDoEnvio() : null;
  if (numero && saude?.bloqueado) {
    const motivo = `${PREFIXO_BLOQUEIO}: ${saude.motivos[0] ?? "a conta do WhatsApp não pode iniciar conversas"}`;
    if (manual || soWhatsapp) return { canal: "whatsapp", ok: false, erro: motivo };
  } else if (numero) {
    const r = await enviarModelo(numero, MODELO_WHATSAPP[tipo], [nome]);
    if (r) {
      await registrarNaCentral(admin, p, numero, r.waId, TEXTO_MODELO[tipo](nome), r.wamid);
      await registrarEnvio(admin, p, tipo, "whatsapp", true, null, manual, r.wamid);
      return { canal: "whatsapp", ok: true };
    }
    await registrarEnvio(admin, p, tipo, "whatsapp", false, "a Meta recusou (modelo não aprovado ou número inválido)", manual);
    if (soWhatsapp) return { canal: "whatsapp", ok: false, erro: "a Meta recusou (modelo ainda não aprovado ou número inválido)" };
  } else if (soWhatsapp) {
    return { canal: null, ok: false, erro: "sem WhatsApp no cadastro" };
  }

  if (!p.email) return { canal: null, ok: false, erro: "sem WhatsApp aceito e sem e-mail" };
  // e-mail é só uma vez por tipo (o WhatsApp recusado volta a ser tentado, o e-mail não se repete)
  if (!manual && (await jaRecebeu(admin, p.id, tipo, "email"))) return { canal: "email", ok: false, erro: "e-mail já enviado" };
  const email = tipo === "ajuda_inicio" ? emailAjudaInicio(p.email, p.nome) : emailFeedbackTeste(p.email, p.nome);
  const r = await enviarEmail(email);
  await registrarEnvio(admin, p, tipo, "email", r.enviado, r.enviado ? null : (r.motivo ?? "falhou"), manual);
  return r.enviado ? { canal: "email", ok: true } : { canal: "email", ok: false, erro: r.motivo ?? "o e-mail falhou" };
}
