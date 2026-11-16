/* Prazos da Central do WhatsApp (16/11/2026). Num arquivo só, porque a tela mostra os mesmos números que o servidor usa. */

/** Lead que não escreve há este tempo (em dias) sai de "Robô atendendo" / "Recebeu o link do teste" e vai para "Sem resposta". */
export const DIAS_SEM_RESPOSTA = 1;

/** Conversa sem nenhuma mensagem há este tempo (em dias) é apagada sozinha (ver limpeza.ts para quem fica de fora). */
export const DIAS_PARA_APAGAR = 5;
