"use client";

import { LinkAgenda } from "@/features/agenda/movimento";
import { diaDaSemana, diasEntre, formatarDataISO, hojeISO, horaDe, intervaloDoMes, type DataISO } from "@/lib/datas";
import { datasEspeciais } from "@/lib/feriados";
import { primeiroNome } from "@/lib/texto";
import { cn } from "@/lib/utils";
import type { Agendamento, Expediente } from "@/types/database";
import { janelaDoDia } from "@/features/agenda/disponibilidade";
import { VISUAL_DATA, visualDe } from "@/features/agenda/visual";
import { LegendaAgenda } from "./LegendaAgenda";

const DIAS = ["seg.", "ter.", "qua.", "qui.", "sex.", "sáb.", "dom."];
/** Quantos itens cabem em cada dia antes do "+N". */
const MAX_POR_DIA = 4;

type Props = {
  data: DataISO; // qualquer dia do mês
  agendamentos: Agendamento[];
  expediente: Expediente;
};

type Item = { id: string; texto: string; completo: string; classes: string; agendamentoId?: string };

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
  const nomesDatas = new Map<DataISO, string[]>();
  // feriados e datas comemorativas primeiro (azul: cheio = feriado, contorno = data do comércio)
  const anos = [...new Set(dias.map((d) => Number(d.slice(0, 4))))];
  for (const e of anos.flatMap((a) => datasEspeciais(a))) {
    if (e.data < inicio || e.data > fim) continue;
    const v = e.feriado ? VISUAL_DATA.feriado : VISUAL_DATA.comemorativa;
    porDia.set(e.data, [...(porDia.get(e.data) ?? []), { id: `data-${e.data}-${e.nome}`, texto: e.nome, completo: `${v.rotulo}: ${e.nome}`, classes: v.chip }]);
    nomesDatas.set(e.data, [...(nomesDatas.get(e.data) ?? []), e.nome]);
  }
  for (const a of [...agendamentos].sort((x, y) => x.inicio.localeCompare(y.inicio))) {
    if (a.status === "cancelado") continue;
    const dIni = diaEmSP(new Date(a.inicio));
    const dFimExcl = diaEmSP(new Date(new Date(a.fim).getTime() - 1));
    const visual = visualDe(a);
    for (const d of diasEntre(dIni, dFimExcl)) {
      // bloqueio de vários dias: nos dias do meio não tem hora
      const comHora = d === dIni && (a.tipo === "atendimento" || dIni === dFimExcl);
      const nome = a.tipo === "bloqueio" ? (a.titulo ?? "Bloqueado") : primeiroNome(a.cliente_nome ?? "");
      const nomeCompleto = a.tipo === "bloqueio" ? (a.titulo ?? "Bloqueado") : (a.cliente_nome ?? "");
      const lista = porDia.get(d) ?? [];
      lista.push({
        id: `${a.id}-${d}`,
        texto: comHora ? `${horaCurta(a.inicio)} ${nome}` : nome,
        completo: `${comHora ? `${horaDe(a.inicio)} ` : ""}${nomeCompleto} (${visual.rotulo.toLowerCase()})`,
        classes: visual.chip,
        agendamentoId: d === dIni ? a.id : undefined,
      });
      porDia.set(d, lista);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div aria-hidden className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
        {DIAS.map((d) => (
          <div key={d} className="py-2">
            {d}
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
          const qtd = itens.length - (nomesDatas.get(d)?.length ?? 0);
          const rotulo = [
            formatarDataISO(d, "EEEE, d 'de' MMMM"),
            ehHoje ? "hoje" : null,
            nomesDatas.get(d)?.join(", ") ?? null,
            qtd === 0 ? "nada marcado" : qtd === 1 ? "1 na agenda" : `${qtd} na agenda`,
            !atende ? "você não atende" : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <LinkAgenda
              key={d}
              href={`/agenda?visao=dia&data=${d}`}
              aria-label={rotulo}
              aria-current={ehHoje ? "date" : undefined}
              className={cn(
                "flex min-h-24 min-w-0 flex-col gap-0.5 border-b px-px pt-1 pb-1.5 transition-colors hover:bg-muted/60 focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-28 sm:px-1",
                i % 7 !== 0 && "border-l",
                foraDoMes && "opacity-45",
                !atende && !foraDoMes && "bg-muted/40",
                (dow === 0 || dow === 6) && atende && !foraDoMes && "bg-muted/15",
              )}
            >
              <span
                className={cn(
                  "mx-auto mb-0.5 inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                  ehHoje && "bg-primary text-primary-foreground",
                )}
              >
                {Number(d.slice(8, 10))}
              </span>
              {visiveis.map((it) => (
                <span
                  key={it.id}
                  title={it.completo}
                  data-agendamento={it.agendamentoId}
                  className={cn(
                    // corta a sobra sem reticências (cabe mais letra, como no Google Agenda); o nome inteiro fica no title
                    "block overflow-hidden rounded-chip px-[3px] py-px text-mini leading-tight font-semibold tracking-tight whitespace-nowrap sm:px-1",
                    it.classes,
                  )}
                >
                  {it.texto}
                </span>
              ))}
              {resto > 0 ? <span className="px-1 text-mini font-semibold text-muted-foreground">+{resto} mais</span> : null}
            </LinkAgenda>
          );
        })}
      </div>
      <div className="grid gap-2 border-t px-3 py-2.5">
        <LegendaAgenda />
        <p className="text-xs text-muted-foreground">Toque num dia para ver os horários. Fundo cinza: dia em que você não atende.</p>
      </div>
    </div>
  );
}
