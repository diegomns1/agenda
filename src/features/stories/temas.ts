export type TipoStory = "dia" | "semana" | "mes" | "servicos";

export const TIPOS_STORY: { id: TipoStory; titulo: string; descricao: string }[] = [
  { id: "dia", titulo: "Agenda do dia", descricao: "Marque os horários que quer divulgar" },
  { id: "semana", titulo: "Agenda da semana", descricao: "Marque os dias com vaga" },
  { id: "mes", titulo: "Agenda do mês", descricao: "Calendário com os dias disponíveis" },
  { id: "servicos", titulo: "Serviços e valores", descricao: "Tabela ou destaque de um serviço com foto" },
];

export type Tema = {
  id: string;
  nome: string;
  /** "sempre" = serve o ano todo; "datas" = data comemorativa (mostra `quando`). */
  grupo: "sempre" | "datas";
  /** Época, para o seletor (ex.: "dezembro"). */
  quando?: string;
  /** Se definidas, substituem as cores da profissional. */
  primaria?: string;
  secundaria?: string;
  /** Cor do texto sobre a cor primária (chips, botões). Padrão: branco. */
  sobrePrimaria?: string;
  /** Cor do título (padrão: a primária). Útil em fundo escuro, onde a primária some. */
  titulo?: string;
  /** A primária é clara (dourado, amarelo): em cartões brancos, o texto usa cor escura. */
  primariaClara?: boolean;
  /** Gradiente de fundo (duas cores). Com papel de parede, é a cor do painel por trás do texto. */
  fundo: [string, string];
  /** Cor do texto sobre o fundo. */
  texto: string;
  /** Cor dos círculos decorativos (temas sem papel de parede). */
  decoracao: string;
  /** Tem papel de parede em public/stories/temas/<id>.jpg (miniatura em <id>-mini.jpg). */
  imagem?: boolean;
  /** Fundo enviado pela própria profissional (vem no pedido, guardado só no aparelho dela). */
  personalizado?: boolean;
  /** Preenchido na hora de gerar a imagem: papel de parede como data URL. */
  imagemUrl?: string;
};

export const ID_MEU_FUNDO = "meu-fundo";

export const TEMAS: Tema[] = [
  // ------------------------------------------------------------ o ano todo
  {
    id: "neutro",
    nome: "Minhas cores",
    grupo: "sempre",
    fundo: ["#FFFFFF", "#F6F6F8"],
    texto: "#1F1F23",
    decoracao: "rgba(0,0,0,0.05)",
  },
  {
    // Cores da profissional sobre a imagem que ela subir; painel branco translúcido para ler bem em qualquer foto.
    id: ID_MEU_FUNDO,
    nome: "Meu fundo",
    grupo: "sempre",
    fundo: ["#FFFFFF", "#F6F6F8"],
    texto: "#1F1F23",
    decoracao: "rgba(0,0,0,0.05)",
    personalizado: true,
  },
  {
    id: "floral",
    nome: "Floral delicado",
    grupo: "sempre",
    primaria: "#8C5E4A",
    secundaria: "#F5EEE6",
    fundo: ["#FBF7F2", "#F5EEE6"],
    texto: "#3B2A22",
    decoracao: "rgba(140,94,74,0.10)",
    imagem: true,
  },
  {
    id: "marmore",
    nome: "Mármore e dourado",
    grupo: "sempre",
    primaria: "#8A6A12",
    secundaria: "#F0EEE9",
    fundo: ["#FAFAF8", "#F0EEE9"],
    texto: "#2B2B2B",
    decoracao: "rgba(138,106,18,0.12)",
    imagem: true,
  },
  {
    id: "verao",
    nome: "Verão tropical",
    grupo: "sempre",
    quando: "dezembro a março",
    primaria: "#00796B",
    secundaria: "#FFEFD6",
    fundo: ["#FFF8EC", "#FFEFD6"],
    texto: "#22302F",
    decoracao: "rgba(0,121,107,0.12)",
    imagem: true,
  },
  // ------------------------------------------------------ datas especiais
  {
    id: "carnaval",
    nome: "Carnaval",
    grupo: "datas",
    quando: "fevereiro",
    primaria: "#FF4081",
    secundaria: "#4A148C",
    fundo: ["#3A0F78", "#4A148C"],
    texto: "#FFFFFF",
    decoracao: "rgba(255,255,255,0.10)",
    imagem: true,
  },
  {
    id: "dia-da-mulher",
    nome: "Dia da Mulher",
    grupo: "datas",
    quando: "8 de março",
    primaria: "#7B1FA2",
    secundaria: "#F3E5F5",
    fundo: ["#F7EEF9", "#F3E5F5"],
    texto: "#3B1B4A",
    decoracao: "rgba(123,31,162,0.12)",
    imagem: true,
  },
  {
    id: "pascoa",
    nome: "Páscoa",
    grupo: "datas",
    quando: "março ou abril",
    primaria: "#7E57C2",
    secundaria: "#FFF1DA",
    fundo: ["#FFF8EC", "#FFF1DA"],
    texto: "#3E2A52",
    decoracao: "rgba(126,87,194,0.12)",
    imagem: true,
  },
  {
    id: "dia-das-maes",
    nome: "Dia das Mães",
    grupo: "datas",
    quando: "maio",
    primaria: "#B4545E",
    secundaria: "#FBE3DA",
    fundo: ["#FDF3EF", "#FBE3DA"],
    texto: "#4A2228",
    decoracao: "rgba(180,84,94,0.12)",
    imagem: true,
  },
  {
    id: "namorados",
    nome: "Dia dos Namorados",
    grupo: "datas",
    quando: "12 de junho",
    primaria: "#C2185B",
    secundaria: "#FFE1E8",
    fundo: ["#FFF3F5", "#FFE1E8"],
    texto: "#4A1024",
    decoracao: "rgba(194,24,91,0.12)",
    imagem: true,
  },
  {
    id: "festa-junina",
    nome: "Festa Junina",
    grupo: "datas",
    quando: "junho",
    primaria: "#D84315",
    secundaria: "#FFEFD9",
    fundo: ["#FFF7EC", "#FFEFD9"],
    texto: "#3E2412",
    decoracao: "rgba(216,67,21,0.12)",
    imagem: true,
  },
  {
    id: "dia-dos-pais",
    nome: "Dia dos Pais",
    grupo: "datas",
    quando: "agosto",
    primaria: "#1F3A5F",
    secundaria: "#E9EDF3",
    fundo: ["#F4F6F9", "#E9EDF3"],
    texto: "#14243A",
    decoracao: "rgba(31,58,95,0.12)",
    imagem: true,
  },
  {
    id: "outubro-rosa",
    nome: "Outubro Rosa",
    grupo: "datas",
    quando: "outubro",
    primaria: "#E91E63",
    secundaria: "#FFF0F5",
    fundo: ["#FFF0F5", "#FFE4EE"],
    texto: "#5A1030",
    decoracao: "rgba(233,30,99,0.14)",
    imagem: true,
  },
  {
    id: "novembro-azul",
    nome: "Novembro Azul",
    grupo: "datas",
    quando: "novembro",
    primaria: "#1565C0",
    secundaria: "#E3F2FD",
    fundo: ["#F1F7FE", "#E3F2FD"],
    texto: "#0D2A4A",
    decoracao: "rgba(21,101,192,0.14)",
    imagem: true,
  },
  {
    id: "black-friday",
    nome: "Black Friday",
    grupo: "datas",
    quando: "fim de novembro",
    primaria: "#FFE600",
    sobrePrimaria: "#111111",
    primariaClara: true,
    secundaria: "#151515",
    fundo: ["#0B0B0B", "#151515"],
    texto: "#FFFFFF",
    decoracao: "rgba(255,230,0,0.12)",
    imagem: true,
  },
  {
    id: "natal",
    nome: "Natal",
    grupo: "datas",
    quando: "dezembro",
    titulo: "#F2C14E",
    primaria: "#B3261E",
    secundaria: "#FDECEC",
    fundo: ["#0F3D2E", "#0B2E22"],
    texto: "#FFFFFF",
    decoracao: "rgba(255,255,255,0.10)",
    imagem: true,
  },
  {
    id: "ano-novo",
    nome: "Ano Novo",
    grupo: "datas",
    quando: "fim de dezembro",
    primaria: "#C9A227",
    sobrePrimaria: "#101014",
    primariaClara: true,
    secundaria: "#FFF8E1",
    fundo: ["#101014", "#17171F"],
    texto: "#FFFFFF",
    decoracao: "rgba(201,162,39,0.18)",
    imagem: true,
  },
];

export function obterTema(id: string | null | undefined): Tema {
  return TEMAS.find((t) => t.id === id) ?? TEMAS[0];
}

/** Caminho público do papel de parede (ou da miniatura) de um tema. */
export function caminhoFundo(id: string, mini = false) {
  return `/stories/temas/${id}${mini ? "-mini" : ""}.jpg`;
}

export const LARGURA_STORY = 1080;
export const ALTURA_STORY = 1920;
