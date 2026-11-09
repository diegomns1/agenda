import { formatarTelefone } from "@/lib/telefone";

/** Número de WhatsApp da assistente da Vaguinha (só dígitos, com 55). Vazio = recurso ainda desligado. */
export const NUMERO_ASSISTENTE = process.env.NEXT_PUBLIC_WHATSAPP_ASSISTENTE?.replace(/\D/g, "") ?? "";

/** Número como a Meta manda (wa_id) → bonito para a tela. Celular brasileiro às vezes vem sem o 9 da frente. */
export function descreverNumero(telefone: string) {
  const comNove = /^55\d{2}[6-9]\d{7}$/.test(telefone) ? `${telefone.slice(0, 4)}9${telefone.slice(4)}` : telefone;
  return formatarTelefone(comNove);
}
