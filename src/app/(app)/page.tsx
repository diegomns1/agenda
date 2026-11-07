import type { Metadata } from "next";
import Link from "next/link";
import { BellIcon, CalendarDaysIcon, CalendarPlusIcon, ChevronRightIcon, ImagePlusIcon, UserRoundPenIcon } from "lucide-react";
import { obterPerfil } from "@/lib/auth";
import { contarLembretesPendentes } from "@/features/lembretes/queries";
import { dataDe, formatarData, hojeISO, horaDe, rotuloRelativo } from "@/lib/datas";
import { formatarMoeda } from "@/lib/moeda";
import { primeiroNome } from "@/lib/texto";
import { listarAgendamentosDias, listarProximosAtendimentos } from "@/features/agenda/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Hoje" };


export default async function PaginaHoje() {
  const perfil = await obterPerfil();
  const hoje = hojeISO();
  const [deHoje, proximos, lembretes] = await Promise.all([
    listarAgendamentosDias(hoje),
    listarProximosAtendimentos(5),
    contarLembretesPendentes(),
  ]);

  const atendimentosHoje = deHoje.filter((a) => a.tipo === "atendimento" && a.status !== "cancelado");
  const faturamentoHoje = atendimentosHoje.filter((a) => a.status !== "faltou").reduce((s, a) => s + (a.valor ?? 0), 0);
  const perfilIncompleto = !perfil?.nome_negocio || !perfil?.logo_url || !perfil?.telefone;

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {primeiroNome(perfil?.nome ?? "")}!</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">{formatarData(new Date(), "EEEE, dd 'de' MMMM")}</p>
      </div>

      {perfilIncompleto ? (
        <Link
          href="/perfil"
          className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 transition-colors hover:bg-primary/10"
        >
          <UserRoundPenIcon className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Complete seu perfil</p>
            <p className="text-sm text-muted-foreground">Logo, nome do negócio, WhatsApp e horários.</p>
          </div>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : null}

      {lembretes > 0 ? (
        <Link
          href="/lembretes"
          className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:hover:bg-amber-900"
        >
          <BellIcon className="size-5 shrink-0 text-amber-700 dark:text-amber-300" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {lembretes} cliente{lembretes === 1 ? "" : "s"} para lembrar
            </p>
            <p className="text-sm text-muted-foreground">Atendimentos nas próximas 48 horas ainda sem aviso.</p>
          </div>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Atendimentos hoje</CardDescription>
            <CardTitle className="text-3xl">{atendimentosHoje.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Previsto hoje</CardDescription>
            <CardTitle className="text-3xl">{formatarMoeda(faturamentoHoje)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDaysIcon className="size-4 text-primary" />
            Próximos atendimentos
          </CardTitle>
          <CardDescription>{proximos.length === 0 ? "Nada marcado daqui para frente." : "Os próximos na sua agenda."}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {proximos.length > 0 ? (
            <ul className="divide-y">
              {proximos.map((a) => (
                <li key={a.id}>
                  <Link href={`/agenda?visao=dia&data=${dataDe(a.inicio)}`} className="flex items-center gap-3 py-2.5">
                    <div className="w-16 shrink-0 text-center">
                      <p className="text-lg font-semibold tabular-nums leading-tight">{horaDe(a.inicio)}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{rotuloRelativo(dataDe(a.inicio))}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.cliente_nome}</p>
                      <p className="truncate text-sm text-muted-foreground">{a.servico_nome}</p>
                    </div>
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/agenda?novo=atendimento">
                <CalendarPlusIcon />
                Marcar atendimento
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/agenda">Ver agenda</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Link
        href="/stories"
        className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/60"
      >
        <ImagePlusIcon className="size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Criar story para o Instagram</p>
          <p className="text-sm text-muted-foreground">Horários livres do dia, da semana, do mês ou sua tabela de serviços.</p>
        </div>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </div>
  );
}
