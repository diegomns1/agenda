import Link from "next/link";
import { CalendarHeartIcon, ShieldCheckIcon } from "lucide-react";
import { NOME_APP } from "@/lib/constantes";
import { BotaoSair } from "@/features/auth/components/BotaoSair";
import { Button } from "@/components/ui/button";

type Props = {
  titulo?: string | null;
  logoUrl?: string | null;
  admin?: boolean;
};

export function Cabecalho({ titulo, logoUrl, admin }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 text-primary">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="size-8 shrink-0 rounded-full object-contain ring-1 ring-border" />
          ) : (
            <CalendarHeartIcon className="size-5 shrink-0" />
          )}
          <span className="truncate font-semibold tracking-tight text-foreground">
            {titulo || NOME_APP}
          </span>
        </Link>
        <div className="flex items-center gap-1">
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
