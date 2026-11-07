"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  BanIcon,
  CalendarClockIcon,
  CheckIcon,
  MessageCircleIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
  UserRoundIcon,
  UserXIcon,
} from "lucide-react";
import { alterarStatusAgendamento, excluirAgendamento } from "@/features/agenda/actions";
import { BotaoLembrarCliente } from "@/features/lembretes/components/BotaoLembrarCliente";
import { STATUS_AGENDAMENTO } from "@/features/agenda/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { formatarData, horaDe } from "@/lib/datas";
import { formatarMoeda } from "@/lib/moeda";
import { linkWhatsApp } from "@/lib/telefone";
import { cn } from "@/lib/utils";
import type { EstadoForm } from "@/components/formulario/tipos";
import type { Agendamento } from "@/types/database";
import type { ClienteResumo } from "./FormAgendamento";

type Props = {
  agendamento: Agendamento | null;
  clientes: ClienteResumo[];
  modeloLembrete: string;
  aoFechar: () => void;
  aoEditar: (a: Agendamento) => void;
};

export function DetalheAgendamento({ agendamento: a, clientes, modeloLembrete, aoFechar, aoEditar }: Props) {
  const [confirmando, setConfirmando] = useState<"cancelar" | "excluir" | null>(null);
  const [pendente, iniciar] = useTransition();

  function executar(fn: () => Promise<EstadoForm>, fechar = true) {
    iniciar(async () => {
      const r = await fn();
      if (r.ok) {
        if (r.mensagem) toast.success(r.mensagem);
        if (fechar) aoFechar();
      } else if (r.erro) toast.error(r.erro);
    });
  }

  const cliente = a?.cliente_id ? clientes.find((c) => c.id === a.cliente_id) : undefined;
  const status = a ? STATUS_AGENDAMENTO[a.status] : null;

  return (
    <>
      <Dialog open={a !== null && confirmando === null} onOpenChange={(aberto) => !aberto && aoFechar()}>
        <DialogContent>
          {a ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {a.tipo === "bloqueio" ? a.titulo : a.cliente_nome}
                  {a.tipo === "atendimento" && status ? (
                    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", status.cor)}>{status.rotulo}</span>
                  ) : null}
                </DialogTitle>
                <DialogDescription>
                  {formatarData(a.inicio, "EEEE, dd/MM")} · {horaDe(a.inicio)} às {horaDe(a.fim)}
                </DialogDescription>
              </DialogHeader>

              {a.tipo === "atendimento" ? (
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Serviço</dt>
                    <dd>{a.servico_nome ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Valor</dt>
                    <dd>{a.valor ? formatarMoeda(a.valor) : "—"}</dd>
                  </div>
                  {a.observacoes ? (
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground">Observações</dt>
                      <dd className="whitespace-pre-wrap">{a.observacoes}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : a.observacoes ? (
                <p className="text-sm whitespace-pre-wrap">{a.observacoes}</p>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                {a.tipo === "atendimento" ? (
                  <>
                    {a.status === "agendado" ? (
                      <BotaoLembrarCliente agendamento={a} telefone={cliente?.telefone ?? null} modelo={modeloLembrete} tamanho="sm" />
                    ) : cliente?.telefone ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={linkWhatsApp(cliente.telefone)} target="_blank" rel="noopener noreferrer">
                          <MessageCircleIcon className="text-emerald-600" />
                          WhatsApp
                        </a>
                      </Button>
                    ) : null}
                    {a.cliente_id ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/clientes/${a.cliente_id}`}>
                          <UserRoundIcon />
                          Ficha
                        </Link>
                      </Button>
                    ) : null}
                    {a.status !== "cancelado" ? (
                      <Button variant="outline" size="sm" onClick={() => aoEditar(a)}>
                        <CalendarClockIcon />
                        Remarcar / editar
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => aoEditar(a)}>
                    <PencilIcon />
                    Editar
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 border-t pt-3">
                {a.tipo === "atendimento" ? (
                  <>
                    {a.status === "agendado" ? (
                      <>
                        <Button size="sm" disabled={pendente} onClick={() => executar(() => alterarStatusAgendamento(a.id, "concluido"))}>
                          <CheckIcon />
                          Concluído
                        </Button>
                        <Button size="sm" variant="secondary" disabled={pendente} onClick={() => executar(() => alterarStatusAgendamento(a.id, "faltou"))}>
                          <UserXIcon />
                          Faltou
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" disabled={pendente} onClick={() => setConfirmando("cancelar")}>
                          <BanIcon />
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" disabled={pendente} onClick={() => executar(() => alterarStatusAgendamento(a.id, "agendado"))}>
                        <RotateCcwIcon />
                        Voltar para agendado
                      </Button>
                    )}
                  </>
                ) : (
                  <Button size="sm" variant="ghost" className="text-destructive" disabled={pendente} onClick={() => setConfirmando("excluir")}>
                    <Trash2Icon />
                    Remover bloqueio
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmando !== null} onOpenChange={(aberto) => !aberto && setConfirmando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmando === "cancelar" ? "Cancelar este atendimento?" : "Remover este bloqueio?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmando === "cancelar"
                ? "O horário volta a ficar livre. O registro continua no histórico da cliente como cancelado."
                : "O período volta a ficar disponível para marcar atendimentos."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!a) return;
                const acao = confirmando === "cancelar" ? () => alterarStatusAgendamento(a.id, "cancelado") : () => excluirAgendamento(a.id);
                setConfirmando(null);
                executar(acao);
              }}
            >
              {confirmando === "cancelar" ? "Cancelar atendimento" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
