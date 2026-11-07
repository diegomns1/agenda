import { addDays, addMonths, differenceInCalendarDays, isValid, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { FUSO } from "@/lib/constantes";

/** Data "AAAA-MM-DD" (sem fuso, representa um dia civil em São Paulo). */
export type DataISO = string;

// ---------------------------------------------------------------------------
// Hoje / formatação
// ---------------------------------------------------------------------------

/** Hoje em São Paulo no formato AAAA-MM-DD. */
export function hojeISO(): DataISO {
  return formatInTimeZone(new Date(), FUSO, "yyyy-MM-dd");
}

/** Formata uma data/hora (ISO ou Date) no fuso de São Paulo. */
export function formatarData(valor: string | Date, formato = "dd/MM/yyyy") {
  const data = typeof valor === "string" ? new Date(valor) : valor;
  return formatInTimeZone(data, FUSO, formato, { locale: ptBR });
}

/** Formata uma data "AAAA-MM-DD" (sem hora) como dd/MM/aaaa, sem deslocar o dia. */
export function formatarDataISO(iso: DataISO, formato = "dd/MM/yyyy") {
  if (formato === "dd/MM/yyyy") {
    const [ano, mes, dia] = iso.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  return formatInTimeZone(inicioDoDia(iso), FUSO, formato, { locale: ptBR });
}

/** "14:30" a partir de um instante. */
export function horaDe(valor: string | Date) {
  return formatarData(valor, "HH:mm");
}

/** "AAAA-MM-DD" (em SP) a partir de um instante. */
export function dataDe(valor: string | Date): DataISO {
  return formatarData(valor, "yyyy-MM-dd");
}

/** true se ativa_ate existe e já passou (comparando datas em SP). */
export function contaVencida(ativaAte: string | null) {
  if (!ativaAte) return false;
  return ativaAte < hojeISO();
}

export function ehDataISO(valor: unknown): valor is DataISO {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor) && isValid(parseISO(valor));
}

// ---------------------------------------------------------------------------
// Conversões entre "dia civil em SP" e instantes
// ---------------------------------------------------------------------------

/** Instante de "AAAA-MM-DD HH:mm" em São Paulo. */
export function instanteEmSP(dia: DataISO, hora: string): Date {
  return fromZonedTime(`${dia}T${hora}:00`, FUSO);
}

export function inicioDoDia(dia: DataISO): Date {
  return instanteEmSP(dia, "00:00");
}

/** Início do dia seguinte (limite exclusivo). */
export function fimDoDia(dia: DataISO): Date {
  return inicioDoDia(somarDias(dia, 1));
}

/** Soma dias a uma data civil. */
export function somarDias(dia: DataISO, n: number): DataISO {
  return formatInTimeZone(addDays(toZonedTime(inicioDoDia(dia), FUSO), n), FUSO, "yyyy-MM-dd");
}

export function somarMeses(dia: DataISO, n: number): DataISO {
  const zonada = toZonedTime(inicioDoDia(dia), FUSO);
  return formatInTimeZone(addMonths(zonada, n), FUSO, "yyyy-MM-dd");
}

/** 0 = domingo ... 6 = sábado, no fuso de SP. */
export function diaDaSemana(dia: DataISO): number {
  return Number(formatInTimeZone(inicioDoDia(dia), FUSO, "i")) % 7;
}

/** Segunda-feira da semana que contém o dia. */
export function inicioDaSemana(dia: DataISO): DataISO {
  const dow = diaDaSemana(dia); // 0 = dom
  const recuo = dow === 0 ? 6 : dow - 1;
  return somarDias(dia, -recuo);
}

/** Primeiro dia do mês. */
export function inicioDoMes(dia: DataISO): DataISO {
  return `${dia.slice(0, 7)}-01`;
}

/** Intervalo exibido na visão de mês: grade de 6 semanas começando na segunda. */
export function intervaloDoMes(data: DataISO) {
  const primeiro = inicioDoMes(data);
  const inicio = inicioDaSemana(primeiro);
  const fim = somarDias(inicio, 41);
  return { inicio, fim, primeiro, ultimo: somarDias(inicioDoMes(somarMeses(primeiro, 1)), -1) };
}

/** Lista de dias "AAAA-MM-DD" de inicio (inclusive) a fim (inclusive). */
export function diasEntre(inicio: DataISO, fim: DataISO): DataISO[] {
  const n = differenceInCalendarDays(parseISO(fim), parseISO(inicio));
  return Array.from({ length: Math.max(0, n) + 1 }, (_, i) => somarDias(inicio, i));
}

/** Minutos desde a meia-noite (SP) de um instante. */
export function minutosDoDia(valor: string | Date): number {
  const [h, m] = formatarData(valor, "HH:mm").split(":").map(Number);
  return h * 60 + m;
}

/** "08:00" → 480 */
export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** 480 → "08:00" */
export function minutosParaHora(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Rótulo amigável: "hoje", "amanhã", "ontem" ou "sexta, 14/11". */
export function rotuloRelativo(dia: DataISO): string {
  const hoje = hojeISO();
  if (dia === hoje) return "hoje";
  if (dia === somarDias(hoje, 1)) return "amanhã";
  if (dia === somarDias(hoje, -1)) return "ontem";
  return formatarDataISO(dia, "EEEE, dd/MM");
}
