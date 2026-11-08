import Link from "next/link";
import {
  ArrowRightIcon,
  BellRingIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronDownIcon,
  HeartIcon,
  Link2Icon,
  MessageCircleIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { Revelar } from "@/components/site/Revelar";
import { Button } from "@/components/ui/button";
import { URL_APP } from "@/lib/constantes";
import { EMAIL_CONTATO } from "@/lib/legal";
import { PLANOS, formatarPreco } from "@/lib/planos";
import { cn } from "@/lib/utils";

const CADASTRO = `${URL_APP}/cadastro`;
const LOGIN = `${URL_APP}/login`;

const PROFISSOES = ["Manicure", "Designer de sobrancelha", "Lash designer", "Cabeleireira", "Esteticista", "Massoterapeuta", "Maquiadora", "Depiladora"];

const RECURSOS = [
  {
    Icone: CalendarDaysIcon,
    titulo: "Agenda que não deixa marcar em cima",
    texto: "Dia, semana e mês na palma da mão. Marcar, remarcar, bloquear almoço ou férias. Dois horários nunca se chocam.",
  },
  {
    Icone: UsersIcon,
    titulo: "Suas clientes com histórico",
    texto: "Nome, WhatsApp, observações e tudo o que ela já fez com você. Pra lembrar da cor do esmalte sem perguntar.",
  },
  {
    Icone: BellRingIcon,
    titulo: "Lembretes que chegam no seu celular",
    texto: "Um dia antes e uma hora antes de cada atendimento. Com um toque, abre o WhatsApp da cliente com a mensagem pronta.",
  },
  {
    Icone: Link2Icon,
    titulo: "Link para a cliente marcar sozinha",
    texto: "Coloque na bio do Instagram. Ela escolhe o serviço e o horário livre; você confirma (ou deixa confirmar sozinho).",
  },
  {
    Icone: SparklesIcon,
    titulo: "Stories prontos para o Instagram",
    texto: "Horários do dia, agenda da semana, calendário do mês e tabela de valores, com a sua logo e as suas cores.",
  },
  {
    Icone: SmartphoneIcon,
    titulo: "Vira um app no seu celular",
    texto: "Sem loja de aplicativos: adicione à tela de início e pronto. Funciona no Android e no iPhone.",
  },
];

const PASSOS = [
  { n: "1", titulo: "Crie sua conta", texto: "Leva um minuto. Nome, e-mail e senha. Você testa grátis por 3 dias." },
  { n: "2", titulo: "Monte sua agenda", texto: "Cadastre seus serviços, valores e horários de atendimento. Suba sua logo e escolha suas cores." },
  { n: "3", titulo: "Compartilhe e atenda", texto: "Cole seu link na bio, poste os stories e deixe os lembretes trabalharem por você." },
];

const PLANOS_SITE = [
  {
    id: "essencial" as const,
    destaque: false,
    para: "Para organizar a agenda",
    itens: ["Agenda por dia, semana e mês", "Cadastro de clientes com histórico", "Serviços e valores", "App no celular com sua logo e cores"],
  },
  {
    id: "profissional" as const,
    destaque: true,
    para: "Para lotar a agenda sem esforço",
    itens: ["Tudo do Essencial", "Link para a cliente marcar sozinha", "Lembretes 1 dia e 1 hora antes", "WhatsApp com a mensagem pronta", "Lista do que falta avisar"],
  },
  {
    id: "premium" as const,
    destaque: false,
    para: "Para quem vive de Instagram",
    itens: ["Tudo do Profissional", "Stories do dia, da semana e do mês", "Story de serviço com foto e valor", "Temas de Natal, Outubro Rosa e mais"],
  },
];

const DUVIDAS = [
  {
    p: "Preciso instalar alguma coisa?",
    r: "Não. O Vaguinha abre no navegador do celular. Se quiser, adicione à tela de início: ele vira um app, com ícone e tudo, e passa a receber as notificações de lembrete.",
  },
  {
    p: "Funciona no iPhone?",
    r: "Sim. No iPhone, adicione à tela de início (Compartilhar → Adicionar à Tela de Início) para receber os lembretes. No Android, basta aceitar o aviso de instalar.",
  },
  {
    p: "Minhas clientes precisam baixar algo ou criar conta?",
    r: "Não. Elas abrem o seu link, escolhem o serviço e o horário, e informam o nome e o WhatsApp. Só isso.",
  },
  {
    p: "O Vaguinha manda mensagem no WhatsApp sozinho?",
    r: "Não, e isso é de propósito: mensagens automáticas podem bloquear o seu número. O Vaguinha prepara a mensagem e abre o WhatsApp da cliente; você só toca em enviar.",
  },
  {
    p: "Como funciona o pagamento?",
    r: "Você testa grátis por 3 dias, com a agenda, as clientes e os serviços. Depois, é uma assinatura mensal simples por Pix, boleto ou cartão, sem fidelidade. Você cancela quando quiser e seus dados continuam guardados.",
  },
  {
    p: "Meus dados e os das minhas clientes estão seguros?",
    r: "Sim. Cada profissional só enxerga a própria agenda, com regras aplicadas direto no banco de dados. Não vendemos dados nem entramos em contato com as suas clientes. Veja a Política de Privacidade.",
  },
];

export default function PaginaSite() {
  return (
    <>
      {/* ------------------------------------------------------------ Hero */}
      <section className="fundo-aurora">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-14 pb-16 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:pt-20 md:pb-24">
          <div className="grid gap-6">
            <span className="surgir inline-flex w-fit items-center gap-2 rounded-full border border-vinho/15 bg-card/80 px-3 py-1 text-xs font-semibold text-vinho shadow-sm">
              <HeartIcon className="size-3.5 fill-rosa text-rosa" />
              Teste grátis por 3 dias
            </span>
            <h1 className="surgir surgir-atraso-1 text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Sua agenda cheia, <span className="texto-gradiente">sem bagunça</span> no WhatsApp.
            </h1>
            <p className="surgir surgir-atraso-2 max-w-xl text-lg text-muted-foreground">
              O Vaguinha organiza horários, clientes e lembretes da profissional autônoma. E ainda deixa a cliente marcar sozinha pelo seu
              link, sem você parar o atendimento para responder.
            </p>
            <div className="surgir surgir-atraso-3 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="brilho h-12 rounded-full px-6 text-base shadow-lg shadow-vinho/25">
                <a href={CADASTRO}>
                  Começar grátis
                  <ArrowRightIcon />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6 text-base">
                <a href={LOGIN}>Já tenho conta</a>
              </Button>
            </div>
            <ul className="surgir surgir-atraso-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {["Sem cartão para testar", "Em português, feito no Brasil", "Cancele quando quiser"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <CheckIcon className="size-4 text-vinho" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <MockCelular />
        </div>
      </section>

      {/* ------------------------------------------------------- Profissões */}
      <section className="border-y border-vinho/10 bg-card/50">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:px-6">
          <p className="text-sm font-medium text-muted-foreground">Feito para quem atende sozinha</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {PROFISSOES.map((p, i) => (
              <Revelar key={p} atraso={i * 50}>
                <li className="rounded-full bg-background px-4 py-1.5 text-sm font-medium ring-1 ring-vinho/10">{p}</li>
              </Revelar>
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------- Recursos */}
      <section id="recursos" className="scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <Revelar className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Tudo o que o seu dia precisa. Nada que você não vai usar.</h2>
            <p className="mt-3 text-muted-foreground">Sem planilha, sem caderninho, sem ficar rolando conversa para achar o horário combinado.</p>
          </Revelar>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map((r, i) => (
              <Revelar key={r.titulo} atraso={(i % 3) * 90}>
                <article className="cartao-vivo h-full rounded-3xl border border-vinho/10 bg-card p-6">
                  <div className="gradiente-marca mb-4 flex size-11 items-center justify-center rounded-2xl text-white shadow-md shadow-vinho/20">
                    <r.Icone className="size-5" />
                  </div>
                  <h3 className="text-lg font-bold">{r.titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.texto}</p>
                </article>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- Link público */}
      <section className="gradiente-marca text-white">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20">
          <Revelar>
            <p className="text-sm font-semibold tracking-wide text-rosa uppercase">Seu link de agendamento</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">vaguinha.app/p/seu-nome</h2>
            <p className="mt-4 max-w-lg text-white/85">
              A cliente abre o link, vê os seus serviços e só os horários realmente livres, e pede o horário com nome e WhatsApp. Você
              recebe uma notificação e confirma com um toque. Ou deixa confirmar sozinho, se preferir.
            </p>
            <ul className="mt-6 grid gap-2 text-sm text-white/90">
              {["Página com a sua logo e as suas cores", "Nunca mostra o nome de outras clientes", "Antecedência mínima e limite de pedidos por pessoa", "Funciona na bio do Instagram e no status do WhatsApp"].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-rosa" />
                  {t}
                </li>
              ))}
            </ul>
          </Revelar>
          <Revelar atraso={120} className="mx-auto w-full max-w-sm">
            <MockLinkPublico />
          </Revelar>
        </div>
      </section>

      {/* ----------------------------------------------------- Como funciona */}
      <section id="como-funciona" className="scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <Revelar className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Pronto em três passos</h2>
            <p className="mt-3 text-muted-foreground">Você não precisa entender de tecnologia. Se usa WhatsApp, usa o Vaguinha.</p>
          </Revelar>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {PASSOS.map((p, i) => (
              <Revelar key={p.n} atraso={i * 110}>
                <li className="relative rounded-3xl border border-vinho/10 bg-card p-6 pt-8">
                  <span className="gradiente-marca absolute -top-5 left-6 flex size-10 items-center justify-center rounded-2xl text-lg font-extrabold text-white shadow-md shadow-vinho/25">
                    {p.n}
                  </span>
                  <h3 className="text-lg font-bold">{p.titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.texto}</p>
                </li>
              </Revelar>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------------------------- Planos */}
      <section id="planos" className="scroll-mt-20 border-y border-vinho/10 bg-card/50">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <Revelar className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Planos simples, preço de um esmalte</h2>
            <p className="mt-3 text-muted-foreground">
              Teste <strong className="text-foreground">grátis por 3 dias</strong> com a agenda, as clientes e os serviços. Depois, você escolhe o
              plano que faz sentido para o seu momento.
            </p>
          </Revelar>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {PLANOS_SITE.map((p, i) => {
              const plano = PLANOS[p.id];
              return (
                <Revelar key={p.id} atraso={i * 100}>
                  <article
                    className={cn(
                      "cartao-vivo relative flex h-full flex-col rounded-3xl border bg-background p-6",
                      p.destaque ? "border-vinho shadow-xl shadow-vinho/15 ring-1 ring-vinho lg:-translate-y-2" : "border-vinho/10",
                    )}
                  >
                    {p.destaque ? (
                      <span className="gradiente-marca absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-bold text-white shadow">Mais escolhido</span>
                    ) : null}
                    <p className="text-sm font-semibold text-vinho">{plano.nome}</p>
                    <p className="text-sm text-muted-foreground">{p.para}</p>
                    <p className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight">{formatarPreco(plano.preco).replace("/mês", "")}</span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </p>
                    <ul className="mt-6 grid gap-2.5 text-sm">
                      {p.itens.map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <CheckIcon className="mt-0.5 size-4 shrink-0 text-vinho" />
                          {t}
                        </li>
                      ))}
                    </ul>
                    <Button asChild className={cn("mt-8 h-11 rounded-full", !p.destaque && "bg-vinho/10 text-vinho shadow-none hover:bg-vinho/15")}>
                      <a href={CADASTRO}>Começar grátis</a>
                    </Button>
                  </article>
                </Revelar>
              );
            })}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">Valores por mês, sem fidelidade. Cancele quando quiser.</p>
        </div>
      </section>

      {/* ---------------------------------------------------------- Dúvidas */}
      <section id="duvidas" className="scroll-mt-20">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 md:py-24">
          <Revelar className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Dúvidas comuns</h2>
          </Revelar>
          <div className="mt-10 grid gap-3">
            {DUVIDAS.map((d, i) => (
              <Revelar key={d.p} atraso={i * 60}>
                <details className="group rounded-2xl border border-vinho/10 bg-card px-5 py-4 open:shadow-md open:shadow-vinho/10">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                    {d.p}
                    <ChevronDownIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {d.r}
                    {d.p.startsWith("Meus dados") ? (
                      <>
                        {" "}
                        <Link href="/privacidade" className="text-vinho underline underline-offset-4">
                          Ler a política
                        </Link>
                        .
                      </>
                    ) : null}
                  </p>
                </details>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- CTA final */}
      <section className="fundo-aurora border-t border-vinho/10">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6">
          <Revelar>
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-card shadow-md ring-1 ring-vinho/10">
              <ShieldCheckIcon className="size-7 text-vinho" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Comece hoje. Sua agenda agradece amanhã.</h2>
            <p className="mt-3 text-muted-foreground">Crie a conta, cadastre seus serviços e compartilhe o link. Em dez minutos está no ar.</p>
          </Revelar>
          <Revelar atraso={120} className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-12 rounded-full px-7 text-base shadow-lg shadow-vinho/25">
              <a href={CADASTRO}>
                Criar minha conta grátis
                <ArrowRightIcon />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6 text-base">
              <a href={`mailto:${EMAIL_CONTATO}`}>
                <MessageCircleIcon />
                Falar com a gente
              </a>
            </Button>
          </Revelar>
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* Ilustrações feitas em CSS (sem imagens): celular com a tela "Hoje" e   */
/* o link público. Dados fictícios.                                       */
/* ---------------------------------------------------------------------- */

function MockCelular() {
  const atendimentos = [
    { hora: "09:00", nome: "Juliana", servico: "Manicure", cor: "bg-vinho" },
    { hora: "10:30", nome: "Camila", servico: "Pé e mão", cor: "bg-rosa" },
    { hora: "14:00", nome: "Renata", servico: "Alongamento em gel", cor: "bg-vinho/70" },
  ];
  return (
    <div className="surgir surgir-atraso-2 relative mx-auto w-full max-w-[300px] md:justify-self-end">
      {/* cartão flutuante: pedido pelo link */}
      <div className="flutuar absolute -top-6 -left-6 z-10 hidden w-56 rounded-2xl bg-card p-3 shadow-xl ring-1 ring-vinho/10 sm:block" style={{ animationDelay: "1s" }}>
        <div className="flex items-center gap-2">
          <span className="pulsar-suave flex size-8 shrink-0 items-center justify-center rounded-full bg-rosa/30 text-vinho">
            <Link2Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Novo pedido pelo link</p>
            <p className="truncate text-[11px] text-muted-foreground">Beatriz · quinta, 15:30</p>
          </div>
        </div>
      </div>
      {/* cartão flutuante: lembrete */}
      <div className="flutuar absolute -right-4 bottom-16 z-10 hidden w-52 rounded-2xl bg-card p-3 shadow-xl ring-1 ring-vinho/10 sm:block" style={{ animationDelay: "2.2s" }}>
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <BellRingIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Amanhã: Juliana às 09:00</p>
            <p className="truncate text-[11px] text-muted-foreground">Toque para lembrar a cliente</p>
          </div>
        </div>
      </div>

      {/* o celular */}
      <div className="celular-moldura overflow-hidden rounded-[2.4rem] bg-background">
        <div className="flex items-center justify-between px-5 pt-4 pb-2 text-[11px] text-muted-foreground">
          <span>9:41</span>
          <span className="h-4 w-16 rounded-full bg-[#1f1f23]" aria-hidden="true" />
          <span>100%</span>
        </div>
        <div className="flex items-center gap-2 px-4 pb-3">
          <span className="gradiente-marca flex size-8 items-center justify-center rounded-full text-sm font-extrabold text-white">A</span>
          <div>
            <p className="text-xs text-muted-foreground">Bom dia,</p>
            <p className="-mt-0.5 text-sm font-bold">Ana · Studio Nails</p>
          </div>
        </div>
        <div className="mx-4 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-vinho/10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Hoje</p>
            <span className="rounded-full bg-vinho/10 px-2 py-0.5 text-[10px] font-bold text-vinho">3 atendimentos</span>
          </div>
          <ul className="mt-2 grid gap-1.5">
            {atendimentos.map((a) => (
              <li key={a.hora} className="flex items-center gap-2 rounded-xl bg-background px-2.5 py-2">
                <span className={cn("h-7 w-1 rounded-full", a.cor)} />
                <span className="w-10 text-xs font-bold tabular-nums">{a.hora}</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{a.nome}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{a.servico}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-card p-3 ring-1 ring-vinho/10">
            <p className="text-[10px] text-muted-foreground">Esta semana</p>
            <p className="text-lg font-extrabold">14</p>
            <p className="text-[10px] text-muted-foreground">horários marcados</p>
          </div>
          <div className="gradiente-marca rounded-2xl p-3 text-white">
            <p className="text-[10px] text-white/80">Livres hoje</p>
            <p className="text-lg font-extrabold">4</p>
            <p className="text-[10px] text-white/80">postar nos stories</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-around border-t border-vinho/10 px-2 py-3 text-[10px] text-muted-foreground">
          {[
            ["Hoje", true],
            ["Agenda", false],
            ["Clientes", false],
            ["Stories", false],
          ].map(([n, ativo]) => (
            <span key={String(n)} className={cn("rounded-full px-2 py-1", ativo && "bg-vinho/10 font-bold text-vinho")}>
              {n}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockLinkPublico() {
  const horarios = ["09:00", "09:30", "11:00", "14:00", "15:30", "16:00"];
  return (
    <div className="rounded-3xl bg-background p-4 text-foreground shadow-2xl shadow-black/30 ring-1 ring-white/20">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-vinho text-base font-extrabold text-white">A</span>
        <div>
          <p className="text-sm font-bold">Studio Ana Nails</p>
          <p className="text-xs text-muted-foreground">@studioananails</p>
        </div>
      </div>
      <div className="mt-4 flex gap-1 text-[10px] font-semibold text-muted-foreground">
        <span className="rounded-full bg-vinho px-2 py-0.5 text-white">1 Serviço</span>
        <span className="rounded-full bg-vinho/15 px-2 py-0.5 text-vinho">2 Dia e hora</span>
        <span className="rounded-full px-2 py-0.5">3 Seus dados</span>
      </div>
      <p className="mt-3 text-xs font-semibold">Quinta, 13 de novembro</p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {horarios.map((h, i) => (
          <span key={h} className={cn("rounded-xl border py-1.5 text-center text-xs font-semibold tabular-nums", i === 4 ? "border-vinho bg-vinho text-white" : "border-vinho/15 bg-card")}>
            {h}
          </span>
        ))}
      </div>
      <div className="mt-3 rounded-2xl bg-card p-3 ring-1 ring-vinho/10">
        <p className="text-[11px] text-muted-foreground">Manicure · 45 min · R$ 55,00</p>
        <p className="text-sm font-bold">Quinta às 15:30</p>
      </div>
      <div className="mt-3 flex h-10 items-center justify-center rounded-full bg-vinho text-sm font-bold text-white">Pedir este horário</div>
    </div>
  );
}
