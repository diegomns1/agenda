import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { obterPerfil, obterUsuario, situacaoDaConta } from "@/lib/auth";
import { BotaoSair } from "@/features/auth/components/BotaoSair";
import { LogoVaguinha } from "@/components/marca/LogoVaguinha";

/**
 * Área da conta (assinatura): exige login e perfil, mas NÃO exige validade em dia —
 * é justamente aqui que a profissional com assinatura vencida renova.
 */
export default async function LayoutConta({ children }: { children: React.ReactNode }) {
  const [usuario, perfil] = await Promise.all([obterUsuario(), obterPerfil()]);
  if (!usuario) redirect("/login?proximo=/assinatura");
  if (!perfil) redirect("/aguardando-aprovacao");

  const aprovada = situacaoDaConta(perfil) === "aprovada";

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4">
          <Link href={aprovada ? "/" : "/aguardando-aprovacao"} className="inline-flex items-center gap-2 text-sm font-medium">
            <ArrowLeftIcon className="size-4" />
            {aprovada ? "Voltar ao painel" : "Situação da conta"}
          </Link>
          <LogoVaguinha variante="simbolo" className="h-6" />
          <BotaoSair variante="ghost" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
