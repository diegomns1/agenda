export const NOME_APP = "Vaguinha";

export const FUSO = "America/Sao_Paulo";

export const STATUS_CONTA = {
  pendente: { rotulo: "Aguardando aprovação", badge: "secondary" },
  aprovada: { rotulo: "Aprovada", badge: "default" },
  recusada: { rotulo: "Recusada", badge: "destructive" },
  suspensa: { rotulo: "Suspensa", badge: "outline" },
} as const;

export type StatusConta = keyof typeof STATUS_CONTA;

// Planos e recursos: ver src/lib/planos.ts
export { PLANOS, type Plano } from "@/lib/planos";

export const MODELO_LEMBRETE_PADRAO =
  "Oi {nome}! Passando para lembrar do seu horário de {servico} {dia} às {hora}. Te espero! 💅";

/** WhatsApp do suporte (só dígitos com 55). Variável NEXT_PUBLIC_SUPORTE_WHATSAPP na Vercel tem prioridade;
 *  sem ela, usa o número pessoal do Diego (pedido dele em 07/11/2026: "por enquanto, meu número pessoal"). */
export const SUPORTE_WHATSAPP = process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP?.replace(/\D/g, "") || "5514982193655";

/** Site institucional. Endereço principal com www (na Vercel, vaguinha.app redireciona para cá). Painel: URL_APP. */
export const URL_SITE = "https://www.vaguinha.app";

/** URL pública do app: NEXT_PUBLIC_APP_URL, ou o domínio de produção da Vercel, ou localhost. */
export const URL_APP =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
