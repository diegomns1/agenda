import type { Metadata } from "next";
import Link from "next/link";
import { WifiOffIcon } from "lucide-react";

export const metadata: Metadata = { title: "Sem conexão" };
export const dynamic = "force-static";

export default function PaginaOffline() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <WifiOffIcon className="size-7" />
      </div>
      <h1 className="text-xl font-semibold">Você está sem internet</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        A agenda precisa de conexão para carregar os dados. Assim que a internet voltar, toque abaixo.
      </p>
      <Link href="/" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Tentar de novo
      </Link>
    </div>
  );
}
