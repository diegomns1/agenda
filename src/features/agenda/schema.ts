import { z } from "zod";
import { VISUAL_STATUS } from "./visual";

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida");

export const esquemaAtendimento = z
  .object({
    tipo: z.literal("atendimento"),
    cliente_id: z.string().trim().optional().transform((v) => v || null),
    // cadastro rápido de cliente dentro do formulário
    nova_cliente_nome: z.string().trim().max(80).optional().transform((v) => v || null),
    nova_cliente_telefone: z.string().trim().optional().transform((v) => v || null),
    servico_id: z.string().trim().min(1, "Escolha o serviço"),
    dia: data,
    hora: hora,
    duracao_min: z.coerce.number().int().min(5, "Mínimo de 5 minutos").max(600, "Máximo de 10 horas"),
    observacoes: z.string().trim().max(500, "Máximo de 500 caracteres").optional().transform((v) => v || null),
  })
  .refine((d) => d.cliente_id || d.nova_cliente_nome, {
    message: "Escolha um cliente da lista ou informe o nome de um novo",
    path: ["cliente_id"],
  });

export const esquemaBloqueio = z
  .object({
    tipo: z.literal("bloqueio"),
    titulo: z.string().trim().min(1, "Dê um nome ao bloqueio (ex.: almoço)").max(60),
    dia: data,
    dia_inteiro: z.string().optional().transform((v) => v === "on"),
    hora_inicio: hora.optional(),
    hora_fim: hora.optional(),
    dias: z.coerce.number().int().min(1).max(60).default(1), // bloqueio de vários dias (férias)
    observacoes: z.string().trim().max(500).optional().transform((v) => v || null),
  })
  .refine((d) => d.dia_inteiro || (d.hora_inicio && d.hora_fim && d.hora_inicio < d.hora_fim), {
    message: "Informe início e fim (o fim precisa ser depois do início)",
    path: ["hora_fim"],
  });

/** Rótulo + cor da etiqueta de cada situação. As cores vêm de `visual.ts` (mesma tabela em todo o painel). */
export const STATUS_AGENDAMENTO = {
  pendente: { rotulo: VISUAL_STATUS.pendente.rotulo, cor: VISUAL_STATUS.pendente.etiqueta },
  agendado: { rotulo: VISUAL_STATUS.agendado.rotulo, cor: VISUAL_STATUS.agendado.etiqueta },
  concluido: { rotulo: VISUAL_STATUS.concluido.rotulo, cor: VISUAL_STATUS.concluido.etiqueta },
  faltou: { rotulo: VISUAL_STATUS.faltou.rotulo, cor: VISUAL_STATUS.faltou.etiqueta },
  cancelado: { rotulo: VISUAL_STATUS.cancelado.rotulo, cor: VISUAL_STATUS.cancelado.etiqueta },
} as const;
