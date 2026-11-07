"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDaysIcon, HomeIcon, ImagePlusIcon, LockIcon, SparklesIcon, UserRoundIcon, UsersIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; rotulo: string; Icone: LucideIcon };

/** Itens entram aqui conforme os módulos ficam prontos. */
export const ITENS_NAVEGACAO: Item[] = [
  { href: "/", rotulo: "Hoje", Icone: HomeIcon },
  { href: "/agenda", rotulo: "Agenda", Icone: CalendarDaysIcon },
  { href: "/clientes", rotulo: "Clientes", Icone: UsersIcon },
  { href: "/servicos", rotulo: "Serviços", Icone: SparklesIcon },
  { href: "/stories", rotulo: "Stories", Icone: ImagePlusIcon },
  { href: "/perfil", rotulo: "Perfil", Icone: UserRoundIcon },
];

type Props = {
  /** Rotas que o plano atual não inclui (mostram um cadeado, mas continuam clicáveis: abrem o convite de upgrade). */
  bloqueados?: Record<string, boolean>;
};

export function BarraInferior({ bloqueados = {} }: Props) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
        {ITENS_NAVEGACAO.map(({ href, rotulo, Icone }) => {
          const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const bloqueado = Boolean(bloqueados[href]);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors sm:text-[11px]",
                  ativo ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  bloqueado && !ativo && "opacity-70",
                )}
              >
                <span className="relative">
                  <Icone className={cn("size-5", ativo && "fill-primary/15")} />
                  {bloqueado ? <LockIcon className="absolute -top-1 -right-1.5 size-3 rounded-full bg-background text-muted-foreground" /> : null}
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
