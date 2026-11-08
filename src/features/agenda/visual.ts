import { BanIcon, CheckIcon, FlagIcon, HourglassIcon, LockIcon, UserXIcon, type LucideIcon } from "lucide-react";
import type { Agendamento, StatusAgendamento } from "@/types/database";

/**
 * Cores e ícones de cada situação da agenda, num lugar só.
 * As cores vêm dos tokens semânticos de `globals.css` (bg-concluido, text-faltou-texto…), documentados em DESIGN.md.
 * Mês, semana, dia, detalhe e histórico usam esta tabela: a mesma cor significa a mesma coisa em todo o painel.
 *
 * - agendado: cor do tema, cheia (é o que importa na agenda)
 * - aguardando confirmação (pedido pelo link): âmbar tracejado
 * - concluído: verde clarinho, com ✓
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

const PENDENTE = "border-dashed border-pendente-borda bg-pendente text-pendente-texto";
const CONCLUIDO = "border-concluido-borda bg-concluido text-concluido-texto";
const FALTOU = "border-faltou-borda bg-faltou text-faltou-texto";

export const VISUAL_STATUS: Record<StatusAgendamento, VisualStatus> = {
  agendado: {
    rotulo: "Agendado",
    Icone: null,
    chip: "bg-primary text-primary-foreground",
    cartao: "border-primary bg-primary text-primary-foreground shadow-suave",
    etiqueta: "border-primary/30 bg-primary/12 text-primary",
  },
  pendente: { rotulo: "Aguardando confirmação", Icone: HourglassIcon, chip: `border ${PENDENTE}`, cartao: PENDENTE, etiqueta: PENDENTE },
  concluido: { rotulo: "Concluído", Icone: CheckIcon, chip: CONCLUIDO, cartao: CONCLUIDO, etiqueta: CONCLUIDO },
  faltou: { rotulo: "Faltou", Icone: UserXIcon, chip: FALTOU, cartao: FALTOU, etiqueta: FALTOU },
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
    chip: "bg-feriado text-feriado-texto",
    etiqueta: "border-feriado bg-feriado text-feriado-texto",
  },
  comemorativa: {
    rotulo: "Data comemorativa",
    Icone: FlagIcon,
    chip: "border border-comemorativa-borda/60 bg-comemorativa text-comemorativa-texto",
    etiqueta: "border-comemorativa-borda/60 bg-comemorativa text-comemorativa-texto",
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
