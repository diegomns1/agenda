import { z } from "zod";
import { PLANOS, STATUS_CONTA } from "@/lib/constantes";

const chavesStatus = Object.keys(STATUS_CONTA) as [keyof typeof STATUS_CONTA, ...(keyof typeof STATUS_CONTA)[]];
const chavesPlano = Object.keys(PLANOS) as [keyof typeof PLANOS, ...(keyof typeof PLANOS)[]];

export const esquemaAlterarStatus = z.object({
  id: z.uuid(),
  status: z.enum(chavesStatus),
  motivo: z.string().trim().max(300, "Máximo de 300 caracteres").optional(),
});

export const esquemaAlterarPlano = z.object({
  id: z.uuid(),
  plano: z.enum(chavesPlano),
  ativa_ate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida"),
});
