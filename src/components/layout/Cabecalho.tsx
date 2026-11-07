import Link from "next/link";
import { BellIcon, ShieldCheckIcon } from "lucide-react";
import { NOME_APP } from "@/lib/constantes";
import { BotaoSair } from "@/features/auth/components/BotaoSair";
import { LogoVaguinha } from "@/components/marca/LogoVaguinha";
import { Button } from "@/components/ui/button";

type Props = {
  titulo?: string | null;
  logoUrl?: string | null;
  admin?: boolean;
  lembretesPendentes?: number;
  mostrarSino?: boolean;
};

export function Cabecalho({ titulo, logoUrl, admin, lembretesPendentes = 0, mostrarSino = true }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
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
        <div className="flex items-center gap-0.5">
          {mostrarSino ? (
            <Button asChild variant="ghost" size="icon" aria-label={`Lembretes${lembretesPendentes ? `: ${lembretesPendentes} pendentes` : ""}`}>
              <Link href="/lembretes" className="relative">
                <BellIcon />
                {lembretesPendentes > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 flex min-w-4 animate-in zoom-in items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground shadow">
                    {lembretesPendentes > 9 ? "9+" : lembretesPendentes}
                  </span>
                ) : null}
              </Link>
            </Button>
          ) : null}
          {admin ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">
                <ShieldCheckIcon />
                Admin
              </Link>
            </Button>
          ) : null}
          <BotaoSair />
        </div>
      </div>
    </header>
  );
}
