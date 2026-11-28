import { BadgeCheckIcon, BotIcon, BotOffIcon, HandIcon, HourglassIcon, Link2Icon, MoonIcon, UserRoundCheckIcon, UserRoundIcon, type LucideIcon } from "lucide-react";
import { DIAS_APAGAR_TESTE_ACABOU, DIAS_SEM_RESPOSTA } from "../prazos";
import type { ContatoCentral } from "../central";
import { descreverNumero } from "../numero";

/* Peças da Central do WhatsApp usadas pelo kanban e pela conversa. */

/** `explica`: o que a coluna quer dizer (aparece embaixo do título). */
export type Coluna = { id: string; titulo: string; explica: string; Icone: LucideIcon; tom: string };

export const COLUNAS: Coluna[] = [
  { id: "precisa", titulo: "Precisa de você", explica: "A Serena chamou você", Icone: HandIcon, tom: "bg-destructive" },
  { id: "humano", titulo: "Com você", explica: "Você assumiu, a Serena fica quieta", Icone: UserRoundIcon, tom: "bg-primary" },
  { id: "robo", titulo: "Robô atendendo", explica: "Lead conversando com a Serena", Icone: BotIcon, tom: "bg-whatsapp" },
  { id: "link", titulo: "Recebeu o link do teste", explica: "A Serena já mandou o link de cadastro", Icone: Link2Icon, tom: "bg-whatsapp" },
  { id: "cadastrou", titulo: "Cadastrou", explica: "Criou a conta, está no teste", Icone: UserRoundCheckIcon, tom: "bg-sucesso-forte" },
  // não é guardada no banco: é o cartão de "Cadastrou" cuja conta está no teste e o teste já venceu (28/11/2026)
  {
    id: "teste_acabou",
    titulo: "Teste acabou",
    explica: `Não assinou. Quem nunca respondeu sai ${DIAS_APAGAR_TESTE_ACABOU} dias depois`,
    Icone: HourglassIcon,
    tom: "bg-aviso-forte",
  },
  { id: "assinou", titulo: "Assinou", explica: "Cliente pagante", Icone: BadgeCheckIcon, tom: "bg-sucesso-forte" },
  {
    id: "sem_resposta",
    titulo: "Sem resposta",
    explica: `Lead que não responde há ${DIAS_SEM_RESPOSTA === 1 ? "1 dia" : `${DIAS_SEM_RESPOSTA} dias`}`,
    Icone: MoonIcon,
    tom: "bg-muted-foreground",
  },
  { id: "spam", titulo: "Robôs e spam", explica: "A Serena não responde", Icone: BotOffIcon, tom: "bg-muted-foreground" },
];

/**
 * Em qual coluna o cartão aparece: spam primeiro, depois quem está atendendo, depois a etapa do funil
 * ("Cadastrou" com o teste vencido aparece em "Teste acabou").
 */
export function colunaDe(c: ContatoCentral) {
  if (c.etapa === "spam") return "spam";
  if (c.atendimento !== "robo") return c.atendimento;
  if (c.etapa === "cadastrou" && c.profissional?.testeAcabou) return "teste_acabou";
  return c.etapa;
}
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

