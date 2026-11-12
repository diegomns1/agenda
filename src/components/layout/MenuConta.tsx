"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  BotMessageSquareIcon,
  ChartColumnIcon,
  LifeBuoyIcon,
  LightbulbIcon,
  LogOutIcon,
  MenuIcon,
  MessageSquareTextIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogoSugestao } from "@/features/sugestoes/components/DialogoSugestao";
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
  const [sugestao, setSugestao] = useState(false);

  return (
    <>
      <form ref={formSair} method="post" action="/auth/sair" className="hidden" />
      <DialogoSugestao aberto={sugestao} aoMudar={setSugestao} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-toque sm:size-toque" aria-label="Abrir menu">
            <MenuIcon className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="w-60">
          <DropdownMenuItem asChild className={ITEM}>
            <Link href="/assistente">
              <BotMessageSquareIcon />
              Assistente no painel
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={ITEM}>
            <Link href="/mensagens">
              <MessageSquareTextIcon />
              Mensagens do WhatsApp
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
          {/* abre depois do menu fechar: o menu devolve o foco e travaria o clique na caixa */}
          <DropdownMenuItem className={ITEM} onSelect={() => setTimeout(() => setSugestao(true), 0)}>
            <LightbulbIcon />
            Sugestões de melhorias
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
