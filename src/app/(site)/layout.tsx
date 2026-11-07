import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { LogoVaguinha } from "@/components/marca/LogoVaguinha";
import { Button } from "@/components/ui/button";
import { URL_APP, URL_SITE } from "@/lib/constantes";
import { EMAIL_CONTATO } from "@/lib/legal";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  title: { absolute: "Vaguinha · Agenda para profissionais autônomas" },
  description:
    "Agenda, clientes, lembretes, link para a cliente marcar sozinha e stories prontos para o Instagram. Feito para manicures, designers de sobrancelha, lash, cabeleireiras e outras profissionais autônomas.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: URL_SITE,
    siteName: "Vaguinha",
    title: "Vaguinha · sua agenda cheia, sem bagunça no WhatsApp",
    description: "Agenda, clientes, lembretes e link de agendamento para profissionais autônomas.",
  },
  twitter: { card: "summary_large_image" },
};

const NAV = [
  { href: "#recursos", rotulo: "Recursos" },
  { href: "#como-funciona", rotulo: "Como funciona" },
  { href: "#planos", rotulo: "Planos" },
  { href: "#duvidas", rotulo: "Dúvidas" },
];

export default function LayoutSite({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-vinho/10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/site" aria-label="Vaguinha, início" className="shrink-0">
            <LogoVaguinha variante="horizontal" className="h-9 w-auto" />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex" aria-label="Seções">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="transition-colors hover:text-foreground">
                {n.rotulo}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <a href={`${URL_APP}/login`}>Acessar painel</a>
            </Button>
            <Button asChild className="rounded-full px-4 shadow-md shadow-vinho/20">
              <a href={`${URL_APP}/cadastro`}>
                Começar grátis
                <ArrowRightIcon />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-vinho/10 bg-card/60">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="grid gap-3">
            <LogoVaguinha variante="horizontal" className="h-9 w-auto" />
            <p className="max-w-sm text-sm text-muted-foreground">
              Agenda online para profissionais autônomas. Feito no Brasil, em português, para caber no seu dia.
            </p>
          </div>
          <div className="grid content-start gap-2 text-sm">
            <p className="font-semibold">Vaguinha</p>
            <a href={`${URL_APP}/login`} className="text-muted-foreground hover:text-foreground">
              Acessar painel
            </a>
            <a href={`${URL_APP}/cadastro`} className="text-muted-foreground hover:text-foreground">
              Criar conta grátis
            </a>
            <a href="#planos" className="text-muted-foreground hover:text-foreground">
              Planos e preços
            </a>
          </div>
          <div className="grid content-start gap-2 text-sm">
            <p className="font-semibold">Ajuda e legal</p>
            <a href={`mailto:${EMAIL_CONTATO}`} className="text-muted-foreground hover:text-foreground">
              {EMAIL_CONTATO}
            </a>
            <Link href="/termos" className="text-muted-foreground hover:text-foreground">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="text-muted-foreground hover:text-foreground">
              Política de Privacidade
            </Link>
          </div>
        </div>
        <p className="pb-8 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Vaguinha · vaguinha.app</p>
      </footer>
    </div>
  );
}
