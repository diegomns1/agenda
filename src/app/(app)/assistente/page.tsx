import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/auth";
import { assistenteConfigurado } from "@/lib/anthropic";
import { temRecurso } from "@/lib/planos";
import { primeiroNome } from "@/lib/texto";
import { ChatAssistente } from "@/features/assistente/components/ChatAssistente";
import { BloqueioPlano } from "@/components/layout/BloqueioPlano";
import Link from "next/link";
import { IconeWhatsApp } from "@/components/marca/IconeWhatsApp";
import { estadoWhatsApp } from "@/features/whatsapp/estado";

export const metadata: Metadata = { title: "Assistente" };

export default async function PaginaAssistente() {
  const perfil = await obterPerfil();
  if (!perfil) redirect("/aguardando-aprovacao");

  if (!temRecurso(perfil.plano, "assistente")) {
    return (
      <BloqueioPlano
        recurso="assistente"
        planoAtual={perfil.plano}
        titulo="Assistente de IA"
        descricao="Peça mudanças na agenda escrevendo, como se fosse para uma secretária."
        beneficios={[
          "\"Muda a Bruna de hoje para sexta às 15h\" e pronto",
          "Pergunte quem vem amanhã, quais horários estão livres ou quanto faturou",
          "Bloqueie horários e marque atendimentos sem abrir formulário",
          "Nada muda sem você confirmar",
        ]}
      />
    );
  }

  const whatsapp = await estadoWhatsApp().catch(() => ({ via: "painel" as const }));

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assistente</h1>
        <p className="text-sm text-muted-foreground">Fale ou escreva o que precisa na agenda. Eu consulto, preparo a mudança e você confirma.</p>
      </div>
      {whatsapp.via !== "painel" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-whatsapp/30 bg-whatsapp/5 px-4 py-3 text-sm">
          <IconeWhatsApp className="size-5 shrink-0 text-whatsapp" />
          <p className="min-w-0 flex-1">
            {whatsapp.via === "whatsapp"
              ? `A mesma assistente responde no seu WhatsApp, pelo número ${whatsapp.numero}.`
              : "A mesma assistente agora responde pelo WhatsApp, sem precisar abrir o app."}
          </p>
          {whatsapp.via === "whatsapp" ? (
            <a href={whatsapp.link} target="_blank" rel="noopener" className="font-semibold text-whatsapp underline underline-offset-2">
              Abrir no WhatsApp
            </a>
          ) : (
            <Link href="/perfil#whatsapp" className="font-semibold text-whatsapp underline underline-offset-2">
              Conectar
            </Link>
          )}
        </div>
      ) : null}
      <ChatAssistente nome={primeiroNome(perfil.nome)} iaAtiva={assistenteConfigurado()} />
    </div>
  );
}
