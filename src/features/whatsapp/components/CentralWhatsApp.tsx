"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MegaphoneIcon, SearchIcon, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { listarContatos, moverContato, type ContatoCentral } from "../central";
import { descreverNumero } from "../numero";
import { ConversaWhatsApp } from "./ConversaWhatsApp";
import { COLUNAS, colunaDe, nomeDe, quando } from "./colunas";

/*
 * Central do WhatsApp (admin): um kanban só, com filtro Todos / Leads / Clientes.
 * As colunas do Diego (Precisa de você, Com você) ficam na esquerda; depois o funil do lead.
 * Atualiza sozinha a cada 10 s. No computador, dá para arrastar o card de coluna; no celular, uma coluna por vez.
 */

type Filtro = "todos" | "leads" | "clientes";

export function CentralWhatsApp({ inicial, abrir }: { inicial: ContatoCentral[]; abrir?: string }) {
  const [contatos, setContatos] = useState(inicial);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(abrir ?? null);
  const [colunaCelular, setColunaCelular] = useState("precisa");
  const [arrastando, setArrastando] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setContatos(await listarContatos());
    } catch {
      /* sem rede: tenta de novo no próximo ciclo */
    }
  }, []);

  useEffect(() => {
    const t = setInterval(recarregar, 10_000);
    return () => clearInterval(t);
  }, [recarregar]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return contatos.filter((c) => {
      if (filtro === "leads" && c.profissional_id) return false;
      if (filtro === "clientes" && !c.profissional_id) return false;
      if (!q) return true;
      return [nomeDe(c), c.nome_whatsapp, c.telefone, c.ramo, c.profissional?.nome].join(" ").toLowerCase().includes(q);
    });
  }, [contatos, filtro, busca]);

  const porColuna = useMemo(() => {
    const mapa = new Map<string, ContatoCentral[]>(COLUNAS.map((c) => [c.id, []]));
    for (const c of visiveis) mapa.get(colunaDe(c))?.push(c);
    // não lidas primeiro, depois a mais recente
    for (const lista of mapa.values()) lista.sort((a, b) => b.nao_lidas - a.nao_lidas || +new Date(b.ultima_msg_em) - +new Date(a.ultima_msg_em));
    return mapa;
  }, [visiveis]);

  async function soltar(coluna: string) {
    const tel = arrastando;
    setArrastando(null);
    if (!tel) return;
    const c = contatos.find((x) => x.telefone === tel);
    if (!c || colunaDe(c) === coluna) return;
    // otimista: move já na tela
    setContatos((l) =>
      l.map((x) =>
        x.telefone !== tel
          ? x
          : coluna === "precisa" || coluna === "humano"
            ? { ...x, atendimento: coluna }
            : { ...x, atendimento: "robo", motivo_ajuda: null, etapa: coluna as ContatoCentral["etapa"] },
      ),
    );
    await moverContato(tel, coluna);
    recarregar();
  }

  const contatoAberto = contatos.find((c) => c.telefone === aberto) ?? null;
  const precisam = porColuna.get("precisa")?.length ?? 0;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Central do WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            {precisam ? `${precisam} ${precisam === 1 ? "conversa precisa" : "conversas precisam"} de você.` : "O robô está dando conta de tudo."} Atualiza sozinha.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border bg-card p-0.5 text-sm" role="tablist" aria-label="Quem mostrar">
            {(["todos", "leads", "clientes"] as Filtro[]).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filtro === f}
                onClick={() => setFiltro(f)}
                className={cn("min-h-9 rounded-full px-3 capitalize transition-colors", filtro === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {f}
              </button>
            ))}
          </div>
          <label className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar nome ou número"
              aria-label="Buscar nome ou número"
              className="h-9 w-56 rounded-full border bg-card pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </label>
        </div>
      </div>

      {/* celular: uma coluna por vez */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden" aria-label="Colunas">
        {COLUNAS.map((col) => (
          <button
            key={col.id}
            type="button"
            onClick={() => setColunaCelular(col.id)}
            className={cn(
              "inline-flex min-h-toque shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm",
              colunaCelular === col.id ? "border-primary bg-primary/10 font-semibold text-primary" : "bg-card text-muted-foreground",
            )}
          >
            <col.Icone className="size-4" aria-hidden />
            {col.titulo}
            <span className="tabular-nums">{porColuna.get(col.id)?.length ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3">
        {COLUNAS.map((col) => {
          const lista = porColuna.get(col.id) ?? [];
          return (
            <section
              key={col.id}
              aria-label={col.titulo}
              onDragOver={(e) => {
                if (arrastando) e.preventDefault();
              }}
              onDrop={() => soltar(col.id)}
              className={cn(
                "flex w-full shrink-0 flex-col rounded-2xl border bg-muted/40 md:w-72",
                colunaCelular !== col.id && "max-md:hidden",
                arrastando && "md:border-dashed",
              )}
            >
              <h2 className="flex items-center gap-2 px-3 pt-3 pb-2 text-sm font-semibold">
                <span className={cn("size-2 rounded-full", col.tom)} aria-hidden />
                {col.titulo}
                <span className="ml-auto rounded-full bg-background px-2 text-xs text-muted-foreground tabular-nums">{lista.length}</span>
              </h2>
              <div className="grid content-start gap-2 px-2 pb-2 md:max-h-[calc(100svh-15rem)] md:overflow-y-auto">
                {lista.length === 0 ? <p className="px-2 py-6 text-center text-xs text-muted-foreground">Ninguém aqui</p> : null}
                {lista.slice(0, 150).map((c) => (
                  <Cartao key={c.telefone} c={c} aoAbrir={() => setAberto(c.telefone)} aoArrastar={() => setArrastando(c.telefone)} aoSoltar={() => setArrastando(null)} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {contatoAberto ? <ConversaWhatsApp contato={contatoAberto} aoFechar={() => setAberto(null)} aoMudar={recarregar} /> : null}
    </div>
  );
}

function Cartao({ c, aoAbrir, aoArrastar, aoSoltar }: { c: ContatoCentral; aoAbrir: () => void; aoArrastar: () => void; aoSoltar: () => void }) {
  const ult = c.ultima;
  return (
    <button
      type="button"
      draggable
      onDragStart={aoArrastar}
      onDragEnd={aoSoltar}
      onClick={aoAbrir}
      className="relative grid gap-1.5 rounded-xl border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{nomeDe(c)}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{descreverNumero(c.telefone)}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{quando(c.ultima_msg_em)}</span>
        {c.nao_lidas > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full bg-whatsapp px-1.5 text-mini leading-5 font-bold text-white tabular-nums">
            {c.nao_lidas > 99 ? "99+" : c.nao_lidas}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1">
        {c.profissional ? (
          <Etiqueta>
            {c.profissional.plano}
            {c.profissional.conectada ? " · assistente" : ""}
          </Etiqueta>
        ) : null}
        {c.ramo ? <Etiqueta>{c.ramo}</Etiqueta> : null}
        {c.origem ? (
          <Etiqueta>
            <MegaphoneIcon className="size-3" aria-hidden />
            Anúncio
          </Etiqueta>
        ) : null}
        {c.ia_usada ? (
          <Etiqueta>
            <SparklesIcon className="size-3" aria-hidden />
            IA
          </Etiqueta>
        ) : null}
      </div>
      {c.atendimento === "precisa" && c.motivo_ajuda ? (
        <p className="line-clamp-2 text-xs font-medium text-destructive">{c.motivo_ajuda}</p>
      ) : ult ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {ult.de === "robo" ? "Robô: " : ult.de === "equipe" ? "Você: " : ult.de === "sistema" ? "• " : ""}
          {ult.texto}
        </p>
      ) : null}
    </button>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-mini font-medium text-muted-foreground capitalize">{children}</span>;
}
