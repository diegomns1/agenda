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

/** Manda a mensagem de ajuda para todas as contas em teste que só entraram e ainda não receberam. */
export async function chamarTodasQueSoEntraram(): Promise<{ ok: boolean; mensagem: string }> {
  const admin = await exigirAdmin();
  const [{ data: contas }, uso] = await Promise.all([
    admin.from("profiles").select("id, nome, email, telefone").eq("status", "aprovada").eq("plano", "teste"),
    usoDasContas(),
  ]);
  let whatsapp = 0;
  let email = 0;
  let falhas = 0;
  for (const c of contas ?? []) {
    if (uso.get(c.id)?.nivel !== "so_entrou" || (await jaRecebeu(admin, c.id, "ajuda_inicio"))) continue;
    const r = await enviarAtivacao(admin, c, "ajuda_inicio", true);
    if (!r.ok) falhas++;
    else if (r.canal === "whatsapp") whatsapp++;
    else email++;
  }
  revalidatePath("/admin");
  const total = whatsapp + email;
  if (!total && !falhas) return { ok: true, mensagem: "Ninguém para chamar: todas que só entraram já receberam." };
  return {
    ok: total > 0,
    mensagem: `${total} chamada${total === 1 ? "" : "s"} (${whatsapp} pelo WhatsApp, ${email} por e-mail)${falhas ? `, ${falhas} não foram` : ""}.`,
  };
}
