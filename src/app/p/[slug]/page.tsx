import type { Metadata } from "next";
import { AtSignIcon, CalendarXIcon } from "lucide-react";
import { obterPerfilPublico } from "@/features/online/publico";
import { AgendarOnline } from "@/features/online/components/AgendarOnline";
import { LogoVaguinha } from "@/components/marca/LogoVaguinha";
import { iniciais } from "@/lib/texto";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const perfil = await obterPerfilPublico(slug);
  const nome = perfil ? perfil.nome_negocio || perfil.nome : "Agendamento";
  return {
    title: `Agendar com ${nome}`,
    description: `Escolha o serviço, o dia e o horário com ${nome}.`,
    openGraph: { title: `Agendar com ${nome}`, description: "Agende seu horário online.", images: perfil?.logo_url ? [perfil.logo_url] : undefined },
  };
}

export default async function PaginaAgendamentoPublico({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const perfil = await obterPerfilPublico(slug);

  if (!perfil) {
    return (
      <div className="fundo-aurora flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CalendarXIcon className="size-7" />
        </div>
        <h1 className="text-xl font-bold">Link indisponível</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Este link de agendamento não existe ou está desativado. Fale diretamente com a profissional.
        </p>
        <LogoVaguinha className="mt-6 h-6 opacity-60" />
      </div>
    );
  }

  const nomeNegocio = perfil.nome_negocio || perfil.nome;
  const estilo = {
    "--primary": perfil.cor_primaria,
    "--ring": perfil.cor_primaria,
    "--vinho": perfil.cor_primaria,
    "--rosa": perfil.cor_secundaria,
    "--background": perfil.cor_secundaria,
  } as React.CSSProperties;

  return (
    <div style={estilo} className="fundo-aurora flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-8 pb-10">
        <header className="surgir flex flex-col items-center text-center">
          <div className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-white shadow-lg shadow-black/5 ring-4 ring-primary/30">
            {perfil.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={perfil.logo_url} alt={nomeNegocio} className="size-full object-contain" />
            ) : (
              <span className="text-2xl font-extrabold text-primary">{iniciais(nomeNegocio)}</span>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{nomeNegocio}</h1>
          {perfil.instagram ? (
            <a
              href={`https://instagram.com/${perfil.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
            >
              <AtSignIcon className="size-3.5" />{perfil.instagram}
            </a>
          ) : null}
          <p className="mt-2 text-sm text-muted-foreground">Agende seu horário em poucos toques.</p>
        </header>

        <div className="surgir surgir-atraso-1 mt-6 rounded-3xl bg-card/90 p-4 shadow-xl shadow-black/5 ring-1 ring-black/5 backdrop-blur sm:p-6">
          <AgendarOnline perfil={perfil} />
        </div>

        <footer className="surgir surgir-atraso-2 mt-8 flex flex-col items-center gap-1 text-xs text-muted-foreground">
          <span>Agendamento online por</span>
          <a href="https://vaguinha.app" target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100">
            <LogoVaguinha className="h-5" />
          </a>
        </footer>
      </main>
    </div>
  );
}
