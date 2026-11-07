"use client";

import { BanIcon, HourglassIcon, LockIcon } from "lucide-react";
import { horaDe } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { primeiroNome } from "@/lib/texto";
import type { Agendamento } from "@/types/database";

type Props = {
  agendamento: Agendamento;
  compacto?: boolean; // visão semana
  style?: React.CSSProperties;
  onClick?: () => void;
};

export function classesDoStatus(a: Agendamento) {
  if (a.tipo === "bloqueio") return "bg-muted text-muted-foreground border-border bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(0,0,0,0.04)_6px,rgba(0,0,0,0.04)_12px)]";
  switch (a.status) {
    case "pendente":
      return "bg-amber-50 text-amber-900 border-amber-400 border-dashed dark:bg-amber-950 dark:text-amber-100";
    case "concluido":
      return "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-900";
    case "faltou":
      return "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-900";
    case "cancelado":
      return "bg-muted/60 text-muted-foreground border-dashed line-through";
    default:
      return "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20";
  }
}

export function CartaoAgendamento({ agendamento: a, compacto, style, onClick }: Props) {
  const titulo = a.tipo === "bloqueio" ? a.titulo : compacto ? primeiroNome(a.cliente_nome ?? "") : a.cliente_nome;
  const Icone = a.tipo === "bloqueio" ? LockIcon : a.status === "cancelado" ? BanIcon : a.status === "pendente" ? HourglassIcon : null;

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-lg border text-left transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
        compacto ? "px-1.5 py-1 text-[11px] leading-tight" : "px-3 py-2 text-sm",
        classesDoStatus(a),
      )}
    >
      <span className={cn("flex items-center gap-1 font-semibold", compacto ? "truncate" : "")}>
        {Icone ? <Icone className={cn("shrink-0", compacto ? "size-3" : "size-3.5")} /> : null}
        <span className="truncate">{titulo}</span>
      </span>
      <span className={cn("truncate opacity-80", compacto ? "" : "text-xs")}>
        {horaDe(a.inicio)}–{horaDe(a.fim)}
        {!compacto && a.servico_nome ? ` · ${a.servico_nome}` : ""}
      </span>
    </button>
  );
}
