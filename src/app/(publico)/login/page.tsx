import type { Metadata } from "next";
import { FormLogin } from "@/features/auth/components/FormLogin";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  const { proximo, msg } = await searchParams;
  const destino = typeof proximo === "string" ? proximo : undefined;
  const mensagem =
    msg === "senha-redefinida"
      ? "Senha alterada com sucesso. Entre com a nova senha."
      : msg === "link-invalido"
        ? "O link expirou ou é inválido. Peça um novo."
        : undefined;

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Entrar</h1>
      <p className="mb-5 text-sm text-muted-foreground">Acesse sua agenda.</p>
      <FormLogin proximo={destino} mensagem={mensagem} />
    </>
  );
}
