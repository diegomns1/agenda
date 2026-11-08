import "server-only";

/* Cliente mínimo da API do Asaas (https://docs.asaas.com), via fetch, sem biblioteca.
   Variáveis: ASAAS_API_KEY, ASAAS_AMBIENTE ("sandbox" | "producao"), ASAAS_WEBHOOK_TOKEN. */

export type AsaasCliente = { id: string; name: string; email: string | null; cpfCnpj: string | null };

export type AsaasAssinatura = {
  id: string;
  customer: string;
  value: number;
  cycle: string;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED" | string;
  nextDueDate: string;
  externalReference: string | null;
  billingType?: string;
  deleted?: boolean;
};

export type AsaasPagamento = {
  id: string;
  customer: string;
  subscription?: string | null;
  value: number;
  netValue?: number;
  status: string; // PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED, DELETED, ...
  billingType: string; // PIX, BOLETO, CREDIT_CARD, UNDEFINED
  dueDate: string; // AAAA-MM-DD
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  confirmedDate?: string | null;
  invoiceUrl?: string | null;
  externalReference?: string | null;
  deleted?: boolean;
};

type Lista<T> = { data: T[]; hasMore: boolean; totalCount: number };

export class ErroAsaas extends Error {
  constructor(
    message: string,
    public status: number,
    public detalhes?: unknown,
  ) {
    super(message);
    this.name = "ErroAsaas";
  }
}

export function asaasConfigurado() {
  return Boolean(process.env.ASAAS_API_KEY);
}

function baseUrl() {
  return process.env.ASAAS_AMBIENTE === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
}

export function ambienteAsaas(): "producao" | "sandbox" {
  return process.env.ASAAS_AMBIENTE === "producao" ? "producao" : "sandbox";
}

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) throw new ErroAsaas("Asaas não configurado (ASAAS_API_KEY).", 500);

  const r = await fetch(`${baseUrl()}${caminho}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "User-Agent": "Vaguinha",
      access_token: chave,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const texto = await r.text();
  const corpo = texto ? safeJson(texto) : null;
  if (!r.ok) {
    const descricao =
      (corpo as { errors?: { description?: string }[] } | null)?.errors?.[0]?.description ?? `Asaas respondeu ${r.status}`;
    throw new ErroAsaas(descricao, r.status, corpo);
  }
  return corpo as T;
}

function safeJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

// ---------------------------------------------------------------- clientes

export async function buscarClientePorReferencia(externalReference: string) {
  const r = await chamar<Lista<AsaasCliente>>(`/customers?externalReference=${encodeURIComponent(externalReference)}&limit=1`);
  return r.data[0] ?? null;
}

export async function criarCliente(dados: {
  name: string;
  email: string | null;
  cpfCnpj: string;
  mobilePhone?: string | null;
  externalReference: string;
}) {
  return chamar<AsaasCliente>("/customers", {
    method: "POST",
    body: JSON.stringify({ ...dados, notificationDisabled: false }),
  });
}

export async function atualizarCliente(id: string, dados: Partial<{ name: string; email: string | null; cpfCnpj: string; mobilePhone: string | null }>) {
  return chamar<AsaasCliente>(`/customers/${id}`, { method: "PUT", body: JSON.stringify(dados) });
}

// ------------------------------------------------------------- assinaturas

/**
 * Formas aceitas na assinatura. A API do Asaas aceita uma forma só por assinatura (PIX, CREDIT_CARD, BOLETO ou
 * UNDEFINED = a pessoa escolhe, mas aí o boleto sempre aparece). Débito não existe para assinatura.
 * Decisão do Diego (08/11/2026): sem boleto → a profissional escolhe Pix ou cartão de crédito na Vaguinha.
 */
export const FORMAS_PAGAMENTO = ["PIX", "CREDIT_CARD"] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export async function criarAssinatura(dados: {
  customer: string;
  value: number;
  nextDueDate: string; // AAAA-MM-DD
  description: string;
  externalReference: string;
  billingType: FormaPagamento;
}) {
  return chamar<AsaasAssinatura>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({ ...dados, cycle: "MONTHLY" }),
  });
}

export async function obterAssinatura(id: string) {
  return chamar<AsaasAssinatura>(`/subscriptions/${id}`);
}

export async function atualizarAssinatura(
  id: string,
  dados: { value: number; description: string; externalReference: string; billingType?: FormaPagamento },
) {
  return chamar<AsaasAssinatura>(`/subscriptions/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...dados, updatePendingPayments: true }),
  });
}

export async function cancelarAssinatura(id: string) {
  return chamar<{ deleted: boolean; id: string }>(`/subscriptions/${id}`, { method: "DELETE" });
}

export async function listarPagamentosDaAssinatura(id: string) {
  const r = await chamar<Lista<AsaasPagamento>>(`/subscriptions/${id}/payments?limit=50`);
  return r.data;
}

export async function obterPagamento(id: string) {
  return chamar<AsaasPagamento>(`/payments/${id}`);
}

/** Link da página de pagamento de uma cobrança (Pix copia-e-cola, boleto ou cartão). */
export function linkDePagamento(p: AsaasPagamento) {
  return p.invoiceUrl ?? null;
}
