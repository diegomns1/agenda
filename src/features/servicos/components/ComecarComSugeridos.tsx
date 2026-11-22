"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatarMoeda } from "@/lib/moeda";
import { adicionarSugeridos } from "../actions";

/*
 * Primeiro passo na tela Hoje para quem ainda não tem nenhum serviço (22/11/2026).
 * Quase metade de quem cria a conta não cadastrava nada e ia embora diante da agenda vazia. Aqui ela vê os
 * serviços mais comuns do ramo dela, com tempo e valor, e adiciona todos com um toque (dá para ajustar depois).
 */

type Sugestao = { nome: string; duracao_min: number; valor: number };

export function ComecarComSugeridos({ sugestoes, ramo }: { sugestoes: Sugestao[]; ramo: string | null }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  function usar() {
    iniciar(async () => {
      const r = await adicionarSugeridos();
      if (r.erro) {
        toast.error(r.erro);
        return;
      }
      toast.success(r.mensagem ?? "Serviços adicionados.");
      router.refresh();
    });
  }

  return (
    <section className="surgir grid gap-3 rounded-3xl border-2 border-primary/30 bg-card p-4" aria-labelledby="comecar-servicos">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden>
          <SparklesIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="comecar-servicos" className="text-base font-bold">
            Comece em 1 toque
          </h2>
          <p className="text-sm text-muted-foreground">
            {ramo ? `Estes são os serviços mais comuns de ${ramo}.` : "Estes são os serviços mais comuns."} Adicione todos de uma vez e
            ajuste os valores depois.
          </p>
        </div>
      </div>
      <ul className="grid gap-1 rounded-2xl bg-muted/50 p-3 text-sm">
        {sugestoes.slice(0, 5).map((s) => (
          <li key={s.nome} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate">{s.nome}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {s.duracao_min} min · {formatarMoeda(s.valor)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button onClick={usar} disabled={pendente} className="min-h-toque">
          {pendente ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          Usar estes serviços
        </Button>
        <Link href="/servicos" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Prefiro cadastrar do meu jeito
        </Link>
      </div>
    </section>
  );
}
