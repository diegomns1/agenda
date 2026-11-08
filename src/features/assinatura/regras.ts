import { somarDias, somarMeses, type DataISO } from "@/lib/datas";
import type { Plano } from "@/lib/planos";

/** Planos que podem ser assinados (o "teste" não se assina). */
export const PLANOS_ASSINAVEIS = ["essencial", "profissional", "premium"] as const satisfies readonly Plano[];
export type PlanoAssinavel = (typeof PLANOS_ASSINAVEIS)[number];

export function ehPlanoAssinavel(v: unknown): v is PlanoAssinavel {
  return typeof v === "string" && (PLANOS_ASSINAVEIS as readonly string[]).includes(v);
}

/**
 * Nova validade depois de um pagamento confirmado: um mês a partir do que vier depois,
 * hoje ou a validade atual (pagou adiantado não perde dias), mais 3 dias de folga para
 * a próxima cobrança compensar.
 */
export function novaValidade(ativaAte: DataISO | null, hoje: DataISO): DataISO {
  const base = ativaAte && ativaAte > hoje ? ativaAte : hoje;
  return somarDias(somarMeses(base, 1), 3);
}

/** Só dígitos; aceita CPF (11) ou CNPJ (14). */
export function normalizarCpfCnpj(valor: string) {
  return valor.replace(/\D/g, "");
}

export function cpfCnpjValido(valor: string) {
  const d = normalizarCpfCnpj(valor);
  if (d.length === 11) return validarCpf(d);
  if (d.length === 14) return validarCnpj(d);
  return false;
}

function validarCpf(cpf: string) {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (tam: number) => {
    let soma = 0;
    for (let i = 0; i < tam; i++) soma += Number(cpf[i]) * (tam + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

function validarCnpj(cnpj: string) {
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (tam: number) => {
    const pesos = tam === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < tam; i++) soma += Number(cnpj[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

export function formatarCpfCnpj(valor: string | null | undefined) {
  if (!valor) return "";
  const d = normalizarCpfCnpj(valor);
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return valor;
}

/** Rótulo em português para o status da cobrança do Asaas. */
export function rotuloStatusCobranca(status: string): { texto: string; tom: "ok" | "aviso" | "erro" | "neutro" } {
  switch (status) {
    case "RECEIVED":
    case "CONFIRMED":
    case "RECEIVED_IN_CASH":
      return { texto: "Paga", tom: "ok" };
    case "PENDING":
    case "AWAITING_RISK_ANALYSIS":
      return { texto: "Aguardando pagamento", tom: "aviso" };
    case "OVERDUE":
      return { texto: "Vencida", tom: "erro" };
    case "REFUNDED":
    case "REFUND_REQUESTED":
    case "REFUND_IN_PROGRESS":
      return { texto: "Estornada", tom: "neutro" };
    case "DELETED":
      return { texto: "Cancelada", tom: "neutro" };
    default:
      return { texto: status, tom: "neutro" };
  }
}

export function cobrancaPaga(status: string) {
  return status === "RECEIVED" || status === "CONFIRMED" || status === "RECEIVED_IN_CASH";
}

export function formaDePagamento(forma: string | null | undefined) {
  switch (forma) {
    case "PIX":
      return "Pix";
    case "BOLETO":
      return "Boleto";
    case "CREDIT_CARD":
      return "Cartão";
    default:
      return "Pix, boleto ou cartão";
  }
}
