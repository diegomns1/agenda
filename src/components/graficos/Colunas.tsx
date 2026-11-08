"use client";

import { useState } from "react";
import { formatarMoeda } from "@/lib/moeda";
import { cn } from "@/lib/utils";

type Ponto = { chave: string; rotulo: string; valor: number };

/**
 * Colunas de uma cor só, com ênfase na coluna `destaque` (as outras em tom apagado).
 * O valor aparece no topo da coluna em destaque e, nas outras, ao tocar/passar o mouse.
 * Inclui uma tabela para quem prefere números ou usa leitor de tela.
 */
export function Colunas({ pontos, destaque, formato = "numero", altura = 140 }: { pontos: Ponto[]; destaque?: string; formato?: "numero" | "moeda"; altura?: number }) {
  const [foco, setFoco] = useState<string | null>(null);
  const max = Math.max(1, ...pontos.map((p) => p.valor));
  const fmt = (v: number) => (formato === "moeda" ? formatarMoeda(v) : String(v));

  return (
    <div>
      <div className="relative" role="img" aria-label={pontos.map((p) => `${p.rotulo}: ${fmt(p.valor)}`).join(", ")}>
        <div className="absolute inset-x-0 border-b border-border" style={{ top: altura }} />
        <div className="grid items-end" style={{ height: altura, gridTemplateColumns: `repeat(${pontos.length}, minmax(0, 1fr))` }}>
          {pontos.map((p) => {
            const ativo = p.chave === destaque;
            const h = p.valor > 0 ? Math.max(4, (p.valor / max) * (altura - 28)) : 0;
            return (
              <button
                key={p.chave}
                type="button"
                className="group flex h-full flex-col items-center justify-end outline-none"
                onMouseEnter={() => setFoco(p.chave)}
                onMouseLeave={() => setFoco(null)}
                onFocus={() => setFoco(p.chave)}
                onBlur={() => setFoco(null)}
                onClick={() => setFoco((f) => (f === p.chave ? null : p.chave))}
                aria-label={`${p.rotulo}: ${fmt(p.valor)}`}
              >
                {ativo || foco === p.chave ? (
                  <span className="mb-1 rounded-md bg-background/90 px-1 text-[11px] font-semibold whitespace-nowrap text-foreground tabular-nums shadow-sm ring-1 ring-border">
                    {fmt(p.valor)}
                  </span>
                ) : null}
                <span
                  className={cn("w-6 rounded-t-[4px] transition-colors", ativo ? "bg-vinho" : "bg-vinho/25 group-hover:bg-vinho/40")}
                  style={{ height: h }}
                />
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 grid text-center text-[11px] text-muted-foreground capitalize" style={{ gridTemplateColumns: `repeat(${pontos.length}, minmax(0, 1fr))` }}>
          {pontos.map((p) => (
            <span key={p.chave} className={cn(p.chave === destaque && "font-bold text-foreground")}>
              {p.rotulo}
            </span>
          ))}
        </div>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Ver em tabela</summary>
        <table className="mt-2 w-full text-xs">
          <tbody className="tabular-nums">
            {pontos.map((p) => (
              <tr key={p.chave} className="border-t">
                <td className="py-1 capitalize">{p.rotulo}</td>
                <td className="py-1 text-right">{fmt(p.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/** Barras horizontais em ordem (maior primeiro), uma cor, valor na ponta. */
export function BarrasRanking({ itens, formato = "numero", vazio = "Sem dados ainda." }: { itens: { nome: string; valor: number; detalhe?: string }[]; formato?: "numero" | "moeda"; vazio?: string }) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  const fmt = (v: number) => (formato === "moeda" ? formatarMoeda(v) : String(v));
  if (itens.length === 0) return <p className="text-sm text-muted-foreground">{vazio}</p>;
  return (
    <ul className="grid gap-3">
      {itens.map((i) => (
        <li key={i.nome} className="grid gap-1" title={`${i.nome}: ${fmt(i.valor)}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">
              {i.nome}
              {i.detalhe ? <span className="text-xs text-muted-foreground"> · {i.detalhe}</span> : null}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{fmt(i.valor)}</span>
          </div>
          <div className="h-2.5 w-full">
            <div className="h-full rounded-r-[4px] bg-vinho" style={{ width: `${Math.max(2, (i.valor / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
