/* Sinais de que do outro lado do WhatsApp é outro robô (resposta automática de empresa, menu de chatbot).
   Separado de processar.ts para dar para testar sem banco (scripts/serena). */

/** Sem acento, minúsculas, espaços simples. */
export function normalizar(t: string) {
  return t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Frases de resposta automática (WhatsApp Business, chatbots de menu). Comparadas sem acento e em minúsculas. */
const FRASE_AUTOMATICA = new RegExp(
  [
    "mensagem automatica",
    "resposta automatica",
    "obrigad[oa] por (entrar em )?contato",
    "agradecemos (o seu|seu|o) contato",
    "retornaremos (o mais breve|em breve|assim que|seu contato)",
    "em breve (retornaremos|responderemos|um (de nossos|dos nossos) atendentes)",
    "digite o numero d[ae]",
    "escolha uma das opcoes",
    "selecione uma das opcoes",
    "responda com o numero",
  ].join("|"),
);

export function pareceRespostaAutomatica(texto: string) {
  return FRASE_AUTOMATICA.test(normalizar(texto));
}
