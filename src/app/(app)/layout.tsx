import { redirect } from "next/navigation";
import { ehAdmin, obterPerfil, obterUsuario, situacaoDaConta } from "@/lib/auth";
import { contarLembretesPendentes } from "@/features/lembretes/queries";
import { Cabecalho } from "@/components/layout/Cabecalho";
import { BarraInferior } from "@/components/layout/BarraInferior";
import { RegistroSW } from "@/components/pwa/RegistroSW";
import { AvisoInstalar } from "@/components/pwa/AvisoInstalar";

/** Área da profissional: exige conta aprovada e dentro da validade. */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  // Tudo em paralelo: a contagem de lembretes já é filtrada pela RLS
  const [usuario, perfil, lembretesPendentes] = await Promise.all([
    obterUsuario(),
    obterPerfil(),
    contarLembretesPendentes().catch(() => 0),
  ]);

  if (!usuario) redirect("/login");
  if (situacaoDaConta(perfil) !== "aprovada") redirect("/aguardando-aprovacao");

  return (
    <div className="flex flex-1 flex-col">
      <Cabecalho
        titulo={perfil?.nome_negocio ?? perfil?.nome}
        logoUrl={perfil?.logo_url}
        admin={ehAdmin(usuario)}
        lembretesPendentes={lembretesPendentes}
      />
      <AvisoInstalar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-24">{children}</main>
      <BarraInferior />
      <RegistroSW />
    </div>
  );
}
