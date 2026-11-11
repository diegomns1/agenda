import { BadgeCheckIcon, BotIcon, HandIcon, Link2Icon, MoonIcon, UserRoundCheckIcon, UserRoundIcon, type LucideIcon } from "lucide-react";
import type { ContatoCentral } from "../central";
import { descreverNumero } from "../numero";

/* Peças da Central do WhatsApp usadas pelo kanban e pela conversa. */

export type Coluna = { id: string; titulo: string; Icone: LucideIcon; tom: string };

export const COLUNAS: Coluna[] = [
  { id: "precisa", titulo: "Precisa de você", Icone: HandIcon, tom: "bg-destructive" },
  { id: "humano", titulo: "Com você", Icone: UserRoundIcon, tom: "bg-primary" },
  { id: "robo", titulo: "Robô atendendo", Icone: BotIcon, tom: "bg-whatsapp" },
  { id: "link", titulo: "Recebeu o link", Icone: Link2Icon, tom: "bg-whatsapp" },
  { id: "cadastrou", titulo: "Cadastrou", Icone: UserRoundCheckIcon, tom: "bg-sucesso-forte" },
  { id: "assinou", titulo: "Assinou", Icone: BadgeCheckIcon, tom: "bg-sucesso-forte" },
  { id: "sem_resposta", titulo: "Sem resposta", Icone: MoonIcon, tom: "bg-muted-foreground" },
];

export const colunaDe = (c: ContatoCentral) => (c.atendimento !== "robo" ? c.atendimento : c.etapa);
export const nomeDe = (c: ContatoCentral) => c.nome || c.profissional?.nome || c.nome_whatsapp || descreverNumero(c.telefone);

/** "agora", "5 min", "3 h", "ontem", "12/11" */
export function quando(iso: string | null) {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  if (min < 24 * 60) return `${Math.round(min / 60)} h`;
  if (min < 48 * 60) return "ontem";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}

