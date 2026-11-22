import type { Metadata } from "next";
import Link from "next/link";
import { BellIcon, BriefcaseIcon, CalendarDaysIcon, CalendarPlusIcon, ChartColumnIcon, ChevronRightIcon, UserRoundPenIcon, type LucideIcon } from "lucide-react";
import { obterRamo, termosDoRamo } from "@/lib/ramos";
import { SERVICOS_SUGERIDOS } from "@/features/servicos/schema";
import { ComecarComSugeridos } from "@/features/servicos/components/ComecarComSugeridos";
import { listarVagas } from "@/features/relatorios/vagas";
import { resumoDoMes } from "@/features/relatorios/dados";
import { VagasAbertas } from "@/features/relatorios/components/VagasAbertas";
import { obterPerfil } from "@/lib/auth";
import { dataDe, formatarData, hojeISO, horaDe, rotuloRelativo } from "@/lib/datas";
import { formatarMoeda } from "@/lib/moeda";
import { primeiroNome } from "@/lib/texto";
import { temRecurso } from "@/lib/planos";
import { listarAgendamentosDias, listarProximosAtendimentos, listarSolicitacoesPendentes } from "@/features/agenda/queries";
import { SolicitacoesPendentes } from "@/features/agenda/components/SolicitacoesPendentes";
import { contarLembretesPendentes } from "@/features/lembretes/queries";
import { Button } from "@/components/ui/button";
import { criarClienteServidor } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { PrimeirosPassos } from "@/features/tutoriais/components/PrimeirosPassos";
import { COOKIE_PASSOS, lerEstadoPassos, type Passo } from "@/features/tutoriais/passos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Hoje" };

export default async function PaginaHoje() {
  const perfil = await obterPerfil();
  const hoje = hojeISO();
  const podeLembretes = temRecurso(perfil?.plano, "lembretes");
  const podeRelatorios = temRecurso(perfil?.plano, "relatorios");
  const supabase = await criarClienteServidor();
  const contar = async (tabela: "servicos" | "clientes" | "agendamentos") => {
    const r =
      tabela === "agendamentos"
        ? await supabase.from("agendamentos").select("id", { count: "exact", head: true }).eq("tipo", "atendimento")
        : await supabase.from(tabela).select("id", { count: "exact", head: true });
    return r.count ?? 0;
  };
  const [deHoje, proximos, lembretes, solicitacoes, vagas, resumo, nServicos, nClientes, nAtendimentos] = await Promise.all([
    listarAgendamentosDias(hoje),
    listarProximosAtendimentos(5),
    podeLembretes ? contarLembretesPendentes() : Promise.resolve(0),
    listarSolicitacoesPendentes(),
    podeRelatorios ? listarVagas() : Promise.resolve([]),
    podeRelatorios ? resumoDoMes().catch(() => null) : Promise.resolve(null),
    contar("servicos"),
    contar("clientes"),
    contar("agendamentos"),
  ]);

  const termos = termosDoRamo(perfil?.ramo);
  const semRamo = Boolean(perfil && !perfil.ramo);
  const atendimentosHoje = deHoje.filter((a) => a.tipo === "atendimento" && a.status !== "cancelado");
  const faturamentoHoje = atendimentosHoje.filter((a) => a.status !== "faltou").reduce((s, a) => s + (a.valor ?? 0), 0);
  const estadoPassos = lerEstadoPassos((await cookies()).get(COOKIE_PASSOS)?.value);
  const passos: Passo[] = [
    {
      id: "dados",
      feito: Boolean(perfil?.nome_negocio && perfil?.telefone),
      titulo: "Seus dados",
      texto: "Nome do negócio, WhatsApp e endereço.",
      href: "/perfil/dados",
      botao: "Preencher",
    },
    { id: "servicos", feito: nServicos > 0, titulo: "Seus serviços", texto: "Cada serviço com o tempo que leva e o valor.", href: "/servicos", botao: "Cadastrar" },
    {
      id: "clientes",
      feito: nClientes > 0,
      titulo: "Seus clientes",
      texto: "Cadastre os clientes que você mais atende (nome e WhatsApp).",
      href: "/clientes",
      botao: "Cadastrar",
      extra: { href: "/agenda/importar", rotulo: "Usa o Google Agenda? Importar tudo de uma vez" },
    },
    { id: "horario", feito: nAtendimentos > 0, titulo: "Primeiro horário", texto: "Marque um atendimento na agenda.", href: "/agenda?novo=atendimento", botao: "Marcar" },
  ];
  const comecando = !estadoPassos.oculto && passos.some((p) => !p.feito && !estadoPassos.pulados.includes(p.id));
  // o "Complete seu perfil" (logo) só aparece depois dos primeiros passos, para não competir com eles
  const perfilIncompleto = !comecando && (!perfil?.nome_negocio || !perfil?.logo_url || !perfil?.telefone);
  // avisos que pedem uma ação: um cartão só, uma linha por aviso (antes eram vários cartões soltos)
  const resolver: { href: string; Icone: LucideIcon; titulo: string; texto: string }[] = [];
  if (lembretes > 0) {
    resolver.push({
      href: "/lembretes",
      Icone: BellIcon,
      titulo: `${lembretes} cliente${lembretes === 1 ? "" : "s"} para lembrar`,
      texto: "Atendimentos das próximas 48 horas ainda sem aviso.",
    });
  }
  if (semRamo) resolver.push({ href: "/perfil/dados", Icone: BriefcaseIcon, titulo: "Conte qual é o seu ramo", texto: "O painel ajusta as palavras e as sugestões de serviço." });
  if (perfilIncompleto) resolver.push({ href: "/perfil/dados", Icone: UserRoundPenIcon, titulo: "Complete seus dados", texto: "Logo, nome do negócio e WhatsApp." });
  const hora = Number(formatarData(new Date(), "H"));
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="grid gap-5">
      {/* Capa: saudação e os números do dia */}
      <section className="gradiente-marca surgir relative overflow-hidden rounded-3xl p-5 text-white shadow-alta">
        <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/10 blur-2xl" />
        <p className="text-sm/5 text-white/80">
          <span className="inline-block first-letter:uppercase">{formatarData(new Date(), "EEEE, dd 'de' MMMM")}</span>
        </p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight">
          {saudacao}, {primeiroNome(perfil?.nome ?? "")}!
        </h1>
        <dl className="mt-4 flex gap-6">
          <div>
            <dt className="text-xs text-white/75">{termos.Varios} hoje</dt>
            <dd className="text-2xl font-extrabold tabular-nums">{atendimentosHoje.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/75">Previsto hoje</dt>
            <dd className="text-2xl font-extrabold tabular-nums">{formatarMoeda(faturamentoHoje)}</dd>
          </div>
        </dl>
        {resumo ? (
          <Link
            href="/relatorios"
            className="mt-4 flex min-h-toque items-center gap-2 rounded-2xl bg-white/12 px-3 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <ChartColumnIcon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              No mês: <strong className="tabular-nums">{formatarMoeda(resumo.faturamento)}</strong> em {resumo.atendimentos} atendimento
              {resumo.atendimentos === 1 ? "" : "s"}
            </span>
            <ChevronRightIcon className="size-4 shrink-0 opacity-80" />
          </Link>
        ) : null}
      </section>

      {/* sem nenhum serviço: os do ramo dela, com um toque (o primeiro passo que mais travava) */}
      {nServicos === 0 ? (
        <ComecarComSugeridos
          sugestoes={obterRamo(perfil?.ramo)?.sugestoes ?? SERVICOS_SUGERIDOS}
          ramo={obterRamo(perfil?.ramo)?.nome.toLowerCase() ?? null}
        />
      ) : null}

      <PrimeirosPassos passos={passos} estado={estadoPassos} />

      <SolicitacoesPendentes solicitacoes={solicitacoes} />

      <Card className="surgir surgir-atraso-1 rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDaysIcon className="size-4 text-primary" />
            {termos.proximos}
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
                      <p className="text-mini text-muted-foreground first-letter:uppercase">{rotuloRelativo(dataDe(a.inicio))}</p>
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
            <Button asChild className="h-toque rounded-xl px-4 sm:h-10">
              <Link href="/agenda?novo=atendimento">
                <CalendarPlusIcon />
                {termos.marcar}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-toque rounded-xl px-4 sm:h-10">
              <Link href="/agenda">Ver agenda</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <VagasAbertas vagas={vagas} />

      {resolver.length ? (
        <section aria-labelledby="para-resolver" className="surgir surgir-atraso-2 grid gap-2">
          <h2 id="para-resolver" className="px-1 text-sm font-semibold text-muted-foreground">
            Para resolver
          </h2>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {resolver.map(({ href, Icone, titulo, texto }) => (
              <li key={titulo}>
                <Link href={href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icone className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{titulo}</span>
                    <span className="block text-sm text-muted-foreground">{texto}</span>
                  </span>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
