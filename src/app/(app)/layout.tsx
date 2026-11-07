import { redirect } from "next/navigation";
import { ehAdmin, obterPerfil, obterUsuario, situacaoDaConta } from "@/lib/auth";
import { temRecurso } from "@/lib/planos";
import { contarLembretesPendentes } from "@/features/lembretes/queries";
import { Cabecalho } from "@/components/layout/Cabecalho";
import { BarraInferior } from "@/components/layout/BarraInferior";
import { RegistroSW } from "@/components/pwa/RegistroSW";
import { AvisoInstalar } from "@/components/pwa/AvisoInstalar";

/** Área da profissional: exige conta aprovada e dentro da validade. */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const [usuario, perfil] = await Promise.all([obterUsuario(), obterPerfil()]);

  if (!usuario) redirect("/login");
  if (situacaoDaConta(perfil) !== "aprovada" || !perfil) redirect("/aguardando-aprovacao");

  const podeLembretes = temRecurso(perfil.plano, "lembretes");
  const podeStories = temRecurso(perfil.plano, "stories");
  const lembretesPendentes = podeLembretes ? await contarLembretesPendentes().catch(() => 0) : 0;

  return (
    <div className="flex flex-1 flex-col">
      <Cabecalho
        titulo={perfil.nome_negocio ?? perfil.nome}
        logoUrl={perfil.logo_url}
        admin={ehAdmin(usuario)}
        lembretesPendentes={lembretesPendentes}
        mostrarSino={podeLembretes}
      />
      <AvisoInstalar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-24">{children}</main>
      <BarraInferior bloqueados={{ "/stories": !podeStories }} />
      <RegistroSW />
    </div>
  );
}
