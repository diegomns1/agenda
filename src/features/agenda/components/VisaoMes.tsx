"use client";

import Link from "next/link";
import { diaDaSemana, diasEntre, hojeISO, horaDe, intervaloDoMes, type DataISO } from "@/lib/datas";
import { datasEspeciais } from "@/lib/feriados";
import { primeiroNome } from "@/lib/texto";
import { cn } from "@/lib/utils";
import type { Agendamento, Expediente } from "@/types/database";
import { janelaDoDia } from "@/features/agenda/disponibilidade";

const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
/** Quantos itens cabem em cada dia antes do "+N". */
const MAX_POR_DIA = 4;

type Props = {
  data: DataISO; // qualquer dia do mês
  agendamentos: Agendamento[];
  expediente: Expediente;
};

type Item = { id: string; texto: string; tipo: "atendimento" | "bloqueio" | "data"; status: Agendamento["status"]; inicio: string };

/** "08:00" → "8h"; "13:30" → "13h30" (como no Google Agenda). */
function horaCurta(iso: string) {
  const [h, m] = horaDe(iso).split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
}

function diaEmSP(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

/** Visão do mês no estilo do Google Agenda: cada dia lista "8h Thay", "11h Carol"... Tocar abre o dia. */
export function VisaoMes({ data, agendamentos, expediente }: Props) {
  const { inicio, fim, primeiro, ultimo } = intervaloDoMes(data);
  const dias = diasEntre(inicio, fim);
  const hoje = hojeISO();

  const porDia = new Map<DataISO, Item[]>();
  // feriados e datas comemorativas primeiro (verde, como no Google Agenda)
  const anos = [...new Set(dias.map((d) => Number(d.slice(0, 4))))];
  for (const e of anos.flatMap((a) => datasEspeciais(a))) {
    if (e.data < inicio || e.data > fim) continue;
    porDia.set(e.data, [...(porDia.get(e.data) ?? []), { id: `data-${e.data}-${e.nome}`, texto: e.nome, tipo: "data", status: "agendado", inicio: e.data }]);
  }
  for (const a of [...agendamentos].sort((x, y) => x.inicio.localeCompare(y.inicio))) {
    if (a.status === "cancelado") continue;
    const dIni = diaEmSP(new Date(a.inicio));
    const dFimExcl = diaEmSP(new Date(new Date(a.fim).getTime() - 1));
    for (const d of diasEntre(dIni, dFimExcl)) {
      // bloqueio de vários dias: nos dias do meio não tem hora
      const comHora = d === dIni && (a.tipo === "atendimento" || dIni === dFimExcl);
      const nome = a.tipo === "bloqueio" ? (a.titulo ?? "Bloqueado") : primeiroNome(a.cliente_nome ?? "");
      const lista = porDia.get(d) ?? [];
      lista.push({ id: `${a.id}-${d}`, texto: comHora ? `${horaCurta(a.inicio)} ${nome}` : nome, tipo: a.tipo, status: a.status, inicio: a.inicio });
      porDia.set(d, lista);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b text-center text-[11px] font-medium text-muted-foreground">
        {DIAS.map((d) => (
          <div key={d} className="py-2">
            {d}.
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((d, i) => {
          const foraDoMes = d < primeiro || d > ultimo;
          const itens = porDia.get(d) ?? [];
          const atende = janelaDoDia(d, expediente) !== null;
          const ehHoje = d === hoje;
          const dow = diaDaSemana(d);
          const visiveis = itens.length > MAX_POR_DIA ? itens.slice(0, MAX_POR_DIA - 1) : itens;
          const resto = itens.length - visiveis.length;
          return (
            <Link
              key={d}
              href={`/agenda?visao=dia&data=${d}`}
              aria-label={`${Number(d.slice(8, 10))}: ${itens.length} na agenda`}
              className={cn(
                "flex min-h-24 min-w-0 flex-col gap-0.5 border-b px-px pt-1 pb-1.5 transition-colors hover:bg-muted/60 sm:min-h-28 sm:px-1",
                i % 7 !== 0 && "border-l",
                foraDoMes && "opacity-45",
                !atende && !foraDoMes && "bg-muted/40",
                (dow === 0 || dow === 6) && atende && !foraDoMes && "bg-muted/15",
              )}
            >
              <span
                className={cn(
                  "mx-auto mb-0.5 inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                  ehHoje && "bg-primary text-primary-foreground",
                )}
              >
                {Number(d.slice(8, 10))}
              </span>
              {visiveis.map((it) => (
                <span
                  key={it.id}
                  className={cn(
                    // corta a sobra sem reticências (cabe mais letra, como no Google Agenda)
                    "block overflow-hidden rounded-[3px] px-[3px] py-px text-[10px] leading-tight font-semibold tracking-tight whitespace-nowrap sm:px-1 sm:text-[11px]",
                    it.tipo === "data"
                      ? "bg-emerald-600 text-white dark:bg-emerald-700"
                      : it.tipo === "bloqueio"
                        ? "bg-muted text-muted-foreground"
                      : it.status === "pendente"
                        ? "border border-dashed border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                        : it.status === "concluido"
                          ? "bg-primary/10 text-primary/80"
                          : "bg-primary text-primary-foreground",
                  )}
                >
                  {it.texto}
                </span>
              ))}
              {resto > 0 ? <span className="px-1 text-[10px] font-semibold text-muted-foreground">+{resto} mais</span> : null}
            </Link>
          );
        })}
      </div>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        Toque num dia para ver os horários. Verde = feriado ou data comemorativa. Cinza = bloqueio ou dia em que você não atende. Tracejado = pedido
        aguardando.
      </p>
    </div>
  );
}
