import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, ShieldCheckIcon } from "lucide-react";
import { ehAdmin, obterUsuario } from "@/lib/auth";
import { BotaoSair } from "@/features/auth/components/BotaoSair";
import { Button } from "@/components/ui/button";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const usuario = await obterUsuario();
  if (!ehAdmin(usuario)) redirect("/");

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheckIcon className="size-5 text-primary" />
            Painel admin
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
