import { redirect } from "next/navigation";
import { ehAdmin, obterPerfil, obterUsuario, situacaoDaConta } from "@/lib/auth";
import { temRecurso } from "@/lib/planos";
import { contarLembretesPendentes } from "@/features/lembretes/queries";
import { Cabecalho } from "@/components/layout/Cabecalho";
import { BarraInferior, BarraLateral } from "@/components/layout/BarraInferior";
import { AplicarTema } from "@/components/layout/AplicarTema";
import { RegistroSW } from "@/components/pwa/RegistroSW";
import { AvisoInstalar } from "@/components/pwa/AvisoInstalar";
import { BotaoAssistente } from "@/features/assistente/components/BotaoAssistente";
import { estadoWhatsApp } from "@/features/whatsapp/estado";

/** Área da profissional: exige conta aprovada e dentro da validade. */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const [usuario, perfil] = await Promise.all([obterUsuario(), obterPerfil()]);

  if (!usuario) redirect("/login");
  if (situacaoDaConta(perfil) !== "aprovada" || !perfil) redirect("/aguardando-aprovacao");

  const podeLembretes = temRecurso(perfil.plano, "lembretes");
  const podeStories = temRecurso(perfil.plano, "stories");
  const [lembretesPendentes, whatsapp] = await Promise.all([
    podeLembretes ? contarLembretesPendentes().catch(() => 0) : Promise.resolve(0),
    estadoWhatsApp().catch(() => ({ via: "painel" as const })),
  ]);

  const bloqueados = { "/stories": !podeStories, "/relatorios": !temRecurso(perfil.plano, "relatorios"), "/lembretes": !podeLembretes };

  return (
    // data-tema troca as cores do painel (globals.css); "rosa" é o padrão da marca.
    // No computador (md+), a navegação é uma coluna fixa na esquerda e o conteúdo começa depois dela.
    <div data-tema={perfil.tema ?? "rosa"} className="flex flex-1 flex-col bg-background text-foreground md:pl-56">
      <AplicarTema tema={perfil.tema ?? "rosa"} />
      <Cabecalho
        titulo={perfil.nome_negocio ?? perfil.nome}
        logoUrl={perfil.logo_url}
        admin={ehAdmin(usuario)}
        lembretesPendentes={lembretesPendentes}
        mostrarSino={podeLembretes}
      />
      <AvisoInstalar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-32 md:pb-16">{children}</main>
      <BarraInferior bloqueados={bloqueados} />
      <BarraLateral bloqueados={bloqueados} />
      <BotaoAssistente estado={whatsapp} />
      <RegistroSW />
    </div>
  );
}
