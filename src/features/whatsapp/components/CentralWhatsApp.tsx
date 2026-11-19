"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MegaphoneIcon, SearchIcon, SendIcon, SparklesIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { listarContatos, moverContato, type ContatoCentral } from "../central";
import { descreverNumero } from "../numero";
import { DIAS_PARA_APAGAR } from "../prazos";
import { ConversaWhatsApp } from "./ConversaWhatsApp";
import { DialogoMensagemPronta } from "./OpcoesConversa";
import { COLUNAS, colunaDe, nomeDe, quando } from "./colunas";

/*
 * Central do WhatsApp (admin): um kanban só, com filtro Todos / Leads / Clientes.
 * As colunas do Diego (Precisa de você, Com você) ficam na esquerda; depois o funil do lead; no fim, Robôs e spam.
 * Atualiza sozinha a cada 10 s. No computador, dá para arrastar o card de coluna; no celular, uma coluna por vez.
 * No computador a página não rola (16/11/2026): o quadro ocupa o que sobra da tela e só os cartões rolam, dentro
 * de cada coluna. Assim o título, os filtros e o nome das colunas ficam sempre à vista.
 */

type Filtro = "todos" | "leads" | "clientes";

export function CentralWhatsApp({ inicial, abrir }: { inicial: ContatoCentral[]; abrir?: string }) {
  const [contatos, setContatos] = useState(inicial);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(abrir ?? null);
  const [colunaCelular, setColunaCelular] = useState("precisa");
  const [arrastando, setArrastando] = useState<string | null>(null);
  /** telefone de quem vai receber a mensagem pronta pelo botão "Reenviar mensagem" do cartão */
  const [reenviarPara, setReenviarPara] = useState<string | null>(null);
  const raiz = useRef<HTMLDivElement>(null);

  // altura do quadro = tela menos o que está acima dele (cabeçalho do admin, botões, aviso da Meta...)
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const medir = () => el.style.setProperty("--topo", `${Math.round(el.getBoundingClientRect().top + window.scrollY)}px`);
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

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
    // otimista: move já na tela (mesmas regras de moverContato, no servidor)
    setContatos((l) =>
      l.map((x): ContatoCentral => {
        if (x.telefone !== tel) return x;
        if (coluna === "spam") return { ...x, etapa: "spam", atendimento: "humano", nao_lidas: 0 };
        if (coluna === "precisa" || coluna === "humano") return { ...x, atendimento: coluna, etapa: x.etapa === "spam" ? "robo" : x.etapa };
        return { ...x, atendimento: "robo", motivo_ajuda: null, etapa: coluna as ContatoCentral["etapa"] };
      }),
    );
    await moverContato(tel, coluna);
    recarregar();
  }

  const contatoAberto = contatos.find((c) => c.telefone === aberto) ?? null;
  const contatoReenvio = contatos.find((c) => c.telefone === reenviarPara) ?? null;
  const precisam = porColuna.get("precisa")?.length ?? 0;

  return (
    // 1.5rem = o espaço de baixo do <main> do admin: com isso a página fecha exatamente na altura da tela
    <div ref={raiz} className="flex flex-col gap-3 md:h-[calc(100svh-var(--topo,15rem)-1.5rem)] md:min-h-80">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Central do WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            {precisam ? `${precisam} ${precisam === 1 ? "conversa precisa" : "conversas precisam"} de você.` : "O robô está dando conta de tudo."} Atualiza
            sozinha. Conversa parada há {DIAS_PARA_APAGAR} dias é apagada.
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
      <div className="-mx-4 flex shrink-0 gap-2 overflow-x-auto px-4 pb-1 md:hidden" aria-label="Colunas">
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

      {/* o quadro ocupa o resto da tela; a rolagem para os lados é dele, e a de cima para baixo é de cada coluna */}
      <div className="flex gap-3 overflow-x-auto pb-2 md:min-h-0 md:flex-1">
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
                "flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border bg-muted/40 md:w-72",
                colunaCelular !== col.id && "max-md:hidden",
                arrastando && "md:border-dashed",
              )}
            >
              <div className="shrink-0 px-3 pt-2.5 pb-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <span className={cn("size-2 shrink-0 rounded-full", col.tom)} aria-hidden />
                  <span className="truncate">{col.titulo}</span>
                  <span className="ml-auto rounded-full bg-background px-2 text-xs text-muted-foreground tabular-nums">{lista.length}</span>
                </h2>
                <p className="truncate pl-4 text-mini text-muted-foreground">{col.explica}</p>
              </div>
              <div className="grid content-start gap-2 px-2 pt-1.5 pb-2 md:min-h-0 md:flex-1 md:overflow-y-auto">
                {lista.length === 0 ? <p className="px-2 py-6 text-center text-xs text-muted-foreground">Ninguém aqui</p> : null}
                {lista.slice(0, 150).map((c) => (
                  <Cartao
                    key={c.telefone}
                    c={c}
                    coluna={col.id}
                    aoAbrir={() => setAberto(c.telefone)}
                    aoReenviar={() => setReenviarPara(c.telefone)}
                    aoArrastar={() => setArrastando(c.telefone)}
                    aoSoltar={() => setArrastando(null)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {contatoAberto ? <ConversaWhatsApp contato={contatoAberto} aoFechar={() => setAberto(null)} aoMudar={recarregar} /> : null}
      {contatoReenvio ? (
        <DialogoMensagemPronta contato={contatoReenvio} aberto aoMudarAberto={(v) => !v && setReenviarPara(null)} aoEnviar={recarregar} />
      ) : null}
    </div>
  );
}

function Cartao({
  c,
  coluna,
  aoAbrir,
  aoReenviar,
  aoArrastar,
  aoSoltar,
}: {
  c: ContatoCentral;
  coluna: string;
  aoAbrir: () => void;
  aoReenviar: () => void;
  aoArrastar: () => void;
  aoSoltar: () => void;
}) {
  const ult = c.ultima;
  // a Meta avisou que a última mensagem que saiu não chegou
  const naoEntregue = Boolean(ult && ult.de !== "contato" && ult.status === "falhou");
  // "Reenviar mensagem": para quem parou de responder e para quem não recebeu (abre as mensagens prontas)
  const podeReenviar = !c.bloqueado && (coluna === "sem_resposta" || naoEntregue);
  return (
    <div
      draggable
      onDragStart={aoArrastar}
      onDragEnd={aoSoltar}
      className="relative rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <button
        type="button"
        onClick={aoAbrir}
        className="grid w-full gap-1.5 rounded-xl p-3 text-left focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{nomeDe(c)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{descreverNumero(c.telefone)}</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{quando(c.ultima_msg_em)}</span>
        </div>
        <div className="flex flex-wrap gap-1 empty:hidden">
          {/* em que etapa de uso a conta está (e onde parou), com as cores da tela de Contas */}
          {c.profissional?.etapa ? (
            <span
              className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-mini font-bold", c.profissional.etapa.tom)}
              title={c.profissional.etapa.dias === null ? "Ainda não cadastrou nada" : `Última atividade há ${c.profissional.etapa.dias} dia${c.profissional.etapa.dias === 1 ? "" : "s"}`}
            >
              {c.profissional.etapa.rotulo}
              {c.profissional.etapa.nivel === "parou" && c.profissional.etapa.dias !== null ? ` · ${c.profissional.etapa.dias} d` : ""}
            </span>
          ) : null}
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
        {c.motivo_ajuda && (c.atendimento === "precisa" || (c.atendimento === "humano" && c.motivo_ajuda.startsWith("🤖"))) ? (
          <p className="line-clamp-2 text-xs font-medium text-destructive">{c.motivo_ajuda}</p>
        ) : ult ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {ult.de === "robo" ? "Robô: " : ult.de === "equipe" ? "Você: " : ult.de === "sistema" ? "• " : ""}
            {ult.texto}
          </p>
        ) : null}
        {naoEntregue ? (
          <p className="flex items-center gap-1 text-xs font-semibold text-destructive">
            <TriangleAlertIcon className="size-3 shrink-0" aria-hidden />
            Não foi entregue
          </p>
        ) : null}
      </button>
      {c.nao_lidas > 0 ? (
        <span className="pointer-events-none absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full bg-whatsapp px-1.5 text-mini leading-5 font-bold text-white tabular-nums">
          {c.nao_lidas > 99 ? "99+" : c.nao_lidas}
        </span>
      ) : null}
      {podeReenviar ? (
        <div className="border-t px-2 py-1.5">
          <button
            type="button"
            onClick={aoReenviar}
            className="inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <SendIcon className="size-3.5" aria-hidden />
            Reenviar mensagem
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-mini font-medium text-muted-foreground capitalize">{children}</span>;
}
