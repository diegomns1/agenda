export type TipoStory = "dia" | "semana" | "mes" | "servicos";

export const TIPOS_STORY: { id: TipoStory; titulo: string; descricao: string }[] = [
  { id: "dia", titulo: "Agenda do dia", descricao: "Horários livres de um dia" },
  { id: "semana", titulo: "Agenda da semana", descricao: "Horários livres dos próximos 7 dias" },
  { id: "mes", titulo: "Agenda do mês", descricao: "Dias com vaga e dias indisponíveis" },
  { id: "servicos", titulo: "Serviços e valores", descricao: "Sua tabela de preços" },
];

export type Tema = {
  id: string;
  nome: string;
  /** Texto curto na faixa do topo (sem emoji: a fonte da imagem não tem emojis). */
  faixa: string | null;
  /** Se definidas, substituem as cores da profissional. */
  primaria?: string;
  secundaria?: string;
  /** Gradiente de fundo (duas cores). */
  fundo: [string, string];
  /** Cor do texto sobre o fundo. */
  texto: string;
  /** Cor dos círculos decorativos. */
  decoracao: string;
};

export const TEMAS: Tema[] = [
  {
    id: "neutro",
    nome: "Minhas cores",
    faixa: null,
    fundo: ["#FFFFFF", "#F6F6F8"],
    texto: "#1F1F23",
    decoracao: "rgba(0,0,0,0.05)",
  },
  {
    id: "natal",
    nome: "Natal",
    faixa: "Boas Festas",
    primaria: "#B3261E",
    secundaria: "#FDECEC",
    fundo: ["#0F3D2E", "#145A42"],
    texto: "#FFFFFF",
    decoracao: "rgba(255,255,255,0.10)",
  },
  {
    id: "ano-novo",
    nome: "Ano Novo",
    faixa: "Feliz Ano Novo",
    primaria: "#C9A227",
    secundaria: "#FFF8E1",
    fundo: ["#101014", "#2A2A38"],
    texto: "#FFFFFF",
    decoracao: "rgba(201,162,39,0.18)",
  },
  {
    id: "dia-da-mulher",
    nome: "Dia da Mulher",
    faixa: "Feliz Dia da Mulher",
    primaria: "#7B1FA2",
    secundaria: "#F3E5F5",
    fundo: ["#F3E5F5", "#E1BEE7"],
    texto: "#3B1B4A",
    decoracao: "rgba(123,31,162,0.12)",
  },
  {
    id: "outubro-rosa",
    nome: "Outubro Rosa",
    faixa: "Outubro Rosa",
    primaria: "#E91E63",
    secundaria: "#FFF0F5",
    fundo: ["#FFE4EE", "#FFC1D9"],
    texto: "#5A1030",
    decoracao: "rgba(233,30,99,0.14)",
  },
  {
    id: "novembro-azul",
    nome: "Novembro Azul",
    faixa: "Novembro Azul",
    primaria: "#1565C0",
    secundaria: "#E3F2FD",
    fundo: ["#E3F2FD", "#BBDEFB"],
    texto: "#0D2A4A",
    decoracao: "rgba(21,101,192,0.14)",
  },
];

export function obterTema(id: string | null | undefined): Tema {
  return TEMAS.find((t) => t.id === id) ?? TEMAS[0];
}

export const LARGURA_STORY = 1080;
export const ALTURA_STORY = 1920;
