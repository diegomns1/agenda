import "server-only";
import { listarAgendamentosDias } from "@/features/agenda/queries";
import { horariosDisponiveis, janelaDoDia } from "@/features/agenda/disponibilidade";
import { listarServicos } from "@/features/servicos/queries";
import { diasEntre, formatarDataISO, hojeISO, intervaloDoMes, minutosDoDia, somarDias, type DataISO } from "@/lib/datas";
import { formatarDuracao, formatarMoeda } from "@/lib/moeda";
import type { Profile, Servico } from "@/types/database";

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

function ocupacoesDoDia(agendamentos: Awaited<ReturnType<typeof listarAgendamentosDias>>) {
  return agendamentos.filter((a) => a.status !== "cancelado").map((a) => ({ id: a.id, inicio: a.inicio, fim: a.fim }));
}

// ---------------------------------------------------------------------------

export type DadosDia = {
  dia: DataISO;
  rotuloDia: string; // "Sexta-feira, 14 de novembro"
  atende: boolean;
  horarios: string[];
};

export async function dadosDia(perfil: Profile, dia: DataISO): Promise<DadosDia> {
  const [agendamentos, servicos] = await Promise.all([listarAgendamentosDias(dia), listarServicos()]);
  const atende = janelaDoDia(dia, perfil.expediente) !== null;
  const horarios = atende
    ? horariosDisponiveis({
        dia,
        expediente: perfil.expediente,
        intervaloMin: perfil.intervalo_grade_min,
        duracaoMin: duracaoBase(servicos),
        ocupacoes: ocupacoesDoDia(agendamentos),
        aPartirDeMin: dia === hojeISO() ? minutosDoDia(new Date()) : undefined,
      })
    : [];
  return { dia, rotuloDia: formatarDataISO(dia, "EEEE, dd 'de' MMMM"), atende, horarios };
}

// ---------------------------------------------------------------------------

export type DadosSemana = {
  inicio: DataISO;
  fim: DataISO;
  dias: { dia: DataISO; semana: string; numero: string; atende: boolean; horarios: string[] }[];
};

export async function dadosSemana(perfil: Profile, inicio: DataISO): Promise<DadosSemana> {
  const fim = somarDias(inicio, 6);
  const [agendamentos, servicos] = await Promise.all([listarAgendamentosDias(inicio, fim), listarServicos()]);
  const duracao = duracaoBase(servicos);
  const hoje = hojeISO();

  const dias = diasEntre(inicio, fim).map((dia) => {
    const atende = janelaDoDia(dia, perfil.expediente) !== null;
    const doDia = agendamentos.filter((a) => {
      const ini = new Date(a.inicio).getTime();
      const fimA = new Date(a.fim).getTime();
      const d0 = new Date(`${dia}T00:00:00-03:00`).getTime();
      return fimA > d0 - 3 * 3_600_000 && ini < d0 + 27 * 3_600_000; // folga de fuso; o cálculo fino é feito dentro
    });
    const horarios = atende
      ? horariosDisponiveis({
          dia,
          expediente: perfil.expediente,
          intervaloMin: perfil.intervalo_grade_min,
          duracaoMin: duracao,
          ocupacoes: ocupacoesDoDia(doDia),
          aPartirDeMin: dia === hoje ? minutosDoDia(new Date()) : undefined,
        })
      : [];
    return {
      dia,
      semana: formatarDataISO(dia, "EEE").replace(".", ""),
      numero: formatarDataISO(dia, "dd/MM"),
      atende,
      horarios,
    };
  });

  return { inicio, fim, dias };
}

// ---------------------------------------------------------------------------

export type DadosMes = {
  mes: DataISO;
  rotuloMes: string; // "Novembro"
  /** 42 células começando na segunda: null = fora do mês */
  celulas: ({ numero: number; disponivel: boolean; passado: boolean } | null)[];
};

export async function dadosMes(perfil: Profile, qualquerDia: DataISO): Promise<DadosMes> {
  const { inicio, fim, primeiro, ultimo } = intervaloDoMes(qualquerDia);
  const [agendamentos, servicos] = await Promise.all([listarAgendamentosDias(primeiro, ultimo), listarServicos()]);
  const duracao = duracaoBase(servicos);
  const hoje = hojeISO();

  const celulas = diasEntre(inicio, fim).map((dia) => {
    if (dia < primeiro || dia > ultimo) return null;
    const passado = dia < hoje;
    const atende = janelaDoDia(dia, perfil.expediente) !== null;
    let disponivel = false;
    if (atende && !passado) {
      const doDia = agendamentos.filter((a) => {
        const ini = new Date(a.inicio).getTime();
        const fimA = new Date(a.fim).getTime();
        const d0 = new Date(`${dia}T00:00:00-03:00`).getTime();
        return fimA > d0 - 3 * 3_600_000 && ini < d0 + 27 * 3_600_000;
      });
      disponivel =
        horariosDisponiveis({
          dia,
          expediente: perfil.expediente,
          intervaloMin: perfil.intervalo_grade_min,
          duracaoMin: duracao,
          ocupacoes: ocupacoesDoDia(doDia),
          aPartirDeMin: dia === hoje ? minutosDoDia(new Date()) : undefined,
        }).length > 0;
    }
    return { numero: Number(dia.slice(8, 10)), disponivel, passado };
  });

  return { mes: primeiro, rotuloMes: formatarDataISO(primeiro, "MMMM 'de' yyyy"), celulas };
}

// ---------------------------------------------------------------------------

export type DadosServicos = { itens: { nome: string; duracao: string; valor: string }[] };

export async function dadosServicos(): Promise<DadosServicos> {
  const servicos = await listarServicos({ somenteAtivos: true });
  return {
    itens: servicos.map((s) => ({
      nome: s.nome,
      duracao: formatarDuracao(s.duracao_min),
      valor: s.valor > 0 ? formatarMoeda(s.valor) : "consulte",
    })),
  };
}
