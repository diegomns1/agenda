import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/* Cliente da API da Anthropic (Claude) para o Assistente de IA do Premium.
   A chave vem de ANTHROPIC_API_KEY (Vercel → Environment Variables; no computador, .env.local).
   Sem a chave, o assistente mostra "em breve" e o resto do painel funciona normalmente. */

/** Modelo padrão do assistente. Para gastar menos, dá para trocar por "claude-haiku-5-5" (decisão do Diego). */
export const MODELO_ASSISTENTE = "claude-opus-5-5";

/** Preço em US$ por 1 milhão de tokens do modelo acima (para estimar o gasto no Painel do dono). */
export const PRECO_POR_MILHAO = { entrada: 4, saida: 20, cacheLeitura: 0.2, cacheEscrita: 5 };

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
