import Link from "next/link";
import { CheckIcon, ChevronRightIcon, GraduationCapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * "Primeiros passos" na tela Hoje (13/11/2026): quem acaba de entrar cai numa agenda vazia e para.
 * Quem importou a agenda do Google virou usuária ativa; então o caminho leva até aí.
 * Some sozinho quando os 4 passos estão feitos.
 */

export type Passo = { feito: boolean; titulo: string; texto: string; href: string; botao: string };

export function PrimeirosPassos({ passos }: { passos: Passo[] }) {
  const feitos = passos.filter((p) => p.feito).length;
  if (feitos === passos.length) return null;
  const proximo = passos.findIndex((p) => !p.feito);

  return (
    <section className="surgir surgir-atraso-1 grid gap-3 rounded-3xl border border-primary/25 bg-card p-4" aria-labelledby="primeiros-passos">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="primeiros-passos" className="text-base font-bold">
            Deixe sua agenda pronta
          </h2>
          <p className="text-sm text-muted-foreground">
            {feitos} de {passos.length} feitos · leva uns 5 minutos
          </p>
        </div>
        <div className="h-2 w-20 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(feitos / passos.length) * 100}%` }} />
        </div>
      </div>

      <ol className="grid gap-2">
        {passos.map((p, i) => {
          const atual = i === proximo;
          return (
            <li key={p.titulo}>
              <Link
                href={p.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors",
                  p.feito ? "border-transparent bg-muted/50" : atual ? "border-primary/40 bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    p.feito ? "bg-primary text-primary-foreground" : atual ? "border-2 border-primary text-primary" : "border text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {p.feito ? <CheckIcon className="size-4" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block font-semibold", p.feito && "text-muted-foreground line-through decoration-1")}>{p.titulo}</span>
                  {!p.feito ? <span className="block text-sm text-muted-foreground">{p.texto}</span> : null}
                </span>
                {atual ? (
                  <span className="hidden shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground sm:inline">{p.botao}</span>
                ) : null}
                {!p.feito ? <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
                <span className="sr-only">{p.feito ? "(feito)" : `(${p.botao})`}</span>
              </Link>
            </li>
          );
        })}
      </ol>

      <Link href="/tutoriais" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
        <GraduationCapIcon className="size-4" aria-hidden />
        Ver os tutoriais
      </Link>
    </section>
  );
}
