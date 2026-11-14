"use server";

import { revalidatePath } from "next/cache";
import { ehAdmin, obterUsuario } from "@/lib/auth";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { usoDasContas } from "@/features/admin/uso";
import { enviarAtivacao, jaRecebeu, type TipoAtivacao } from "./enviar";

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

/**
 * Chama no WhatsApp (só WhatsApp, nunca cai no e-mail) todas as contas em teste que só entraram, têm número e ainda
 * não receberam a ajuda POR WhatsApp (quem só recebeu o e-mail entra de novo).
 */
export async function chamarTodasQueSoEntraram(): Promise<{ ok: boolean; mensagem: string }> {
  const admin = await exigirAdmin();
  const [{ data: contas }, uso] = await Promise.all([
    admin.from("profiles").select("id, nome, email, telefone").eq("status", "aprovada").eq("plano", "teste").not("telefone", "is", null),
    usoDasContas(),
  ]);
  let enviadas = 0;
  let recusadas = 0;
  for (const c of contas ?? []) {
    if (uso.get(c.id)?.nivel !== "so_entrou" || (await jaRecebeu(admin, c.id, "ajuda_inicio", "whatsapp"))) continue;
    const r = await enviarAtivacao(admin, c, "ajuda_inicio", true, true);
    if (r.ok) enviadas++;
    else recusadas++;
  }
  revalidatePath("/admin");
  if (!enviadas && !recusadas) return { ok: true, mensagem: "Ninguém para chamar: todas que só entraram já receberam no WhatsApp." };
  if (!enviadas)
    return {
      ok: false,
      mensagem: `A Meta recusou as ${recusadas}. O modelo "vaguinha_ajuda_inicio" já está Ativo no WhatsApp Manager? Se ainda estiver em análise, espere e tente de novo.`,
    };
  return { ok: true, mensagem: `${enviadas} chamada${enviadas === 1 ? "" : "s"} no WhatsApp${recusadas ? ` (${recusadas} a Meta recusou: número inválido?)` : ""}.` };
}
