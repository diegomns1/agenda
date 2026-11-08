"use client";

import { useState } from "react";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CalendarCheckIcon,
  CalendarXIcon,
  ChevronDownIcon,
  Link2Icon,
  MinusIcon,
  ReceiptIcon,
  RepeatIcon,
  UserPlusIcon,
  UsersIcon,
  UserXIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import type { Chave, Relatorio } from "@/features/relatorios/dados";
import { formatarMoeda } from "@/lib/moeda";
import { cn } from "@/lib/utils";

type Config = {
  rotulo: string;
  Icone: LucideIcon;
  dinheiro?: boolean;
  /** subir é bom (faturamento) ou ruim (cancelamentos)? */
  subirEhBom: boolean;
  ajuda: string;
};

const CONFIG: Record<Chave, Config> = {
  faturamento: { rotulo: "Faturamento", Icone: WalletIcon, dinheiro: true, subirEhBom: true, ajuda: "Atendimentos que já aconteceram e não foram marcados como falta ou cancelados." },
  atendimentos: { rotulo: "Atendimentos feitos", Icone: CalendarCheckIcon, subirEhBom: true, ajuda: "Quantos atendimentos já aconteceram no mês." },
  ticket: { rotulo: "Valor médio", Icone: ReceiptIcon, dinheiro: true, subirEhBom: true, ajuda: "Faturamento dividido pelo número de atendimentos." },
  previsto: { rotulo: "Ainda vai entrar", Icone: WalletIcon, dinheiro: true, subirEhBom: true, ajuda: "Atendimentos marcados para os próximos dias do mês." },
  clientesAtendidas: { rotulo: "Clientes atendidas", Icone: UsersIcon, subirEhBom: true, ajuda: "Clientes diferentes que vieram no mês." },
  novasClientes: { rotulo: "Clientes novas", Icone: UserPlusIcon, subirEhBom: true, ajuda: "Clientes cadastradas no mês." },
  cancelamentos: { rotulo: "Desmarcaram", Icone: CalendarXIcon, subirEhBom: false, ajuda: "Atendimentos cancelados ou apagados no mês." },
  remarcacoes: { rotulo: "Remarcaram", Icone: RepeatIcon, subirEhBom: false, ajuda: "Atendimentos que mudaram de dia ou horário no mês." },
  faltas: { rotulo: "Faltaram", Icone: UserXIcon, subirEhBom: false, ajuda: "Atendimentos do mês marcados como falta." },
  pedidosLink: { rotulo: "Pedidos pelo link", Icone: Link2Icon, subirEhBom: true, ajuda: "Horários pedidos pelas clientes no seu link de agendamento." },
};

const ORDEM: Chave[] = ["atendimentos", "ticket", "clientesAtendidas", "novasClientes", "cancelamentos", "remarcacoes", "faltas", "pedidosLink"];

function formatar(chave: Chave, v: number) {
  return CONFIG[chave].dinheiro ? formatarMoeda(v) : String(Math.round(v));
}

/** Variação contra o mês anterior: seta + texto (nunca só cor). */
function Variacao({ chave, valor, anterior, rotuloAnterior, claro = false }: { chave: Chave; valor: number; anterior: number; rotuloAnterior: string; claro?: boolean }) {
  const dif = valor - anterior;
  if (anterior === 0 && valor === 0) return <span className={cn("text-xs", claro ? "text-white/70" : "text-muted-foreground")}>igual a {rotuloAnterior}</span>;
  const bom = dif === 0 ? null : (dif > 0) === CONFIG[chave].subirEhBom;
  const Icone = dif > 0 ? ArrowUpRightIcon : dif < 0 ? ArrowDownRightIcon : MinusIcon;
  const texto =
    anterior === 0
      ? `${formatar(chave, valor)} a mais que ${rotuloAnterior}`
      : dif === 0
        ? `igual a ${rotuloAnterior}`
        : `${dif > 0 ? "+" : "−"}${Math.abs(Math.round((dif / anterior) * 100))}% vs ${rotuloAnterior}`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        claro ? "text-white/90" : bom === null ? "text-muted-foreground" : bom ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400",
      )}
    >
      <Icone className="size-3.5" />
      {texto}
    </span>
  );
}

export function PainelRelatorio({ relatorio }: { relatorio: Relatorio }) {
  const [aberto, setAberto] = useState<Chave | null>(null);
  const { indicadores: ind, rotuloAnterior } = relatorio;
  const detalheAberto = aberto ? ind[aberto] : null;

  return (
    <div className="grid gap-5">
      {/* Destaque: faturamento */}
      <section className="gradiente-marca relative overflow-hidden rounded-3xl p-5 text-white shadow-lg shadow-vinho/20">
        <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/10 blur-2xl" />
        <p className="text-sm text-white/80">Faturamento em {relatorio.rotuloMes}{relatorio.mesEmAndamento ? " (até agora)" : ""}</p>
        <p className="mt-1 text-5xl font-extrabold tracking-tight">{formatarMoeda(ind.faturamento.valor)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <Variacao chave="faturamento" valor={ind.faturamento.valor} anterior={ind.faturamento.anterior} rotuloAnterior={rotuloAnterior} claro />
          {ind.previsto.valor > 0 ? <span className="text-xs text-white/85">+ {formatarMoeda(ind.previsto.valor)} ainda marcados neste mês</span> : null}
        </div>
      </section>

      {/* Indicadores */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Números do mês">
        {ORDEM.map((chave) => {
          const c = CONFIG[chave];
          const i = ind[chave];
          const clicavel = Boolean(i.detalhes);
          const conteudo = (
            <>
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <c.Icone className="size-3.5" />
                {c.rotulo}
              </span>
              <span className="text-2xl font-extrabold tracking-tight">{formatar(chave, i.valor)}</span>
              <Variacao chave={chave} valor={i.valor} anterior={i.anterior} rotuloAnterior={rotuloAnterior} />
              {clicavel ? (
                <span className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary">
                  {aberto === chave ? "Esconder" : "Ver quem"}
                  <ChevronDownIcon className={cn("size-3 transition-transform", aberto === chave && "rotate-180")} />
                </span>
              ) : null}
            </>
          );
          return clicavel ? (
            <button
              key={chave}
              type="button"
              title={c.ajuda}
              aria-expanded={aberto === chave}
              onClick={() => setAberto((a) => (a === chave ? null : chave))}
              className={cn(
                "cartao-vivo grid content-start gap-1 rounded-2xl border bg-card p-3 text-left transition-colors",
                aberto === chave ? "border-primary ring-1 ring-primary" : "hover:bg-muted/40",
              )}
            >
              {conteudo}
            </button>
          ) : (
            <div key={chave} title={c.ajuda} className="grid content-start gap-1 rounded-2xl border bg-card p-3">
              {conteudo}
            </div>
          );
        })}
      </section>

      {/* Lista de quem (ao tocar num indicador) */}
      {aberto && detalheAberto ? (
        <section className="surgir rounded-2xl border bg-card p-4" aria-live="polite">
          <h2 className="font-semibold">
            {CONFIG[aberto].rotulo} em {relatorio.rotuloMes}
          </h2>
          <p className="text-xs text-muted-foreground">{CONFIG[aberto].ajuda}</p>
          {detalheAberto.detalhes!.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Ninguém neste mês.</p>
          ) : (
            <ul className="mt-2 divide-y">
              {detalheAberto.detalhes!.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.titulo}</p>
                    <p className="text-xs text-muted-foreground first-letter:uppercase">{d.subtitulo}</p>
                  </div>
                  {d.valor ? <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{formatarMoeda(Number(d.valor))}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <GraficoMeses serie={relatorio.serieMeses} mesSelecionado={relatorio.mes} />

      <div className="grid gap-5 md:grid-cols-2">
        <Ranking titulo="Serviços que mais faturaram" vazio="Nenhum atendimento feito neste mês." itens={relatorio.servicos} />
        <Ranking titulo="Clientes que mais gastaram" vazio="Nenhum atendimento feito neste mês." itens={relatorio.topClientes} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Faturamento dos últimos 6 meses: colunas de uma cor só (ênfase no mês escolhido,
   os outros em tom apagado). Valor no topo só do mês escolhido; os outros no toque/hover.
   -------------------------------------------------------------------------- */
function GraficoMeses({ serie, mesSelecionado }: { serie: Relatorio["serieMeses"]; mesSelecionado: string }) {
  const [foco, setFoco] = useState<string | null>(null);
  const max = Math.max(1, ...serie.map((s) => s.faturamento));
  const ALTURA = 140;

  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="font-semibold">Faturamento dos últimos 6 meses</h2>
      <p className="text-xs text-muted-foreground">Toque numa coluna para ver o valor.</p>

      <div className="relative mt-4" role="img" aria-label={serie.map((s) => `${s.rotulo}: ${formatarMoeda(s.faturamento)}`).join(", ")}>
        {/* linha de base */}
        <div className="absolute inset-x-0 border-b border-border" style={{ top: ALTURA }} />
        <div className="grid grid-cols-6 items-end" style={{ height: ALTURA }}>
          {serie.map((s) => {
            const selecionado = s.mes === mesSelecionado;
            const mostrarValor = selecionado || foco === s.mes;
            const h = s.faturamento > 0 ? Math.max(4, (s.faturamento / max) * (ALTURA - 28)) : 0;
            return (
              <button
                key={s.mes}
                type="button"
                className="group relative flex h-full flex-col items-center justify-end outline-none"
                onMouseEnter={() => setFoco(s.mes)}
                onMouseLeave={() => setFoco(null)}
                onFocus={() => setFoco(s.mes)}
                onBlur={() => setFoco(null)}
                onClick={() => setFoco((f) => (f === s.mes ? null : s.mes))}
                aria-label={`${s.rotulo}: ${formatarMoeda(s.faturamento)}, ${s.atendimentos} atendimentos`}
              >
                {mostrarValor ? (
                  <span className="mb-1 rounded-md bg-background/90 px-1 text-[11px] font-semibold whitespace-nowrap text-foreground tabular-nums shadow-sm ring-1 ring-border">
                    {formatarMoeda(s.faturamento)}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "w-6 rounded-t-[4px] transition-colors",
                    selecionado ? "bg-vinho dark:bg-rosa" : "bg-vinho/25 group-hover:bg-vinho/40 dark:bg-rosa/30 dark:group-hover:bg-rosa/45",
                  )}
                  style={{ height: h }}
                />
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 grid grid-cols-6 text-center text-[11px] text-muted-foreground capitalize">
          {serie.map((s) => (
            <span key={s.mes} className={cn(s.mes === mesSelecionado && "font-bold text-foreground")}>
              {s.rotulo}
            </span>
          ))}
        </div>
      </div>

      {/* tabela para leitores de tela / quem preferir números */}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Ver em tabela</summary>
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 font-medium">Mês</th>
              <th className="py-1 text-right font-medium">Atendimentos</th>
              <th className="py-1 text-right font-medium">Faturamento</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {serie.map((s) => (
              <tr key={s.mes} className="border-t">
                <td className="py-1 capitalize">{s.rotulo}</td>
                <td className="py-1 text-right">{s.atendimentos}</td>
                <td className="py-1 text-right">{formatarMoeda(s.faturamento)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

/** Barras horizontais em ordem, uma cor, valor na ponta. */
function Ranking({ titulo, vazio, itens }: { titulo: string; vazio: string; itens: { nome: string; valor: number; quantidade: number }[] }) {
  const visiveis = itens.slice(0, 6);
  const resto = itens.slice(6);
  const lista = resto.length
    ? [...visiveis, { nome: `Outros (${resto.length})`, valor: resto.reduce((s, i) => s + i.valor, 0), quantidade: resto.reduce((s, i) => s + i.quantidade, 0) }]
    : visiveis;
  const max = Math.max(1, ...lista.map((i) => i.valor));

  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="font-semibold">{titulo}</h2>
      {lista.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {lista.map((i) => (
            <li key={i.nome} className="grid gap-1" title={`${i.nome}: ${formatarMoeda(i.valor)} em ${i.quantidade} atendimento${i.quantidade === 1 ? "" : "s"}`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{i.nome}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {i.quantidade}× · <span className="font-semibold text-foreground">{formatarMoeda(i.valor)}</span>
                </span>
              </div>
              <div className="h-2.5 w-full">
                <div className="h-full rounded-r-[4px] bg-vinho dark:bg-rosa" style={{ width: `${Math.max(2, (i.valor / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
