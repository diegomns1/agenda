import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { ehAdmin, obterPerfil, obterUsuario } from "@/lib/auth";
import { URL_APP } from "@/lib/constantes";
import { temRecurso } from "@/lib/planos";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FalarComSuporte } from "@/components/layout/FalarComSuporte";
import { FormPerfil } from "@/features/perfil/components/FormPerfil";
import { UploadLogo } from "@/features/perfil/components/UploadLogo";
import { SECOES_PERFIL, type SecaoPerfil } from "@/features/perfil/schema";
import { ConectarWhatsApp } from "@/features/whatsapp/components/ConectarWhatsApp";
import { descreverNumero, whatsappLiberadoPara } from "@/features/whatsapp/numero";

/* Telas do Perfil (15/11/2026): /perfil/dados, /horarios, /aparencia, /link, /assistente e /suporte. */

const TELAS: Record<string, { titulo: string; texto: string }> = {
  dados: { titulo: "Meus dados", texto: "Sua logo, seu nome e como falar com você." },
  horarios: { titulo: "Horários", texto: "Os dias e as horas em que você atende." },
  aparencia: { titulo: "Layout e cores", texto: "O tema do seu painel e as cores da sua marca." },
  link: { titulo: "Link de agendamento", texto: "Para seus clientes pedirem horário sozinhos." },
  assistente: { titulo: "Assistente no WhatsApp", texto: "Peça marcações, remarcações e cadastros por mensagem." },
  suporte: { titulo: "Suporte", texto: "Tutoriais, dúvidas e sugestões." },
};

type Props = { params: Promise<{ secao: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { secao } = await params;
  return { title: TELAS[secao]?.titulo ?? "Perfil" };
}

export default async function PaginaSecaoPerfil({ params }: Props) {
  const { secao } = await params;
  const tela = TELAS[secao];
  if (!tela) notFound();

  const perfil = await obterPerfil();
  if (!perfil) redirect("/aguardando-aprovacao");

  let conteudo: React.ReactNode;
  if ((SECOES_PERFIL as readonly string[]).includes(secao)) {
    conteudo = (
      <>
        {secao === "dados" ? (
          <Card>
            <CardHeader>
              <CardTitle>Sua logo</CardTitle>
              <CardDescription>Aparece no topo do app, no seu link e nos stories.</CardDescription>
            </CardHeader>
            <CardContent>
              <UploadLogo usuarioId={perfil.id} logoUrl={perfil.logo_url} />
            </CardContent>
          </Card>
        ) : null}
        <FormPerfil
          perfil={perfil}
          secao={secao as SecaoPerfil}
          urlBase={URL_APP}
          podeAgendamentoOnline={temRecurso(perfil.plano, "agendamento_online")}
        />
      </>
    );
  } else if (secao === "assistente") {
    // o quadro só existe com o número oficial configurado (e, em teste, só para admin)
    if (!whatsappLiberadoPara(ehAdmin(await obterUsuario()))) notFound();
    const { data: vinculo } = await (await criarClienteServidor()).from("whatsapp_vinculos").select("telefone").eq("profissional_id", perfil.id).maybeSingle();
    conteudo = <ConectarWhatsApp conectado={vinculo ? descreverNumero(vinculo.telefone) : null} permitido={temRecurso(perfil.plano, "assistente")} />;
  } else {
    conteudo = <FalarComSuporte nome={perfil.nome} email={perfil.email} />;
  }

  return (
    <div className="grid gap-5">
      <div>
        <Link href="/perfil" className="-ml-1 inline-flex min-h-toque items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeftIcon className="size-4" />
          Perfil
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{tela.titulo}</h1>
        <p className="text-sm text-muted-foreground">{tela.texto}</p>
      </div>
      {conteudo}
    </div>
  );
}
