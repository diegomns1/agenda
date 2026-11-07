import type { Metadata } from "next";
import Link from "next/link";
import { BellIcon, CalendarDaysIcon, CalendarPlusIcon, ChevronRightIcon, ImagePlusIcon, UserRoundPenIcon } from "lucide-react";
import { obterPerfil } from "@/lib/auth";
import { dataDe, formatarData, hojeISO, horaDe, rotuloRelativo } from "@/lib/datas";
import { formatarMoeda } from "@/lib/moeda";
import { primeiroNome } from "@/lib/texto";
import { PLANOS, temRecurso } from "@/lib/planos";
import { listarAgendamentosDias, listarProximosAtendimentos, listarSolicitacoesPendentes } from "@/features/agenda/queries";
import { SolicitacoesPendentes } from "@/features/agenda/components/SolicitacoesPendentes";
import { contarLembretesPendentes } from "@/features/lembretes/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Hoje" };

export default async function PaginaHoje() {
  const perfil = await obterPerfil();
  const hoje = hojeISO();
  const podeLembretes = temRecurso(perfil?.plano, "lembretes");
  const [deHoje, proximos, lembretes, solicitacoes] = await Promise.all([
    listarAgendamentosDias(hoje),
    listarProximosAtendimentos(5),
    podeLembretes ? contarLembretesPendentes() : Promise.resolve(0),
    listarSolicitacoesPendentes(),
  ]);

  const atendimentosHoje = deHoje.filter((a) => a.tipo === "atendimento" && a.status !== "cancelado");
  const faturamentoHoje = atendimentosHoje.filter((a) => a.status !== "faltou").reduce((s, a) => s + (a.valor ?? 0), 0);
  const perfilIncompleto = !perfil?.nome_negocio || !perfil?.logo_url || !perfil?.telefone;
  const hora = Number(formatarData(new Date(), "H"));
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="grid gap-5">
      {/* Capa */}
      <section className="gradiente-marca surgir relative overflow-hidden rounded-3xl p-5 text-white shadow-lg shadow-vinho/20">
        <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-6 size-44 rounded-full bg-rosa/30 blur-2xl" />
        <p className="text-sm/5 text-white/80">
          <span className="inline-block first-letter:uppercase">{formatarData(new Date(), "EEEE, dd 'de' MMMM")}</span>
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          {saudacao}, {primeiroNome(perfil?.nome ?? "")}!
        </h1>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/12 p-3 backdrop-blur-sm">
            <p className="text-xs text-white/75">Atendimentos hoje</p>
            <p className="text-3xl font-extrabold tabular-nums">{atendimentosHoje.length}</p>
          </div>
          <div className="rounded-2xl bg-white/12 p-3 backdrop-blur-sm">
            <p className="text-xs text-white/75">Previsto hoje</p>
            <p className="text-2xl font-extrabold tabular-nums">{formatarMoeda(faturamentoHoje)}</p>
          </div>
        </div>
        {perfil ? (
          <p className="mt-3 inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold">
            Plano {PLANOS[perfil.plano]?.nome ?? perfil.plano}
          </p>
        ) : null}
      </section>

      <SolicitacoesPendentes solicitacoes={solicitacoes} />

      {perfilIncompleto ? (
        <Link
          href="/perfil"
          className="cartao-vivo surgir surgir-atraso-1 flex items-center gap-3 rounded-2xl border border-primary/25 bg-card px-4 py-3"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserRoundPenIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Complete seu perfil</p>
            <p className="text-sm text-muted-foreground">Logo, nome do negócio, WhatsApp e horários.</p>
          </div>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : null}

      {lembretes > 0 ? (
        <Link
          href="/lembretes"
          className="cartao-vivo surgir surgir-atraso-1 flex items-center gap-3 rounded-2xl border border-rosa/50 bg-rosa/15 px-4 py-3"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BellIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {lembretes} cliente{lembretes === 1 ? "" : "s"} para lembrar
            </p>
            <p className="text-sm text-muted-foreground">Atendimentos nas próximas 48 horas ainda sem aviso.</p>
          </div>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : null}

      <Card className="surgir surgir-atraso-2 rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
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
                  <Link href={`/agenda?visao=dia&data=${dataDe(a.inicio)}`} className="flex items-center gap-3 py-2.5 transition-colors hover:text-primary">
                    <div className="w-16 shrink-0 rounded-xl bg-primary/8 py-1 text-center">
                      <p className="text-lg font-extrabold tabular-nums leading-tight">{horaDe(a.inicio)}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{rotuloRelativo(dataDe(a.inicio))}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{a.cliente_nome}</p>
                      <p className="truncate text-sm text-muted-foreground">{a.servico_nome}</p>
                    </div>
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button asChild className="h-10 rounded-xl px-4">
              <Link href="/agenda?novo=atendimento">
                <CalendarPlusIcon />
                Marcar atendimento
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-10 rounded-xl px-4">
              <Link href="/agenda">Ver agenda</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Link
        href="/stories"
        className="cartao-vivo surgir surgir-atraso-3 flex items-center gap-3 rounded-2xl border bg-card px-4 py-3"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-rosa/25 text-primary">
          <ImagePlusIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Criar story para o Instagram</p>
          <p className="text-sm text-muted-foreground">Horários livres do dia, da semana, do mês ou sua tabela de serviços.</p>
        </div>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </div>
  );
}
