"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterPerfil } from "@/lib/auth";
import { hojeISO } from "@/lib/datas";
import { PLANOS } from "@/lib/planos";
import {
  asaasConfigurado,
  atualizarAssinatura,
  atualizarCliente,
  buscarClientePorReferencia,
  cancelarAssinatura as cancelarNoAsaas,
  criarAssinatura,
  criarCliente,
  ErroAsaas,
  linkDePagamento,
  listarPagamentosDaAssinatura,
  obterAssinatura,
  type AsaasPagamento,
} from "@/lib/asaas";
import type { EstadoForm } from "@/components/formulario/tipos";
import { cpfCnpjValido, ehPlanoAssinavel, normalizarCpfCnpj, type PlanoAssinavel } from "./regras";

function revalidar() {
  revalidatePath("/assinatura");
  revalidatePath("/perfil");
  revalidatePath("/", "layout");
}

const esquemaAssinar = z.object({
  plano: z.string().refine(ehPlanoAssinavel, "Escolha um plano"),
  cpf_cnpj: z.string().trim().refine(cpfCnpjValido, "CPF ou CNPJ inválido"),
});

type ResultadoAssinar = EstadoForm & { linkPagamento?: string };

/** Espelha uma cobrança do Asaas na tabela local (para a página mostrar sem esperar o webhook). */
async function espelharCobranca(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
  profissionalId: string,
  plano: PlanoAssinavel | null,
  p: AsaasPagamento,
) {
  await supabase.from("cobrancas").upsert(
    {
      profissional_id: profissionalId,
      asaas_id: p.id,
      assinatura_id: p.subscription ?? null,
      plano,
      valor: p.value,
      vencimento: p.dueDate,
      status: p.status,
      forma: p.billingType,
      link: linkDePagamento(p),
      pago_em: p.confirmedDate ?? p.paymentDate ?? p.clientPaymentDate ?? null,
    },
    { onConflict: "asaas_id" },
  );
}

function traduzirErro(e: unknown) {
  if (e instanceof ErroAsaas) {
    if (e.status === 401) return "A chave do Asaas não foi aceita. Avise o suporte.";
    return `Pagamento: ${e.message}`;
  }
  return "Não foi possível falar com o serviço de pagamento. Tente de novo em instantes.";
}

/**
 * Cria (ou troca) a assinatura mensal no Asaas e devolve o link da primeira cobrança.
 * A liberação do acesso acontece quando o Asaas avisa que o pagamento foi confirmado (webhook).
 */
export async function assinar(_: EstadoForm, formData: FormData): Promise<ResultadoAssinar> {
  if (!asaasConfigurado()) return { erro: "Pagamento online ainda não está ativo. Fale com o suporte para assinar." };

  const r = esquemaAssinar.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erros: z.flattenError(r.error).fieldErrors, erro: "Confira os campos.", valores: { cpf_cnpj: String(formData.get("cpf_cnpj") ?? "") } };

  const perfil = await obterPerfil();
  if (!perfil) return { erro: "Sessão expirada. Entre de novo." };

  const plano = r.data.plano as PlanoAssinavel;
  const cpfCnpj = normalizarCpfCnpj(r.data.cpf_cnpj);
  const supabase = await criarClienteServidor();
  const hoje = hojeISO();
  const descricao = `Vaguinha · plano ${PLANOS[plano].nome}`;
  const referencia = `${perfil.id}:${plano}`;

  try {
    // 1) cliente no Asaas (um por profissional)
    let customerId = perfil.asaas_customer_id;
    if (!customerId) {
      const existente = await buscarClientePorReferencia(perfil.id);
      const cliente =
        existente ??
        (await criarCliente({
          name: perfil.nome,
          email: perfil.email,
          cpfCnpj,
          mobilePhone: perfil.telefone?.replace(/^55/, "") ?? null,
          externalReference: perfil.id,
        }));
      customerId = cliente.id;
    } else if (perfil.cpf_cnpj !== cpfCnpj) {
      await atualizarCliente(customerId, { cpfCnpj });
    }

    // 2) assinatura: troca de valor se já existe uma ativa; senão cria
    let subscriptionId = perfil.asaas_subscription_id;
    let pagamentos: AsaasPagamento[] = [];
    if (subscriptionId) {
      const atual = await obterAssinatura(subscriptionId).catch(() => null);
      if (atual && !atual.deleted && atual.status === "ACTIVE") {
        await atualizarAssinatura(subscriptionId, { value: PLANOS[plano].preco, description: descricao, externalReference: referencia });
      } else {
        subscriptionId = null;
      }
    }
    if (!subscriptionId) {
      const nova = await criarAssinatura({
        customer: customerId,
        value: PLANOS[plano].preco,
        nextDueDate: hoje,
        description: descricao,
        externalReference: referencia,
      });
      subscriptionId = nova.id;
    }
    pagamentos = await listarPagamentosDaAssinatura(subscriptionId);

    // 3) guarda no perfil e espelha as cobranças
    const { error } = await supabase
      .from("profiles")
      .update({ asaas_customer_id: customerId, asaas_subscription_id: subscriptionId, plano_assinado: plano, cpf_cnpj: cpfCnpj })
      .eq("id", perfil.id);
    if (error) return { erro: `Não foi possível salvar a assinatura: ${error.message}` };

    for (const p of pagamentos) await espelharCobranca(supabase, perfil.id, plano, p);

    const pendente = pagamentos
      .filter((p) => p.status === "PENDING" || p.status === "OVERDUE")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

    revalidar();
    return {
      ok: true,
      mensagem: pendente ? "Assinatura criada! Agora é só pagar a primeira mensalidade." : "Assinatura atualizada.",
      linkPagamento: pendente ? (linkDePagamento(pendente) ?? undefined) : undefined,
    };
  } catch (e) {
    return { erro: traduzirErro(e) };
  }
}

/** Cancela a assinatura no Asaas. O acesso continua até a validade já paga. */
export async function cancelarAssinatura(): Promise<EstadoForm> {
  const perfil = await obterPerfil();
  if (!perfil) return { erro: "Sessão expirada. Entre de novo." };
  if (!perfil.asaas_subscription_id) return { erro: "Você não tem uma assinatura ativa." };

  try {
    await cancelarNoAsaas(perfil.asaas_subscription_id);
  } catch (e) {
    if (!(e instanceof ErroAsaas && e.status === 404)) return { erro: traduzirErro(e) };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("profiles").update({ asaas_subscription_id: null, plano_assinado: null }).eq("id", perfil.id);
  if (error) return { erro: `Não foi possível salvar: ${error.message}` };

  revalidar();
  return {
    ok: true,
    mensagem: perfil.ativa_ate ? `Assinatura cancelada. Seu acesso continua até a data já paga.` : "Assinatura cancelada.",
  };
}

/** Busca no Asaas o estado atual das cobranças (botão "Atualizar" na página). */
export async function sincronizarCobrancas(): Promise<EstadoForm> {
  const perfil = await obterPerfil();
  if (!perfil) return { erro: "Sessão expirada. Entre de novo." };
  if (!perfil.asaas_subscription_id || !asaasConfigurado()) return { ok: true };

  try {
    const pagamentos = await listarPagamentosDaAssinatura(perfil.asaas_subscription_id);
    const supabase = await criarClienteServidor();
    for (const p of pagamentos) await espelharCobranca(supabase, perfil.id, perfil.plano_assinado, p);
    revalidar();
    return { ok: true, mensagem: "Cobranças atualizadas." };
  } catch (e) {
    return { erro: traduzirErro(e) };
  }
}
