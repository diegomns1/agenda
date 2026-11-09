import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/auth";
import { temRecurso } from "@/lib/planos";
import { contarInscricoesPush, listarLembretes } from "@/features/lembretes/queries";
import { ListaLembretes } from "@/features/lembretes/components/ListaLembretes";
import { AtivarNotificacoes } from "@/features/lembretes/components/AtivarNotificacoes";
import { BloqueioPlano } from "@/components/layout/BloqueioPlano";
import { mensagensDoPerfil } from "@/features/mensagens/modelos";
import { URL_APP } from "@/lib/constantes";

export const metadata: Metadata = { title: "Lembretes" };

export default async function PaginaLembretes({ searchParams }: PageProps<"/lembretes">) {
  const { agendamento } = await searchParams;
  const perfil = await obterPerfil();
  if (!perfil) redirect("/aguardando-aprovacao");

  if (!temRecurso(perfil.plano, "lembretes")) {
    return (
      <BloqueioPlano
        recurso="lembretes"
        planoAtual={perfil.plano}
        titulo="Lembretes"
        descricao="Avisos automáticos para você e mensagens prontas para quem você atende."
        beneficios={[
          "Notificação no celular 1 dia e 1 hora antes de cada atendimento",
          "Botão que abre o WhatsApp de quem vem, com a mensagem pronta",
          "Lista do que ainda falta avisar, com check de enviado",
          "Link para marcarem horário sozinhos",
        ]}
      />
    );
  }

  const [{ pendentes, avisados }, aparelhos] = await Promise.all([listarLembretes(), contarInscricoesPush()]);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lembretes</h1>
        <p className="text-sm text-muted-foreground">
          Atendimentos das próximas 48 horas. Toque em <strong>Enviar lembrete</strong> para abrir o WhatsApp com a mensagem pronta.{" "}
          <Link href="/mensagens" className="underline underline-offset-4">
            Editar mensagens
          </Link>
        </p>
      </div>

      <ListaLembretes
        pendentes={pendentes}
        avisados={avisados}
        mensagens={mensagensDoPerfil(perfil, URL_APP)}
        destaqueId={typeof agendamento === "string" ? agendamento : null}
      />

      <AtivarNotificacoes aparelhos={aparelhos} />
    </div>
  );
}
