"use server";

import { revalidatePath } from "next/cache";
import { ehAdmin, obterUsuario } from "@/lib/auth";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarAtivacao, type TipoAtivacao } from "./enviar";
import { saudeDoEnvio } from "@/features/whatsapp/meta";

/* Botões do Admin para chamar quem não está usando (o automático roda sozinho; isto é para mandar agora). */

async function exigirAdmin() {
  if (!ehAdmin(await obterUsuario())) throw new Error("Só o admin pode fazer isso.");
  return criarClienteAdmin();
}

const NOME_CANAL = { whatsapp: "pelo WhatsApp", email: "por e-mail" } as const;

/** Manda agora para uma conta (mesmo que já tenha recebido antes). */
export async function chamarConta(id: string, tipo: TipoAtivacao): Promise<{ ok: boolean; mensagem: string }> {
  const admin = await exigirAdmin();
  const { data: p } = await admin.from("profiles").select("id, nome, email, telefone").eq("id", id).maybeSingle();
  if (!p) return { ok: false, mensagem: "Conta não encontrada." };
  const r = await enviarAtivacao(admin, p, tipo, true);
  revalidatePath("/admin");
  revalidatePath(`/admin/contas/${id}`);
  return r.ok && r.canal
    ? { ok: true, mensagem: `Mensagem enviada ${NOME_CANAL[r.canal]}.` }
    : { ok: false, mensagem: `Não foi: ${r.erro ?? "erro desconhecido"}.` };
}

/** No máximo por vez: cada mensagem é cobrada pela Meta, e um toque errado não deve chamar a base inteira. */
const MAXIMO_POR_VEZ = 60;

/**
 * Manda a oferta de ajuda pelo WhatsApp (só WhatsApp, nunca cai no e-mail) para as contas que o admin marcou na
 * lista (17/11/2026: de qualquer categoria, não só "Só entrou"; e manda de novo para quem já recebeu, se ele marcar).
 * Conferido de novo aqui: a conta precisa estar liberada e ter número.
 */
export async function chamarContas(ids: string[]): Promise<{ ok: boolean; mensagem: string }> {
  const admin = await exigirAdmin();
  const escolhidas = [...new Set(ids)].slice(0, MAXIMO_POR_VEZ);
  if (escolhidas.length === 0) return { ok: false, mensagem: "Marque pelo menos uma conta." };
  // a Meta está barrando as mensagens prontas? avisa o motivo de verdade, em vez de "a Meta recusou"
  const saude = await saudeDoEnvio();
  if (saude?.bloqueado) {
    return {
      ok: false,
      mensagem: `Não foi: a Meta está bloqueando as mensagens prontas (${saude.motivos[0] ?? "a conta do WhatsApp não pode iniciar conversas"}). Ninguém foi chamada.`,
    };
  }
  const { data: contas } = await admin.from("profiles").select("id, nome, email, telefone").in("id", escolhidas).eq("status", "aprovada").not("telefone", "is", null);
  let enviadas = 0;
  let recusadas = 0;
  for (const c of contas ?? []) {
    const r = await enviarAtivacao(admin, c, "ajuda_inicio", true, true);
    if (r.ok) enviadas++;
    else recusadas++;
  }
  revalidatePath("/admin");
  if (!enviadas && !recusadas) return { ok: false, mensagem: "Nenhuma das contas marcadas está liberada e com WhatsApp." };
  if (!enviadas)
    return {
      ok: false,
      mensagem: `A Meta recusou ${recusadas === 1 ? "a mensagem" : `as ${recusadas}`}. O modelo "vaguinha_ajuda_inicio" está Ativo no WhatsApp Manager?`,
    };
  return { ok: true, mensagem: `${enviadas} chamada${enviadas === 1 ? "" : "s"} no WhatsApp${recusadas ? ` (${recusadas} a Meta recusou: número inválido?)` : ""}.` };
}
