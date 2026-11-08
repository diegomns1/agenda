"use client";

import { LinkAgenda } from "@/features/agenda/movimento";
import { CalendarPlusIcon, ChevronLeftIcon, ChevronRightIcon, LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarDataISO, hojeISO, inicioDaSemana, somarDias, somarMeses, type DataISO } from "@/lib/datas";
import { cn } from "@/lib/utils";

export type Visao = "dia" | "semana" | "mes";

type Props = {
  visao: Visao;
  data: DataISO;
  aoMarcar: () => void;
  aoBloquear: () => void;
};

const ROTULO_VISAO: Record<Visao, string> = { mes: "Mês", semana: "Semana", dia: "Dia" };

export function rotuloDoPeriodo(visao: Visao, data: DataISO) {
  if (visao === "dia") return formatarDataISO(data, "EEEE, dd 'de' MMMM");
  if (visao === "semana") {
    const ini = inicioDaSemana(data);
    const fim = somarDias(ini, 6);
    return `${formatarDataISO(ini, "dd/MM")} a ${formatarDataISO(fim, "dd/MM")}`;
  }
  return formatarDataISO(data, "MMMM 'de' yyyy");
}

/** Controles da agenda. No celular tudo tem 44 px de altura (alcance do polegar); no computador, mais compacto. */
export function BarraAgenda({ visao, data, aoMarcar, aoBloquear }: Props) {
  const hoje = hojeISO();
  const anterior = visao === "dia" ? somarDias(data, -1) : visao === "semana" ? somarDias(data, -7) : somarMeses(data, -1);
  const proximo = visao === "dia" ? somarDias(data, 1) : visao === "semana" ? somarDias(data, 7) : somarMeses(data, 1);
  const href = (v: Visao, d: DataISO) => `/agenda?visao=${v}&data=${d}`;
  const nomePeriodo = visao === "dia" ? "dia" : visao === "semana" ? "semana" : "mês";

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <nav aria-label="Como ver a agenda" className="flex rounded-xl bg-muted p-1 text-sm font-medium">
          {(["mes", "semana", "dia"] as const).map((v) => (
            <LinkAgenda
              key={v}
              href={href(v, data)}
              aria-current={visao === v ? "page" : undefined}
              className={cn(
                "flex min-h-toque items-center justify-center rounded-lg px-3 transition-colors sm:min-h-8",
                visao === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {ROTULO_VISAO[v]}
            </LinkAgenda>
          ))}
        </nav>
        <div className="flex gap-2">
          <Button variant="outline" onClick={aoBloquear} className="h-toque sm:h-8">
            <LockIcon />
            Bloquear
          </Button>
          {/* No celular, "Marcar" é o botão flutuante embaixo (alcance do polegar) */}
          <Button onClick={aoMarcar} className="hidden sm:inline-flex">
            <CalendarPlusIcon />
            Marcar
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" className="size-toque sm:size-8">
            <LinkAgenda href={href(visao, anterior)} aria-label={`${nomePeriodo === "semana" ? "Semana" : nomePeriodo === "mês" ? "Mês" : "Dia"} anterior`}>
              <ChevronLeftIcon />
            </LinkAgenda>
          </Button>
          <Button asChild variant="ghost" size="icon" className="size-toque sm:size-8">
            <LinkAgenda href={href(visao, proximo)} aria-label={`Próxim${nomePeriodo === "semana" ? "a semana" : nomePeriodo === "mês" ? "o mês" : "o dia"}`}>
              <ChevronRightIcon />
            </LinkAgenda>
          </Button>
          <Button asChild variant={data === hoje ? "secondary" : "ghost"} className="h-toque sm:h-8">
            <LinkAgenda href={href(visao, hoje)}>Hoje</LinkAgenda>
          </Button>
        </div>
        <h2 className="truncate text-right text-sm font-semibold first-letter:uppercase sm:text-base">{rotuloDoPeriodo(visao, data)}</h2>
      </div>
    </div>
  );
}
