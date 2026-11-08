"use client";

import { CheckIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PALETAS } from "@/features/perfil/schema";

export type Cores = { primaria: string; secundaria: string };

type Props = {
  valor: Cores;
  aoMudar: (cores: Cores) => void;
};

export function SeletorCores({ valor, aoMudar }: Props) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <span className="text-sm font-medium">Paletas prontas</span>
        <div className="flex flex-wrap gap-2">
          {PALETAS.map((p) => {
            const ativa =
              p.primaria.toUpperCase() === valor.primaria.toUpperCase() &&
              p.secundaria.toUpperCase() === valor.secundaria.toUpperCase();
            return (
              <button
                key={p.nome}
                type="button"
                title={p.nome}
                aria-label={`Paleta ${p.nome}`}
                aria-pressed={ativa}
                onClick={() => aoMudar({ primaria: p.primaria, secundaria: p.secundaria })}
                className={cn(
                  "relative size-10 overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-background transition",
                  ativa ? "ring-foreground" : "ring-transparent hover:ring-border",
                )}
                style={{ background: `linear-gradient(135deg, ${p.primaria} 50%, ${p.secundaria} 50%)` }}
              >
                {ativa ? (
                  <CheckIcon className="absolute inset-0 m-auto size-4 text-white drop-shadow" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CampoCor
          id="cor_primaria"
          rotulo="Cor principal"
          valor={valor.primaria}
          aoMudar={(c) => aoMudar({ ...valor, primaria: c })}
        />
        <CampoCor
          id="cor_secundaria"
          rotulo="Cor de fundo"
          valor={valor.secundaria}
          aoMudar={(c) => aoMudar({ ...valor, secundaria: c })}
        />
      </div>
    </div>
  );
}

function CampoCor({
  id,
  rotulo,
  valor,
  aoMudar,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (c: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <label
        htmlFor={id}
        className="flex h-toque cursor-pointer items-center gap-3 rounded-lg border border-input bg-background px-3 sm:h-toque"
      >
        <span className="size-6 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: valor }} />
        <span className="font-mono text-sm uppercase">{valor}</span>
        <input
          id={id}
          name={id}
          type="color"
          value={valor.toLowerCase()}
          onChange={(e) => aoMudar(e.target.value.toUpperCase())}
          className="sr-only"
        />
      </label>
    </div>
  );
}
