"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, UserRoundIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; rotulo: string; Icone: LucideIcon };

/** Itens entram aqui conforme os módulos ficam prontos. */
export const ITENS_NAVEGACAO: Item[] = [
  { href: "/", rotulo: "Hoje", Icone: HomeIcon },
  { href: "/perfil", rotulo: "Perfil", Icone: UserRoundIcon },
];

export function BarraInferior() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
        {ITENS_NAVEGACAO.map(({ href, rotulo, Icone }) => {
          const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  ativo ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icone className={cn("size-5", ativo && "fill-primary/15")} />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
