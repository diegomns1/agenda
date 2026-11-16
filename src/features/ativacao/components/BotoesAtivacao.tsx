"use client";

import { useState, useTransition } from "react";
import { HandHelpingIcon, Loader2Icon, MessageSquareHeartIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { chamarConta, chamarTodasQueSoEntraram } from "../actions";
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

export type ContaParaChamar = { id: string; nome: string; telefone: string; detalhe: string };

/**
 * Na lista de contas: chamar no WhatsApp quem só entrou e ainda não recebeu a oferta de ajuda.
 * O botão abre a lista (16/11/2026): dá para ver quem são e desmarcar quem não deve receber.
 */
export function BotaoChamarTodas({ contas }: { contas: ContaParaChamar[] }) {
  const [pendente, iniciar] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [fora, setFora] = useState<Set<string>>(new Set()); // desmarcadas (o padrão é todas marcadas)
  if (!contas.length) return null;

  const marcadas = contas.filter((c) => !fora.has(c.id));
  const alternar = (id: string) =>
    setFora((antes) => {
      const novo = new Set(antes);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });

  function chamar() {
    iniciar(async () => {
      const r = await chamarTodasQueSoEntraram(marcadas.map((c) => c.id));
      if (r.ok) toast.success(r.mensagem);
      else toast.error(r.mensagem);
      if (r.ok) {
        setAberto(false);
        setFora(new Set());
      }
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setAberto(true)} className="w-fit">
        <SendIcon />
        Chamar no WhatsApp {contas.length === 1 ? "a que só entrou" : `as ${contas.length} que só entraram`}
      </Button>
      <Dialog open={aberto} onOpenChange={(v) => !pendente && setAberto(v)}>
        <DialogContent className="flex max-h-[88svh] flex-col gap-3 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quem chamar no WhatsApp</DialogTitle>
            <DialogDescription>
              Estas contas criaram o cadastro, não cadastraram nada e ainda não receberam a oferta de ajuda. Desmarque quem não deve
              receber. A Meta cobra por cada mensagem enviada.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {marcadas.length} de {contas.length} marcada{contas.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              className="font-semibold text-primary underline-offset-4 hover:underline"
              onClick={() => setFora(marcadas.length === contas.length ? new Set(contas.map((c) => c.id)) : new Set())}
            >
              {marcadas.length === contas.length ? "Desmarcar todas" : "Marcar todas"}
            </button>
          </div>
          <ul className="-mx-1 grid min-h-0 flex-1 content-start gap-1 overflow-y-auto px-1">
            {contas.map((c) => (
              <li key={c.id}>
                <label className="flex min-h-toque cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 has-checked:border-primary/40 has-checked:bg-primary/5">
                  <input type="checkbox" className="size-4 shrink-0 accent-primary" checked={!fora.has(c.id)} onChange={() => alternar(c.id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{c.nome}</span>
                    <span className="block truncate text-xs text-muted-foreground tabular-nums">
                      {c.telefone} · {c.detalhe}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)} disabled={pendente}>
              Cancelar
            </Button>
            <Button onClick={chamar} disabled={pendente || marcadas.length === 0}>
              {pendente ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
              {marcadas.length === 1 ? "Chamar 1 conta" : `Chamar ${marcadas.length} contas`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
