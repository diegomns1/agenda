import "server-only";
import { listarAgendamentosDias } from "@/features/agenda/queries";
import { horariosDisponiveis, janelaDoDia } from "@/features/agenda/disponibilidade";
import { listarServicos } from "@/features/servicos/queries";
import { diasEntre, formatarDataISO, hojeISO, intervaloDoMes, minutosDoDia, somarDias, type DataISO } from "@/lib/datas";
import { formatarMoeda } from "@/lib/moeda";
import type { Profile, Servico } from "@/types/database";
import type { TipoStory } from "./temas";

export type Marca = {
  nome: string;
  instagram: string | null;
  logoUrl: string | null;
  primaria: string;
  secundaria: string;
};

export function marcaDoPerfil(p: Profile): Marca {
  return {
    nome: p.nome_negocio || p.nome,
    instagram: p.instagram,
    logoUrl: p.logo_url,
    primaria: p.cor_primaria,
    secundaria: p.cor_secundaria,
  };
}

/** Duração usada para calcular "horário livre": o menor serviço ativo, ou 30 min. */
function duracaoBase(servicos: Servico[]) {
  const ativos = servicos.filter((s) => s.ativo);
  return ativos.length ? Math.min(...ativos.map((s) => s.duracao_min)) : 30;
}

type Ocupacao = { id: string; inicio: string; fim: string };

function ocupacoesDoDia(agendamentos: Awaited<ReturnType<typeof listarAgendamentosDias>>): Ocupacao[] {
  return agendamentos.filter((a) => a.status !== "cancelado").map((a) => ({ id: a.id, inicio: a.inicio, fim: a.fim }));
}

/** Horários livres de cada dia do intervalo, lendo a agenda uma vez só. */
async function livresPorDia(perfil: Profile, primeiro: DataISO, ultimo: DataISO): Promise<Map<DataISO, string[]>> {
  const [agendamentos, servicos] = await Promise.all([listarAgendamentosDias(primeiro, ultimo), listarServicos()]);
  const duracao = duracaoBase(servicos);
  const hoje = hojeISO();
  const ocupacoes = ocupacoesDoDia(agendamentos);

  const mapa = new Map<DataISO, string[]>();
  for (const dia of diasEntre(primeiro, ultimo)) {
    if (dia < hoje || janelaDoDia(dia, perfil.expediente) === null) {
      mapa.set(dia, []);
      continue;
    }
    // folga de fuso: o cálculo fino (minutos do dia em SP) é feito dentro de horariosDisponiveis
    const d0 = new Date(`${dia}T00:00:00-03:00`).getTime();
    const doDia = ocupacoes.filter((o) => {
      const ini = new Date(o.inicio).getTime();
      const fim = new Date(o.fim).getTime();
      return fim > d0 - 3 * 3_600_000 && ini < d0 + 27 * 3_600_000;
    });
    mapa.set(
      dia,
      horariosDisponiveis({
        dia,
        expediente: perfil.expediente,
        intervaloMin: perfil.intervalo_grade_min,
        duracaoMin: duracao,
        ocupacoes: doDia,
        aPartirDeMin: dia === hoje ? minutosDoDia(new Date()) : undefined,
      }),
    );
  }
  return mapa;
}

// ---------------------------------------------------------------------------
// Dia
// ---------------------------------------------------------------------------

export type DadosDia = {
  dia: DataISO;
  rotuloDia: string; // "Sexta-feira, 14 de novembro"
  atende: boolean;
  horarios: string[];
};

function rotuloDoDia(dia: DataISO) {
  return formatarDataISO(dia, "EEEE, dd 'de' MMMM");
}

/** Automático: horários livres segundo a agenda. */
export async function dadosDia(perfil: Profile, dia: DataISO): Promise<DadosDia> {
  const atende = janelaDoDia(dia, perfil.expediente) !== null;
  const livres = atende ? ((await livresPorDia(perfil, dia, dia)).get(dia) ?? []) : [];
  return { dia, rotuloDia: rotuloDoDia(dia), atende, horarios: livres };
}

/** Manual: a profissional marcou os horários que quer divulgar. */
export function dadosDiaManual(dia: DataISO, horarios: string[]): DadosDia {
  const unicos = [...new Set(horarios)].sort();
  return { dia, rotuloDia: rotuloDoDia(dia), atende: true, horarios: unicos };
}

// ---------------------------------------------------------------------------
// Semana
// ---------------------------------------------------------------------------

export type DiaSemanaStory = { dia: DataISO; semana: string; numero: string; disponivel: boolean };
export type DadosSemana = { inicio: DataISO; fim: DataISO; dias: DiaSemanaStory[] };

function resumoDoDia(dia: DataISO, disponivel: boolean): DiaSemanaStory {
  return {
    dia,
    semana: formatarDataISO(dia, "EEE").replace(".", ""),
    numero: formatarDataISO(dia, "dd/MM"),
    disponivel,
  };
}

/** Automático: dia disponível = atende e ainda tem horário livre. */
export async function dadosSemana(perfil: Profile, inicio: DataISO): Promise<DadosSemana> {
  const fim = somarDias(inicio, 6);
  const livres = await livresPorDia(perfil, inicio, fim);
  return { inicio, fim, dias: diasEntre(inicio, fim).map((d) => resumoDoDia(d, (livres.get(d)?.length ?? 0) > 0)) };
}

/** Manual: dias marcados = disponíveis; os outros aparecem como fechados. */
export function dadosSemanaManual(inicio: DataISO, diasMarcados: DataISO[]): DadosSemana {
  const fim = somarDias(inicio, 6);
  const marcados = new Set(diasMarcados);
  return { inicio, fim, dias: diasEntre(inicio, fim).map((d) => resumoDoDia(d, marcados.has(d))) };
}

// ---------------------------------------------------------------------------
// Mês
// ---------------------------------------------------------------------------

export type DadosMes = {
  mes: DataISO;
  rotuloMes: string; // "Novembro de 2026"
  /** 42 células começando na segunda: null = fora do mês */
  celulas: ({ numero: number; disponivel: boolean; passado: boolean } | null)[];
};

function montarMes(qualquerDia: DataISO, disponivel: (dia: DataISO) => boolean): DadosMes {
  const { inicio, fim, primeiro, ultimo } = intervaloDoMes(qualquerDia);
  const hoje = hojeISO();
  const celulas = diasEntre(inicio, fim).map((dia) => {
    if (dia < primeiro || dia > ultimo) return null;
    const passado = dia < hoje;
    return { numero: Number(dia.slice(8, 10)), disponivel: !passado && disponivel(dia), passado };
  });
  return { mes: primeiro, rotuloMes: formatarDataISO(primeiro, "MMMM 'de' yyyy"), celulas };
}

/** Automático: dia com vaga = atende e tem horário livre. */
export async function dadosMes(perfil: Profile, qualquerDia: DataISO): Promise<DadosMes> {
  const { primeiro, ultimo } = intervaloDoMes(qualquerDia);
  const livres = await livresPorDia(perfil, primeiro, ultimo);
  return montarMes(qualquerDia, (d) => (livres.get(d)?.length ?? 0) > 0);
}

/** Manual: dias marcados pela profissional. */
export function dadosMesManual(qualquerDia: DataISO, diasMarcados: DataISO[]): DadosMes {
  const marcados = new Set(diasMarcados);
  return montarMes(qualquerDia, (d) => marcados.has(d));
}

// ---------------------------------------------------------------------------
// Serviços e valores
// ---------------------------------------------------------------------------

export type DadosServicos = {
  itens: { nome: string; valor: string }[];
  /** Foto do serviço (data URL), só faz sentido com um item. */
  foto: string | null;
};

/** Sem `ids`: todos os serviços ativos. Com `ids`: só os escolhidos, na ordem da lista. */
export async function dadosServicos(ids?: string[], foto?: string | null): Promise<DadosServicos> {
  const servicos = await listarServicos({ somenteAtivos: true });
  const escolhidos = ids ? servicos.filter((s) => ids.includes(s.id)) : servicos;
  return {
    itens: escolhidos.map((s) => ({ nome: s.nome, valor: s.valor > 0 ? formatarMoeda(s.valor) : "consulte" })),
    foto: escolhidos.length === 1 && foto ? foto : null,
  };
}

// ---------------------------------------------------------------------------
// Sugestão inicial para a tela (o que a agenda indica como livre)
// ---------------------------------------------------------------------------

export type SugestaoStory = { horarios?: string[]; dias?: DataISO[] };

export async function sugestaoStory(perfil: Profile, tipo: TipoStory, data: DataISO): Promise<SugestaoStory> {
  if (tipo === "dia") return { horarios: (await dadosDia(perfil, data)).horarios };
  if (tipo === "semana") {
    const livres = await livresPorDia(perfil, data, somarDias(data, 6));
    return { dias: [...livres.entries()].filter(([, h]) => h.length > 0).map(([d]) => d) };
  }
  if (tipo === "mes") {
    const { primeiro, ultimo } = intervaloDoMes(data);
    const livres = await livresPorDia(perfil, primeiro, ultimo);
    return { dias: [...livres.entries()].filter(([, h]) => h.length > 0).map(([d]) => d) };
  }
  return {};
}
