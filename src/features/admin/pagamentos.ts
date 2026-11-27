import "server-only";
import type { criarClienteAdmin } from "@/lib/supabase/admin";
import type { Plano } from "@/lib/planos";
import { cobrancaEmAberto, cobrancaPaga } from "@/features/assinatura/regras";

/*
 * Situação de pagamento de cada conta, para a lista do admin (27/11/2026).
 * O Diego não via quem já é assinante, quem gerou um Pix e não pagou, nem quem pagou duas vezes.
 * Lê só a tabela de cobranças (espelho do Asaas, atualizada pelo webhook): não chama o Asaas a cada visita.
 */

export type SituacaoPagamento = {
  tipo: "assinante" | "atrasada" | "aberto";
  /** mensalidades pagas e quanto somam */
  pagas: number;
  totalPago: number;
  /** cobrança em aberto que já venceu (ou vence hoje): valor, forma e desde quando */
  aberta: { valor: number; forma: string | null; vencimento: string } | null;
  /** plano escolhido por quem ainda não pagou nenhuma (está no teste) */
  escolheu: Exclude<Plano, "teste"> | null;
  /** assinante que trocou de plano: o novo só vale a partir da próxima mensalidade */
  trocaPara: Exclude<Plano, "teste"> | null;
};

type Admin = ReturnType<typeof criarClienteAdmin>;
type PerfilBase = { id: string; plano: Plano; plano_assinado: Exclude<Plano, "teste"> | null; asaas_subscription_id: string | null };

export async function situacaoDosPagamentos(admin: Admin, perfis: PerfilBase[], hoje: string) {
  const { data } = await admin.from("cobrancas").select("profissional_id, status, valor, vencimento, forma").limit(5000);
  const porConta = new Map<string, NonNullable<typeof data>>();
  for (const c of data ?? []) {
    const lista = porConta.get(c.profissional_id) ?? [];
    lista.push(c);
    porConta.set(c.profissional_id, lista);
  }

  const situacao = new Map<string, SituacaoPagamento>();
  for (const p of perfis) {
    const cobrancas = porConta.get(p.id) ?? [];
    const pagas = cobrancas.filter((c) => cobrancaPaga(c.status));
    // só conta como "em aberto" a que já devia ter sido paga: a do mês seguinte o Asaas gera adiantada
    const aberta =
      cobrancas
        .filter((c) => cobrancaEmAberto(c.status) && c.vencimento <= hoje)
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0] ?? null;
    if (!pagas.length && !aberta) continue;
    situacao.set(p.id, {
      tipo: pagas.length ? (aberta ? "atrasada" : "assinante") : "aberto",
      pagas: pagas.length,
      totalPago: pagas.reduce((s, c) => s + Number(c.valor), 0),
      aberta: aberta ? { valor: Number(aberta.valor), forma: aberta.forma, vencimento: aberta.vencimento } : null,
      escolheu: p.plano === "teste" ? p.plano_assinado : null,
      trocaPara: p.plano !== "teste" && p.asaas_subscription_id && p.plano_assinado && p.plano_assinado !== p.plano ? p.plano_assinado : null,
    });
  }
  return situacao;
}
