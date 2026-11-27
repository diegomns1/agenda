/*
 * Mensagens prontas (modelos aprovados pela Meta), 14/11/2026. É o único jeito de chamar alguém que não escreveu
 * nas últimas 24 h. O texto aqui tem de ser IGUAL ao cadastrado no WhatsApp Manager ({{1}} = primeiro nome):
 * ele aparece na Central e a Serena usa para saber o que foi perguntado.
 * Usado pela ativação automática (features/ativacao) e pelo botão "Mensagem pronta" da Central.
 */

export type IdModelo = "ajuda_inicio" | "feedback_teste" | "parou" | "retomar_conversa" | "assinatura" | "pagamento_aberto";

export type ModeloMensagem = {
  id: IdModelo;
  /** nome no WhatsApp Manager */
  nome: string;
  rotulo: string;
  /** para quem faz sentido: quem já tem conta, quem ainda é lead, ou qualquer um */
  para: "conta" | "lead" | "todos";
  texto: (nome: string) => string;
};

export const MODELOS: Record<IdModelo, ModeloMensagem> = {
  ajuda_inicio: {
    id: "ajuda_inicio",
    nome: "vaguinha_ajuda_inicio",
    rotulo: "Oferecer ajuda para começar",
    para: "conta",
    texto: (nome) =>
      `Oi, ${nome}! Aqui é a Serena, da Vaguinha 😊 Vi que você criou sua conta. Conseguiu cadastrar seus serviços e marcar o primeiro horário? Se travou em alguma parte, me responde aqui que eu te ajudo.`,
  },
  feedback_teste: {
    id: "feedback_teste",
    nome: "vaguinha_feedback_teste",
    rotulo: "Pedir opinião (fim do teste)",
    para: "conta",
    texto: (nome) =>
      `Oi, ${nome}! Seu teste grátis da Vaguinha termina hoje. Posso te pedir 1 minutinho? O que faltou pra agenda funcionar pra você? Sua resposta ajuda muito a gente a melhorar.`,
  },
  // cadastrado na Meta em 19/11/2026 (categoria Marketing): para quem começou a configurar e parou
  parou: {
    id: "parou",
    nome: "vaguinha_retomar_uso",
    rotulo: "Chamar quem parou de usar",
    para: "conta",
    texto: (nome) =>
      `Oi, ${nome}! Aqui é a Serena, da Vaguinha 😊 Vi que você começou a montar sua agenda e depois deu uma pausa. Ficou alguma dúvida ou faltou alguma coisa? Me responde aqui que eu te ajudo a terminar.`,
  },
  // cadastrado na Meta em 27/11/2026 (categoria Utilidade): para falar com quem mexeu na assinatura ou no pagamento
  assinatura: {
    id: "assinatura",
    nome: "vaguinha_assinatura",
    rotulo: "Falar sobre a assinatura",
    para: "conta",
    texto: (nome) =>
      `Oi, ${nome}! Aqui é o Diego, da Vaguinha. Estou falando sobre a sua assinatura: vi uma mudança no seu plano e quero confirmar se ficou tudo certo para você. Pode me responder por aqui?`,
  },
  // cadastrado na Meta em 27/11/2026 (categoria Utilidade): gerou o Pix (ou a cobrança no cartão) e não pagou
  pagamento_aberto: {
    id: "pagamento_aberto",
    nome: "vaguinha_pagamento_aberto",
    rotulo: "Ajudar a concluir o pagamento",
    para: "conta",
    texto: (nome) =>
      `Oi, ${nome}! Aqui é o Diego, da Vaguinha. Vi que você começou a assinatura, mas o pagamento não foi concluído. Teve alguma dificuldade? Me responde aqui que eu te ajudo a finalizar.`,
  },
  retomar_conversa: {
    id: "retomar_conversa",
    nome: "vaguinha_retomar_conversa",
    rotulo: "Retomar a conversa",
    para: "lead",
    texto: (nome) =>
      `Oi, ${nome}! Aqui é a Serena, da Vaguinha 😊 A gente conversou sobre a agenda no celular e queria saber se ficou alguma dúvida. Se quiser, te mando o link pra testar 5 dias grátis.`,
  },
};

/** Modelos que fazem sentido para o contato (tem conta ou ainda é lead). */
export function modelosPara(temConta: boolean): ModeloMensagem[] {
  return Object.values(MODELOS).filter((m) => m.para === "todos" || m.para === (temConta ? "conta" : "lead"));
}
