import { z } from "zod";

/* Tipos compartilhados entre servidor e navegador (sem "server-only"). */

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/**
 * Mudança que o assistente PROPÕE e que só acontece quando a profissional toca em "Confirmar".
 * O servidor valida tudo de novo na hora de executar (a proposta passa pelo navegador).
 */
export const esquemaProposta = z.discriminatedUnion("tipo", [
  z.object({ id: z.string(), tipo: z.literal("remarcar"), resumo: z.string(), agendamento_id: z.uuid(), data, hora }),
  z.object({ id: z.string(), tipo: z.literal("cancelar"), resumo: z.string(), agendamento_id: z.uuid() }),
  z.object({
    id: z.string(),
    tipo: z.literal("marcar"),
    resumo: z.string(),
    cliente_id: z.uuid().nullable(),
    nova_cliente_nome: z.string().max(80).nullable(),
    nova_cliente_telefone: z.string().max(30).nullable(),
    servico_id: z.uuid(),
    data,
    hora,
  }),
  z.object({
    id: z.string(),
    tipo: z.literal("bloquear"),
    resumo: z.string(),
    titulo: z.string().min(1).max(60),
    data,
    dia_inteiro: z.boolean(),
    hora_inicio: hora.nullable(),
    hora_fim: hora.nullable(),
  }),
  z.object({ id: z.string(), tipo: z.literal("status"), resumo: z.string(), agendamento_id: z.uuid(), status: z.enum(["concluido", "faltou"]) }),
  z.object({
    id: z.string(),
    tipo: z.literal("cadastrar_cliente"),
    resumo: z.string(),
    nome: z.string().min(2).max(80),
    telefone: z.string().regex(/^55\d{10,11}$/).nullable(),
    observacoes: z.string().max(500).nullable(),
  }),
  z.object({
    id: z.string(),
    tipo: z.literal("editar_cliente"),
    resumo: z.string(),
    cliente_id: z.uuid(),
    nome: z.string().min(2).max(80).nullable(),
    telefone: z.string().regex(/^55\d{10,11}$/).nullable(),
    observacoes: z.string().max(500).nullable(),
  }),
]);

export type Proposta = z.infer<typeof esquemaProposta>;

export const esquemaMensagemChat = z.object({
  papel: z.enum(["voce", "assistente"]),
  texto: z.string().max(4000),
});

export type MensagemChat = z.infer<typeof esquemaMensagemChat>;

export type RespostaAssistente = {
  ok: boolean;
  texto?: string;
  propostas?: Proposta[];
  erro?: string;
  restantesHoje?: number;
  /** true quando a resposta veio de um comando pronto (sem IA, sem custo) */
  semIA?: boolean;
};

/** Exemplos de pedidos que precisam da IA (mudanças), mostrados na conversa vazia. */
export const SUGESTOES_ASSISTENTE = ["Muda a Bruna de hoje para sexta às 15h", "Bloqueia minha tarde de quarta, vou ao médico"];
