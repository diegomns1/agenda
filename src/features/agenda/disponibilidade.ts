import { diaDaSemana, horaParaMinutos, minutosDoDia, minutosParaHora, type DataISO } from "@/lib/datas";
import type { Expediente } from "@/types/database";

export type Ocupacao = { inicio: string | Date; fim: string | Date; id?: string };

export type ParametrosDisponibilidade = {
  dia: DataISO;
  expediente: Expediente;
  intervaloMin: number;
  duracaoMin: number;
  ocupacoes: Ocupacao[];
  /** Agendamento sendo remarcado: não conta como ocupado. */
  ignorarId?: string;
  /** Minutos desde a meia-noite a partir dos quais pode marcar (ex.: agora, se for hoje). */
  aPartirDeMin?: number;
};

/** Janela de expediente do dia em minutos [inicio, fim), ou null se não atende. */
export function janelaDoDia(dia: DataISO, expediente: Expediente) {
  const cfg = expediente[String(diaDaSemana(dia)) as keyof Expediente];
  if (!cfg?.ativo) return null;
  const inicio = horaParaMinutos(cfg.inicio);
  const fim = horaParaMinutos(cfg.fim);
  return fim > inicio ? { inicio, fim } : null;
}

/**
 * Horários de início disponíveis ("HH:mm") para um serviço de `duracaoMin`,
 * respeitando expediente, passo da grade e ocupações do dia.
 */
export function horariosDisponiveis(p: ParametrosDisponibilidade): string[] {
  const janela = janelaDoDia(p.dia, p.expediente);
  if (!janela) return [];

  const ocupados = p.ocupacoes
    .filter((o) => !p.ignorarId || o.id !== p.ignorarId)
    .map((o) => ({ ini: minutosDoDiaSeguro(o.inicio, p.dia), fim: minutosDoDiaSeguro(o.fim, p.dia, true) }));

  const resultado: string[] = [];
  const passo = Math.max(5, p.intervaloMin);
  for (let t = janela.inicio; t + p.duracaoMin <= janela.fim; t += passo) {
    if (p.aPartirDeMin !== undefined && t < p.aPartirDeMin) continue;
    const fimSlot = t + p.duracaoMin;
    const conflita = ocupados.some((o) => t < o.fim && fimSlot > o.ini);
    if (!conflita) resultado.push(minutosParaHora(t));
  }
  return resultado;
}

/**
 * Minutos do dia para um instante, tratando ocupações que começam antes
 * ou terminam depois do dia (bloqueios de vários dias).
 */
function minutosDoDiaSeguro(valor: string | Date, dia: DataISO, ehFim = false): number {
  const data = typeof valor === "string" ? new Date(valor) : valor;
  const diaDoValor = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(data); // AAAA-MM-DD
  if (diaDoValor < dia) return ehFim ? 0 : -1;
  if (diaDoValor > dia) return ehFim ? 24 * 60 + 1 : 24 * 60;
  const min = minutosDoDia(data);
  // "fim" exatamente à meia-noite do dia seguinte aparece como 00:00 do dia seguinte → já tratado acima
  return min;
}

/** Blocos livres [inicio, fim) em minutos dentro do expediente, para os stories e a visão do dia. */
export function blocosLivres(dia: DataISO, expediente: Expediente, ocupacoes: Ocupacao[]) {
  const janela = janelaDoDia(dia, expediente);
  if (!janela) return [];
  const ocupados = ocupacoes
    .map((o) => ({ ini: minutosDoDiaSeguro(o.inicio, dia), fim: minutosDoDiaSeguro(o.fim, dia, true) }))
    .filter((o) => o.fim > janela.inicio && o.ini < janela.fim)
    .sort((a, b) => a.ini - b.ini);

  const livres: { inicio: number; fim: number }[] = [];
  let cursor = janela.inicio;
  for (const o of ocupados) {
    if (o.ini > cursor) livres.push({ inicio: cursor, fim: Math.min(o.ini, janela.fim) });
    cursor = Math.max(cursor, o.fim);
  }
  if (cursor < janela.fim) livres.push({ inicio: cursor, fim: janela.fim });
  return livres;
}
