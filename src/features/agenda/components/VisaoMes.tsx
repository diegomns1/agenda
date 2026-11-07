"use client";

import Link from "next/link";
import { LockIcon } from "lucide-react";
import { diaDaSemana, diasEntre, hojeISO, intervaloDoMes, type DataISO } from "@/lib/datas";
import { cn } from "@/lib/utils";
import type { Agendamento, Expediente } from "@/types/database";
import { janelaDoDia } from "@/features/agenda/disponibilidade";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type Props = {
  data: DataISO; // qualquer dia do mês
  agendamentos: Agendamento[];
  expediente: Expediente;
};

export function VisaoMes({ data, agendamentos, expediente }: Props) {
  const { inicio, fim, primeiro, ultimo } = intervaloDoMes(data);
  const dias = diasEntre(inicio, fim);
  const hoje = hojeISO();

  const porDia = new Map<DataISO, { atendimentos: number; bloqueios: number; diaTodo: boolean }>();
  for (const a of agendamentos) {
    if (a.status === "cancelado") continue;
    const dIni = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(a.inicio));
    const dFimExcl = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(new Date(a.fim).getTime() - 1));
    for (const d of diasEntre(dIni, dFimExcl)) {
      const atual = porDia.get(d) ?? { atendimentos: 0, bloqueios: 0, diaTodo: false };
      if (a.tipo === "atendimento") atual.atendimentos += 1;
      else {
        atual.bloqueios += 1;
        if (dIni !== dFimExcl || (new Date(a.fim).getTime() - new Date(a.inicio).getTime()) >= 86_400_000) atual.diaTodo = true;
      }
      porDia.set(d, atual);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
        {DIAS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((d, i) => {
          const foraDoMes = d < primeiro || d > ultimo;
          const info = porDia.get(d);
          const atende = janelaDoDia(d, expediente) !== null;
          const indisponivel = !atende || info?.diaTodo;
          const ehHoje = d === hoje;
          const dow = diaDaSemana(d);
          return (
            <Link
              key={d}
              href={`/agenda?visao=dia&data=${d}`}
              className={cn(
                "flex min-h-16 flex-col gap-1 border-b p-1.5 text-sm transition-colors hover:bg-muted/60 sm:min-h-20",
                i % 7 !== 0 && "border-l",
                foraDoMes && "text-muted-foreground/50",
                indisponivel && !foraDoMes && "bg-muted/40",
                (dow === 0 || dow === 6) && !foraDoMes && "bg-muted/20",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  ehHoje && "bg-primary text-primary-foreground",
                )}
              >
                {Number(d.slice(8, 10))}
              </span>
              {info?.atendimentos ? (
                <span className="inline-flex w-fit items-center rounded-full bg-primary/15 px-1.5 text-[11px] font-semibold text-primary">
                  {info.atendimentos}
                </span>
              ) : null}
              {info?.bloqueios ? <LockIcon className="size-3 text-muted-foreground" /> : null}
            </Link>
          );
        })}
      </div>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        Número = atendimentos no dia · cadeado = bloqueio · fundo cinza = não atende. Toque num dia para abrir.
      </p>
    </div>
  );
}
