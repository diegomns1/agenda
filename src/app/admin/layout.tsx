import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, ChartPieIcon, LightbulbIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import { IconeWhatsApp } from "@/components/marca/IconeWhatsApp";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { ehAdmin, obterUsuario } from "@/lib/auth";
import { BotaoSair } from "@/features/auth/components/BotaoSair";
import { LogoVaguinha } from "@/components/marca/LogoVaguinha";
import { Button } from "@/components/ui/button";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const usuario = await obterUsuario();
  if (!ehAdmin(usuario)) redirect("/");

  // conversas em que a IA chamou o Diego (aparece no botão da Central)
  const { count: precisam } = await criarClienteAdmin()
    .from("whatsapp_contatos")
    .select("telefone", { count: "exact", head: true })
    .eq("atendimento", "precisa")
    .then((r) => r, () => ({ count: 0 }));
  // sugestões ainda não lidas (botão Sugestões)
  const { count: sugestoesNovas } = await criarClienteAdmin()
    .from("sugestoes")
    .select("id", { count: "exact", head: true })
    .is("lida_em", null)
    .then((r) => r, () => ({ count: 0 }));

  return (
    <div className="flex flex-1 flex-col overflow-x-clip">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2 font-bold">
            <LogoVaguinha variante="simbolo" className="h-6" />
            Admin
            <ShieldCheckIcon className="size-4 text-primary" />
          </div>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeftIcon />
                Voltar ao app
              </Link>
            </Button>
            <BotaoSair />
          </div>
        </div>
      </header>
      <nav className="mx-auto flex w-full max-w-3xl flex-wrap gap-2 px-4 pt-4" aria-label="Seções do admin">
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/admin/painel">
            <ChartPieIcon />
            Painel do dono
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/admin">
            <UsersIcon />
            Contas
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/admin/whatsapp">
            <IconeWhatsApp className="size-4" />
            WhatsApp
            {precisam ? (
              <span className="rounded-full bg-destructive px-1.5 text-mini leading-4 font-bold text-white tabular-nums" aria-label={`${precisam} precisam de você`}>
                {precisam}
              </span>
            ) : null}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/admin/sugestoes">
            <LightbulbIcon />
            Sugestões
            {sugestoesNovas ? (
              <span className="rounded-full bg-primary px-1.5 text-mini leading-4 font-bold text-primary-foreground tabular-nums" aria-label={`${sugestoesNovas} novas`}>
                {sugestoesNovas}
              </span>
            ) : null}
          </Link>
        </Button>
      </nav>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
