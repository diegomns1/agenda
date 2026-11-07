import { redirect } from "next/navigation";
import { ehAdmin, obterPerfil, obterUsuario, situacaoDaConta } from "@/lib/auth";
import { Cabecalho } from "@/components/layout/Cabecalho";

/** Área da profissional: exige conta aprovada e dentro da validade. */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const [usuario, perfil] = await Promise.all([obterUsuario(), obterPerfil()]);

  if (!usuario) redirect("/login");
  if (situacaoDaConta(perfil) !== "aprovada") redirect("/aguardando-aprovacao");

  return (
    <div className="flex flex-1 flex-col">
      <Cabecalho titulo={perfil?.nome_negocio ?? perfil?.nome} admin={ehAdmin(usuario)} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
