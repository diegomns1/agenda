"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  CalendarDaysIcon,
  ChartColumnIcon,
  HomeIcon,
  ImagePlusIcon,
  LockIcon,
  SparklesIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { LogoVaguinha } from "@/components/marca/LogoVaguinha";
import { cn } from "@/lib/utils";

type Item = { href: string; rotulo: string; Icone: LucideIcon; /** outras rotas que acendem este item */ tambem?: string[] };

/*
 * Navegação principal (15/11/2026):
 * - celular: barra de baixo com 6 itens. "Serviços" saiu daqui e foi para dentro do Perfil; entrou o Relatório.
 * - computador (md+): coluna na esquerda, com tudo (inclui Serviços e Lembretes).
 */
const NO_CELULAR: Item[] = [
  { href: "/", rotulo: "Hoje", Icone: HomeIcon },
  { href: "/agenda", rotulo: "Agenda", Icone: CalendarDaysIcon },
  { href: "/clientes", rotulo: "Clientes", Icone: UsersIcon },
  { href: "/stories", rotulo: "Stories", Icone: ImagePlusIcon },
  { href: "/relatorios", rotulo: "Relatório", Icone: ChartColumnIcon },
  { href: "/perfil", rotulo: "Perfil", Icone: UserRoundIcon, tambem: ["/servicos", "/mensagens", "/assinatura", "/tutoriais"] },
];

const NO_COMPUTADOR: Item[] = [
  { href: "/", rotulo: "Hoje", Icone: HomeIcon },
  { href: "/agenda", rotulo: "Agenda", Icone: CalendarDaysIcon },
  { href: "/clientes", rotulo: "Clientes", Icone: UsersIcon },
  { href: "/servicos", rotulo: "Serviços", Icone: SparklesIcon },
  { href: "/lembretes", rotulo: "Lembretes", Icone: BellIcon },
  { href: "/stories", rotulo: "Stories", Icone: ImagePlusIcon },
  { href: "/relatorios", rotulo: "Relatório", Icone: ChartColumnIcon },
  { href: "/perfil", rotulo: "Perfil", Icone: UserRoundIcon, tambem: ["/mensagens", "/assinatura", "/tutoriais"] },
];

type Props = {
  /** Rotas que o plano atual não inclui (mostram um cadeado, mas continuam clicáveis: abrem o convite de upgrade). */
  bloqueados?: Record<string, boolean>;
};

function ativoEm(pathname: string, item: Item) {
  if (item.href === "/") return pathname === "/";
  return [item.href, ...(item.tambem ?? [])].some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Barra de baixo, só no celular. */
export function BarraInferior({ bloqueados = {} }: Props) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
        {NO_CELULAR.map((item) => {
          const { href, rotulo, Icone } = item;
          const ativo = ativoEm(pathname, item);
          const bloqueado = Boolean(bloqueados[href]);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "group flex h-[60px] flex-col items-center justify-center gap-0.5 text-xs font-semibold tracking-tight transition-colors",
                  ativo ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  bloqueado && !ativo && "opacity-70",
                )}
              >
                <span
                  className={cn(
                    "relative flex h-7 w-12 items-center justify-center rounded-2xl transition-all duration-300",
                    ativo ? "bg-primary/12 scale-105" : "group-active:scale-95",
                  )}
                >
                  <Icone className={cn("size-5 transition-transform duration-300", ativo && "-translate-y-px")} />
                  {bloqueado ? (
                    <LockIcon className="absolute -top-1 right-1 size-3 rounded-full bg-background text-muted-foreground" />
                  ) : null}
                </span>
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Coluna da esquerda, só no computador. */
export function BarraLateral({ bloqueados = {} }: Props) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col gap-1 border-r border-border/70 bg-card/60 px-3 pb-4 md:flex"
    >
      <Link href="/" className="flex h-14 items-center px-2" aria-label="Vaguinha: início">
        <LogoVaguinha className="h-6" />
      </Link>
      <ul className="grid gap-0.5">
        {NO_COMPUTADOR.map((item) => {
          const { href, rotulo, Icone } = item;
          const ativo = ativoEm(pathname, item);
          const bloqueado = Boolean(bloqueados[href]);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                  ativo ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icone className="size-[18px] shrink-0" />
                <span className="flex-1 truncate">{rotulo}</span>
                {bloqueado ? <LockIcon className="size-3.5 shrink-0 opacity-70" aria-label="Não incluído no seu plano" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
