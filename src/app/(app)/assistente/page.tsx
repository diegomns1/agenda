import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/auth";
import { assistenteConfigurado } from "@/lib/anthropic";
import { temRecurso } from "@/lib/planos";
import { primeiroNome } from "@/lib/texto";
import { ChatAssistente } from "@/features/assistente/components/ChatAssistente";
import { BloqueioPlano } from "@/components/layout/BloqueioPlano";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assistente</h1>
        <p className="text-sm text-muted-foreground">Escreva o que precisa na agenda. Eu consulto, preparo a mudança e você confirma.</p>
      </div>
      {assistenteConfigurado() ? (
        <ChatAssistente nome={primeiroNome(perfil.nome)} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Assistente chegando</CardTitle>
            <CardDescription>O assistente de IA está quase pronto. Em breve ele aparece aqui.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
