import { z } from "zod";
import { janelaDoDia } from "@/features/agenda/disponibilidade";
import { minutosParaHora, type DataISO } from "@/lib/datas";
import type { Expediente } from "@/types/database";

/* O que a profissional escolheu na tela de stories. Vai no corpo do POST /api/stories/[tipo].
   Tudo opcional: sem seleção, o servidor monta o story automaticamente a partir da agenda. */

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const hora = z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida");

export const esquemaSelecaoStory = z.object({
  tema: z.string().max(40).optional(),
  data: data.optional(),
  /** Story do dia: horários marcados como livres. */
  horarios: z.array(hora).max(80).optional(),
  /** Semana/mês: dias marcados como disponíveis. */
  dias: z.array(data).max(42).optional(),
  /** Serviços e valores: ids escolhidos (na ordem da lista). */
  servicos: z.array(z.uuid()).max(40).optional(),
  /** Foto do serviço (data URL JPEG/PNG já reduzida no navegador), só quando há um serviço. */
  foto: z.string().startsWith("data:image/").max(2_500_000).nullable().optional(),
  /** Tema "Meu fundo": imagem da profissional (data URL JPEG 1080x1920 já recortada no navegador). */
  fundo: z.string().startsWith("data:image/").max(3_000_000).nullable().optional(),
});

export type SelecaoStory = z.infer<typeof esquemaSelecaoStory>;

/** Grade de horários do dia (expediente + passo), sem olhar a agenda. Vazio = folga. */
export function gradeDoDia(dia: DataISO, expediente: Expediente, intervaloMin: number): string[] {
  const janela = janelaDoDia(dia, expediente);
  if (!janela) return [];
  const passo = Math.max(5, intervaloMin);
  const r: string[] = [];
  for (let t = janela.inicio; t < janela.fim; t += passo) r.push(minutosParaHora(t));
  return r;
}

/** Grade genérica para um dia de folga (a profissional pode querer abrir uma exceção). */
export function gradeGenerica(intervaloMin: number): string[] {
  const passo = Math.max(5, intervaloMin);
  const r: string[] = [];
  for (let t = 7 * 60; t < 20 * 60; t += passo) r.push(minutosParaHora(t));
  return r;
}
