import type { Plano } from "@/lib/planos";

/*
 * Novidades do painel (17/11/2026). Aparecem num aviso quando a profissional entra, uma vez por novidade.
 *
 * COMO ADICIONAR: ponha a novidade nova NO TOPO da lista, com a data de hoje. Quem já viu as anteriores vê só a nova.
 * - `data`: dia em que entrou no ar ("AAAA-MM-DD"). É por ela que o painel sabe o que cada pessoa já viu, e conta
 *   criada depois dessa data não recebe o aviso (para ela não é novidade, o painel já era assim).
 * - `plano`: se a novidade é só de um plano, aparece a etiqueta (ex.: "Premium"). Todo mundo vê, para saber que existe.
 * - `acao`: botão que leva direto para a tela.
 * Texto curto, na língua de quem usa: o que mudou e para que serve.
 */

export type Novidade = {
  data: string;
  titulo: string;
  texto: string;
  plano?: Exclude<Plano, "teste">;
  acao?: { href: string; rotulo: string };
};

export const NOVIDADES: Novidade[] = [
  {
    data: "2026-11-16",
    titulo: "Planos R$ 10 mais baratos",
    texto: "O Essencial agora custa R$ 19,90, o Profissional R$ 29,90 e o Premium R$ 49,90 por mês.",
    acao: { href: "/assinatura", rotulo: "Ver planos" },
  },
  {
    data: "2026-11-15",
    titulo: "Lembrete automático pelo seu WhatsApp",
    texto: "Conecte o seu WhatsApp e o lembrete sai sozinho para o cliente, 1 dia e 2 horas antes do horário.",
    plano: "premium",
    acao: { href: "/lembretes", rotulo: "Conectar meu WhatsApp" },
  },
  {
    data: "2026-11-15",
    titulo: "Stories criados com IA",
    texto: "No gerador de stories, toque em Gerar com IA para uma versão com acabamento profissional. São 30 por mês.",
    plano: "premium",
    acao: { href: "/stories", rotulo: "Criar um story" },
  },
  {
    data: "2026-11-15",
    titulo: "Editar um atendimento já marcado",
    texto: "Toque no atendimento e em Editar para mudar o dia, o horário ou o serviço. Também dá para adicionar mais um serviço.",
    acao: { href: "/agenda", rotulo: "Abrir a agenda" },
  },
];

/** No máximo quantas aparecem de uma vez (as mais novas). */
export const MAXIMO_NO_AVISO = 4;
