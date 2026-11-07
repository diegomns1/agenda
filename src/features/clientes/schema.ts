import { z } from "zod";

export const esquemaCliente = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(80, "Máximo de 80 caracteres"),
  telefone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || v.replace(/\D/g, "").length >= 10, "WhatsApp incompleto (DDD + número)"),
  observacoes: z
    .string()
    .trim()
    .max(1000, "Máximo de 1000 caracteres")
    .optional()
    .transform((v) => v || null),
});

export type DadosCliente = z.infer<typeof esquemaCliente>;
