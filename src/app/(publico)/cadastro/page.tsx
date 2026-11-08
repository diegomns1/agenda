import type { Metadata } from "next";
import { FormCadastro } from "@/features/auth/components/FormCadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCadastro() {
  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Crie sua conta no Vaguinha</h1>
      <p className="mb-2 text-sm text-muted-foreground">3 dias grátis, sem cartão. Leva um minuto.</p>
      <p className="mb-5 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
        Depois do cadastro, uma pessoa confere a conta e você recebe um e-mail quando ela for liberada. O teste começa nesse dia.
      </p>
      <FormCadastro />
    </>
  );
}
