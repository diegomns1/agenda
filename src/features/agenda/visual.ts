import { BanIcon, CheckIcon, FlagIcon, HourglassIcon, LockIcon, UserXIcon, type LucideIcon } from "lucide-react";
import type { Agendamento, StatusAgendamento } from "@/types/database";

/**
 * Cores e ícones de cada situação da agenda, num lugar só.
 * Mês, semana, dia, detalhe e histórico usam esta tabela: a mesma cor significa a mesma coisa em todo o painel.
 *
 * - agendado: cor do tema, cheia (é o que importa na agenda)
 * - aguardando confirmação (pedido pelo link): âmbar tracejado
 * - concluído: verde-esmeralda clarinho, com ✓
 * - faltou: rosa-avermelhado, com ícone de pessoa riscada
 * - cancelado: cinza tracejado e riscado
 * - bloqueio: cinza listrado, com cadeado
 * - feriado / data comemorativa: azul-céu (cheio = feriado, contorno = data do comércio)
 */
export type VisualStatus = {
  rotulo: string;
  Icone: LucideIcon | null;
  /** Pílula pequena da visão do mês. */
  chip: string;
  /** Cartão da grade (semana e dia) e da lista da semana no celular. */
  cartao: string;
  /** Etiqueta do detalhe, do histórico e da legenda. */
  etiqueta: string;
};

const LISTRAS = "bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(0,0,0,0.05)_6px,rgba(0,0,0,0.05)_12px)]";

export const VISUAL_STATUS: Record<StatusAgendamento, VisualStatus> = {
  agendado: {
    rotulo: "Agendado",
    Icone: null,
    chip: "bg-primary text-primary-foreground",
    cartao: "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20",
    etiqueta: "border-primary/30 bg-primary/12 text-primary",
  },
  pendente: {
    rotulo: "Aguardando confirmação",
    Icone: HourglassIcon,
    chip: "border border-dashed border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
    cartao: "border-dashed border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
    etiqueta: "border-dashed border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  },
  concluido: {
    rotulo: "Concluído",
    Icone: CheckIcon,
    chip: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
    cartao: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
    etiqueta: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  },
  faltou: {
    rotulo: "Faltou",
    Icone: UserXIcon,
    chip: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100",
    cartao: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100",
    etiqueta: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100",
  },
  cancelado: {
    rotulo: "Cancelado",
    Icone: BanIcon,
    chip: "bg-muted text-muted-foreground line-through",
    cartao: "border-dashed border-border bg-muted/60 text-muted-foreground line-through",
    etiqueta: "border-dashed border-border bg-muted text-muted-foreground",
  },
};

export const VISUAL_BLOQUEIO: VisualStatus = {
  rotulo: "Bloqueio",
  Icone: LockIcon,
  chip: `bg-muted text-muted-foreground ${LISTRAS}`,
  cartao: `border-border bg-muted text-muted-foreground ${LISTRAS}`,
  etiqueta: `border-border bg-muted text-muted-foreground ${LISTRAS}`,
};

/** Feriado nacional (cheio) e data comemorativa do comércio (só contorno). */
export const VISUAL_DATA = {
  feriado: {
    rotulo: "Feriado",
    Icone: FlagIcon,
    chip: "bg-sky-700 text-white dark:bg-sky-800",
    etiqueta: "border-sky-700 bg-sky-700 text-white dark:bg-sky-800",
  },
  comemorativa: {
    rotulo: "Data comemorativa",
    Icone: FlagIcon,
    chip: "border border-sky-700/60 bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
    etiqueta: "border-sky-700/60 bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
  },
} as const;

export function visualDe(a: Pick<Agendamento, "tipo" | "status">): VisualStatus {
  return a.tipo === "bloqueio" ? VISUAL_BLOQUEIO : VISUAL_STATUS[a.status];
}

/** Texto para leitor de tela: "Carla, 15:00 às 15:45, concluído". */
export function rotuloAcessivel(a: Pick<Agendamento, "tipo" | "status" | "titulo" | "cliente_nome">, inicio: string, fim: string) {
  const nome = a.tipo === "bloqueio" ? `Bloqueio: ${a.titulo ?? ""}` : (a.cliente_nome ?? "Atendimento");
  const situacao = a.tipo === "bloqueio" ? "" : `, ${VISUAL_STATUS[a.status].rotulo.toLowerCase()}`;
  return `${nome}, ${inicio} às ${fim}${situacao}`;
}
