"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehAdmin, obterUsuario } from "@/lib/auth";
import { PLANOS, STATUS_CONTA } from "@/lib/constantes";
import type { EstadoForm } from "@/components/formulario/tipos";
import { esquemaAlterarPlano, esquemaAlterarStatus } from "./schema";

async function exigirAdmin() {
  const usuario = await obterUsuario();
  if (!ehAdmin(usuario)) throw new Error("Sem permissão");
}

function revalidarConta(id: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/contas/${id}`);
}

export async function alterarStatusConta(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirAdmin();

  const r = esquemaAlterarStatus.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erros: z.flattenError(r.error).fieldErrors, erro: "Dados inválidos." };

  const { id, status, motivo } = r.data;
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("profiles")
    .update({
      status,
      // motivo só faz sentido para recusa/suspensão; ao aprovar, limpa
      status_motivo: status === "recusada" || status === "suspensa" ? motivo || null : null,
    })
    .eq("id", id);

  if (error) return { erro: `Não foi possível alterar o status: ${error.message}` };

  revalidarConta(id);
  return { ok: true, mensagem: `Conta marcada como "${STATUS_CONTA[status].rotulo}".` };
}

export async function alterarPlanoConta(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirAdmin();

  const r = esquemaAlterarPlano.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erros: z.flattenError(r.error).fieldErrors, erro: "Dados inválidos." };

  const { id, plano, ativa_ate } = r.data;
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("profiles").update({ plano, ativa_ate }).eq("id", id);

  if (error) return { erro: `Não foi possível salvar o plano: ${error.message}` };

  revalidarConta(id);
  return { ok: true, mensagem: `Plano "${PLANOS[plano].nome}" salvo.` };
}
