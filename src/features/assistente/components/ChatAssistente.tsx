"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BotMessageSquareIcon, CheckIcon, Loader2Icon, SendHorizontalIcon, XIcon } from "lucide-react";
import { conversarComAssistente, executarProposta } from "@/features/assistente/actions";
import { SUGESTOES_ASSISTENTE, type MensagemChat, type Proposta } from "@/features/assistente/tipos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Fala = {
  id: string;
  papel: "voce" | "assistente";
  texto: string;
  propostas?: (Proposta & { situacao?: "confirmada" | "recusada" | "erro"; retorno?: string })[];
  erro?: boolean;
};

const CHAVE = "vaguinha-assistente-conversa";

export function ChatAssistente({ nome }: { nome: string }) {
  const [falas, setFalas] = useState<Fala[]>([]);
  const [texto, setTexto] = useState("");
  const [restantes, setRestantes] = useState<number | null>(null);
  const [enviando, iniciar] = useTransition();
  const [executando, setExecutando] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  // conversa guardada só nesta aba (some ao fechar o navegador)
  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem(CHAVE);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restaura a conversa salva uma única vez
      if (salvo) setFalas(JSON.parse(salvo));
    } catch {
      /* sem armazenamento: começa vazio */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify(falas.slice(-40)));
    } catch {
      /* ignora */
    }
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [falas]);

  function historico(): MensagemChat[] {
    return falas.filter((f) => !f.erro).map((f) => ({ papel: f.papel, texto: f.texto.slice(0, 4000) }));
  }

  function enviar(mensagem: string) {
    const limpo = mensagem.trim();
    if (!limpo || enviando) return;
    const anterior = historico();
    setFalas((l) => [...l, { id: crypto.randomUUID(), papel: "voce", texto: limpo }]);
    setTexto("");
    iniciar(async () => {
      const r = await conversarComAssistente(anterior, limpo);
      if (typeof r.restantesHoje === "number") setRestantes(r.restantesHoje);
      setFalas((l) => [
        ...l,
        r.ok
          ? { id: crypto.randomUUID(), papel: "assistente", texto: r.texto ?? "", propostas: r.propostas }
          : { id: crypto.randomUUID(), papel: "assistente", texto: r.erro ?? "Algo deu errado.", erro: true },
      ]);
    });
  }

  async function decidir(falaId: string, proposta: Proposta, confirmar: boolean) {
    const marcar = (situacao: "confirmada" | "recusada" | "erro", retorno: string) =>
      setFalas((l) =>
        l.map((f) =>
          f.id === falaId ? { ...f, propostas: f.propostas?.map((p) => (p.id === proposta.id ? { ...p, situacao, retorno } : p)) } : f,
        ),
      );
    if (!confirmar) {
      marcar("recusada", "Não alterei nada.");
      setFalas((l) => [...l, { id: crypto.randomUUID(), papel: "assistente", texto: `Ok, não fiz: ${proposta.resumo}.` }]);
      return;
    }
    setExecutando(proposta.id);
    const r = await executarProposta(proposta);
    setExecutando(null);
    marcar(r.ok ? "confirmada" : "erro", r.mensagem);
    setFalas((l) => [...l, { id: crypto.randomUUID(), papel: "assistente", texto: r.mensagem, erro: !r.ok }]);
  }

  return (
    <div className="flex min-h-[60vh] flex-col rounded-3xl border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {falas.length === 0 ? (
          <div className="grid gap-4 py-6 text-center">
            <span className="gradiente-marca mx-auto flex size-12 items-center justify-center rounded-2xl text-white shadow-md">
              <BotMessageSquareIcon className="size-6" />
            </span>
            <div>
              <p className="font-semibold">Oi, {nome}! O que você precisa?</p>
              <p className="text-sm text-muted-foreground">Peça com suas palavras. Antes de mudar qualquer coisa, eu mostro e você confirma.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGESTOES_ASSISTENTE.map((s) => (
                <button key={s} type="button" onClick={() => enviar(s)} className="rounded-full border bg-background px-3 py-1.5 text-sm hover:bg-muted">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {falas.map((f) => (
          <div key={f.id} className={cn("flex", f.papel === "voce" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                f.papel === "voce" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted",
                f.erro && "bg-destructive/10 text-destructive",
              )}
            >
              {f.texto}
              {f.propostas?.length ? (
                <div className="mt-2 grid gap-2">
                  {f.propostas.map((p) => (
                    <div key={p.id} className="rounded-xl border bg-background p-3 text-foreground">
                      <p className="text-sm font-medium first-letter:uppercase">{p.resumo}</p>
                      {p.situacao ? (
                        <p
                          className={cn(
                            "mt-1 inline-flex items-center gap-1 text-xs font-semibold",
                            p.situacao === "confirmada" ? "text-sucesso-forte" : p.situacao === "erro" ? "text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {p.situacao === "confirmada" ? <CheckIcon className="size-3.5" /> : <XIcon className="size-3.5" />}
                          {p.situacao === "confirmada" ? "Feito" : p.situacao === "erro" ? p.retorno : "Cancelado"}
                        </p>
                      ) : (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" className="rounded-full" disabled={executando !== null} onClick={() => decidir(f.id, p, true)}>
                            {executando === p.id ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                            Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" className="rounded-full" disabled={executando !== null} onClick={() => decidir(f.id, p, false)}>
                            Não
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {enviando ? (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Olhando sua agenda…
            </div>
          </div>
        ) : null}
        <div ref={fimRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, 1500))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(texto);
            }
          }}
          rows={1}
          placeholder="Ex.: muda a Bruna de hoje para sexta às 15h"
          className="max-h-32 min-h-toque flex-1 resize-none rounded-2xl border border-input bg-background px-3.5 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label="Mensagem para o assistente"
        />
        <Button type="submit" size="icon" className="size-toque shrink-0 rounded-full" disabled={enviando || !texto.trim()} aria-label="Enviar">
          {enviando ? <Loader2Icon className="animate-spin" /> : <SendHorizontalIcon />}
        </Button>
      </form>
      <div className="flex items-center justify-between gap-2 px-4 pb-3 text-mini text-muted-foreground">
        <span>O assistente pode errar: confira antes de confirmar.</span>
        {restantes !== null ? <span>{restantes} mensagens restantes hoje</span> : null}
        {falas.length > 0 ? (
          <button type="button" className="underline underline-offset-2" onClick={() => setFalas([])}>
            Nova conversa
          </button>
        ) : null}
      </div>
    </div>
  );
}
