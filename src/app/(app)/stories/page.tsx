import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/auth";
import { hojeISO } from "@/lib/datas";
import { GeradorStories } from "@/features/stories/components/GeradorStories";

export const metadata: Metadata = { title: "Stories" };

export default async function PaginaStories() {
  const perfil = await obterPerfil();
  if (!perfil) redirect("/aguardando-aprovacao");

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stories</h1>
        <p className="text-sm text-muted-foreground">
          Imagens prontas para o Instagram com sua logo e suas cores.{" "}
          {!perfil.logo_url ? (
            <Link href="/perfil" className="underline underline-offset-4">
              Envie sua logo
            </Link>
          ) : null}
        </p>
      </div>
      <GeradorStories hoje={hojeISO()} corPrimaria={perfil.cor_primaria} corSecundaria={perfil.cor_secundaria} />
    </div>
  );
}
