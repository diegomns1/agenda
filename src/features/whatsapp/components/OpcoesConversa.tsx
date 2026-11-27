"use client";

import { useState, useTransition } from "react";
import { BanIcon, BookOpenIcon, EllipsisVerticalIcon, EraserIcon, Loader2Icon, PlayIcon, SendIcon, ShieldCheckIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { primeiroNome } from "@/lib/texto";
import { bloquearContato, excluirContato, limparConversa, mandarMensagemPronta, mandarTutorial, type ContatoCentral } from "../central";
import { TUTORIAIS } from "@/features/tutoriais/conteudo";
import { videoDoTutorial } from "@/features/tutoriais/whatsapp";
import { PLANOS } from "@/lib/planos";
import { modelosPara, type IdModelo } from "../modelos";
import { nomeDe } from "./colunas";

type Confirmar = "bloquear" | "limpar" | "excluir" | null;

const TEXTOS: Record<Exclude<Confirmar, null>, { titulo: string; texto: string; botao: string }> = {
  bloquear: {
    titulo: "Bloquear este contato?",
    texto: "A pessoa não consegue mais escrever para o WhatsApp da Vaguinha e o robô não responde mais. Dá para desbloquear depois.",
    botao: "Bloquear",
  },
  limpar: {
    titulo: "Limpar a conversa?",
    texto: "Apaga todas as mensagens, fotos e áudios desta conversa aqui no painel. O contato continua na Central. Não dá para desfazer.",
    botao: "Limpar",
  },
  excluir: {
    titulo: "Excluir o contato?",
    texto: "Apaga o contato, a conversa, as fotos e os áudios. Se a pessoa escrever de novo, ela aparece como um contato novo. Não dá para desfazer.",
    botao: "Excluir",
  },
};

/** Menu ⋮ da conversa: mensagem pronta, bloquear/desbloquear, limpar e excluir. */
export function OpcoesConversa({
  contato,
  aoAbrirPronta,
  aoMudar,
  aoExcluir,
}: {
  contato: ContatoCentral;
  aoAbrirPronta: () => void;
  aoMudar: () => void;
  aoExcluir: () => void;
}) {
  const [confirmar, setConfirmar] = useState<Confirmar>(null);
  const [pendente, iniciar] = useTransition();
  const tel = contato.telefone;

  function executar(acao: Exclude<Confirmar, null>) {
    iniciar(async () => {
      if (acao === "bloquear") {
        const r = await bloquearContato(tel, true);
        if (r.aviso) toast.warning(r.aviso);
        else toast.success("Contato bloqueado.");
        aoMudar();
      } else if (acao === "limpar") {
        const r = await limparConversa(tel);
        if (r.ok) toast.success("Conversa limpa.");
        else toast.error("Não consegui limpar. Tente de novo.");
        aoMudar();
      } else {
        const r = await excluirContato(tel);
        if (!r.ok) {
          toast.error("Não consegui excluir. Tente de novo.");
          return;
        }
        toast.success("Contato excluído.");
        aoExcluir();
      }
      setConfirmar(null);
    });
  }

  function desbloquear() {
    iniciar(async () => {
      await bloquearContato(tel, false);
      toast.success("Contato desbloqueado.");
      aoMudar();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9" aria-label="Opções da conversa" disabled={pendente}>
            {pendente ? <Loader2Icon className="animate-spin" /> : <EllipsisVerticalIcon />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem className="min-h-toque gap-2.5" onSelect={() => setTimeout(aoAbrirPronta, 0)} disabled={contato.bloqueado}>
            <SendIcon />
            Mensagem pronta
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {contato.bloqueado ? (
            <DropdownMenuItem className="min-h-toque gap-2.5" onSelect={desbloquear}>
              <ShieldCheckIcon />
              Desbloquear
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="min-h-toque gap-2.5" onSelect={() => setTimeout(() => setConfirmar("bloquear"), 0)}>
              <BanIcon />
              Bloquear
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="min-h-toque gap-2.5" onSelect={() => setTimeout(() => setConfirmar("limpar"), 0)}>
            <EraserIcon />
            Limpar conversa
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" className="min-h-toque gap-2.5" onSelect={() => setTimeout(() => setConfirmar("excluir"), 0)}>
            <Trash2Icon />
            Excluir contato
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmar !== null} onOpenChange={(v) => !v && !pendente && setConfirmar(null)}>
        <AlertDialogContent>
          {confirmar ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{TEXTOS[confirmar].titulo}</AlertDialogTitle>
                <AlertDialogDescription>
                  {nomeDe(contato)}: {TEXTOS[confirmar].texto}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pendente}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant={confirmar === "limpar" ? "default" : "destructive"}
                  onClick={(e) => {
                    e.preventDefault();
                    executar(confirmar);
                  }}
                  disabled={pendente}
                >
                  {pendente ? <Loader2Icon className="animate-spin" /> : null}
                  {TEXTOS[confirmar].botao}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Mandar um tutorial com um toque (27/11/2026): o passo a passo da tela Tutoriais, o link da tela certa do painel
 * e o vídeo, quando o tutorial tem. Só dentro das 24 h da última mensagem da pessoa (regra da Meta).
 */
export function BotaoTutoriais({ contato, janelaAberta, aoEnviar }: { contato: ContatoCentral; janelaAberta: boolean; aoEnviar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  function mandar(id: string) {
    setEnviando(id);
    iniciar(async () => {
      const r = await mandarTutorial(contato.telefone, id).catch(() => ({ ok: false, erro: "Sem conexão com o painel. Tente de novo." }));
      setEnviando(null);
      if (!r.ok) {
        toast.error(r.erro ?? "Não foi.");
        return;
      }
      toast.success("Tutorial enviado.");
      setAberto(false);
      aoEnviar();
    });
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2.5" onClick={() => setAberto(true)} disabled={contato.bloqueado}>
        <BookOpenIcon />
        Tutorial
      </Button>
      <Dialog open={aberto} onOpenChange={(v) => !enviando && setAberto(v)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mandar tutorial</DialogTitle>
            <DialogDescription>
              Toque no tutorial e ele vai na hora: passo a passo, link da tela no painel e o vídeo, quando tem.
              {janelaAberta ? null : " Atenção: essa pessoa não escreve há mais de 24 h, e a Meta só deixa mandar depois que ela escrever de novo."}
            </DialogDescription>
          </DialogHeader>
          <ul className="grid gap-2">
            {TUTORIAIS.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => mandar(t.id)}
                  disabled={enviando !== null}
                  className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                      {t.titulo}
                      {t.plano ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-mini font-bold text-primary">{PLANOS[t.plano].nome}</span> : null}
                      {videoDoTutorial(t) ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-mini font-bold text-muted-foreground">
                          <PlayIcon className="size-3" aria-hidden />
                          vídeo
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-xs text-muted-foreground">{t.resumo}</span>
                  </span>
                  {enviando === t.id ? <Loader2Icon className="size-4 shrink-0 animate-spin" /> : <SendIcon className="size-4 shrink-0 text-primary" />}
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Escolher e mandar uma mensagem pronta (modelo aprovado pela Meta), que funciona mesmo depois das 24 h. */
export function DialogoMensagemPronta({
  contato,
  aberto,
  aoMudarAberto,
  aoEnviar,
}: {
  contato: ContatoCentral;
  aberto: boolean;
  aoMudarAberto: (v: boolean) => void;
  aoEnviar: () => void;
}) {
  const [pendente, iniciar] = useTransition();
  const modelos = modelosPara(Boolean(contato.profissional_id));
  const nome = primeiroNome(contato.nome || contato.nome_whatsapp || "").replace(/[^\p{L}' -]/gu, "") || "tudo bem";

  function mandar(id: IdModelo) {
    iniciar(async () => {
      const r = await mandarMensagemPronta(contato.telefone, id);
      if (!r.ok) {
        toast.error(r.erro ?? "Não foi.");
        return;
      }
      toast.success("Mensagem enviada.");
      aoMudarAberto(false);
      aoEnviar();
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !pendente && aoMudarAberto(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mensagem pronta</DialogTitle>
          <DialogDescription>
            Modelos aprovados pela Meta: chegam mesmo se a pessoa não escreve há mais de 24 h. A resposta cai aqui e a Serena atende.
          </DialogDescription>
        </DialogHeader>
        <ul className="grid gap-2">
          {modelos.map((m) => (
            <li key={m.id} className="grid gap-2 rounded-xl border p-3">
              <p className="text-sm font-semibold">{m.rotulo}</p>
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">{m.texto(nome)}</p>
              <Button size="sm" className="w-fit" onClick={() => mandar(m.id)} disabled={pendente}>
                {pendente ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
                Mandar
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
