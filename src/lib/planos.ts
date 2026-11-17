/**
 * Planos do Vaguinha e o que cada um libera.
 * A regra fica num lugar só; telas e ações consultam `temRecurso()`.
 *
 * Preços (16/11/2026): baixaram R$ 10 em todos os planos. `precoAnterior` é o valor cobrado até 15/11/2026
 * (R$ 29,90 / 39,90 / 59,90) e aparece riscado no site e na tela de assinatura ("de R$ 29,90 por R$ 19,90").
 * Para parar de mostrar o preço riscado, apague `precoAnterior`.
 *
 * `para` e `itens` são o texto de venda de cada plano: o site e a tela de assinatura mostram exatamente o mesmo.
 * (O que a Serena fala fica em features/whatsapp/conhecimento.ts; mudou aqui, confira lá.)
 */

export const PLANOS = {
  teste: {
    nome: "Teste grátis",
    curto: "Teste",
    preco: 0,
    precoAnterior: null,
    descricao: "5 dias grátis com os recursos do Essencial.",
    para: "",
    itens: [],
    // mesmo nível do Essencial: agenda, clientes e serviços (sem lembretes, link e stories)
    nivel: 1,
  },
  essencial: {
    nome: "Essencial",
    curto: "Essencial",
    preco: 19.9,
    precoAnterior: 29.9,
    descricao: "Perfil, serviços, cadastro de clientes e agenda.",
    para: "Para organizar a agenda.",
    itens: [
      "Agenda por dia, semana e mês",
      "Clientes com histórico de atendimentos",
      "Serviços com duração e valor",
      "Importação da agenda do Google",
      "App no celular com a sua logo e as suas cores",
    ],
    nivel: 1,
  },
  profissional: {
    nome: "Profissional",
    curto: "Profissional",
    preco: 29.9,
    precoAnterior: 39.9,
    descricao: "Tudo do Essencial + link de agendamento + lembretes.",
    para: "Para o cliente marcar sozinho e faltar menos.",
    itens: [
      "Tudo do Essencial",
      "Link para o cliente marcar sozinho",
      "Aviso no seu celular 1 dia e 1 hora antes de cada horário",
      "Lembrete pronto para enviar pelo WhatsApp com um toque",
    ],
    nivel: 2,
  },
  premium: {
    nome: "Premium",
    curto: "Premium",
    preco: 49.9,
    precoAnterior: 59.9,
    descricao: "Tudo do Profissional + lembrete automático pelo seu WhatsApp + assistente de IA + stories para o Instagram + relatórios do mês.",
    para: "Para os lembretes saírem sozinhos e a agenda encher.",
    itens: [
      "Tudo do Profissional",
      "Lembrete automático pelo seu WhatsApp, 1 dia e 2 horas antes",
      "Assistente de IA no WhatsApp para consultar e marcar",
      "Stories prontos dos seus horários livres e serviços",
      "30 stories por mês criados com IA",
      "Relatório do mês e aviso quando um horário vaga",
    ],
    nivel: 3,
  },
} as const;

export type Plano = keyof typeof PLANOS;

/** Duração do teste grátis, contada a partir da aprovação da conta pelo admin. */
export const DIAS_TESTE = 5; // 5 dias desde 12/11/2026 (antes 3). Textos fixos: grep "5 dias"

export const RECURSOS = {
  lembretes: { nome: "Lembretes", planoMinimo: "profissional" as Plano },
  agendamento_online: { nome: "Link de agendamento", planoMinimo: "profissional" as Plano },
  stories: { nome: "Stories para o Instagram", planoMinimo: "premium" as Plano },
  // relatórios do mês + aviso "vagou um horário" na tela Hoje
  relatorios: { nome: "Relatórios", planoMinimo: "premium" as Plano },
  // chat de IA que consulta e propõe mudanças na agenda (src/features/assistente)
  assistente: { nome: "Assistente de IA", planoMinimo: "premium" as Plano },
  // lembrete que sai sozinho do WhatsApp da própria profissional (src/features/whatsapp-proprio), 15/11/2026
  lembrete_automatico: { nome: "Lembrete automático pelo seu WhatsApp", planoMinimo: "premium" as Plano },
} as const;

export type Recurso = keyof typeof RECURSOS;

export function ehPlano(valor: unknown): valor is Plano {
  return typeof valor === "string" && valor in PLANOS;
}

/** O plano libera o recurso? (Teste libera tudo.) */
export function temRecurso(plano: Plano | string | null | undefined, recurso: Recurso): boolean {
  const atual = ehPlano(plano) ? plano : "essencial";
  return PLANOS[atual].nivel >= PLANOS[RECURSOS[recurso].planoMinimo].nivel;
}

/** Plano necessário para um recurso, para mostrar no convite de upgrade. */
export function planoNecessario(recurso: Recurso) {
  return PLANOS[RECURSOS[recurso].planoMinimo];
}

export function formatarPreco(valor: number) {
  return valor === 0 ? "Grátis" : `R$ ${valor.toFixed(2).replace(".", ",")}/mês`;
}
