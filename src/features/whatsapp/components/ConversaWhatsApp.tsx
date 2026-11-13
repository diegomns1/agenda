"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BotIcon, ExternalLinkIcon, Loader2Icon, MegaphoneIcon, UserRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { abrirConversa, moverContato, mudarAtendimento, responderContato, type ContatoCentral, type MensagemCentral } from "../central";
import { descreverNumero } from "../numero";
import { COLUNAS, colunaDe, nomeDe, quando } from "./colunas";
import { MidiaMensagem } from "./MidiaMensagem";
import { Compositor } from "./Compositor";

/** Conversa de um contato na Central: histórico, assumir / devolver ao robô, mover de coluna e responder. */
export function ConversaWhatsApp({ contato, aoFechar, aoMudar }: { contato: ContatoCentral; aoFechar: () => void; aoMudar: () => void }) {
  const [mensagens, setMensagens] = useState<MensagemCentral[] | null>(null);
  const [enviando, iniciar] = useTransition();
  const fimRef = useRef<HTMLDivElement>(null);
  const tel = contato.telefone;

  const carregar = useCallback(async () => {
    try {
      const novas = await abrirConversa(tel);
      // mantém o link da foto/áudio que já estava na tela (vale 1 h): senão a imagem recarregaria a cada 5 s
      setMensagens((antes) => {
        const urls = new Map((antes ?? []).filter((m) => m.url).map((m) => [m.id, m.url]));
        return novas.map((m) => (m.url && urls.has(m.id) ? { ...m, url: urls.get(m.id)! } : m));
      });
    } catch {
      /* tenta de novo no próximo ciclo */
    }
  }, [tel]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carrega a conversa ao abrir e de 5 em 5 s
    void carregar();
    const t = setInterval(carregar, 5_000);
    return () => clearInterval(t);
  }, [carregar]);

  const total = mensagens?.length ?? 0;
  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [total]);

  async function enviarTexto(limpo: string) {
    const r = await responderContato(tel, limpo);
    if (!r.ok) toast.error(r.erro ?? "Não foi.");
    return r.ok;
  }

  function atendimento(novo: "humano" | "robo") {
    iniciar(async () => {
      await mudarAtendimento(tel, novo);
      toast.success(novo === "robo" ? "Devolvido ao robô" : "Você assumiu: o robô fica quieto nesta conversa");
      await carregar();
      aoMudar();
    });
  }

  function mover(coluna: string) {
    iniciar(async () => {
      await moverContato(tel, coluna);
      aoMudar();
    });
  }

  const origem = contato.origem as { titulo?: string; url?: string } | null;
  const comVoce = contato.atendimento === "humano";

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent className="flex h-[92svh] flex-col gap-0 p-0 sm:h-[85svh] sm:max-w-2xl">
        <DialogHeader className="gap-1 border-b px-4 pt-4 pb-3 pr-12 text-left">
          <DialogTitle className="truncate">{nomeDe(contato)}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="tabular-nums">{descreverNumero(tel)}</span>
            {contato.nome_whatsapp && contato.nome_whatsapp !== nomeDe(contato) ? <span>WhatsApp: {contato.nome_whatsapp}</span> : null}
            {contato.ramo ? <span>{contato.ramo}</span> : null}
            {contato.profissional ? (
              <Link href={`/admin/contas/${contato.profissional_id}`} className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline">
                Conta: {contato.profissional.nome} ({contato.profissional.plano}) <ExternalLinkIcon className="size-3" />
              </Link>
            ) : null}
          </DialogDescription>
          {origem ? (
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <MegaphoneIcon className="size-3.5" aria-hidden />
              Veio do anúncio{origem.titulo ? `: ${origem.titulo}` : ""}
            </p>
          ) : null}
          {contato.atendimento === "precisa" && contato.motivo_ajuda ? (
            <p className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-sm font-medium text-destructive">A IA chamou você: {contato.motivo_ajuda}</p>
          ) : contato.atendimento === "humano" && contato.motivo_ajuda?.startsWith("🤖") ? (
            <p className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-sm font-medium text-destructive">
              {contato.motivo_ajuda}. Se for uma pessoa de verdade, toque em devolver ao robô.
            </p>
          ) : null}
        </DialogHeader>

        <div className="flex-1 space-y-2 overflow-y-auto bg-muted/40 px-4 py-3" aria-live="polite">
          {mensagens === null ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" /> Carregando a conversa…
            </p>
          ) : mensagens.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
          ) : (
            mensagens.map((m) =>
              m.de === "sistema" ? (
                <p key={m.id} className="mx-auto w-fit rounded-full bg-background px-3 py-1 text-center text-xs text-muted-foreground">
                  {m.texto} · {quando(m.criado_em)}
                </p>
              ) : (
                <div key={m.id} className={cn("flex", m.de === "contato" ? "justify-start" : "justify-end")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap shadow-sm",
                      m.de === "contato" && "rounded-tl-sm bg-card",
                      m.de === "robo" && "rounded-tr-sm bg-whatsapp/15",
                      m.de === "equipe" && "rounded-tr-sm bg-primary text-primary-foreground",
                    )}
                  >
                    {m.de !== "contato" ? (
                      <p className={cn("mb-0.5 inline-flex items-center gap-1 text-mini font-semibold", m.de === "equipe" ? "text-primary-foreground/80" : "text-whatsapp")}>
                        {m.de === "robo" ? <BotIcon className="size-3" /> : <UserRoundIcon className="size-3" />}
                        {m.de === "robo" ? "Robô" : "Você"}
                      </p>
                    ) : null}
                    {m.tipo === "texto" || !m.tipo ? <p>{m.texto}</p> : <MidiaMensagem m={m} escuro={m.de === "equipe"} />}
                    <p className={cn("mt-0.5 text-right text-mini", m.de === "equipe" ? "text-primary-foreground/70" : "text-muted-foreground")}>{quando(m.criado_em)}</p>
                  </div>
                </div>
              ),
            )
          )}
          <div ref={fimRef} />
        </div>

        <div className="grid gap-2 border-t px-3 pt-2 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {comVoce ? (
              <Button size="sm" variant="outline" onClick={() => atendimento("robo")} disabled={enviando}>
                <BotIcon />
                Devolver ao robô
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => atendimento("humano")} disabled={enviando}>
                <UserRoundIcon />
                Assumir
              </Button>
            )}
            {contato.atendimento === "precisa" ? (
              <Button size="sm" variant="ghost" onClick={() => atendimento("robo")} disabled={enviando}>
                Resolvido, volta pro robô
              </Button>
            ) : null}
            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              Mover para
              <select
                value={colunaDe(contato)}
                onChange={(e) => mover(e.target.value)}
                disabled={enviando}
                className="h-8 rounded-lg border bg-background px-2 text-sm text-foreground"
              >
                {COLUNAS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titulo}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Compositor
            telefone={tel}
            placeholder={comVoce ? "Escreva a resposta" : "Responder (o robô sai)"}
            enviarTexto={enviarTexto}
            aoEnviar={() => {
              void carregar();
              aoMudar();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
