"use client";

import { useState } from "react";
import { TRATAMENTOS, type Tratamento } from "@/lib/ramos";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** "Como prefere ser chamada(o)?" — envia o campo `tratamento`. */
export function EscolhaTratamento({ inicial, erro, aoMudar }: { inicial?: Tratamento | null; erro?: string; aoMudar?: (t: Tratamento) => void }) {
  const [valor, setValor] = useState<Tratamento | "">(inicial ?? "");
  return (
    <div className="grid gap-1.5">
      <Label>Como prefere ser tratada(o)?</Label>
      <input type="hidden" name="tratamento" value={valor} />
      <div className="grid grid-cols-3 gap-2" role="radiogroup">
        {(Object.keys(TRATAMENTOS) as Tratamento[]).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={valor === t}
            onClick={() => {
              setValor(t);
              aoMudar?.(t);
            }}
            className={cn(
              "rounded-xl border px-2 py-2.5 text-center text-sm transition-colors",
              valor === t ? "border-primary bg-primary/10 font-semibold text-primary ring-1 ring-primary" : "bg-background hover:bg-muted",
            )}
          >
            {TRATAMENTOS[t].rotulo}
            <span className="block text-mini font-normal text-muted-foreground">&quot;{TRATAMENTOS[t].exemplo}&quot;</span>
          </button>
        ))}
      </div>
      {erro ? <p className="text-sm text-destructive">{erro}</p> : <p className="text-xs text-muted-foreground">Ajusta os textos do painel. A cor você escolhe depois no Perfil.</p>}
    </div>
  );
}
