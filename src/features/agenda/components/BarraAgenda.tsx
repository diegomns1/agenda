"use client";

import Link from "next/link";
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

export function rotuloDoPeriodo(visao: Visao, data: DataISO) {
  if (visao === "dia") return formatarDataISO(data, "EEEE, dd 'de' MMMM");
  if (visao === "semana") {
    const ini = inicioDaSemana(data);
    const fim = somarDias(ini, 6);
    return `${formatarDataISO(ini, "dd/MM")} a ${formatarDataISO(fim, "dd/MM")}`;
  }
  return formatarDataISO(data, "MMMM 'de' yyyy");
}

export function BarraAgenda({ visao, data, aoMarcar, aoBloquear }: Props) {
  const hoje = hojeISO();
  const anterior = visao === "dia" ? somarDias(data, -1) : visao === "semana" ? somarDias(data, -7) : somarMeses(data, -1);
  const proximo = visao === "dia" ? somarDias(data, 1) : visao === "semana" ? somarDias(data, 7) : somarMeses(data, 1);
  const href = (v: Visao, d: DataISO) => `/agenda?visao=${v}&data=${d}`;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="grid grid-cols-3 rounded-lg bg-muted p-1 text-sm font-medium">
          {(["dia", "semana", "mes"] as const).map((v) => (
            <Link
              key={v}
              href={href(v, data)}
              className={cn(
                "rounded-md px-3 py-1.5 text-center capitalize transition-colors",
                visao === v ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "mes" ? "Mês" : v}
            </Link>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={aoBloquear} aria-label="Bloquear horário">
            <LockIcon />
            <span className="hidden sm:inline">Bloquear</span>
          </Button>
          <Button size="sm" onClick={aoMarcar}>
            <CalendarPlusIcon />
            Marcar
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon-sm" aria-label="Anterior">
            <Link href={href(visao, anterior)}>
              <ChevronLeftIcon />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon-sm" aria-label="Próximo">
            <Link href={href(visao, proximo)}>
              <ChevronRightIcon />
            </Link>
          </Button>
          <Button asChild variant={data === hoje ? "secondary" : "ghost"} size="sm">
            <Link href={href(visao, hoje)}>Hoje</Link>
          </Button>
        </div>
        <h2 className="truncate text-right text-sm font-semibold first-letter:uppercase sm:text-base">{rotuloDoPeriodo(visao, data)}</h2>
      </div>
    </div>
  );
}
