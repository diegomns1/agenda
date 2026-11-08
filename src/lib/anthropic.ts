import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/* Cliente da API da Anthropic (Claude) para o Assistente de IA do Premium.
   A chave vem de ANTHROPIC_API_KEY (Vercel → Environment Variables; no computador, .env.local).
   Sem a chave, o assistente mostra "em breve" e o resto do painel funciona normalmente. */

/**
 * Modelo do assistente: Haiku 5.5, o mais barato (decisão do Diego em 08/11/2026, para o Premium não dar prejuízo).
 * Com o Opus 5.5 a média medida era US$ 0,02 por mensagem; o Haiku custa cerca de 1/15 disso.
 * Se ele errar muito nas ferramentas, o próximo degrau é "claude-sonnet-5-5" (US$ 2 / US$ 10 por milhão).
 */
export const MODELO_ASSISTENTE = "claude-haiku-5-5";

/** Preço em US$ por 1 milhão de tokens do modelo acima, com pedido de até 100 mil tokens (para o Painel do dono). */
export const PRECO_POR_MILHAO = { entrada: 0.1, saida: 0.5, cacheLeitura: 0.01, cacheEscrita: 0.125 };

/** Limite de mensagens por profissional por dia (protege o crédito mensal da API). */
export const LIMITE_DIARIO_ASSISTENTE = 60;

export function assistenteConfigurado() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let cliente: Anthropic | null = null;

export function clienteAnthropic(): Anthropic {
  cliente ??= new Anthropic({ maxRetries: 2, timeout: 60_000 });
  return cliente;
}

export function custoEmDolar(uso: { entrada: number; saida: number; cacheLeitura: number; cacheEscrita: number }) {
  const p = PRECO_POR_MILHAO;
  return (uso.entrada * p.entrada + uso.saida * p.saida + uso.cacheLeitura * p.cacheLeitura + uso.cacheEscrita * p.cacheEscrita) / 1_000_000;
}
