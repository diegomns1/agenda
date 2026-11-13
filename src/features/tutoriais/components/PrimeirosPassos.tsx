"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckIcon, ChevronRightIcon, GraduationCapIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { COOKIE_PASSOS, type EstadoPassos, type Passo } from "../passos";

/*
 * "Primeiros passos" na tela Hoje (13/11/2026): quem acaba de entrar cai numa agenda vazia e para.
 * Cada passo pode ser pulado e a lista inteira pode ser escondida (fica guardado no cookie vg_passos, no aparelho).
 * Some sozinho quando todos os passos estão feitos ou pulados.
 */

function gravar(estado: EstadoPassos) {
  const seguro = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_PASSOS}=${encodeURIComponent(JSON.stringify(estado))}; Max-Age=${365 * 86_400}; Path=/; SameSite=Lax${seguro}`;
}

export function PrimeirosPassos({ passos, estado }: { passos: Passo[]; estado: EstadoPassos }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const pulado = (p: Passo) => !p.feito && estado.pulados.includes(p.id);
  const resolvidos = passos.filter((p) => p.feito || pulado(p)).length;
  if (estado.oculto || resolvidos === passos.length) return null;
  const proximo = passos.findIndex((p) => !p.feito && !pulado(p));

  function mudar(novo: EstadoPassos) {
    gravar(novo);
    iniciar(() => router.refresh());
  }

  return (
    <section
      className={cn("surgir surgir-atraso-1 grid gap-3 rounded-3xl border border-primary/25 bg-card p-4", pendente && "opacity-70")}
      aria-labelledby="primeiros-passos"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="primeiros-passos" className="text-base font-bold">
            Deixe sua agenda pronta
          </h2>
          <p className="text-sm text-muted-foreground">
            {resolvidos} de {passos.length} · leva uns 5 minutos
          </p>
          <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(resolvidos / passos.length) * 100}%` }} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => mudar({ ...estado, oculto: true })}
          className="inline-flex min-h-toque shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-3.5" aria-hidden />
          Esconder
        </button>
      </div>

      <ol className="grid gap-2">
        {passos.map((p, i) => {
          const pulou = pulado(p);
          const ok = p.feito || pulou;
          const atual = i === proximo;
          return (
            <li
              key={p.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
                ok ? "border-transparent bg-muted/50" : atual ? "border-primary/40 bg-primary/5" : "",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  p.feito ? "bg-primary text-primary-foreground" : pulou ? "bg-muted-foreground/30 text-background" : atual ? "border-2 border-primary text-primary" : "border text-muted-foreground",
                )}
                aria-hidden
              >
                {ok ? <CheckIcon className="size-4" /> : i + 1}
              </span>

              {ok ? (
                <span className="min-w-0 flex-1 text-muted-foreground">
                  <span className="font-semibold line-through decoration-1">{p.titulo}</span>
                  {pulou ? <span className="ml-2 text-xs">pulado</span> : null}
                </span>
              ) : (
                <span className="min-w-0 flex-1">
                  <Link href={p.href} className="block font-semibold underline-offset-4 hover:underline">
                    {p.titulo}
                  </Link>
                  <span className="block text-sm text-muted-foreground">{p.texto}</span>
                  {p.extra ? (
                    <Link href={p.extra.href} className="mt-0.5 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
                      {p.extra.rotulo}
                    </Link>
                  ) : null}
                </span>
              )}

              {ok ? (
                pulou ? (
                  <button
                    type="button"
                    onClick={() => mudar({ ...estado, pulados: estado.pulados.filter((x) => x !== p.id) })}
                    className="min-h-toque shrink-0 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Desfazer
                  </button>
                ) : null
              ) : (
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                  <Link
                    href={p.href}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
                      atual ? "bg-primary text-primary-foreground" : "border text-foreground hover:bg-muted",
                    )}
                  >
                    {p.botao}
                    <ChevronRightIcon className="size-3.5" aria-hidden />
                  </Link>
                  <button
                    type="button"
                    onClick={() => mudar({ ...estado, pulados: [...estado.pulados, p.id] })}
                    className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Pular
                  </button>
                </div>
              )}
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
