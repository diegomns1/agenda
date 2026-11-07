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
    telefone: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || v.replace(/\D/g, "").length >= 10, "Telefone incompleto"),
    email,
    senha,
    confirmarSenha: z.string(),
  })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  });

export const esquemaRecuperarSenha = z.object({ email });

export const esquemaRedefinirSenha = z
  .object({ senha, confirmarSenha: z.string() })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  });
