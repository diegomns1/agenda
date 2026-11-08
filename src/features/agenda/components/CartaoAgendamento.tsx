"use client";

import { horaDe } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { primeiroNome } from "@/lib/texto";
import { rotuloAcessivel, visualDe } from "@/features/agenda/visual";
import type { Agendamento } from "@/types/database";

type Props = {
  agendamento: Agendamento;
  compacto?: boolean; // visão semana
  style?: React.CSSProperties;
  onClick?: () => void;
};

/** Cor e ícone da situação vêm de `visual.ts` (as mesmas do mês, do detalhe e do histórico). */
export function classesDoStatus(a: Agendamento) {
  return visualDe(a).cartao;
}

export function CartaoAgendamento({ agendamento: a, compacto, style, onClick }: Props) {
  const visual = visualDe(a);
  const titulo = a.tipo === "bloqueio" ? a.titulo : compacto ? primeiroNome(a.cliente_nome ?? "") : a.cliente_nome;
  const Icone = visual.Icone;
  const inicio = horaDe(a.inicio);
  const fim = horaDe(a.fim);

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      aria-label={rotuloAcessivel(a, inicio, fim)}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-lg border text-left transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        compacto ? "px-1.5 py-1 text-mini leading-tight" : "px-3 py-2 text-sm",
        visual.cartao,
      )}
    >
      <span className={cn("flex items-center gap-1 font-semibold", compacto ? "truncate" : "")}>
        {Icone ? <Icone aria-hidden className={cn("shrink-0", compacto ? "size-3" : "size-3.5")} /> : null}
        <span className="truncate">{titulo}</span>
      </span>
      <span className={cn("truncate tabular-nums opacity-85", compacto ? "" : "text-xs")}>
        {inicio}–{fim}
        {!compacto && a.servico_nome ? ` · ${a.servico_nome}` : ""}
      </span>
    </button>
  );
}
