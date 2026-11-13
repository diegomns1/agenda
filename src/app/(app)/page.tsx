import type { Metadata } from "next";
import Link from "next/link";
import { BellIcon, CalendarDaysIcon, CalendarPlusIcon, ChartColumnIcon, ChevronRightIcon, ImagePlusIcon, LockIcon, UserRoundPenIcon } from "lucide-react";
import { BotMessageSquareIcon, BriefcaseIcon } from "lucide-react";
import { termosDoRamo } from "@/lib/ramos";
import { listarVagas } from "@/features/relatorios/vagas";
import { resumoDoMes } from "@/features/relatorios/dados";
import { VagasAbertas } from "@/features/relatorios/components/VagasAbertas";
import { obterPerfil } from "@/lib/auth";
import { estadoWhatsApp } from "@/features/whatsapp/estado";
import { IconeWhatsApp } from "@/components/marca/IconeWhatsApp";
import { dataDe, formatarData, hojeISO, horaDe, rotuloRelativo } from "@/lib/datas";
import { formatarMoeda } from "@/lib/moeda";
import { primeiroNome } from "@/lib/texto";
import { PLANOS, temRecurso } from "@/lib/planos";
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
  const [deHoje, proximos, lembretes, solicitacoes, vagas, resumo, whatsapp, nServicos, nClientes, nAtendimentos] = await Promise.all([
    listarAgendamentosDias(hoje),
    listarProximosAtendimentos(5),
    podeLembretes ? contarLembretesPendentes() : Promise.resolve(0),
    listarSolicitacoesPendentes(),
    podeRelatorios ? listarVagas() : Promise.resolve([]),
    podeRelatorios ? resumoDoMes().catch(() => null) : Promise.resolve(null),
    estadoWhatsApp().catch(() => ({ via: "painel" as const })),
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
      texto: "Nome do negócio, WhatsApp e horário de atendimento.",
      href: "/perfil",
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
  const hora = Number(formatarData(new Date(), "H"));
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="grid gap-5">
      {/* Capa */}
      <section className="gradiente-marca surgir relative overflow-hidden rounded-3xl p-5 text-white shadow-alta">
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
            <p className="text-xs text-white/75">{termos.Varios} hoje</p>
            <p className="text-3xl font-extrabold tabular-nums">{atendimentosHoje.length}</p>
          </div>
          <div className="rounded-2xl bg-white/12 p-3 backdrop-blur-sm">
            <p className="text-xs text-white/75">Previsto hoje</p>
            <p className="text-2xl font-extrabold tabular-nums">{formatarMoeda(faturamentoHoje)}</p>
          </div>
        </div>
        {perfil ? (
          <p className="mt-3 inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-mini font-semibold">
            Plano {PLANOS[perfil.plano]?.nome ?? perfil.plano}
          </p>
        ) : null}
      </section>

      <PrimeirosPassos passos={passos} estado={estadoPassos} />

      <SolicitacoesPendentes solicitacoes={solicitacoes} />

      <VagasAbertas vagas={vagas} />

      {semRamo ? (
        <Link
          href="/perfil#ramo"
          className="cartao-vivo surgir surgir-atraso-1 flex items-center gap-3 rounded-2xl border border-primary/25 bg-card px-4 py-3"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BriefcaseIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Conte qual é o seu ramo</p>
            <p className="text-sm text-muted-foreground">O painel ajusta as palavras e as sugestões de serviço, e você escolhe as cores.</p>
          </div>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : null}

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

      {whatsapp.via === "painel" ? (
        <Link
          href="/assistente"
          className="cartao-vivo surgir surgir-atraso-3 flex items-center gap-3 rounded-2xl border border-primary/20 bg-card px-4 py-3"
        >
          <span className="gradiente-marca flex size-10 items-center justify-center rounded-xl text-white">
            <BotMessageSquareIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Assistente de IA</p>
            <p className="text-sm text-muted-foreground">&quot;Muda a Bruna para sexta às 15h&quot;: peça escrevendo e só confirme.</p>
          </div>
          {podeRelatorios ? (
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <LockIcon className="size-4 shrink-0 text-muted-foreground" />
          )}
        </Link>
      ) : (
        <a
          href={whatsapp.via === "whatsapp" ? whatsapp.link : "/perfil#whatsapp"}
          {...(whatsapp.via === "whatsapp" ? { target: "_blank", rel: "noopener" } : {})}
          className="cartao-vivo surgir surgir-atraso-3 flex items-center gap-3 rounded-2xl border border-whatsapp/30 bg-card px-4 py-3"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-whatsapp text-white">
            <IconeWhatsApp className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{whatsapp.via === "whatsapp" ? "Assistente no WhatsApp" : "Sua assistente agora no WhatsApp"}</p>
            <p className="text-sm text-muted-foreground">
              {whatsapp.via === "whatsapp"
                ? `Mande mensagem para a Vaguinha, ${whatsapp.numero}: "marca a Duda sexta às 11h".`
                : "Conecte seu WhatsApp e peça marcações, remarcações e cadastros sem abrir o app."}
            </p>
          </div>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </a>
      )}

      <Link
        href="/relatorios"
        className="cartao-vivo surgir surgir-atraso-3 flex items-center gap-3 rounded-2xl border bg-card px-4 py-3"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ChartColumnIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Relatório do mês</p>
          <p className="text-sm text-muted-foreground">
            {resumo
              ? `${formatarMoeda(resumo.faturamento)} em ${resumo.atendimentos} atendimento${resumo.atendimentos === 1 ? "" : "s"} até agora${resumo.previsto > 0 ? ` · ${formatarMoeda(resumo.previsto)} ainda marcados` : ""}.`
              : "Quanto entrou, quem desmarcou, quem remarcou e a comparação com o mês anterior."}
          </p>
        </div>
        {podeRelatorios ? (
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <LockIcon className="size-4 shrink-0 text-muted-foreground" />
        )}
      </Link>

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
