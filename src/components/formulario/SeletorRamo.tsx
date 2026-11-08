"use client";

import { useId, useMemo, useState } from "react";
import { CheckIcon, PencilLineIcon, SearchIcon } from "lucide-react";
import { buscarRamos, GRUPOS, OUTRO_RAMO, obterRamo, type GrupoRamo } from "@/lib/ramos";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  ramoInicial?: string | null;
  outroInicial?: string | null;
  erro?: string;
  rotulo?: string;
};

/**
 * Escolha do ramo com busca. Envia os campos `ramo` (id da lista ou "outro") e `ramo_outro`.
 * Mostra a lista agrupada; digitar filtra por nome e sinônimos (ex.: "unha", "tattoo", "barba").
 */
export function SeletorRamo({ ramoInicial, outroInicial, erro, rotulo = "Seu ramo de atuação" }: Props) {
  const id = useId();
  const [ramo, setRamo] = useState<string>(ramoInicial ?? "");
  const [outro, setOutro] = useState(outroInicial ?? "");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(!ramoInicial);

  const resultados = useMemo(() => buscarRamos(busca), [busca]);
  const porGrupo = useMemo(() => {
    const mapa = new Map<GrupoRamo, typeof resultados>();
    for (const r of resultados) mapa.set(r.grupo, [...(mapa.get(r.grupo) ?? []), r]);
    return [...mapa.entries()];
  }, [resultados]);

  const escolhido = ramo === OUTRO_RAMO ? null : obterRamo(ramo);

  function escolher(novo: string) {
    setRamo(novo);
    setAberto(novo === OUTRO_RAMO);
    if (novo !== OUTRO_RAMO) setBusca("");
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`${id}-busca`}>{rotulo}</Label>
      <input type="hidden" name="ramo" value={ramo} />
      <input type="hidden" name="ramo_outro" value={ramo === OUTRO_RAMO ? outro : ""} />

      {!aberto && ramo ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="flex h-toque items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-base sm:h-toque"
        >
          <span className="truncate">{escolhido?.nome ?? (outro || "Outros")}</span>
          <span className="shrink-0 text-xs font-semibold text-primary">Trocar</span>
        </button>
      ) : (
        <div className={cn("grid gap-2 rounded-xl border bg-background p-2", erro && "border-destructive")}>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`${id}-busca`}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Busque: unha, cabelo, tatuagem, personal..."
              autoComplete="off"
              className="h-toque pl-9 text-base sm:h-toque"
            />
          </div>
          <div className="max-h-64 overflow-y-auto pr-1" role="listbox" aria-label="Ramos">
            {porGrupo.map(([grupo, ramos]) => (
              <div key={grupo} className="py-1">
                <p className="px-2 pb-1 text-mini font-semibold tracking-wide text-muted-foreground uppercase">{GRUPOS[grupo]}</p>
                {ramos.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    aria-selected={ramo === r.id}
                    onClick={() => escolher(r.id)}
                    className={cn(
                      "min-h-toque sm:min-h-0 flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-muted",
                      ramo === r.id && "bg-primary/10 font-semibold text-primary",
                    )}
                  >
                    {r.nome}
                    {ramo === r.id ? <CheckIcon className="size-4" /> : null}
                  </button>
                ))}
              </div>
            ))}
            {resultados.length === 0 ? <p className="px-2 py-2 text-sm text-muted-foreground">Não achou? Escolha &quot;Outros&quot; e escreva.</p> : null}
            <button
              type="button"
              role="option"
              aria-selected={ramo === OUTRO_RAMO}
              onClick={() => escolher(OUTRO_RAMO)}
              className={cn(
                "min-h-toque sm:min-h-0 mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed px-2 py-2 text-left text-sm hover:bg-muted",
                ramo === OUTRO_RAMO && "border-primary bg-primary/10 font-semibold text-primary",
              )}
            >
              <PencilLineIcon className="size-4" />
              Outros (escrever o meu)
            </button>
          </div>
          {ramo === OUTRO_RAMO ? (
            <Input
              value={outro}
              onChange={(e) => setOutro(e.target.value.slice(0, 60))}
              placeholder="Qual é o seu ramo? Ex.: Fotografia de pets"
              className="h-toque text-base sm:h-toque"
              autoFocus
            />
          ) : null}
        </div>
      )}
      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
    </div>
  );
}
