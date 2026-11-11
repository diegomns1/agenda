import { after, NextResponse, type NextRequest } from "next/server";
import { registrarPrimeiroPagamento } from "@/features/rastreio/servidor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { hojeISO } from "@/lib/datas";
import { obterPagamento, type AsaasPagamento } from "@/lib/asaas";
import { cobrancaPaga, ehPlanoAssinavel, novaValidade } from "@/features/assinatura/regras";

export const dynamic = "force-dynamic";

/**
 * Webhook do Asaas (Configurações → Integrações → Webhooks).
 * URL: https://painel.vaguinha.app/api/webhooks/asaas · token = ASAAS_WEBHOOK_TOKEN (header asaas-access-token).
 * Eventos de pagamento: espelha a cobrança e, quando confirmada, estende `ativa_ate` e aplica o plano.
 * Responde 200 mesmo para eventos ignorados (o Asaas reenvia tudo que não for 2xx).
 */
export async function POST(request: NextRequest) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  const recebido = request.headers.get("asaas-access-token");
  if (!esperado || recebido !== esperado) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  let evento: { event?: string; payment?: AsaasPagamento } = {};
  try {
    evento = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo inválido" }, { status: 400 });
  }

  const tipo = evento.event ?? "";
  if (!tipo.startsWith("PAYMENT_") || !evento.payment?.id) {
    return NextResponse.json({ ok: true, ignorado: tipo || "sem evento" });
  }

  let admin: ReturnType<typeof criarClienteAdmin>;
  try {
    admin = criarClienteAdmin();
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Service role não configurada" }, { status: 500 });
  }

  // Confirma os dados direto na API (não confia só no corpo recebido)
  let pagamento = evento.payment;
  if (process.env.ASAAS_API_KEY) {
    pagamento = await obterPagamento(evento.payment.id).catch(() => evento.payment!);
  }

  const { data: perfil } = await admin
    .from("profiles")
    .select("id, plano, ativa_ate, plano_assinado")
    .eq("asaas_customer_id", pagamento.customer)
    .maybeSingle();
  if (!perfil) return NextResponse.json({ ok: true, ignorado: "cliente desconhecido" });

  // plano: da referência "uuid:plano" da assinatura, ou o plano assinado guardado no perfil
  const planoDaRef = pagamento.externalReference?.split(":")[1];
  const plano = ehPlanoAssinavel(planoDaRef) ? planoDaRef : ehPlanoAssinavel(perfil.plano_assinado) ? perfil.plano_assinado : null;

  const { data: existente } = await admin.from("cobrancas").select("id, liberou_acesso").eq("asaas_id", pagamento.id).maybeSingle();

  const paga = cobrancaPaga(pagamento.status);
  const { data: cobranca, error } = await admin
    .from("cobrancas")
    .upsert(
      {
        profissional_id: perfil.id,
        asaas_id: pagamento.id,
        assinatura_id: pagamento.subscription ?? null,
        plano,
        valor: pagamento.value,
        vencimento: pagamento.dueDate,
        status: pagamento.deleted ? "DELETED" : pagamento.status,
        forma: pagamento.billingType,
        link: pagamento.invoiceUrl ?? null,
        pago_em: paga ? (pagamento.confirmedDate ?? pagamento.paymentDate ?? pagamento.clientPaymentDate ?? new Date().toISOString()) : null,
      },
      { onConflict: "asaas_id" },
    )
    .select("id, liberou_acesso")
    .single();
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  // Libera o acesso uma única vez por cobrança paga
  let liberado = false;
  if (paga && !(existente?.liberou_acesso ?? cobranca.liberou_acesso)) {
    const validade = novaValidade(perfil.ativa_ate, hojeISO());
    const { error: erroPerfil } = await admin
      .from("profiles")
      .update({ ativa_ate: validade, plano: plano ?? perfil.plano, status: "aprovada" })
      .eq("id", perfil.id)
      .neq("status", "recusada"); // conta recusada não é reativada por pagamento
    if (erroPerfil) return NextResponse.json({ erro: erroPerfil.message }, { status: 500 });
    await admin.from("cobrancas").update({ liberou_acesso: true }).eq("id", cobranca.id);
    liberado = true;
    // Anúncios: primeiro pagamento = virou cliente (Subscribe com o valor; só manda uma vez por profissional)
    const valorPago = Number(pagamento.value) || 0;
    after(() => registrarPrimeiroPagamento(perfil.id, valorPago).catch((e) => console.error("[meta] pagamento", e)));
  }

  return NextResponse.json({ ok: true, evento: tipo, pagamento: pagamento.id, liberado });
}
