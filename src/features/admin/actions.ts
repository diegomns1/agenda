"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehAdmin, obterUsuario } from "@/lib/auth";
import { PLANOS, STATUS_CONTA } from "@/lib/constantes";
import { enviarEmail } from "@/lib/email";
import { emailContaAprovada, emailContaRecusada, emailContaSuspensa } from "@/features/emails/modelos";
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
  const { data: antes } = await supabase.from("profiles").select("nome, email, status").eq("id", id).maybeSingle();

  const motivoFinal = status === "recusada" || status === "suspensa" ? motivo || null : null;
  const { error } = await supabase
    .from("profiles")
    .update({
      status,
      // motivo só faz sentido para recusa/suspensão; ao aprovar, limpa
      status_motivo: motivoFinal,
    })
    .eq("id", id);

  if (error) return { erro: `Não foi possível alterar o status: ${error.message}` };

  // Avisa a profissional por e-mail (se o envio estiver configurado)
  let aviso = "";
  if (antes?.email && antes.status !== status) {
    const email =
      status === "aprovada"
        ? emailContaAprovada(antes.email, antes.nome, antes.status === "suspensa")
        : status === "recusada"
          ? emailContaRecusada(antes.email, antes.nome, motivoFinal)
          : status === "suspensa"
            ? emailContaSuspensa(antes.email, antes.nome, motivoFinal)
            : null;
    if (email) {
      const r = await enviarEmail(email);
      aviso = r.enviado ? " E-mail enviado para a profissional." : "";
    }
  }

  revalidarConta(id);
  return { ok: true, mensagem: `Conta marcada como "${STATUS_CONTA[status].rotulo}".${aviso}` };
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
