"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BotMessageSquareIcon, CheckIcon, Loader2Icon, MicIcon, SendHorizontalIcon, SquareIcon, XIcon, ZapIcon } from "lucide-react";
import { conversarComAssistente, executarProposta } from "@/features/assistente/actions";
import { ATALHOS, interpretar } from "@/features/assistente/interpretar";
import { SUGESTOES_ASSISTENTE, type MensagemChat, type Proposta } from "@/features/assistente/tipos";
import { useVoz } from "./useVoz";
import { Button } from "@/components/ui/button";
import { hojeISO } from "@/lib/datas";
import { cn } from "@/lib/utils";

type PropostaNaTela = Proposta & { situacao?: "confirmada" | "recusada" | "erro"; retorno?: string };

type Fala = {
  id: string;
  papel: "voce" | "assistente";
  texto: string;
  propostas?: PropostaNaTela[];
  erro?: boolean;
  semIA?: boolean;
};

const CHAVE = "vaguinha-assistente-conversa";

/** Primeira proposta ainda sem resposta, na fala mais recente que tiver alguma. */
function propostaPendente(falas: Fala[]) {
  for (let i = falas.length - 1; i >= 0; i--) {
    const p = falas[i].propostas?.find((x) => !x.situacao);
    if (p) return { falaId: falas[i].id, proposta: p as Proposta };
  }
  return null;
}

export function ChatAssistente({ nome, iaAtiva }: { nome: string; iaAtiva: boolean }) {
  const [falas, setFalas] = useState<Fala[]>([]);
  const [texto, setTexto] = useState("");
  const [restantes, setRestantes] = useState<number | null>(null);
  const [enviando, iniciar] = useTransition();
  const [executando, setExecutando] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const falasRef = useRef<Fala[]>([]);

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
    falasRef.current = falas;
    // conversa vazia não sobrescreve a salva (a tela pode montar duas vezes antes de restaurar);
    // "Nova conversa" apaga de propósito
    if (falas.length === 0) return;
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify(falas.slice(-40)));
    } catch {
      /* ignora */
    }
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [falas]);

  const enviarRef = useRef<(m: string) => void>(() => {});
  const voz = useVoz({ aoTerminarDeOuvir: (t) => enviarRef.current(t) });

  function historico(): MensagemChat[] {
    return falasRef.current.filter((f) => !f.erro).map((f) => ({ papel: f.papel, texto: f.texto.slice(0, 4000) }));
  }

  async function decidir(falaId: string, proposta: Proposta, confirmar: boolean) {
    const marcar = (situacao: "confirmada" | "recusada" | "erro", retorno: string) =>
      setFalas((l) =>
        l.map((f) => (f.id === falaId ? { ...f, propostas: f.propostas?.map((p) => (p.id === proposta.id ? { ...p, situacao, retorno } : p)) } : f)),
      );
    if (!confirmar) {
      marcar("recusada", "Não alterei nada.");
      const t = `Ok, não fiz: ${proposta.resumo}.`;
      setFalas((l) => [...l, { id: crypto.randomUUID(), papel: "assistente", texto: t, semIA: true }]);
      return;
    }
    setExecutando(proposta.id);
    const r = await executarProposta(proposta);
    setExecutando(null);
    marcar(r.ok ? "confirmada" : "erro", r.mensagem);
    setFalas((l) => [...l, { id: crypto.randomUUID(), papel: "assistente", texto: r.mensagem, erro: !r.ok, semIA: true }]);
  }

  function enviar(mensagem: string) {
    const limpo = mensagem.trim();
    if (!limpo || enviando) return;
    voz.limparErroVoz();
    setTexto("");

    // "sim" / "não" respondendo a uma mudança que está esperando: resolve aqui, sem IA
    const pendente = propostaPendente(falasRef.current);
    const comando = interpretar(limpo, hojeISO());
    if (pendente && (comando?.tipo === "confirmar" || comando?.tipo === "recusar")) {
      setFalas((l) => [...l, { id: crypto.randomUUID(), papel: "voce", texto: limpo }]);
      void decidir(pendente.falaId, pendente.proposta, comando.tipo === "confirmar");
      return;
    }

    const anterior = historico();
    setFalas((l) => [...l, { id: crypto.randomUUID(), papel: "voce", texto: limpo }]);
    iniciar(async () => {
      const r = await conversarComAssistente(anterior, limpo);
      if (typeof r.restantesHoje === "number") setRestantes(r.restantesHoje);
      const resposta = r.ok ? r.texto ?? "" : r.erro ?? "Algo deu errado.";
      setFalas((l) => [
        ...l,
        r.ok
          ? { id: crypto.randomUUID(), papel: "assistente", texto: resposta, propostas: r.propostas, semIA: r.semIA }
          : { id: crypto.randomUUID(), papel: "assistente", texto: resposta, erro: true },
      ]);
    });
  }
  // a voz chama sempre a versão mais nova de enviar (com as falas atuais)
  useEffect(() => {
    enviarRef.current = enviar;
  });

  const mostrarMicrofone = voz.podeOuvir && !texto.trim() && !enviando;

  return (
    <div className="flex min-h-[60vh] min-w-0 flex-col rounded-3xl border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {falas.length === 0 ? (
          <div className="grid gap-4 py-6 text-center">
            <span className="gradiente-marca mx-auto flex size-12 items-center justify-center rounded-2xl text-white shadow-md">
              <BotMessageSquareIcon className="size-6" />
            </span>
            <div className="grid gap-1">
              <p className="font-semibold">Oi, {nome}! O que você precisa?</p>
              <p className="text-sm text-muted-foreground">
                {voz.podeOuvir ? "Toque no microfone e fale, ou escreva. " : "Escreva com suas palavras. "}
                Antes de mudar qualquer coisa, eu mostro e você confirma{voz.podeOuvir ? " (pode dizer “sim”)" : ""}.
              </p>
              {voz.podeOuvir ? <p className="text-xs text-muted-foreground">No carro, use a voz só com o carro parado.</p> : null}
            </div>
            {iaAtiva ? (
              <div className="grid gap-2">
                <p className="text-xs font-medium text-muted-foreground">Para mudar a agenda, peça assim:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGESTOES_ASSISTENTE.map((s) => (
                    <button key={s} type="button" onClick={() => enviar(s)} className="min-h-toque rounded-full border bg-background px-3 py-1.5 text-sm hover:bg-muted sm:min-h-0">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {falas.map((f) => (
          <div key={f.id} className={cn("flex", f.papel === "voce" ? "justify-end" : "justify-start")}>
            <div className="grid max-w-[85%] gap-1">
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
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
              {f.papel === "assistente" && f.semIA && !f.erro ? (
                <p className="inline-flex items-center gap-1 px-1 text-mini text-muted-foreground">
                  <ZapIcon className="size-3" aria-hidden />
                  Resposta na hora, não gasta mensagens
                </p>
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

      {/* Atalhos: comandos prontos, respondidos sem IA */}
      <div className="border-t px-3 pt-3">
        <p className="mb-1.5 inline-flex items-center gap-1 px-1 text-mini font-medium text-muted-foreground">
          <ZapIcon className="size-3" aria-hidden />
          Atalhos: respondem na hora e não gastam mensagens
        </p>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
          {ATALHOS.map((a) => (
            <button
              key={a}
              type="button"
              disabled={enviando}
              onClick={() => enviar(a)}
              className="min-h-toque shrink-0 rounded-full border bg-background px-3 text-sm whitespace-nowrap hover:bg-muted disabled:opacity-50 sm:min-h-9"
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <form
        className="flex items-end gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
      >
        <textarea
          value={voz.ouvindo ? voz.parcial : texto}
          readOnly={voz.ouvindo}
          onChange={(e) => setTexto(e.target.value.slice(0, 1500))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(texto);
            }
          }}
          rows={1}
          placeholder={voz.ouvindo ? "Ouvindo… pode falar" : "Escreva ou toque no microfone"}
          className="max-h-32 min-h-toque flex-1 resize-none rounded-2xl border border-input bg-background px-3.5 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label="Mensagem para o assistente"
        />
        {voz.ouvindo ? (
          <Button
            type="button"
            size="icon"
            onClick={voz.pararDeOuvir}
            className="size-12 shrink-0 animate-pulse rounded-full bg-destructive text-white hover:bg-destructive/90 sm:size-12"
            aria-label="Parar de ouvir e enviar"
          >
            <SquareIcon className="size-4 fill-current" />
          </Button>
        ) : mostrarMicrofone ? (
          <Button type="button" size="icon" onClick={voz.ouvir} className="size-12 shrink-0 rounded-full sm:size-12" aria-label="Falar com o assistente">
            <MicIcon className="size-5" />
          </Button>
        ) : (
          <Button type="submit" size="icon" className="size-12 shrink-0 rounded-full sm:size-12" disabled={enviando || !texto.trim()} aria-label="Enviar">
            {enviando ? <Loader2Icon className="animate-spin" /> : <SendHorizontalIcon />}
          </Button>
        )}
      </form>
      {voz.erroVoz ? <p className="px-4 pb-2 text-sm text-destructive">{voz.erroVoz}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3 text-mini text-muted-foreground">
        <span>{iaAtiva ? "O assistente pode errar: confira antes de confirmar." : "Por enquanto só os atalhos funcionam: a IA ainda não foi ativada."}</span>
        {restantes !== null ? <span>{restantes} mensagens com IA restantes hoje</span> : null}
        {falas.length > 0 ? (
          <button type="button" className="inline-flex min-h-toque items-center underline underline-offset-2" onClick={() => {
                setFalas([]);
                try {
                  sessionStorage.removeItem(CHAVE);
                } catch {
                  /* ignora */
                }
              }}
            >
            Nova conversa
          </button>
        ) : null}
      </div>
    </div>
  );
}
