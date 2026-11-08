/**
 * Ramos de atividade que usam agenda com hora marcada.
 * Servem para: (1) adaptar a linguagem do painel ("sessão", "aula", "consulta"...),
 * (2) sugerir os primeiros serviços, (3) o Diego saber o público (painel do Admin).
 * A lista é de leitura pura: pode ser usada no servidor e no navegador.
 */

export type Termo = "atendimento" | "sessao" | "aula" | "consulta" | "horario";

export type Ramo = {
  id: string;
  nome: string;
  grupo: GrupoRamo;
  termo: Termo;
  /** Palavras extras para a busca (sinônimos, como as pessoas escrevem). */
  busca?: string;
  /** Exemplo de nome de negócio para o placeholder do Perfil. */
  exemplo: string;
  sugestoes: { nome: string; duracao_min: number; valor: number }[];
};

export const GRUPOS = {
  beleza: "Beleza e estética",
  saude: "Saúde e bem-estar",
  corpo: "Esporte e movimento",
  arte: "Tatuagem e arte no corpo",
  ensino: "Aulas e cursos",
  pet: "Pet",
  servicos: "Serviços e consultoria",
} as const;

export type GrupoRamo = keyof typeof GRUPOS;

const s = (nome: string, duracao_min: number, valor: number) => ({ nome, duracao_min, valor });

export const RAMOS: Ramo[] = [
  // ---------------------------------------------------------------- beleza
  { id: "manicure", nome: "Manicure e pedicure", grupo: "beleza", termo: "atendimento", busca: "unha unhas mão pé esmalte", exemplo: "Studio Ana Nails",
    sugestoes: [s("Manicure", 45, 40), s("Pedicure", 50, 45), s("Pé e mão", 90, 80), s("Esmaltação em gel", 60, 70), s("Spa dos pés", 60, 70)] },
  { id: "nail_designer", nome: "Nail designer (alongamento)", grupo: "beleza", termo: "atendimento", busca: "unha gel fibra acrigel alongamento", exemplo: "Bia Nail Design",
    sugestoes: [s("Alongamento em fibra", 150, 180), s("Alongamento em gel", 150, 170), s("Manutenção de alongamento", 120, 120), s("Blindagem", 60, 80), s("Remoção", 45, 50)] },
  { id: "salao", nome: "Salão de beleza", grupo: "beleza", termo: "atendimento", busca: "cabelo corte escova", exemplo: "Salão Bella Vista",
    sugestoes: [s("Corte feminino", 60, 80), s("Escova", 45, 60), s("Coloração", 120, 180), s("Hidratação", 60, 90), s("Progressiva", 180, 250)] },
  { id: "cabeleireiro", nome: "Cabeleireiro(a)", grupo: "beleza", termo: "atendimento", busca: "cabelo corte mechas luzes", exemplo: "Hair by Carol",
    sugestoes: [s("Corte", 60, 70), s("Mechas", 180, 300), s("Coloração", 120, 180), s("Escova", 45, 60), s("Tratamento capilar", 60, 100)] },
  { id: "barbearia", nome: "Barbearia", grupo: "beleza", termo: "horario", busca: "barbeiro barba corte masculino", exemplo: "Barbearia do Léo",
    sugestoes: [s("Corte", 40, 45), s("Barba", 30, 35), s("Corte + barba", 60, 70), s("Pigmentação", 30, 40), s("Sobrancelha", 15, 20)] },
  { id: "sobrancelha", nome: "Designer de sobrancelhas", grupo: "beleza", termo: "atendimento", busca: "sobrancelha henna brow", exemplo: "Studio Olhar",
    sugestoes: [s("Design de sobrancelha", 30, 40), s("Design com henna", 45, 55), s("Brow lamination", 60, 120), s("Buço", 15, 20)] },
  { id: "lash", nome: "Lash designer (cílios)", grupo: "beleza", termo: "atendimento", busca: "cílios extensão lash lifting fio a fio volume", exemplo: "Lash Studio Mari",
    sugestoes: [s("Extensão fio a fio", 120, 150), s("Volume russo", 150, 200), s("Manutenção", 90, 100), s("Lash lifting", 60, 120)] },
  { id: "maquiagem", nome: "Maquiagem", grupo: "beleza", termo: "atendimento", busca: "make maquiadora noiva festa", exemplo: "Make by Ju",
    sugestoes: [s("Maquiagem social", 60, 150), s("Maquiagem de noiva", 120, 450), s("Penteado", 60, 120), s("Make + penteado", 120, 250)] },
  { id: "depilacao", nome: "Depilação", grupo: "beleza", termo: "sessao", busca: "cera laser depiladora", exemplo: "Depil Express",
    sugestoes: [s("Perna inteira", 40, 60), s("Axila", 15, 20), s("Virilha", 30, 45), s("Buço", 10, 15), s("Depilação a laser", 30, 120)] },
  { id: "estetica_facial", nome: "Estética facial", grupo: "beleza", termo: "sessao", busca: "limpeza de pele esteticista peeling skincare", exemplo: "Clínica Pele Viva",
    sugestoes: [s("Limpeza de pele", 75, 150), s("Peeling", 45, 180), s("Microagulhamento", 60, 250), s("Hidratação facial", 60, 120)] },
  { id: "estetica_corporal", nome: "Estética corporal", grupo: "beleza", termo: "sessao", busca: "drenagem modeladora esteticista criolipólise", exemplo: "Corpo & Forma",
    sugestoes: [s("Drenagem linfática", 60, 120), s("Massagem modeladora", 60, 120), s("Radiofrequência", 45, 150), s("Pacote 10 sessões", 60, 900)] },
  { id: "micropigmentacao", nome: "Micropigmentação", grupo: "beleza", termo: "sessao", busca: "micro sobrancelha fio a fio lábios dermopigmentação", exemplo: "Studio Traço",
    sugestoes: [s("Micropigmentação de sobrancelha", 150, 500), s("Retoque", 90, 200), s("Micropigmentação labial", 150, 600)] },
  { id: "trancista", nome: "Tranças e penteados", grupo: "beleza", termo: "atendimento", busca: "trança box braids nagô trancista", exemplo: "Tranças da Nanda",
    sugestoes: [s("Box braids", 300, 350), s("Nagô", 120, 150), s("Manutenção", 120, 150), s("Penteado", 60, 100)] },
  { id: "podologia", nome: "Podologia", grupo: "saude", termo: "atendimento", busca: "podóloga unha encravada pé", exemplo: "Podologia Passo Leve",
    sugestoes: [s("Podologia completa", 60, 120), s("Unha encravada", 45, 100), s("Órtese", 30, 80)] },
  { id: "spa", nome: "Spa e day spa", grupo: "beleza", termo: "atendimento", busca: "relaxante pedras ofurô", exemplo: "Spa Essência",
    sugestoes: [s("Massagem relaxante", 60, 150), s("Pedras quentes", 75, 180), s("Day spa", 240, 400)] },
  { id: "bronzeamento", nome: "Bronzeamento", grupo: "beleza", termo: "sessao", busca: "bronze marquinha", exemplo: "Bronze da Lu",
    sugestoes: [s("Bronzeamento natural", 120, 120), s("Bronzeamento a jato", 30, 100)] },

  // ----------------------------------------------------------------- saúde
  { id: "massoterapia", nome: "Massoterapia", grupo: "saude", termo: "sessao", busca: "massagem massagista quick", exemplo: "Toque Terapia",
    sugestoes: [s("Massagem relaxante", 60, 120), s("Massagem terapêutica", 60, 140), s("Quick massage", 20, 50), s("Reflexologia", 45, 90)] },
  { id: "fisioterapia", nome: "Fisioterapia", grupo: "saude", termo: "sessao", busca: "fisio fisioterapeuta rpg", exemplo: "Fisio em Movimento",
    sugestoes: [s("Avaliação", 60, 150), s("Sessão de fisioterapia", 50, 120), s("RPG", 60, 150)] },
  { id: "psicologia", nome: "Psicologia", grupo: "saude", termo: "sessao", busca: "psicóloga psicólogo terapia psicoterapia", exemplo: "Consultório Dra. Paula",
    sugestoes: [s("Sessão de terapia", 50, 180), s("Primeira consulta", 50, 180), s("Sessão online", 50, 160)] },
  { id: "nutricao", nome: "Nutrição", grupo: "saude", termo: "consulta", busca: "nutricionista dieta", exemplo: "Nutri Clara Lima",
    sugestoes: [s("Primeira consulta", 60, 250), s("Retorno", 40, 150), s("Consulta online", 50, 200)] },
  { id: "terapias", nome: "Terapias integrativas", grupo: "saude", termo: "sessao", busca: "reiki acupuntura terapeuta holístico aromaterapia constelação", exemplo: "Espaço Equilíbrio",
    sugestoes: [s("Reiki", 60, 120), s("Acupuntura", 50, 130), s("Auriculoterapia", 30, 70), s("Barras de Access", 60, 150)] },
  { id: "odontologia", nome: "Odontologia", grupo: "saude", termo: "consulta", busca: "dentista consultório dental", exemplo: "Sorriso Clínica",
    sugestoes: [s("Avaliação", 30, 100), s("Limpeza", 45, 200), s("Clareamento", 60, 600), s("Restauração", 60, 250)] },
  { id: "fonoaudiologia", nome: "Fonoaudiologia", grupo: "saude", termo: "sessao", busca: "fono fonoaudióloga", exemplo: "Fono Fala Bem",
    sugestoes: [s("Avaliação", 60, 200), s("Sessão", 45, 150)] },

  // ------------------------------------------------------------------ corpo
  { id: "personal", nome: "Personal trainer", grupo: "corpo", termo: "aula", busca: "treino academia personal", exemplo: "Personal Rafa",
    sugestoes: [s("Aula avulsa", 60, 80), s("Avaliação física", 60, 100), s("Treino em dupla", 60, 120)] },
  { id: "pilates", nome: "Pilates e yoga", grupo: "corpo", termo: "aula", busca: "pilates yoga ioga studio", exemplo: "Studio Equilíbrio",
    sugestoes: [s("Aula de pilates", 50, 80), s("Aula de yoga", 60, 70), s("Aula experimental", 50, 0)] },
  { id: "danca", nome: "Dança e lutas", grupo: "corpo", termo: "aula", busca: "dança ballet luta jiu-jitsu muay thai", exemplo: "Academia Ritmo",
    sugestoes: [s("Aula particular", 60, 100), s("Aula em grupo", 60, 50)] },

  // ------------------------------------------------------------------- arte
  { id: "tatuagem", nome: "Tatuagem", grupo: "arte", termo: "sessao", busca: "tattoo tatuador tatuadora", exemplo: "Black Ink Tattoo",
    sugestoes: [s("Orçamento", 30, 0), s("Tatuagem pequena", 90, 250), s("Sessão (meio período)", 240, 600), s("Sessão (dia inteiro)", 480, 1100), s("Retoque", 60, 0)] },
  { id: "piercing", nome: "Piercing", grupo: "arte", termo: "atendimento", busca: "body piercer perfuração", exemplo: "Studio Pierce",
    sugestoes: [s("Perfuração", 30, 100), s("Troca de joia", 15, 30)] },

  // ------------------------------------------------------------------ ensino
  { id: "aulas_particulares", nome: "Aulas particulares e reforço", grupo: "ensino", termo: "aula", busca: "professor professora reforço escolar matemática", exemplo: "Reforço com a Prof. Ana",
    sugestoes: [s("Aula particular", 60, 70), s("Aula online", 60, 60), s("Pacote 4 aulas", 60, 250)] },
  { id: "musica", nome: "Aulas de música", grupo: "ensino", termo: "aula", busca: "violão piano canto bateria", exemplo: "Música com o Leo",
    sugestoes: [s("Aula de violão", 60, 90), s("Aula de canto", 60, 100), s("Aula de piano", 60, 100)] },
  { id: "idiomas", nome: "Aulas de idiomas", grupo: "ensino", termo: "aula", busca: "inglês espanhol professor", exemplo: "English with Bia",
    sugestoes: [s("Aula individual", 60, 90), s("Conversação", 45, 70), s("Aula em dupla", 60, 120)] },

  // --------------------------------------------------------------------- pet
  { id: "banho_tosa", nome: "Banho e tosa", grupo: "pet", termo: "horario", busca: "pet shop cachorro gato tosador", exemplo: "Pet Cheiroso",
    sugestoes: [s("Banho porte pequeno", 60, 50), s("Banho e tosa", 120, 90), s("Tosa higiênica", 45, 40), s("Hidratação", 60, 60)] },
  { id: "veterinario", nome: "Veterinário(a)", grupo: "pet", termo: "consulta", busca: "vet clínica veterinária vacina", exemplo: "Clínica Vet Amigo",
    sugestoes: [s("Consulta", 30, 150), s("Vacina", 15, 90), s("Retorno", 20, 0)] },
  { id: "adestramento", nome: "Adestramento", grupo: "pet", termo: "aula", busca: "adestrador cão", exemplo: "Cão Educado",
    sugestoes: [s("Aula de adestramento", 60, 120), s("Avaliação", 45, 80)] },

  // ---------------------------------------------------------------- serviços
  { id: "fotografia", nome: "Fotografia", grupo: "servicos", termo: "sessao", busca: "fotógrafa fotógrafo ensaio book", exemplo: "Foto Luz",
    sugestoes: [s("Ensaio fotográfico", 90, 400), s("Book", 120, 600), s("Fotos de produto", 120, 300)] },
  { id: "consultoria", nome: "Consultoria e mentoria", grupo: "servicos", termo: "consulta", busca: "consultora mentora coach advogada contadora", exemplo: "Mentoria Carla Reis",
    sugestoes: [s("Reunião inicial", 30, 0), s("Sessão de mentoria", 60, 300), s("Consultoria", 60, 250)] },
  { id: "costura", nome: "Costura e ajustes", grupo: "servicos", termo: "horario", busca: "costureira prova ajuste roupa", exemplo: "Ateliê da Rosa",
    sugestoes: [s("Prova", 30, 0), s("Ajuste", 30, 40), s("Retirada", 15, 0)] },
  { id: "automotivo", nome: "Estética automotiva e lava-rápido", grupo: "servicos", termo: "horario", busca: "lavagem carro polimento lava jato", exemplo: "Brilho Car",
    sugestoes: [s("Lavagem simples", 45, 50), s("Lavagem completa", 90, 90), s("Polimento", 240, 350), s("Higienização interna", 180, 250)] },
  { id: "limpeza", nome: "Limpeza e diarista", grupo: "servicos", termo: "horario", busca: "faxina diarista organizer", exemplo: "Casa Limpa",
    sugestoes: [s("Diária", 480, 200), s("Meia diária", 240, 120), s("Faxina pesada", 480, 280)] },
];

export const OUTRO_RAMO = "outro";

export function obterRamo(id: string | null | undefined): Ramo | null {
  return RAMOS.find((r) => r.id === id) ?? null;
}

/** Nome para mostrar: o do catálogo ou o que a pessoa digitou em "Outros". */
export function nomeDoRamo(id: string | null | undefined, outro?: string | null): string {
  if (id === OUTRO_RAMO) return outro?.trim() || "Outros";
  return obterRamo(id)?.nome ?? "Não informado";
}

function normalizar(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function buscarRamos(consulta: string): Ramo[] {
  const q = normalizar(consulta.trim());
  if (!q) return RAMOS;
  const partes = q.split(/\s+/);
  return RAMOS.filter((r) => {
    const alvo = normalizar(`${r.nome} ${r.busca ?? ""} ${GRUPOS[r.grupo]}`);
    return partes.every((p) => alvo.includes(p));
  });
}

// ---------------------------------------------------------------------------
// Linguagem: "atendimento", "sessão", "aula"... com artigo e plural certos
// ---------------------------------------------------------------------------

const TERMOS: Record<Termo, { um: string; varios: string; artigo: "o" | "a"; marcar: string }> = {
  atendimento: { um: "atendimento", varios: "atendimentos", artigo: "o", marcar: "Marcar atendimento" },
  sessao: { um: "sessão", varios: "sessões", artigo: "a", marcar: "Marcar sessão" },
  aula: { um: "aula", varios: "aulas", artigo: "a", marcar: "Marcar aula" },
  consulta: { um: "consulta", varios: "consultas", artigo: "a", marcar: "Marcar consulta" },
  horario: { um: "horário", varios: "horários", artigo: "o", marcar: "Marcar horário" },
};

export function termosDoRamo(id: string | null | undefined) {
  const termo = obterRamo(id)?.termo ?? "atendimento";
  const t = TERMOS[termo];
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  return {
    ...t,
    Um: cap(t.um),
    Varios: cap(t.varios),
    /** "Próximos atendimentos" / "Próximas sessões" */
    proximos: `${t.artigo === "a" ? "Próximas" : "Próximos"} ${t.varios}`,
    /** "Nada marcado" é neutro; "Nenhuma sessão" / "Nenhum atendimento" */
    nenhum: `${t.artigo === "a" ? "Nenhuma" : "Nenhum"} ${t.um}`,
  };
}

// ---------------------------------------------------------------------------
// Tratamento (ela / ele / neutro) e tema do painel
// ---------------------------------------------------------------------------

export const TRATAMENTOS = {
  ela: { rotulo: "Ela", exemplo: "Bem-vinda" },
  ele: { rotulo: "Ele", exemplo: "Bem-vindo" },
  neutro: { rotulo: "Prefiro não dizer", exemplo: "Boas-vindas" },
} as const;

export type Tratamento = keyof typeof TRATAMENTOS;

export function ehTratamento(v: unknown): v is Tratamento {
  return typeof v === "string" && v in TRATAMENTOS;
}

/** Escolhe a palavra conforme o tratamento: flexao(t, "pronta", "pronto", "tudo pronto"). */
export function flexao(t: Tratamento | null | undefined, feminino: string, masculino: string, neutro?: string) {
  if (t === "ele") return masculino;
  if (t === "neutro") return neutro ?? masculino;
  return feminino;
}

export const TEMAS_PAINEL = {
  rosa: { nome: "Rosa Vaguinha", cores: ["#702D50", "#D799AF", "#FCF6F1"] },
  grafite: { nome: "Grafite", cores: ["#1F2937", "#94A3B8", "#F5F6F8"] },
  azul: { nome: "Azul", cores: ["#1E3A8A", "#93C5FD", "#F3F7FD"] },
  verde: { nome: "Verde", cores: ["#14532D", "#86C9A0", "#F2F8F4"] },
  lavanda: { nome: "Lavanda", cores: ["#4C1D95", "#C4B5FD", "#F7F5FD"] },
} as const;

export type TemaPainel = keyof typeof TEMAS_PAINEL;

export function ehTemaPainel(v: unknown): v is TemaPainel {
  return typeof v === "string" && v in TEMAS_PAINEL;
}

/** Tema inicial conforme o tratamento escolhido no cadastro (dá para trocar no Perfil). */
export function temaPadrao(t: Tratamento | null | undefined): TemaPainel {
  return t === "ele" ? "grafite" : "rosa";
}
