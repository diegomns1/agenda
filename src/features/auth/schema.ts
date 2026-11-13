import { z } from "zod";

const email = z.email("Informe um e-mail válido").trim().toLowerCase();
const senha = z.string().min(6, "A senha precisa ter pelo menos 6 caracteres");

export const esquemaLogin = z.object({
  email,
  senha: z.string().min(1, "Informe a senha"),
});

export const esquemaCadastro = z
  .object({
    nome: z.string().trim().min(2, "Informe seu nome"),
    // obrigatório desde 13/11/2026: é por ele que a Serena ajuda quem acabou de entrar (ativação)
    telefone: z
      .string({ error: "Informe seu WhatsApp com DDD" })
      .trim()
      .min(1, "Informe seu WhatsApp com DDD")
      .refine((v) => {
        const d = v.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
        return d.length === 10 || d.length === 11;
      }, "WhatsApp incompleto: coloque o DDD e o número, ex.: (11) 99999-9999"),
    email,
    senha,
    aceite: z
      .string()
      .optional()
      .refine((v) => v === "on", "Para continuar, aceite os Termos de Uso e a Política de Privacidade"),
    tratamento: z.enum(["ela", "ele", "neutro"], { error: "Escolha uma opção" }),
    ramo: z.string().trim().min(1, "Escolha o seu ramo (ou Outros)").max(40),
    ramo_outro: z.string().trim().max(60).optional().transform((v) => v || null),
  })
  .refine((d) => d.ramo !== "outro" || d.ramo_outro, {
    message: "Escreva qual é o seu ramo",
    path: ["ramo"],
  });

export const esquemaRecuperarSenha = z.object({ email });

export const esquemaRedefinirSenha = z
  .object({ senha, confirmarSenha: z.string() })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  });
