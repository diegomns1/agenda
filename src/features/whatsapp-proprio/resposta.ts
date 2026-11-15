/*
 * O que a cliente quis dizer ao responder o lembrete automático (fase 3, 15/11/2026). Regras simples, sem IA:
 *   "confirmou" — sim, confirmo, ok, 👍... (mensagem curta e sem "não", "remarcar", "cancelar"...)
 *   "parar"     — parar, sair, não quero mais receber...
 *   "outra"     — qualquer outra coisa (a profissional é avisada para ler)
 * Sem "server-only": dá para testar no terminal.
 */

export type TipoResposta = "confirmou" | "parar" | "outra";

function normalizar(t: string) {
  return t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const PARAR = /^(parar|pare|para|sair|stop|cancelar (os )?lembretes?)\W*$|(nao|n) (quero|precisa|precisam) (mais )?(receber|mandar|essas? mensage)|para de (me )?mandar|nao (me )?mande mais|parar de receber/;

const NEGATIVO = /\bnao\b|\bn\b|remarc|desmarc|cancel|adiar|outro (dia|horario)|atras|nao vou|nao consigo|nao posso|imprevisto|desculp/;

const CONFIRMA =
  /^(sim+|s+|ss+|si+m+|isso|confirm\w*|ok+|okay|oks|ta (bom|otimo|certo|confirmado|ok)|ta|beleza|blz|certo|certinho|combinado|pode (ser|confirmar)|positivo|com certeza|claro|perfeito|otimo|vou( sim)?|estarei( ai| la)?|to indo|estou indo|vou estar|confirmadissimo|fechado|show|uhum|aham)\b/;

const EMOJI_CONFIRMA = /^[\s👍👌✅🙏❤️❤🥰😊😍💖💕✨🤝]+$/u;

export function entenderResposta(texto: string): TipoResposta {
  const bruto = texto.trim();
  if (!bruto) return "outra";
  if (EMOJI_CONFIRMA.test(bruto)) return "confirmou";
  const t = normalizar(bruto);
  if (PARAR.test(t)) return "parar";
  if (NEGATIVO.test(t)) return "outra";
  // confirmação costuma ser curta; mensagem longa pode trazer pergunta ou pedido junto
  const semPontuacao = t.replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
  if (semPontuacao.length <= 60 && CONFIRMA.test(semPontuacao) && !t.includes("?")) return "confirmou";
  return "outra";
}
