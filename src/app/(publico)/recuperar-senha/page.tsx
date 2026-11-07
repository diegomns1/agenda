import type { Metadata } from "next";
import { FormRecuperarSenha } from "@/features/auth/components/FormRecuperarSenha";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function PaginaRecuperarSenha() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Recuperar senha</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Informe o e-mail da sua conta. Vamos enviar um link para criar uma nova senha.
      </p>
      <FormRecuperarSenha />
    </>
  );
}
