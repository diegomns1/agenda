import { dataDe, formatarDataISO, hojeISO, horaDe, somarDias } from "@/lib/datas";
import { primeiroNome } from "@/lib/texto";
import { linkWhatsApp } from "@/lib/telefone";
import type { Agendamento } from "@/types/database";

/** "hoje", "amanhã (sexta)", "sexta-feira (14/11)" — texto natural para a mensagem. */
export function descreverDia(dia: string): string {
  const hoje = hojeISO();
  if (dia === hoje) return "hoje";
  const semana = formatarDataISO(dia, "EEEE").replace("-feira", "");
  if (dia === somarDias(hoje, 1)) return `amanhã (${semana})`;
  return `${formatarDataISO(dia, "EEEE")} (${formatarDataISO(dia, "dd/MM")})`;
}

/** Preenche {nome}, {dia}, {hora} e {servico} no modelo da profissional. */
export function montarMensagem(modelo: string, a: Pick<Agendamento, "inicio" | "cliente_nome" | "servico_nome">) {
  return modelo
    .replaceAll("{nome}", primeiroNome(a.cliente_nome ?? ""))
    .replaceAll("{dia}", descreverDia(dataDe(a.inicio)))
    .replaceAll("{hora}", horaDe(a.inicio))
    .replaceAll("{servico}", (a.servico_nome ?? "atendimento").toLowerCase());
}

/** Link wa.me pronto com a mensagem do lembrete. */
export function linkLembrete(telefone: string, modelo: string, a: Pick<Agendamento, "inicio" | "cliente_nome" | "servico_nome">) {
  return linkWhatsApp(telefone, montarMensagem(modelo, a));
}
