import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronRightIcon,
  ClockIcon,
  CreditCardIcon,
  LifeBuoyIcon,
  Link2Icon,
  LockIcon,
  LogOutIcon,
  MessageSquareTextIcon,
  PaletteIcon,
  SparklesIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import { ehAdmin, obterPerfil, obterUsuario } from "@/lib/auth";
import { URL_APP } from "@/lib/constantes";
import { formatarDataISO } from "@/lib/datas";
import { PLANOS, temRecurso } from "@/lib/planos";
import { IconeWhatsApp } from "@/components/marca/IconeWhatsApp";
import { Button } from "@/components/ui/button";
import { LinkAgendamento } from "@/features/perfil/components/LinkAgendamento";
import { whatsappLiberadoPara } from "@/features/whatsapp/numero";

export const metadata: Metadata = { title: "Perfil" };

/*
 * Perfil em botões (15/11/2026): antes era uma página só, comprida, com tudo aberto.
 * Agora cada assunto tem a sua tela (/perfil/dados, /horarios, /aparencia, /link, /assistente, /suporte)
 * e o link de agendamento fica em destaque no topo.
 */

type Item = { href: string; Icone: LucideIcon | typeof IconeWhatsApp; titulo: string; texto: string };

function Lista({ titulo, itens }: { titulo: string; itens: Item[] }) {
  return (
    <section className="grid min-w-0 gap-2">
      <h2 className="px-1 text-sm font-semibold text-muted-foreground">{titulo}</h2>
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {itens.map(({ href, Icone, titulo: nome, texto }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icone className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{nome}</span>
                <span className="block truncate text-sm text-muted-foreground">{texto}</span>
              </span>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function PaginaPerfil() {
  const perfil = await obterPerfil();
  if (!perfil) redirect("/aguardando-aprovacao");

  const podeLink = temRecurso(perfil.plano, "agendamento_online");
  const linkAtivo = podeLink && perfil.agendamento_online && Boolean(perfil.slug);
  const whatsappLigado = whatsappLiberadoPara(ehAdmin(await obterUsuario()));
  const plano = PLANOS[perfil.plano];

  const negocio: Item[] = [
    { href: "/perfil/dados", Icone: UserRoundIcon, titulo: "Meus dados", texto: "Logo, nome, WhatsApp, endereço e ramo" },
    { href: "/perfil/horarios", Icone: ClockIcon, titulo: "Horários", texto: "Dias e horas em que você atende" },
    { href: "/perfil/aparencia", Icone: PaletteIcon, titulo: "Layout e cores", texto: "Tema do painel e cores da sua marca" },
    { href: "/servicos", Icone: SparklesIcon, titulo: "Serviços", texto: "O que você faz, quanto tempo leva e o valor" },
    { href: "/mensagens", Icone: MessageSquareTextIcon, titulo: "Mensagens do WhatsApp", texto: "Textos de lembrete, confirmação e agradecimento" },
  ];
  const conta: Item[] = [
    {
      href: "/assinatura",
      Icone: CreditCardIcon,
      titulo: "Assinatura",
      texto: `Plano ${plano.nome}${perfil.ativa_ate ? ` · até ${formatarDataISO(perfil.ativa_ate)}` : perfil.plano === "teste" ? " · teste grátis" : ""}`,
    },
    ...(whatsappLigado
      ? [{ href: "/perfil/assistente", Icone: IconeWhatsApp, titulo: "Assistente no WhatsApp", texto: "Peça marcações por mensagem para a Vaguinha" }]
      : []),
    { href: "/perfil/suporte", Icone: LifeBuoyIcon, titulo: "Suporte", texto: "Tutoriais, dúvidas e sugestões" },
  ];

  return (
    <div className="grid gap-6">
      <header className="flex min-w-0 items-center gap-3">
        {perfil.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo enviada pela profissional (bucket público)
          <img src={perfil.logo_url} alt="" className="size-14 shrink-0 rounded-full bg-white object-contain ring-2 ring-rosa/40" />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-extrabold text-primary">
            {(perfil.nome_negocio || perfil.nome).trim().charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{perfil.nome_negocio || perfil.nome}</h1>
          <p className="truncate text-sm text-muted-foreground">{perfil.nome_negocio ? perfil.nome : perfil.email}</p>
        </div>
      </header>

      {/* Link de agendamento em destaque */}
      <section className="grid min-w-0 gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            {podeLink ? <Link2Icon className="size-5" /> : <LockIcon className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Link de agendamento</h2>
            <p className="text-sm text-muted-foreground">
              {linkAtivo
                ? "Coloque na bio do Instagram: seus clientes pedem horário sozinhos."
                : podeLink
                  ? "Ainda desligado. Ative para seus clientes pedirem horário sozinhos."
                  : "Disponível a partir do plano Profissional."}
            </p>
          </div>
        </div>
        {linkAtivo ? <LinkAgendamento url={`${URL_APP}/p/${perfil.slug}`} /> : null}
        <Button asChild variant={linkAtivo ? "outline" : "default"} className="h-toque w-fit sm:h-9">
          <Link href={podeLink ? "/perfil/link" : "/assinatura"}>{linkAtivo ? "Configurar o link" : podeLink ? "Ativar meu link" : "Ver planos"}</Link>
        </Button>
      </section>

      <Lista titulo="Meu negócio" itens={negocio} />
      <Lista titulo="Conta" itens={conta} />

      <form method="post" action="/auth/sair">
        <Button type="submit" variant="ghost" className="h-toque text-destructive hover:text-destructive sm:h-9">
          <LogOutIcon />
          Sair da conta
        </Button>
      </form>
    </div>
  );
}
