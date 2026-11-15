import { URL_APP } from "@/lib/constantes";

/** Para onde a Evolution manda os avisos (conexão e mensagens). */
export const URL_AVISOS_EVOLUTION = `${URL_APP}/api/webhooks/evolution`;

/**
 * Lembrete automático, fixo e simples (15/11/2026, pedido do Diego): 1 dia antes e 2 horas antes de cada atendimento,
 * sempre com estas mensagens (não pede "sim" nem "não"). Linha com campo vazio some (ex.: sem endereço).
 */
export const MENSAGEM_LEMBRETE_DIA = ["Oi, {nome}! 😊", "Passando para lembrar do seu horário {dia} às {hora}.", "✨ {servico}", "📍 {endereco}", "", "Até lá!"].join("\n");
export const MENSAGEM_LEMBRETE_2H = ["Oi, {nome}! Seu horário é hoje às {hora}.", "✨ {servico}", "📍 {endereco}", "", "Até daqui a pouco! 😊"].join("\n");
