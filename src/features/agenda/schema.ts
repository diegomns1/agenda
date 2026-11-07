import { z } from "zod";

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
    message: "Escolha a cliente ou informe o nome de uma nova",
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

export const STATUS_AGENDAMENTO = {
  agendado: { rotulo: "Agendado", cor: "bg-primary/15 text-primary border-primary/30" },
  concluido: { rotulo: "Concluído", cor: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200" },
  faltou: { rotulo: "Faltou", cor: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200" },
  cancelado: { rotulo: "Cancelado", cor: "bg-muted text-muted-foreground border-border line-through" },
} as const;
