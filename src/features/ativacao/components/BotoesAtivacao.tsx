"use client";

import { useState, useTransition } from "react";
import { HandHelpingIcon, Loader2Icon, MessageSquareHeartIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { chamarConta, chamarContas } from "../actions";
import type { TipoAtivacao } from "../enviar";

/** Na página da conta: mandar agora a mensagem de ajuda ou o pedido de feedback. */
export function BotoesAtivacaoConta({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();
  function chamar(tipo: TipoAtivacao) {
    iniciar(async () => {
      const r = await chamarConta(id, tipo);
      if (r.ok) toast.success(r.mensagem);
      else toast.error(r.mensagem);
    });
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => chamar("ajuda_inicio")} disabled={pendente}>
        {pendente ? <Loader2Icon className="animate-spin" /> : <HandHelpingIcon />}
        Oferecer ajuda
      </Button>
      <Button variant="outline" onClick={() => chamar("feedback_teste")} disabled={pendente}>
        <MessageSquareHeartIcon />
        Pedir feedback
      </Button>
    </div>
  );
}

export type CategoriaChamada = "so_entrou" | "configurando" | "parou";
export type ContaParaChamar = {
  id: string;
  nome: string;
  telefone: string;
  detalhe: string;
  categoria: CategoriaChamada;
  /** "dd/MM" da última vez que a mensagem desta categoria saiu pelo WhatsApp, se já saiu */
  jaChamada: string | null;
};

const CATEGORIAS: { id: CategoriaChamada; rotulo: string; explica: string }[] = [
  { id: "so_entrou", rotulo: "Só entrou", explica: "criou a conta e não cadastrou nada" },
  { id: "configurando", rotulo: "Configurando", explica: "cadastrou serviço ou cliente há pouco, mas ainda marca pouco" },
  { id: "parou", rotulo: "Parou", explica: "mexeu no começo e depois não fez mais nada" },
];

/** Vêm marcadas as que ainda não receberam a mensagem; quem já recebeu só vai de novo se você marcar. */
const marcadasDeInicio = (contas: ContaParaChamar[], categoria: CategoriaChamada) =>
  new Set(contas.filter((c) => c.categoria === categoria && !c.jaChamada).map((c) => c.id));

/**
 * Na lista de contas: chamar no WhatsApp com a oferta de ajuda.
 * Abre uma lista (16/11/2026) para ver quem são e desmarcar quem não deve receber. Desde 17/11/2026 dá para
 * escolher a categoria (Só entrou, Configurando ou Parou) e mandar de novo para quem já recebeu.
 */
export function BotaoChamarTodas({ contas }: { contas: ContaParaChamar[] }) {
  const [pendente, iniciar] = useTransition();
  const [aberto, setAberto] = useState(false);
  const primeira = CATEGORIAS.find((c) => contas.some((x) => x.categoria === c.id && !x.jaChamada))?.id ?? "so_entrou";
  const [categoria, setCategoria] = useState<CategoriaChamada>(primeira);
  const [marcadas, setMarcadas] = useState<Set<string>>(() => marcadasDeInicio(contas, primeira));
  if (!contas.length) return null;

  const daCategoria = contas.filter((c) => c.categoria === categoria);
  // quem parou recebe a mensagem própria ("começou a montar sua agenda e deu uma pausa"); o resto, a oferta de ajuda
  const mensagem =
    categoria === "parou"
      ? "\"Vi que você começou a montar sua agenda e depois deu uma pausa. Ficou alguma dúvida?\""
      : "\"Conseguiu cadastrar seus serviços e marcar o primeiro horário?\"";
  const escolhidas = daCategoria.filter((c) => marcadas.has(c.id));
  const quantas = (id: CategoriaChamada) => contas.filter((c) => c.categoria === id).length;

  function trocarCategoria(nova: CategoriaChamada) {
    setCategoria(nova);
    setMarcadas(marcadasDeInicio(contas, nova));
  }
  const alternar = (id: string) =>
    setMarcadas((antes) => {
      const novo = new Set(antes);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  const todasMarcadas = daCategoria.length > 0 && escolhidas.length === daCategoria.length;

  function chamar() {
    iniciar(async () => {
      const r = await chamarContas(
        escolhidas.map((c) => c.id),
        categoria === "parou" ? "parou" : "ajuda_inicio",
      );
      if (r.ok) toast.success(r.mensagem);
      else toast.error(r.mensagem);
      if (r.ok) {
        setAberto(false);
        setMarcadas(new Set());
      }
    });
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          trocarCategoria(primeira);
          setAberto(true);
        }}
        className="w-fit"
      >
        <SendIcon />
        Chamar no WhatsApp
      </Button>
      <Dialog open={aberto} onOpenChange={(v) => !pendente && setAberto(v)}>
        <DialogContent className="flex max-h-[88svh] flex-col gap-3 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quem chamar no WhatsApp</DialogTitle>
            <DialogDescription>
              A Serena manda {mensagem}. Escolha a categoria e desmarque quem não deve receber. A Meta cobra por cada mensagem
              enviada.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Categoria">
            {CATEGORIAS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={categoria === c.id}
                title={c.explica}
                onClick={() => trocarCategoria(c.id)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
                  categoria === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {c.rotulo} <span className="tabular-nums opacity-75">{quantas(c.id)}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {escolhidas.length} de {daCategoria.length} marcada{daCategoria.length === 1 ? "" : "s"}
            </span>
            {daCategoria.length ? (
              <button
                type="button"
                className="font-semibold text-primary underline-offset-4 hover:underline"
                onClick={() => setMarcadas(todasMarcadas ? new Set() : new Set(daCategoria.map((c) => c.id)))}
              >
                {todasMarcadas ? "Desmarcar todas" : "Marcar todas"}
              </button>
            ) : null}
          </div>
          <ul className="-mx-1 grid min-h-0 flex-1 content-start gap-1 overflow-y-auto px-1">
            {daCategoria.length === 0 ? <li className="py-6 text-center text-sm text-muted-foreground">Ninguém nesta categoria com WhatsApp.</li> : null}
            {daCategoria.map((c) => (
              <li key={c.id}>
                <label className="flex min-h-toque cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 has-checked:border-primary/40 has-checked:bg-primary/5">
                  <input type="checkbox" className="size-4 shrink-0 accent-primary" checked={marcadas.has(c.id)} onChange={() => alternar(c.id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{c.nome}</span>
                    <span className="block truncate text-xs text-muted-foreground tabular-nums">
                      {c.telefone} · {c.detalhe}
                    </span>
                    {c.jaChamada ? <span className="block text-xs font-medium text-aviso-texto">Já recebeu esta mensagem em {c.jaChamada}</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)} disabled={pendente}>
              Cancelar
            </Button>
            <Button onClick={chamar} disabled={pendente || escolhidas.length === 0}>
              {pendente ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
              {escolhidas.length === 1 ? "Chamar 1 conta" : `Chamar ${escolhidas.length} contas`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
