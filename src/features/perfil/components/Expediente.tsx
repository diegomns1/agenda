"use client";

import { useState } from "react";
import { CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { DIAS_SEMANA, INTERVALOS_GRADE, type ChaveDia } from "@/features/perfil/schema";
import type { Expediente as TipoExpediente } from "@/types/database";

type Props = {
  inicial: TipoExpediente;
  intervaloInicial: number;
};

export function Expediente({ inicial, intervaloInicial }: Props) {
  const [exp, setExp] = useState<TipoExpediente>(inicial);

  function mudar(dia: ChaveDia, campo: "ativo" | "inicio" | "fim", valor: boolean | string) {
    setExp((atual) => ({ ...atual, [dia]: { ...atual[dia], [campo]: valor } }));
  }

  function copiarSegundaParaTodos() {
    const base = exp["1"];
    setExp((atual) => {
      const novo = { ...atual };
      for (const { chave } of DIAS_SEMANA) {
        if (chave === "0") continue; // domingo mantém como está
        novo[chave] = { ...novo[chave], inicio: base.inicio, fim: base.fim };
      }
      return novo;
    });
  }

  return (
    <div className="grid gap-4">
      <ul className="divide-y rounded-lg border">
        {DIAS_SEMANA.map(({ chave, nome }) => {
          const d = exp[chave];
          return (
            <li
              key={chave}
              className={cn("grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:grid-cols-[1fr_auto_auto]", !d.ativo && "text-muted-foreground")}
            >
              <div className="flex items-center gap-3">
                <Switch
                  id={`exp_${chave}_ativo`}
                  name={`exp_${chave}_ativo`}
                  checked={d.ativo}
                  onCheckedChange={(v) => mudar(chave, "ativo", v)}
                  aria-label={`Atende ${nome}`}
                />
                <Label htmlFor={`exp_${chave}_ativo`} className="text-sm font-medium">
                  {nome}
                </Label>
              </div>

              <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:justify-self-end">
                <input
                  type="time"
                  name={`exp_${chave}_inicio`}
                  value={d.inicio}
                  onChange={(e) => mudar(chave, "inicio", e.target.value)}
                  step={300}
                  aria-label={`${nome}: início`}
                  className={cn("h-9 rounded-md border border-input bg-background px-2 text-sm", !d.ativo && "opacity-50")}
                />
                <span className="text-xs">até</span>
                <input
                  type="time"
                  name={`exp_${chave}_fim`}
                  value={d.fim}
                  onChange={(e) => mudar(chave, "fim", e.target.value)}
                  step={300}
                  aria-label={`${nome}: fim`}
                  className={cn("h-9 rounded-md border border-input bg-background px-2 text-sm", !d.ativo && "opacity-50")}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={copiarSegundaParaTodos}>
          <CopyIcon />
          Usar horário de segunda nos outros dias
        </Button>

        <div className="grid gap-1.5">
          <Label htmlFor="intervalo_grade_min">Intervalo da grade</Label>
          <select
            id="intervalo_grade_min"
            name="intervalo_grade_min"
            defaultValue={intervaloInicial}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {INTERVALOS_GRADE.map((m) => (
              <option key={m} value={m}>
                a cada {m} min
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
