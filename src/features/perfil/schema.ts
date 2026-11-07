import { z } from "zod";
import type { Expediente, ExpedienteDia } from "@/types/database";

export const DIAS_SEMANA = [
  { chave: "1", nome: "Segunda", curto: "Seg" },
  { chave: "2", nome: "Terça", curto: "Ter" },
  { chave: "3", nome: "Quarta", curto: "Qua" },
  { chave: "4", nome: "Quinta", curto: "Qui" },
  { chave: "5", nome: "Sexta", curto: "Sex" },
  { chave: "6", nome: "Sábado", curto: "Sáb" },
  { chave: "0", nome: "Domingo", curto: "Dom" },
] as const;

export type ChaveDia = (typeof DIAS_SEMANA)[number]["chave"];

export const INTERVALOS_GRADE = [15, 20, 30, 60] as const;

const hex = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida")
  .transform((v) => v.toUpperCase());

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida");

const dia = z
  .object({ ativo: z.boolean(), inicio: hora, fim: hora })
  .refine((d) => !d.ativo || d.inicio < d.fim, {
    message: "O fim precisa ser depois do início",
    path: ["fim"],
  });

export const esquemaPerfil = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(80),
  nome_negocio: z.string().trim().max(80).optional().transform((v) => v || null),
  telefone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || v.replace(/\D/g, "").length >= 10, "Telefone incompleto"),
  instagram: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v ? v.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/$/, "") : null)),
  cor_primaria: hex,
  cor_secundaria: hex,
  intervalo_grade_min: z.coerce.number().refine((n) => (INTERVALOS_GRADE as readonly number[]).includes(n), "Intervalo inválido"),
  modelo_lembrete: z.string().trim().min(10, "Mensagem muito curta").max(400, "Máximo de 400 caracteres"),
  expediente: z.object({
    "0": dia, "1": dia, "2": dia, "3": dia, "4": dia, "5": dia, "6": dia,
  }),
});

export type DadosPerfil = z.infer<typeof esquemaPerfil>;

/** Monta o objeto `expediente` a partir dos campos exp_<dia>_ativo / _inicio / _fim do FormData. */
export function expedienteDoForm(formData: FormData): Expediente {
  const resultado = {} as Record<string, ExpedienteDia>;
  for (const { chave } of DIAS_SEMANA) {
    resultado[chave] = {
      ativo: formData.get(`exp_${chave}_ativo`) === "on",
      inicio: String(formData.get(`exp_${chave}_inicio`) ?? "08:00"),
      fim: String(formData.get(`exp_${chave}_fim`) ?? "18:00"),
    };
  }
  return resultado as Expediente;
}

/** Paleta de pares sugeridos (primária, secundária). */
export const PALETAS = [
  { nome: "Vinho", primaria: "#702D50", secundaria: "#FCF6F1" },
  { nome: "Rosa", primaria: "#C2185B", secundaria: "#FCE4EC" },
  { nome: "Pink", primaria: "#E91E63", secundaria: "#FFF0F5" },
  { nome: "Lilás", primaria: "#7B1FA2", secundaria: "#F3E5F5" },
  { nome: "Vinho", primaria: "#880E4F", secundaria: "#FBE9EF" },
  { nome: "Coral", primaria: "#E64A19", secundaria: "#FFF3EE" },
  { nome: "Dourado", primaria: "#B8860B", secundaria: "#FFF8E1" },
  { nome: "Nude", primaria: "#A1887F", secundaria: "#F7F1EE" },
  { nome: "Verde", primaria: "#2E7D32", secundaria: "#E8F5E9" },
  { nome: "Azul", primaria: "#1565C0", secundaria: "#E3F2FD" },
  { nome: "Preto", primaria: "#212121", secundaria: "#F5F5F5" },
] as const;
