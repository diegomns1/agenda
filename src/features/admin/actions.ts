"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehAdmin, obterUsuario } from "@/lib/auth";
import { PLANOS, STATUS_CONTA } from "@/lib/constantes";
import { DIAS_TESTE } from "@/lib/planos";
import { formatarDataISO, hojeISO, somarDias } from "@/lib/datas";
import { enviarEmail } from "@/lib/email";
import { emailContaAprovada, emailContaRecusada, emailContaSuspensa } from "@/features/emails/modelos";
import type { EstadoForm } from "@/components/formulario/tipos";
import { esquemaAlterarPlano, esquemaAlterarStatus, esquemaExcluirConta } from "./schema";
import { after } from "next/server";
import { registrarAprovacao } from "@/features/rastreio/servidor";
import { criarClienteAdmin } from "@/lib/supabase/admin";

async function exigirAdmin() {
  const usuario = await obterUsuario();
  if (!ehAdmin(usuario)) throw new Error("Sem permissão");
  return usuario!;
}

/**
 * Apaga de vez uma conta (login, perfil, agenda, clientes, serviços, conversas, logo). Sem volta.
 * Travas: só conta suspensa ou recusada; nunca um admin nem você mesmo; nunca quem tem assinatura no Asaas
 * ou já pagou (registro de pagamento precisa ficar guardado por lei: nesses casos, deixe suspensa).
 */
export async function excluirConta(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const eu = await exigirAdmin();

  const r = esquemaExcluirConta.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erros: z.flattenError(r.error).fieldErrors, erro: "Digite EXCLUIR para confirmar." };
  const { id } = r.data;
  if (id === eu.id) return { erro: "Você não pode excluir a sua própria conta." };

  const admin = criarClienteAdmin();
  const { data: conta } = await admin
    .from("profiles")
    .select("nome, status, asaas_subscription_id")
    .eq("id", id)
    .maybeSingle();
  if (!conta) return { erro: "Conta não encontrada (talvez já tenha sido excluída)." };
  if (conta.status !== "suspensa" && conta.status !== "recusada") {
    return { erro: "Antes de excluir, suspenda ou recuse a conta." };
  }
  if (conta.asaas_subscription_id) {
    return { erro: "Esta conta tem assinatura no Asaas. Cancele a assinatura lá e deixe a conta suspensa." };
  }
  const { count: pagas } = await admin
    .from("cobrancas")
    .select("id", { count: "exact", head: true })
    .eq("profissional_id", id)
    .not("pago_em", "is", null);
  if (pagas) return { erro: "Esta conta já pagou. Os registros de pagamento precisam ficar guardados: deixe a conta suspensa." };

  const { data: usuario } = await admin.auth.admin.getUserById(id);
  if ((usuario.user?.app_metadata as { role?: string } | undefined)?.role === "admin") {
    return { erro: "Não é possível excluir uma conta de administrador." };
  }

  // Atendimentos primeiro: o vínculo atendimento → serviço não deixa apagar um serviço ainda em uso
  const { error: erroAgenda } = await admin.from("agendamentos").delete().eq("profissional_id", id);
  if (erroAgenda) return { erro: `Não foi possível apagar a agenda: ${erroAgenda.message}` };

  // Logo (Storage não apaga sozinho)
  const { data: arquivos } = await admin.storage.from("logos").list(id);
  if (arquivos?.length) await admin.storage.from("logos").remove(arquivos.map((a) => `${id}/${a.name}`));

  // Apagar o login apaga o perfil e, em cascata, clientes, serviços, histórico, lembretes, cobranças e o WhatsApp
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { erro: `Não foi possível excluir: ${error.message}` };

  revalidatePath("/admin");
  revalidatePath("/admin/painel");
  return { ok: true, mensagem: `Conta de ${conta.nome} excluída.` };
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
  const { data: antes } = await supabase.from("profiles").select("nome, email, status, plano, ativa_ate").eq("id", id).maybeSingle();

  const motivoFinal = status === "recusada" || status === "suspensa" ? motivo || null : null;

  // Primeira aprovação de uma conta em Teste sem validade: começa o teste grátis de DIAS_TESTE dias
  const iniciaTeste = status === "aprovada" && antes?.status === "pendente" && antes.plano === "teste" && !antes.ativa_ate;
  const fimDoTeste = iniciaTeste ? somarDias(hojeISO(), DIAS_TESTE) : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      status,
      // motivo só faz sentido para recusa/suspensão; ao aprovar, limpa
      status_motivo: motivoFinal,
      ...(fimDoTeste ? { ativa_ate: fimDoTeste } : {}),
    })
    .eq("id", id);

  if (error) return { erro: `Não foi possível alterar o status: ${error.message}` };

  // Anúncios: conta aprovada pela primeira vez = lead qualificado (StartTrial na Meta)
  if (status === "aprovada" && antes?.status === "pendente") {
    after(() => registrarAprovacao(id).catch((e) => console.error("[meta] aprovação", e)));
  }

  // Avisa a profissional por e-mail (se o envio estiver configurado)
  let aviso = "";
  if (antes?.email && antes.status !== status) {
    const email =
      status === "aprovada"
        ? emailContaAprovada(antes.email, antes.nome, antes.status === "suspensa", fimDoTeste)
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
  const teste = fimDoTeste ? ` Teste grátis até ${formatarDataISO(fimDoTeste)}.` : "";
  return { ok: true, mensagem: `Conta marcada como "${STATUS_CONTA[status].rotulo}".${teste}${aviso}` };
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
