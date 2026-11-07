import { z } from "zod";
import { interpretarMoeda } from "@/lib/moeda";

export const DURACOES_SUGERIDAS = [15, 20, 30, 40, 45, 60, 75, 90, 120, 150, 180] as const;

export const esquemaServico = z.object({
  nome: z.string().trim().min(1, "Informe o nome do serviço").max(80, "Máximo de 80 caracteres"),
  duracao_min: z.coerce
    .number({ error: "Informe a duração" })
    .int("Use minutos inteiros")
    .min(5, "Mínimo de 5 minutos")
    .max(600, "Máximo de 10 horas"),
  valor: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return 0;
      const n = interpretarMoeda(v);
      if (n === null) {
        ctx.addIssue({ code: "custom", message: "Valor inválido. Ex.: 45,00" });
        return z.NEVER;
      }
      return n;
    }),
});

export type DadosServico = z.infer<typeof esquemaServico>;

/** Sugestões para começar rápido (nome, duração em min, valor). */
export const SERVICOS_SUGERIDOS: { nome: string; duracao_min: number; valor: number }[] = [
  { nome: "Manicure", duracao_min: 45, valor: 40 },
  { nome: "Pedicure", duracao_min: 50, valor: 45 },
  { nome: "Pé e mão", duracao_min: 90, valor: 80 },
  { nome: "Esmaltação em gel", duracao_min: 60, valor: 70 },
  { nome: "Alongamento em fibra", duracao_min: 150, valor: 180 },
  { nome: "Manutenção de alongamento", duracao_min: 120, valor: 120 },
  { nome: "Spa dos pés", duracao_min: 60, valor: 70 },
  { nome: "Design de sobrancelha", duracao_min: 30, valor: 40 },
];
