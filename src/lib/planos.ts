/**
 * Planos do Vaguinha e o que cada um libera.
 * A regra fica num lugar só; telas e ações consultam `temRecurso()`.
 */

export const PLANOS = {
  teste: {
    nome: "Teste gratuito",
    curto: "Teste",
    preco: 0,
    descricao: "Tudo liberado durante o período de testes.",
    nivel: 3,
  },
  essencial: {
    nome: "Essencial",
    curto: "Essencial",
    preco: 19.9,
    descricao: "Perfil, serviços, cadastro de clientes e agenda.",
    nivel: 1,
  },
  profissional: {
    nome: "Profissional",
    curto: "Profissional",
    preco: 29.9,
    descricao: "Tudo do Essencial + agendamento pela cliente + lembretes.",
    nivel: 2,
  },
  premium: {
    nome: "Premium",
    curto: "Premium",
    preco: 39.9,
    descricao: "Tudo do Profissional + stories para o Instagram.",
    nivel: 3,
  },
} as const;

export type Plano = keyof typeof PLANOS;

export const RECURSOS = {
  lembretes: { nome: "Lembretes", planoMinimo: "profissional" as Plano },
  agendamento_online: { nome: "Agendamento pela cliente", planoMinimo: "profissional" as Plano },
  stories: { nome: "Stories para o Instagram", planoMinimo: "premium" as Plano },
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
