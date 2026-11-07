import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CalendarIcon, MessageCircleIcon, StickyNoteIcon } from "lucide-react";
import { listarHistoricoCliente, obterCliente } from "@/features/clientes/queries";
import { AcoesCliente } from "@/features/clientes/components/AcoesCliente";
import { HistoricoCliente } from "@/features/clientes/components/HistoricoCliente";
import { iniciais } from "@/lib/texto";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarData } from "@/lib/datas";
import { formatarTelefone, linkWhatsApp } from "@/lib/telefone";

export const metadata: Metadata = { title: "Cliente" };

export default async function PaginaCliente({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const cliente = await obterCliente(id);
  if (!cliente) notFound();

  const historico = await listarHistoricoCliente(id);

  return (
    <div className="grid gap-5">
      <Link href="/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        Clientes
      </Link>

      <div className="flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
          {iniciais(cliente.nome)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{cliente.nome}</h1>
          <p className="text-sm text-muted-foreground">Cliente desde {formatarData(cliente.created_at, "MMM 'de' yyyy")}</p>
        </div>
      </div>

      <AcoesCliente cliente={cliente} ultimoServicoId={historico[0]?.servico_id ?? null} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircleIcon className="size-4 text-emerald-600" />
            WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          {cliente.telefone ? (
            <>
              <span className="text-base">{formatarTelefone(cliente.telefone)}</span>
              <Button asChild variant="outline" size="sm">
                <a href={linkWhatsApp(cliente.telefone)} target="_blank" rel="noopener noreferrer">
                  <MessageCircleIcon />
                  Abrir conversa
                </a>
              </Button>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Não informado. Toque em Editar para adicionar.</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNoteIcon className="size-4 text-amber-600" />
            Observações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cliente.observacoes ? (
            <p className="whitespace-pre-wrap text-base">{cliente.observacoes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma observação. Preferências, alergias, detalhes que ajudam no atendimento.</p>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CalendarIcon className="size-4 text-primary" />
          Histórico de atendimentos
        </h2>
        <HistoricoCliente historico={historico} />
      </section>
    </div>
  );
}
