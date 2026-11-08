"use client";

import { Fragment, useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";
import { minutosDoDia, minutosParaHora, type DataISO } from "@/lib/datas";
import { cn } from "@/lib/utils";
import type { Agendamento } from "@/types/database";
import { CartaoAgendamento } from "./CartaoAgendamento";

export const PX_POR_MIN = 1.6; // 30 min = 48px

export type Coluna = { dia: DataISO; agendamentos: Agendamento[]; atende: boolean };

type Props = {
  colunas: Coluna[];
  inicioMin: number; // ex.: 480 (08:00)
  fimMin: number; // ex.: 1080 (18:00)
  passoMin: number; // linhas de referência
  agoraMin?: number | null; // linha "agora" (só se o dia for hoje)
  diaDeHoje?: DataISO;
  compacto?: boolean;
  aoClicarSlot?: (dia: DataISO, hora: string) => void;
  aoSelecionar?: (a: Agendamento) => void;
  cabecalho?: (c: Coluna) => React.ReactNode;
  /** Área que rola (para posicionar no horário atual ao abrir). */
  refRolagem?: React.Ref<HTMLDivElement>;
};

/** Folga acima da primeira e abaixo da última hora, para os rótulos não ficarem cortados. */
export const FOLGA_GRADE = 12;

/** Grade com eixo de horas à esquerda e uma ou mais colunas (dia / semana). */
export function GradeHoraria({
  colunas,
  inicioMin,
  fimMin,
  passoMin,
  agoraMin,
  diaDeHoje,
  compacto,
  aoClicarSlot,
  aoSelecionar,
  cabecalho,
  refRolagem,
}: Props) {
  const total = fimMin - inicioMin;
  const altura = total * PX_POR_MIN;
  const linhas: number[] = [];
  for (let t = inicioMin; t <= fimMin; t += 60) linhas.push(t);

  // Toque em horário vazio: o 1º toque só marca o espaço ("+ 14:30"); o 2º, nele, abre o agendamento.
  // Evita abrir "Marcar atendimento" sem querer ao rolar ou ao errar um cartão por pouco.
  const [slot, setSlot] = useState<{ dia: DataISO; min: number } | null>(null);
  useEffect(() => {
    if (!slot) return;
    const sair = (e: KeyboardEvent) => e.key === "Escape" && setSlot(null);
    window.addEventListener("keydown", sair);
    return () => window.removeEventListener("keydown", sair);
  }, [slot]);

  function clicarFundo(e: React.MouseEvent<HTMLDivElement>, dia: DataISO) {
    if (!aoClicarSlot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutos = inicioMin + Math.floor(y / PX_POR_MIN / passoMin) * passoMin;
    setSlot({ dia, min: Math.max(inicioMin, Math.min(minutos, fimMin - passoMin)) });
  }

  return (
    // A grade rola sozinha (altura da tela), sem arrastar o painel junto: overscroll-contain segura o gesto aqui
    <div
      ref={refRolagem}
      className="h-[calc(100dvh-21rem)] min-h-72 overflow-auto overscroll-contain rounded-xl border bg-card [-webkit-overflow-scrolling:touch]"
    >
      <div
        className="grid min-w-full"
        style={{ gridTemplateColumns: `3rem repeat(${colunas.length}, minmax(${compacto ? "5.5rem" : "0"}, 1fr))` }}
      >
        {/* Cabeçalhos */}
        {cabecalho ? (
          <>
            <div className="sticky top-0 left-0 z-30 border-b bg-card" />
            {colunas.map((c) => (
              <div key={c.dia} className="sticky top-0 z-20 border-b border-l bg-card">
                {cabecalho(c)}
              </div>
            ))}
          </>
        ) : null}

        {/* Eixo das horas */}
        <div className="sticky left-0 z-[15] bg-card" style={{ height: altura + FOLGA_GRADE * 2, paddingTop: FOLGA_GRADE }}>
          <div className="relative" style={{ height: altura }}>
          {linhas.map((t) => (
            <span
              key={t}
              className="absolute right-1.5 -translate-y-1/2 text-mini tabular-nums text-muted-foreground"
              style={{ top: (t - inicioMin) * PX_POR_MIN }}
            >
              {minutosParaHora(t)}
            </span>
          ))}
          </div>
        </div>

        {/* Colunas */}
        {colunas.map((c) => {
          const ehHoje = c.dia === diaDeHoje;
          return (
            <div
              key={c.dia}
              onClick={(e) => clicarFundo(e, c.dia)}
              className={cn(
                "relative border-l",
                !c.atende && "bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,color-mix(in_oklch,var(--muted),transparent_30%)_8px,color-mix(in_oklch,var(--muted),transparent_30%)_16px)]",
                aoClicarSlot && "cursor-pointer",
              )}
              style={{ height: altura, marginTop: FOLGA_GRADE, marginBottom: FOLGA_GRADE }}
            >
              {linhas.map((t) => (
                <Fragment key={t}>
                  <div className="absolute inset-x-0 border-t border-border/70" style={{ top: (t - inicioMin) * PX_POR_MIN }} />
                  {t + 30 < fimMin ? (
                    <div className="absolute inset-x-0 border-t border-dashed border-border/40" style={{ top: (t + 30 - inicioMin) * PX_POR_MIN }} />
                  ) : null}
                </Fragment>
              ))}

              {ehHoje && agoraMin != null && agoraMin >= inicioMin && agoraMin <= fimMin ? (
                <div className="pointer-events-none absolute inset-x-0 z-[12] flex items-center" style={{ top: (agoraMin - inicioMin) * PX_POR_MIN }}>
                  <span className="size-2 -translate-x-1 rounded-full bg-destructive" />
                  <span className="h-px flex-1 bg-destructive" />
                </div>
              ) : null}

              {slot && slot.dia === c.dia && aoClicarSlot ? (
                <button
                  type="button"
                  autoFocus
                  aria-label={`Marcar atendimento às ${minutosParaHora(slot.min)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    aoClicarSlot(c.dia, minutosParaHora(slot.min));
                    setSlot(null);
                  }}
                  className="surgir absolute inset-x-0.5 z-[11] flex items-center gap-1 rounded-lg border-2 border-dashed border-primary bg-primary/10 px-1.5 text-xs font-semibold text-primary tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  style={{ top: (slot.min - inicioMin) * PX_POR_MIN, height: Math.max(44, passoMin * PX_POR_MIN - 2) }}
                >
                  <PlusIcon aria-hidden className="size-3.5 shrink-0" />
                  {minutosParaHora(slot.min)}
                </button>
              ) : null}

              {c.agendamentos.map((a) => {
                const ini = Math.max(inicioMin, minutosDoDiaRelativo(a.inicio, c.dia));
                const fim = Math.min(fimMin, minutosDoDiaRelativo(a.fim, c.dia, true));
                if (fim <= ini) return null;
                const top = (ini - inicioMin) * PX_POR_MIN;
                const height = Math.max(22, (fim - ini) * PX_POR_MIN - 2);
                return (
                  <div
                    key={a.id}
                    className="absolute inset-x-0.5 z-10"
                    style={{ top, height }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CartaoAgendamento
                      agendamento={a}
                      compacto={compacto}
                      style={{ height: "100%" }}
                      onClick={() => aoSelecionar?.(a)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Minutos do dia, limitando ocupações que atravessam a meia-noite. */
function minutosDoDiaRelativo(valor: string, dia: DataISO, ehFim = false) {
  const d = new Date(valor);
  const diaDoValor = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
  if (diaDoValor < dia) return 0;
  if (diaDoValor > dia) return 24 * 60;
  const m = minutosDoDia(d);
  return ehFim && m === 0 ? 24 * 60 : m;
}
