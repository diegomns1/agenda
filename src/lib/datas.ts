import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { FUSO } from "@/lib/constantes";

/** Hoje em São Paulo no formato AAAA-MM-DD. */
export function hojeISO() {
  return formatInTimeZone(new Date(), FUSO, "yyyy-MM-dd");
}

/** Formata uma data/hora (ISO ou Date) no fuso de São Paulo. */
export function formatarData(valor: string | Date, formato = "dd/MM/yyyy") {
  const data = typeof valor === "string" ? new Date(valor) : valor;
  return formatInTimeZone(data, FUSO, formato, { locale: ptBR });
}

/** Formata uma data "AAAA-MM-DD" (sem hora) como dd/MM/aaaa, sem deslocar o dia. */
export function formatarDataISO(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** true se ativa_ate existe e já passou (comparando datas em SP). */
export function contaVencida(ativaAte: string | null) {
  if (!ativaAte) return false;
  return ativaAte < hojeISO();
}
