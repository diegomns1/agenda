import type { Metadata } from "next";
import { FormCadastro } from "@/features/auth/components/FormCadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCadastro() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Criar conta</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Grátis durante a fase de testes. Depois do cadastro, sua conta passa por uma aprovação
        rápida.
      </p>
      <FormCadastro />
    </>
  );
}
