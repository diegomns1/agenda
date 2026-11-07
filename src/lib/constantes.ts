export const NOME_APP = "Vaguinha";

export const FUSO = "America/Sao_Paulo";

export const STATUS_CONTA = {
  pendente: { rotulo: "Aguardando aprovação", badge: "secondary" },
  aprovada: { rotulo: "Aprovada", badge: "default" },
  recusada: { rotulo: "Recusada", badge: "destructive" },
  suspensa: { rotulo: "Suspensa", badge: "outline" },
} as const;

export type StatusConta = keyof typeof STATUS_CONTA;

export const PLANOS = {
  teste: "Teste gratuito",
  mensal: "Mensal",
  trimestral: "Trimestral",
  anual: "Anual",
} as const;

export type Plano = keyof typeof PLANOS;

export const MODELO_LEMBRETE_PADRAO =
  "Oi {nome}! Passando para lembrar do seu horário de {servico} {dia} às {hora}. Te espero! 💅";

/** URL pública do app: NEXT_PUBLIC_APP_URL, ou o domínio de produção da Vercel, ou localhost. */
export const URL_APP =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
