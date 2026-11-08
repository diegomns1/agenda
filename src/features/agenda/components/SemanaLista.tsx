"use client";

import Link from "next/link";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { formatarDataISO, minutosDoDia, minutosParaHora, type DataISO } from "@/lib/datas";
import { datasDoDia } from "@/lib/feriados";
import { cn } from "@/lib/utils";
import type { Agendamento, Expediente } from "@/types/database";
import { janelaDoDia } from "@/features/agenda/disponibilidade";
import { VISUAL_DATA } from "@/features/agenda/visual";
import { CartaoAgendamento } from "./CartaoAgendamento";
import type { Coluna } from "./GradeHoraria";

type Props = {
  colunas: Coluna[];
  expediente: Expediente;
  intervaloMin: number;
  hoje: DataISO;
  agoraMin: number | null;
  aoSelecionar: (a: Agendamento) => void;
  aoMarcar: (dia: DataISO, hora?: string) => void;
};

type Linha = { tipo: "agendamento"; a: Agendamento; ini: number } | { tipo: "livre"; ini: number; fim: number };

function diaEmSP(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

/** Minutos do dia de um instante, limitado ao dia `d` (ocupações que atravessam a meia-noite). */
function minutosNoDia(iso: string, d: DataISO, ehFim = false) {
  const dia = diaEmSP(ehFim ? new Date(new Date(iso).getTime() - 1).toISOString() : iso);
  if (dia < d) return 0;
  if (dia > d) return 24 * 60;
  const m = minutosDoDia(iso);
  return ehFim && m === 0 ? 24 * 60 : m;
}

/** Atendimentos e janelas livres do dia, em ordem. Livre só aparece dentro do expediente e daqui para a frente. */
function linhasDoDia(c: Coluna, expediente: Expediente, intervaloMin: number, hoje: DataISO, agoraMin: number | null): Linha[] {
  const ativos = c.agendamentos.filter((a) => a.status !== "cancelado");
  const linhas: Linha[] = c.agendamentos.map((a) => ({ tipo: "agendamento", a, ini: minutosNoDia(a.inicio, c.dia) }));

  const janela = janelaDoDia(c.dia, expediente);
  if (janela && c.dia >= hoje) {
    const passo = Math.max(15, intervaloMin);
    let cursor = janela.inicio;
    if (c.dia === hoje && agoraMin !== null) cursor = Math.max(cursor, Math.ceil(agoraMin / passo) * passo);
    const ocupados = ativos
      .map((a) => ({ ini: minutosNoDia(a.inicio, c.dia), fim: minutosNoDia(a.fim, c.dia, true) }))
      .sort((x, y) => x.ini - y.ini);
    for (const o of ocupados) {
      if (o.ini - cursor >= passo && o.ini > cursor) linhas.push({ tipo: "livre", ini: cursor, fim: Math.min(o.ini, janela.fim) });
      cursor = Math.max(cursor, o.fim);
    }
    if (janela.fim - cursor >= passo) linhas.push({ tipo: "livre", ini: cursor, fim: janela.fim });
  }
  return linhas.sort((x, y) => x.ini - y.ini || (x.tipo === "livre" ? 1 : -1));
}

/**
 * Semana no celular: um dia embaixo do outro, só rolando para baixo.
 * Cada dia mostra os atendimentos e os horários livres ("Livre 14:00–16:00 · + Marcar").
 */
export function SemanaLista({ colunas, expediente, intervaloMin, hoje, agoraMin, aoSelecionar, aoMarcar }: Props) {
  return (
    <ol className="grid gap-3" aria-label="Agenda da semana, dia a dia">
      {colunas.map((c) => {
        const ehHoje = c.dia === hoje;
        const passou = c.dia < hoje;
        const datas = datasDoDia(c.dia);
        const linhas = linhasDoDia(c, expediente, intervaloMin, hoje, agoraMin);
        const qtd = c.agendamentos.filter((a) => a.tipo === "atendimento" && a.status !== "cancelado").length;
        return (
          <li key={c.dia} className={cn("overflow-hidden rounded-xl border bg-card", ehHoje && "ring-1 ring-primary/40", passou && "opacity-75")}>
            <Link
              href={`/agenda?visao=dia&data=${c.dia}`}
              className="flex min-h-12 items-center gap-2 border-b px-3 py-2 transition-colors hover:bg-muted/50"
              aria-label={`Abrir ${formatarDataISO(c.dia, "EEEE, d 'de' MMMM")}`}
            >
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold first-letter:uppercase">{formatarDataISO(c.dia, "EEEE, d MMM")}</span>
                {ehHoje ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">hoje</span> : null}
                {datas.map((e) => (
                  <span
                    key={e.nome}
                    className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", e.feriado ? VISUAL_DATA.feriado.etiqueta : VISUAL_DATA.comemorativa.etiqueta)}
                  >
                    {e.nome}
                  </span>
                ))}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {qtd === 0 ? "" : qtd === 1 ? "1 atendimento" : `${qtd} atendimentos`}
              </span>
              <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </Link>

            {!c.atende && linhas.length === 0 ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <p className="text-sm text-muted-foreground">Você não atende neste dia.</p>
                {!passou ? (
                  <button
                    type="button"
                    onClick={() => aoMarcar(c.dia)}
                    className="min-h-11 rounded-lg px-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Marcar encaixe
                  </button>
                ) : null}
              </div>
            ) : linhas.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">{passou ? "Nada marcado." : "Sem horário livre."}</p>
            ) : (
              <ul className="grid gap-1.5 p-2">
                {linhas.map((l) =>
                  l.tipo === "agendamento" ? (
                    <li key={l.a.id}>
                      <CartaoAgendamento agendamento={l.a} onClick={() => aoSelecionar(l.a)} />
                    </li>
                  ) : (
                    <li key={`livre-${l.ini}`}>
                      <button
                        type="button"
                        onClick={() => aoMarcar(c.dia, minutosParaHora(l.ini))}
                        className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-dashed border-primary/30 px-3 text-left text-sm transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        aria-label={`Livre das ${minutosParaHora(l.ini)} às ${minutosParaHora(l.fim)}. Marcar às ${minutosParaHora(l.ini)}`}
                      >
                        <span className="flex-1 text-muted-foreground">
                          Livre <span className="font-medium text-foreground tabular-nums">{minutosParaHora(l.ini)}–{minutosParaHora(l.fim)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-primary">
                          <PlusIcon aria-hidden className="size-4" />
                          Marcar
                        </span>
                      </button>
                    </li>
                  ),
                )}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
