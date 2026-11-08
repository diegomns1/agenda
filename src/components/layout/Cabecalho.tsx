import Link from "next/link";
import { BellIcon, BotMessageSquareIcon, ChartColumnIcon } from "lucide-react";
import { NOME_APP, SUPORTE_WHATSAPP } from "@/lib/constantes";
import { linkWhatsApp } from "@/lib/telefone";
import { LogoVaguinha } from "@/components/marca/LogoVaguinha";
import { Button } from "@/components/ui/button";
import { MenuConta } from "./MenuConta";

type Props = {
  titulo?: string | null;
  logoUrl?: string | null;
  admin?: boolean;
  lembretesPendentes?: number;
  mostrarSino?: boolean;
};

/**
 * Topo do painel. No celular: logo + nome do negócio (com espaço), sino de lembretes e o menu.
 * No computador, Assistente e Relatórios aparecem também com nome ao lado do sino.
 */
export function Cabecalho({ titulo, logoUrl, admin, lembretesPendentes = 0, mostrarSino = true }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-2 pr-2 pl-4">
        <Link href="/" className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="size-9 shrink-0 rounded-full bg-white object-contain ring-2 ring-rosa/40" />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <LogoVaguinha variante="simbolo" className="h-5" />
            </span>
          )}
          <span className="truncate text-[15px] font-bold tracking-tight text-foreground">{titulo || NOME_APP}</span>
        </Link>
        <div className="flex shrink-0 items-center">
          <Button asChild variant="ghost" className="hidden h-9 sm:inline-flex">
            <Link href="/assistente">
              <BotMessageSquareIcon />
              Assistente
            </Link>
          </Button>
          <Button asChild variant="ghost" className="hidden h-9 sm:inline-flex">
            <Link href="/relatorios">
              <ChartColumnIcon />
              Relatórios
            </Link>
          </Button>
          {mostrarSino ? (
            <Button asChild variant="ghost" size="icon" className="size-11">
              <Link href="/lembretes" className="relative" aria-label={`Lembretes${lembretesPendentes ? `: ${lembretesPendentes} para avisar` : ""}`}>
                <BellIcon className="size-5" />
                {lembretesPendentes > 0 ? (
                  <span className="absolute top-1 right-1 flex min-w-[18px] animate-in zoom-in items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-[18px] text-primary-foreground shadow tabular-nums">
                    {lembretesPendentes > 9 ? "9+" : lembretesPendentes}
                  </span>
                ) : null}
              </Link>
            </Button>
          ) : null}
          <MenuConta admin={admin} linkSuporte={linkWhatsApp(SUPORTE_WHATSAPP, `Olá! Uso o ${NOME_APP} e preciso de ajuda: `)} />
        </div>
      </div>
    </header>
  );
}
