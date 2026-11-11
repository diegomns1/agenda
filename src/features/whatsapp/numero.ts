import { formatarTelefone } from "@/lib/telefone";

/*
 * Lidos na hora (não no build), para trocar na VPS só com um reload do PM2:
 *   WHATSAPP_NUMERO_ASSISTENTE  número da Vaguinha (ou o de teste da Meta), só dígitos com 55. Vazio = recurso desligado.
 *   WHATSAPP_ABERTO=1           mostra o quadro "Assistente no WhatsApp" para todas as profissionais.
 *                               Sem ele, só as contas admin veem (fase de testes com o número de teste da Meta).
 */

export function numeroAssistente() {
  return (process.env.WHATSAPP_NUMERO_ASSISTENTE ?? "").replace(/\D/g, "");
}

export function whatsappLiberadoPara(admin: boolean) {
  return Boolean(numeroAssistente()) && (process.env.WHATSAPP_ABERTO === "1" || admin);
}

/** Número como a Meta manda (wa_id) → bonito para a tela. Celular brasileiro às vezes vem sem o 9 da frente. */
export function descreverNumero(telefone: string) {
  const comNove = /^55\d{2}[6-9]\d{7}$/.test(telefone) ? `${telefone.slice(0, 4)}9${telefone.slice(4)}` : telefone;
  return formatarTelefone(comNove);
}
