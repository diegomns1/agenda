import type { Metadata } from "next";
import { FormRedefinirSenha } from "@/features/auth/components/FormRedefinirSenha";

export const metadata: Metadata = { title: "Nova senha" };

// Rota privada: só chega aqui quem veio do link de e-mail (sessão criada no /auth/callback).
export default function PaginaRedefinirSenha() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Criar nova senha</h1>
      <p className="mb-5 text-sm text-muted-foreground">Escolha uma senha nova para sua conta.</p>
      <FormRedefinirSenha />
    </>
  );
}
