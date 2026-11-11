import Link from "next/link";
import { ArrowRightIcon, BellRingIcon, CheckIcon, ChevronDownIcon, FileTextIcon, Link2Icon, MailIcon } from "lucide-react";
import { IconeWhatsApp } from "@/components/marca/IconeWhatsApp";
import { Button } from "@/components/ui/button";
import { ACAO_PRINCIPAL_SITE as ACAO_PRINCIPAL, URL_APP } from "@/lib/constantes";
import { EMAIL_CONTATO } from "@/lib/legal";
import { PLANOS, formatarPreco } from "@/lib/planos";
import { cn } from "@/lib/utils";

/*
 * Site público (etapa 5 do plano de design, com as regras da Taste Skill):
 * - o título diz o que é e para quem; a primeira tela tem um fato concreto (3 dias grátis, R$ 29,90);
 * - uma ação principal com o mesmo texto no menu, no topo e no fim ("Começar o teste grátis");
 * - nada aparece "surgindo" ao rolar; só o topo entra uma vez ao carregar; cartões sobem 2px no hover;
 * - cada recurso mostra um pedaço da tela real em vez de ícone genérico;
 * - a aprovação do cadastro é dita com clareza (é o que a pessoa vai encontrar).
 */

const CADASTRO = `${URL_APP}/cadastro`;
const LOGIN = `${URL_APP}/login`;

const PROFISSOES = [
  "Manicure",
  "Barbearia",
  "Salão de beleza",
  "Sobrancelha e cílios",
  "Estética",
  "Massoterapia",
  "Tatuagem",
  "Personal trainer",
  "Nutrição",
  "Psicologia",
];

const PASSOS = [
  {
    titulo: "Crie a conta",
    texto: "Nome, ramo, e-mail e senha. Uma pessoa confere cada cadastro e libera o acesso; o teste de 3 dias começa nesse dia.",
  },
  { titulo: "Monte a agenda", texto: "Cadastre serviços, valores e horários de atendimento. Suba a logo e escolha as cores." },
  { titulo: "Divulgue o link", texto: "Coloque o link na bio, poste os stories e deixe os lembretes avisarem você." },
];

const PLANOS_SITE = [
  {
    id: "essencial" as const,
    destaque: false,
    para: "Para organizar a agenda.",
    itens: ["Agenda por dia, semana e mês", "Clientes com histórico", "Serviços e valores", "Importar do Google Agenda", "App no celular com sua logo e cores"],
  },
  {
    id: "profissional" as const,
    destaque: false,
    para: "Para clientes pedirem horário pelo link e receberem lembrete.",
    itens: ["Tudo do Essencial", "Link de agendamento", "Lembrete 1 dia e 1 hora antes", "WhatsApp com a mensagem pronta", "Lista de quem falta avisar"],
  },
  {
    id: "premium" as const,
    destaque: true,
    para: "Para divulgar horários vagos e ter uma assistente no WhatsApp.",
    itens: [
      "Tudo do Profissional",
      "Assistente de IA no seu WhatsApp",
      "Stories do dia, da semana e do mês",
      "Story do horário que vagou",
      "Story de serviço com foto e valor",
      "Relatório do mês: quanto entrou, faltas e remarcações",
    ],
  },
];

const DUVIDAS = [
  {
    p: "Por que o cadastro passa por aprovação?",
    r: "Uma pessoa da equipe confere cada cadastro antes de liberar o acesso, para o Vaguinha ter só profissionais de verdade. Você recebe um e-mail quando a conta for liberada, e o teste de 3 dias começa nesse dia.",
  },
  {
    p: "Preciso instalar alguma coisa?",
    r: "Não. O Vaguinha abre no navegador do celular. Se quiser, adicione à tela de início: ele vira um app, com ícone, e passa a receber as notificações de lembrete.",
  },
  {
    p: "Funciona no iPhone?",
    r: "Sim. No iPhone, toque em Compartilhar → Adicionar à Tela de Início para receber os lembretes. No Android, basta aceitar o aviso de instalar.",
  },
  {
    p: "Meus clientes precisam baixar algo ou criar conta?",
    r: "Não. Eles abrem o seu link, escolhem o serviço e o horário, e informam o nome e o WhatsApp.",
  },
  {
    p: "Como funciona a assistente no WhatsApp?",
    r: "No plano Premium, você conecta o seu WhatsApp no painel (em Perfil) e passa a conversar com a Vaguinha pelo número oficial dela. Ela consulta e muda a sua agenda, mas sempre pede o seu Confirmar antes. Ela conversa só com você, nunca com os seus clientes.",
  },
  {
    p: "O Vaguinha manda mensagem para os meus clientes sozinho?",
    r: "Não. Mensagem automática pode bloquear o seu número. O Vaguinha prepara o texto e abre o WhatsApp do cliente; você toca em enviar.",
  },
  {
    p: "Dá para trazer a agenda que eu uso no Google?",
    r: "Dá. No Google Agenda, exporte o arquivo (Configurações → Importar e exportar) e envie no Vaguinha em Agenda → Importar. Os compromissos entram de uma vez, sem digitar um por um.",
  },
  {
    p: "Como funciona o pagamento?",
    r: "O teste de 3 dias é grátis e não pede cartão. Depois, a assinatura é mensal, por Pix ou cartão de crédito, sem fidelidade. Se cancelar, seus dados continuam guardados.",
  },
  {
    p: "Meus dados e os dos meus clientes estão seguros?",
    r: "Cada profissional só enxerga a própria agenda, com regras aplicadas direto no banco de dados. Não vendemos dados nem entramos em contato com os seus clientes.",
  },
];

/** Altura de uma tela menos o cabeçalho fixo (64px). */
const TELA = "md:min-h-[calc(100svh-4rem)]";

export default function PaginaSite() {
  return (
    <>
      {/* ------------------------------------------------------------ Topo */}
      <section className={cn("fundo-aurora before:animate-none after:animate-none", "flex items-center md:min-h-[calc(100svh-4rem)]")}>
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:py-16">
          <div className="grid gap-6">
            <a
              href="#assistente"
              className="surgir inline-flex w-fit items-center gap-2 rounded-full border border-whatsapp/30 bg-background/70 py-1 pr-3 pl-1 text-sm font-semibold text-foreground backdrop-blur hover:bg-background"
            >
              <span className="rounded-full bg-whatsapp px-2 py-0.5 text-mini font-bold text-white">Novidade</span>
              Sua assistente agora no WhatsApp
              <ArrowRightIcon className="size-3.5" />
            </a>
            <h1 className="surgir text-4xl leading-[1.08] font-extrabold tracking-tight text-balance sm:text-5xl md:text-[3.5rem]">
              Agenda no celular para profissionais de beleza e saúde
            </h1>
            <p className="surgir surgir-atraso-1 max-w-xl text-lg text-pretty text-muted-foreground">
              Marque, remarque e bloqueie horários, guarde o histórico de cada cliente e deixe seus clientes pedirem horário pelo seu link, sem
              parar o atendimento para responder.
            </p>
            <div className="surgir surgir-atraso-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="brilho h-12 rounded-full px-6 text-base shadow-lg shadow-vinho/25 sm:h-12">
                <a href={CADASTRO}>
                  {ACAO_PRINCIPAL}
                  <ArrowRightIcon />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6 text-base sm:h-12">
                <a href={LOGIN}>Entrar no painel</a>
              </Button>
            </div>
            <p className="surgir surgir-atraso-3 text-sm text-muted-foreground">
              <strong className="font-semibold text-foreground">3 dias grátis.</strong> Depois, planos a partir de{" "}
              <strong className="font-semibold text-foreground">{formatarPreco(PLANOS.essencial.preco).replace("/mês", "")} por mês</strong>,
              por Pix ou cartão de crédito.
            </p>
          </div>

          <MockCelular />
        </div>
      </section>

      {/* --------------------------------------------------------- Recursos */}
      <section id="recursos" className={cn("flex scroll-mt-16 items-center border-t border-vinho/10 bg-card/50", TELA)}>
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">O que o Vaguinha faz no seu dia</h2>
            <p className="mt-3 text-muted-foreground">Tudo o que hoje fica espalhado entre caderninho, print e conversa de WhatsApp.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Recurso titulo="Impede dois clientes no mesmo horário" texto="Dia, semana e mês como no Google Agenda, com feriados. O horário ocupado fica recusado.">
              <FragmentoConflito />
            </Recurso>
            <Recurso titulo="Guarda o histórico de cada cliente" texto="WhatsApp, observações e tudo o que já foi feito: a cor, o corte, a alergia.">
              <FragmentoHistorico />
            </Recurso>
            <Recurso titulo="Avisa você um dia e uma hora antes" texto="A notificação chega no celular e abre o WhatsApp do cliente com a mensagem pronta.">
              <FragmentoLembrete />
            </Recurso>
            <Recurso titulo="Traz sua agenda do Google" texto="Envie o arquivo exportado do Google Agenda e os compromissos entram de uma vez.">
              <FragmentoImportar />
            </Recurso>
            <Recurso titulo="Monta stories dos horários livres" texto="Dia, semana ou só o horário que vagou, com a sua logo e 16 temas para escolher.">
              <FragmentoStory />
            </Recurso>
            <Recurso titulo="Abre como app no celular" texto="Adicione à tela de início, sem loja de aplicativos. Funciona no Android e no iPhone.">
              <FragmentoApp />
            </Recurso>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- Link público */}
      <section id="link" className={cn("gradiente-marca flex scroll-mt-16 items-center text-white", TELA)}>
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Seu link de agendamento</h2>
            <p className="mt-2 text-xl font-bold text-rosa">vaguinha.app/p/seu-nome</p>
            <p className="mt-4 max-w-lg text-white/85">
              O cliente abre o link, escolhe o serviço, vê só os horários livres e pede com nome e WhatsApp. Você confirma com um toque ou deixa
              confirmar sozinho.
            </p>
            <ul className="mt-6 grid gap-2.5 text-sm text-white/90">
              {[
                "Página com a sua logo e as suas cores",
                "Nunca mostra o nome de outros clientes",
                "Antecedência mínima e limite de pedidos por pessoa",
                "Cabe na bio do Instagram e no status do WhatsApp",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-rosa" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <MockLinkPublico />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- Assistente de IA */}
      <section id="assistente" className={cn("flex scroll-mt-16 items-center", TELA)}>
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-bold text-whatsapp">
              <IconeWhatsApp className="size-4" />
              Novidade · plano Premium
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Uma assistente no seu WhatsApp</h2>
            <p className="mt-4 max-w-lg text-pretty text-muted-foreground">
              Mande mensagem para a Vaguinha como mandaria para uma recepcionista. Ela olha a sua agenda, prepara a mudança e só aplica depois do
              seu Confirmar. Tudo entre um atendimento e outro, sem abrir o app.
            </p>
            <ul className="mt-6 grid gap-2 text-sm">
              {[
                "“Marca a Duda sexta às 11h, alongamento”",
                "“Quem eu atendo amanhã?”",
                "“Cadastra a Bia, 14 99999-8888”",
                "“Bloqueia minha tarde de quinta, vou ao médico”",
              ].map((t) => (
                <li key={t} className="w-fit rounded-2xl rounded-br-md bg-whatsapp/10 px-3 py-2">
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-lg text-sm text-muted-foreground">
              Prefere o painel? A mesma assistente também funciona dentro do app, por escrito ou por voz.
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-md pb-24 sm:pb-16">
            <div className="overflow-hidden rounded-3xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/site/cabeleireira.webp"
                alt="Cabeleireira falando com a assistente pelo celular entre um atendimento e outro"
                width={720}
                height={900}
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] h-auto w-full object-cover"
              />
            </div>
            <div className="absolute right-0 bottom-0 left-6 sm:-right-6 sm:left-auto sm:w-80">
              <MockAssistente />
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- Como funciona */}
      <section id="como-funciona" className={cn("flex scroll-mt-16 items-center border-y border-vinho/10 bg-card/50", TELA)}>
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Do cadastro ao primeiro horário pelo link</h2>
            <p className="mt-3 text-muted-foreground">Se você usa WhatsApp, consegue usar o Vaguinha.</p>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="rounded-3xl border border-vinho/10 bg-background p-6">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-vinho text-lg font-extrabold text-white">{i + 1}</span>
                <h3 className="mt-4 text-lg font-bold">{p.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.texto}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <h3 className="text-sm font-semibold">Ramos que você escolhe no cadastro (e outros)</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {PROFISSOES.map((p) => (
                <li key={p} className="rounded-full bg-background px-4 py-1.5 text-sm font-medium ring-1 ring-vinho/10">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- Planos */}
      <section id="planos" className={cn("flex scroll-mt-16 items-center", TELA)}>
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
              Planos a partir de {formatarPreco(PLANOS.essencial.preco).replace("/mês", "")} por mês
            </h2>
            <p className="mt-3 text-muted-foreground">
              O teste grátis tem a agenda, os clientes e os serviços. Depois, você escolhe o plano no painel e paga por Pix ou cartão de crédito,
              sem fidelidade.
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {PLANOS_SITE.map((p) => {
              const plano = PLANOS[p.id];
              return (
                <article
                  key={p.id}
                  className={cn(
                    "relative flex h-full flex-col rounded-3xl border bg-card p-6",
                    p.destaque ? "border-vinho shadow-alta ring-1 ring-vinho" : "border-vinho/10",
                  )}
                >
                  {p.destaque ? (
                    <span className="absolute -top-3 left-6 rounded-full bg-vinho px-3 py-1 text-xs font-bold text-white">Mais escolhido</span>
                  ) : null}
                  <h3 className="text-lg font-bold text-vinho">{plano.nome}</h3>
                  <p className="text-sm text-muted-foreground">{p.para}</p>
                  <p className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight tabular-nums">{formatarPreco(plano.preco).replace("/mês", "")}</span>
                    <span className="text-sm text-muted-foreground">por mês</span>
                  </p>
                  <ul className="mt-6 grid gap-2.5 text-sm">
                    {p.itens.map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <CheckIcon className="mt-0.5 size-4 shrink-0 text-vinho" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            O plano é escolhido depois do teste, dentro do painel, em <strong className="font-semibold text-foreground">Assinatura</strong>. Sem
            fidelidade: cancele quando quiser.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- Dúvidas */}
      <section id="duvidas" className="scroll-mt-16 border-t border-vinho/10 bg-card/50">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[0.8fr_1.2fr] md:py-24">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Perguntas frequentes</h2>
            <p className="mt-3 text-muted-foreground">
              Não achou a sua?{" "}
              <a href={`mailto:${EMAIL_CONTATO}`} className="font-semibold text-vinho underline underline-offset-4">
                Escreva para {EMAIL_CONTATO}
              </a>
              .
            </p>
          </div>
          <div className="grid content-start gap-3">
            {DUVIDAS.map((d) => (
              <details key={d.p} className="group rounded-2xl border border-vinho/10 bg-background px-5 open:shadow-media">
                <summary className="flex min-h-toque cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
                  {d.p}
                  <ChevronDownIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
                  {d.r}
                  {d.p.startsWith("Meus dados") ? (
                    <>
                      {" "}
                      <Link href="/privacidade" className="text-vinho underline underline-offset-4">
                        Ler a Política de Privacidade
                      </Link>
                      .
                    </>
                  ) : null}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- Fim */}
      <section className="border-t border-vinho/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-6 md:flex-row md:items-end md:justify-between md:py-28">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">Teste o Vaguinha grátis por 3 dias</h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Sem cartão para começar. Depois do teste, planos a partir de {formatarPreco(PLANOS.essencial.preco).replace("/mês", "")} por mês.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full px-7 text-base shadow-lg shadow-vinho/25 sm:h-12">
              <a href={CADASTRO}>
                {ACAO_PRINCIPAL}
                <ArrowRightIcon />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6 text-base sm:h-12">
              <a href={`mailto:${EMAIL_CONTATO}`}>
                <MailIcon />
                Enviar um e-mail
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* Cartão de recurso: um pedaço da tela real em cima, título e uma frase.  */
/* ---------------------------------------------------------------------- */

function Recurso({ titulo, texto, children }: { titulo: string; texto: string; children: React.ReactNode }) {
  return (
    <article className="cartao-vivo flex h-full flex-col rounded-3xl border border-vinho/10 bg-background p-4">
      <div aria-hidden className="flex h-32 items-center justify-center overflow-hidden rounded-2xl bg-muted/60 px-4">
        {children}
      </div>
      <h3 className="mt-4 px-2 text-lg leading-snug font-bold">{titulo}</h3>
      <p className="mt-1.5 px-2 pb-2 text-sm leading-relaxed text-muted-foreground">{texto}</p>
    </article>
  );
}

function FragmentoConflito() {
  return (
    <div className="grid w-full max-w-60 gap-1.5 text-mini">
      <div className="flex items-center gap-2 rounded-lg bg-primary px-2.5 py-1.5 font-semibold text-primary-foreground">
        <span className="tabular-nums">14:00</span> Carol · Manicure
      </div>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-destructive/60 bg-background px-2.5 py-1.5">
        <span className="font-semibold">
          <span className="tabular-nums">14:00</span> Bia
        </span>
        <span className="font-semibold text-destructive">Horário ocupado</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-background px-2.5 py-1.5 text-muted-foreground">
        <span className="tabular-nums">15:00</span> Livre
      </div>
    </div>
  );
}

function FragmentoHistorico() {
  return (
    <div className="w-full max-w-60 rounded-xl bg-background p-2.5 text-mini shadow-suave">
      <p className="text-xs font-bold">Thaís Moreira</p>
      <p className="mt-1 rounded-md bg-aviso px-1.5 py-0.5 font-semibold text-aviso-texto">Alergia a acetona</p>
      <ul className="mt-1.5 grid gap-0.5 text-muted-foreground">
        <li>12/10 · Alongamento em gel, nude 02</li>
        <li>28/09 · Manutenção</li>
      </ul>
    </div>
  );
}

function FragmentoLembrete() {
  return (
    <div className="grid w-full max-w-60 gap-1.5">
      <div className="flex items-center gap-2 rounded-xl bg-background p-2 shadow-suave">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-vinho text-white">
          <BellRingIcon className="size-3.5" />
        </span>
        <div className="min-w-0 text-mini">
          <p className="truncate font-bold">Amanhã às 9:00 · Juliana</p>
          <p className="truncate text-muted-foreground">Toque para enviar o lembrete</p>
        </div>
      </div>
      <span className="flex items-center justify-center gap-1.5 rounded-lg bg-whatsapp py-1.5 text-mini font-bold text-white">
        <IconeWhatsApp className="size-3.5" />
        Abrir no WhatsApp
      </span>
    </div>
  );
}

function FragmentoImportar() {
  return (
    <div className="flex w-full max-w-60 items-center gap-2 text-mini">
      <span className="flex flex-col items-center gap-1 rounded-xl bg-background px-3 py-2 shadow-suave">
        <FileTextIcon className="size-5 text-muted-foreground" />
        <span className="font-semibold">agenda.ics</span>
      </span>
      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 rounded-xl bg-sucesso px-2.5 py-2 font-semibold text-sucesso-texto">
        <CheckIcon className="mb-0.5 inline size-3.5" /> Compromissos importados para a agenda
      </span>
    </div>
  );
}

function FragmentoStory() {
  return (
    <div className="flex h-28 w-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-lg bg-vinho p-1.5 text-center text-white shadow-suave">
      <span className="text-mini leading-tight font-bold">Vagou um horário</span>
      <span className="rounded-md bg-white px-1.5 py-0.5 text-xs font-extrabold text-vinho tabular-nums">16:30</span>
      <span className="text-mini text-white/85">sexta</span>
    </div>
  );
}

function FragmentoApp() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-11 rounded-xl bg-background/80" />
      ))}
      <span className="flex flex-col items-center gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={44} height={44} className="size-11 rounded-xl shadow-suave" />
        <span className="text-mini font-semibold">Vaguinha</span>
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Telas feitas em HTML (sem imagens): celular com a tela "Hoje", o link   */
/* público e o assistente. Dados fictícios.                                */
/* ---------------------------------------------------------------------- */

function MockCelular() {
  const atendimentos = [
    { hora: "09:00", nome: "Juliana", servico: "Manicure", cor: "bg-vinho" },
    { hora: "10:30", nome: "Camila", servico: "Pé e mão", cor: "bg-rosa" },
    { hora: "14:00", nome: "Renata", servico: "Alongamento em gel", cor: "bg-vinho/70" },
  ];
  return (
    <div aria-hidden className="surgir surgir-atraso-2 relative mx-auto w-full max-w-[300px] sm:my-16 md:justify-self-end">
      {/* cartões fora da tela do celular (em cima e embaixo), para não cobrir nada dela */}
      <div className="surgir surgir-atraso-4 absolute -top-16 -left-12 z-10 hidden w-56 rounded-2xl bg-card p-3 shadow-alta ring-1 ring-vinho/10 sm:block">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rosa/30 text-vinho">
            <Link2Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Novo pedido pelo link</p>
            <p className="truncate text-mini text-muted-foreground">Beatriz · quinta, 15:30</p>
          </div>
        </div>
      </div>
      <div className="surgir surgir-atraso-4 absolute -right-10 -bottom-16 z-10 hidden w-52 rounded-2xl bg-card p-3 shadow-alta ring-1 ring-vinho/10 sm:block">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sucesso text-sucesso-texto">
            <BellRingIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Amanhã: Juliana às 09:00</p>
            <p className="truncate text-mini text-muted-foreground">Toque para enviar o lembrete</p>
          </div>
        </div>
      </div>

      {/* o celular */}
      <div className="celular-moldura overflow-hidden rounded-[2.4rem] bg-background">
        <div className="flex items-center justify-between px-5 pt-4 pb-2 text-mini text-muted-foreground">
          <span>9:41</span>
          <span className="h-4 w-16 rounded-full bg-[#1f1f23]" />
          <span>100%</span>
        </div>
        <div className="flex items-center gap-2 px-4 pb-3">
          <span className="gradiente-marca flex size-8 items-center justify-center rounded-full text-sm font-extrabold text-white">A</span>
          <div>
            <p className="text-xs text-muted-foreground">Bom dia,</p>
            <p className="-mt-0.5 text-sm font-bold">Ana · Studio Nails</p>
          </div>
        </div>
        <div className="mx-4 rounded-2xl bg-card p-3 shadow-suave ring-1 ring-vinho/10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Hoje</p>
            <span className="rounded-full bg-vinho/10 px-2 py-0.5 text-mini font-bold text-vinho">3 atendimentos</span>
          </div>
          <ul className="mt-2 grid gap-1.5">
            {atendimentos.map((a) => (
              <li key={a.hora} className="flex items-center gap-2 rounded-xl bg-background px-2.5 py-2">
                <span className={cn("h-7 w-1 rounded-full", a.cor)} />
                <span className="w-10 text-xs font-bold tabular-nums">{a.hora}</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{a.nome}</p>
                  <p className="truncate text-mini text-muted-foreground">{a.servico}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-card p-3 ring-1 ring-vinho/10">
            <p className="text-mini text-muted-foreground">Esta semana</p>
            <p className="text-lg font-extrabold">14</p>
            <p className="text-mini text-muted-foreground">horários marcados</p>
          </div>
          <div className="gradiente-marca rounded-2xl p-3 text-white">
            <p className="text-mini text-white/80">Livres hoje</p>
            <p className="text-lg font-extrabold">4</p>
            <p className="text-mini text-white/80">postar nos stories</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-around border-t border-vinho/10 px-2 py-3 text-mini text-muted-foreground">
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

function MockAssistente() {
  return (
    <div aria-hidden className="overflow-hidden rounded-3xl border border-vinho/10 bg-card shadow-alta">
      <div className="flex items-center gap-2.5 bg-whatsapp px-3.5 py-2.5 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-maskable-192.png" alt="" width={32} height={32} className="size-8 rounded-full" />
        <div className="leading-tight">
          <p className="text-sm font-bold">Vaguinha</p>
          <p className="text-mini opacity-85">online</p>
        </div>
      </div>
      <div className="grid gap-2 bg-muted/60 p-3">
        <p className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-whatsapp/15 px-3 py-2 text-sm">Marca a Duda sexta às 11h, alongamento</p>
        <div className="max-w-[92%]">
          <div className="rounded-xl rounded-tl-sm bg-card px-3 py-2 text-sm shadow-sm">
            Sexta às 11:00 está livre. Preparei assim:
            <p className="mt-1.5 font-semibold">👉 Marcar Duda · Alongamento em gel · sexta, 13/11 às 11:00</p>
          </div>
          <div className="mt-1 grid gap-1 text-center text-sm font-semibold text-whatsapp">
            <span className="rounded-xl bg-card py-1.5 shadow-sm">✅ Confirmar</span>
            <span className="rounded-xl bg-card py-1.5 shadow-sm">Não</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockLinkPublico() {
  const horarios = ["09:00", "09:30", "11:00", "14:00", "15:30", "16:00"];
  return (
    <div aria-hidden className="rounded-3xl bg-background p-4 text-foreground shadow-2xl shadow-black/30 ring-1 ring-white/20">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-vinho text-base font-extrabold text-white">A</span>
        <div>
          <p className="text-sm font-bold">Studio Ana Nails</p>
          <p className="text-xs text-muted-foreground">Manicure e pedicure</p>
        </div>
      </div>
      <div className="mt-4 flex gap-1 text-mini font-semibold text-muted-foreground">
        <span className="rounded-full bg-vinho px-2 py-0.5 text-white">1 Serviço</span>
        <span className="rounded-full bg-vinho/15 px-2 py-0.5 text-vinho">2 Dia e hora</span>
        <span className="rounded-full px-2 py-0.5">3 Seus dados</span>
      </div>
      <p className="mt-3 text-xs font-semibold">Quinta, 13 de novembro</p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {horarios.map((h, i) => (
          <span
            key={h}
            className={cn("rounded-xl border py-1.5 text-center text-xs font-semibold tabular-nums", i === 4 ? "border-vinho bg-vinho text-white" : "border-vinho/15 bg-card")}
          >
            {h}
          </span>
        ))}
      </div>
      <div className="mt-3 rounded-2xl bg-card p-3 ring-1 ring-vinho/10">
        <p className="text-mini text-muted-foreground">Manicure · 45 min · R$ 55,00</p>
        <p className="text-sm font-bold">Quinta às 15:30</p>
      </div>
      <div className="mt-3 flex h-10 items-center justify-center rounded-full bg-vinho text-sm font-bold text-white">Pedir este horário</div>
    </div>
  );
}
