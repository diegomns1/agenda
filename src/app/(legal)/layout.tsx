import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { LogoVaguinha } from "@/components/marca/LogoVaguinha";

/** Páginas de texto (termos, privacidade): largura de leitura, sem login. */
export default function LayoutLegal({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="border-b bg-card/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/" aria-label="Início">
            <LogoVaguinha variante="horizontal" className="h-8 w-auto" />
          </Link>
          <Link href="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-4" />
            Voltar
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <article className="surgir prose-legal">{children}</article>
      </main>
      <footer className="mx-auto w-full max-w-2xl px-4 pb-10 text-xs text-muted-foreground">
        <Link href="/termos" className="underline-offset-4 hover:underline">
          Termos de Uso
        </Link>
        {" · "}
        <Link href="/privacidade" className="underline-offset-4 hover:underline">
          Política de Privacidade
        </Link>
        {" · vaguinha.app"}
      </footer>
    </div>
  );
}
