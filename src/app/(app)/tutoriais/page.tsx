import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDownIcon, ChevronRightIcon, LockIcon, PlayCircleIcon } from "lucide-react";
import { obterPerfil } from "@/lib/auth";
import { PLANOS, temRecurso } from "@/lib/planos";
import { SUPORTE_WHATSAPP } from "@/lib/constantes";
import { TUTORIAIS, videoEmbutido } from "@/features/tutoriais/conteudo";

export const metadata: Metadata = { title: "Tutoriais" };

/** Recurso que libera cada tutorial de plano pago (para mostrar o cadeado em quem não tem). */
const RECURSO = { profissional: "lembretes", premium: "assistente" } as const;

export default async function PaginaTutoriais({ searchParams }: { searchParams: Promise<{ abrir?: string }> }) {
  const { abrir } = await searchParams;
  const perfil = await obterPerfil();

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tutoriais</h1>
        <p className="text-sm text-muted-foreground">Passo a passo de cada parte do Vaguinha. Toque num assunto para abrir.</p>
      </div>

      <ul className="grid gap-2">
        {TUTORIAIS.map((t) => {
          const bloqueado = t.plano ? !temRecurso(perfil?.plano, RECURSO[t.plano]) : false;
          const embutido = t.video ? videoEmbutido(t.video) : null;
          return (
            <li key={t.id} id={t.id}>
              <details open={abrir === t.id} className="group rounded-2xl border bg-card open:shadow-sm">
                <summary className="flex min-h-toque cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {t.titulo}
                      {t.plano ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-mini font-semibold text-muted-foreground">
                          {bloqueado ? <LockIcon className="size-3" aria-hidden /> : null}
                          {PLANOS[t.plano].nome}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted-foreground">{t.resumo}</p>
                  </div>
                  <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </summary>

                <div className="grid gap-3 border-t px-4 py-3">
                  {embutido ? (
                    <div className="aspect-video overflow-hidden rounded-xl bg-muted">
                      <iframe
                        src={embutido}
                        title={`Vídeo: ${t.titulo}`}
                        className="size-full"
                        loading="lazy"
                        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : t.video ? (
                    <a href={t.video} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      <PlayCircleIcon className="size-4" aria-hidden />
                      Ver o vídeo
                    </a>
                  ) : (
                    <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <PlayCircleIcon className="size-4" aria-hidden />
                      Vídeo em breve
                    </p>
                  )}

                  <ol className="grid list-decimal gap-1.5 pl-5 text-sm leading-relaxed">
                    {t.passos.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ol>

                  {bloqueado ? (
                    <Link href="/assinatura" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                      Disponível no plano {PLANOS[t.plano!].nome}: ver planos
                      <ChevronRightIcon className="size-4" aria-hidden />
                    </Link>
                  ) : t.acao ? (
                    <Link href={t.acao.href} className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                      {t.acao.rotulo}
                      <ChevronRightIcon className="size-4" aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      <p className="text-sm text-muted-foreground">
        Ficou com dúvida?{" "}
        <a href={`https://wa.me/${SUPORTE_WHATSAPP}`} target="_blank" rel="noopener" className="font-semibold text-primary underline-offset-4 hover:underline">
          Chame a gente no WhatsApp
        </a>
        .
      </p>
    </div>
  );
}
