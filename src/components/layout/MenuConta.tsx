"use client";

import Link from "next/link";
import { useRef } from "react";
import { BotMessageSquareIcon, ChartColumnIcon, LifeBuoyIcon, LogOutIcon, MenuIcon, ShieldCheckIcon } from "lucide-react";
import { sair } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = { admin?: boolean; linkSuporte: string };

const ITEM = "min-h-toque gap-2.5 px-2.5 text-destaque";

/**
 * Menu do topo: as funções que antes eram ícones soltos agora têm nome.
 * Assim o nome do negócio ganha espaço no celular e "Sair"/"Admin" saem do lugar nobre.
 */
export function MenuConta({ admin, linkSuporte }: Props) {
  const formSair = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formSair} action={sair} className="hidden" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-toque" aria-label="Abrir menu">
            <MenuIcon className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="w-60">
          <DropdownMenuItem asChild className={ITEM}>
            <Link href="/assistente">
              <BotMessageSquareIcon />
              Assistente de IA
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={ITEM}>
            <Link href="/relatorios">
              <ChartColumnIcon />
              Relatórios do mês
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={ITEM}>
            <a href={linkSuporte} target="_blank" rel="noopener noreferrer">
              <LifeBuoyIcon />
              Falar com o suporte
            </a>
          </DropdownMenuItem>
          {admin ? (
            <DropdownMenuItem asChild className={ITEM}>
              <Link href="/admin">
                <ShieldCheckIcon />
                Admin
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" className={ITEM} onSelect={() => formSair.current?.requestSubmit()}>
            <LogOutIcon />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
