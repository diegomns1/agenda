"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  BanIcon,
  CalendarClockIcon,
  CheckIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
  UserRoundIcon,
  UserXIcon,
} from "lucide-react";
import { alterarStatusAgendamento, excluirAgendamento } from "@/features/agenda/actions";
import { BotaoLembrarCliente } from "@/features/lembretes/components/BotaoLembrarCliente";
import { MenuMensagens } from "@/features/mensagens/components/MenuMensagens";
import type { Mensagens } from "@/features/mensagens/modelos";
import { STATUS_AGENDAMENTO } from "@/features/agenda/schema";
import { VISUAL_STATUS } from "@/features/agenda/visual";
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
import { cn } from "@/lib/utils";
import type { EstadoForm } from "@/components/formulario/tipos";
import type { Agendamento, StatusAgendamento } from "@/types/database";
import type { ClienteResumo } from "./FormAgendamento";

type Props = {
  agendamento: Agendamento | null;
  clientes: ClienteResumo[];
  mensagens: Mensagens;
  aoFechar: () => void;
  aoEditar: (a: Agendamento) => void;
};

export function DetalheAgendamento({ agendamento: a, clientes, mensagens, aoFechar, aoEditar }: Props) {
  const [confirmando, setConfirmando] = useState<"cancelar" | "excluir" | null>(null);
  const [pendente, iniciar] = useTransition();

  function executar(fn: () => Promise<EstadoForm>, desfazer?: () => Promise<EstadoForm>) {
    iniciar(async () => {
      const r = await fn();
      if (r.ok) {
        if (r.mensagem) {
          // "Concluído"/"Faltou" são um toque só: a notificação traz "Desfazer" por alguns segundos
          toast.success(r.mensagem, desfazer ? { duration: 7000, action: { label: "Desfazer", onClick: () => void desfazer().then((d) => d.ok && toast.success("Desfeito.")) } } : undefined);
        }
        aoFechar();
      } else if (r.erro) toast.error(r.erro);
    });
  }

  function mudarStatus(id: string, novo: StatusAgendamento, anterior: StatusAgendamento) {
    executar(
      () => alterarStatusAgendamento(id, novo),
      () => alterarStatusAgendamento(id, anterior),
    );
  }

  const cliente = a?.cliente_id ? clientes.find((c) => c.id === a.cliente_id) : undefined;
  const status = a ? STATUS_AGENDAMENTO[a.status] : null;
  const IconeStatus = a && a.tipo === "atendimento" ? VISUAL_STATUS[a.status].Icone : null;
  const botao = "h-toque sm:h-8";

  return (
    <>
      <Dialog open={a !== null && confirmando === null} onOpenChange={(aberto) => !aberto && aoFechar()}>
        <DialogContent>
          {a ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 pr-10 text-lg">
                  {a.tipo === "bloqueio" ? a.titulo : a.cliente_nome}
                  {a.tipo === "atendimento" && status ? (
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", status.cor)}>
                      {IconeStatus ? <IconeStatus aria-hidden className="size-3" /> : null}
                      {status.rotulo}
                    </span>
                  ) : null}
                </DialogTitle>
                <DialogDescription>
                  {formatarData(a.inicio, "EEEE, dd/MM")} · {horaDe(a.inicio)} às {horaDe(a.fim)}
                  {a.origem === "online" ? " · pedido pelo link" : ""}
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

              {/* 1) contato e edição (contornados) */}
              <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:flex-wrap">
                {a.tipo === "atendimento" ? (
                  <>
                    {cliente?.telefone ? (
                      <MenuMensagens agendamento={a} telefone={cliente.telefone} mensagens={mensagens} className={cn(botao, "col-span-2")} />
                    ) : a.status === "agendado" ? (
                      // sem WhatsApp cadastrado: só dá para marcar o lembrete como feito
                      <BotaoLembrarCliente
                        agendamento={a}
                        telefone={null}
                        mensagens={mensagens}
                        tamanho="sm"
                        destaque={false}
                        className={cn(botao, "col-span-2")}
                      />
                    ) : null}
                    {a.cliente_id ? (
                      <Button asChild variant="outline" className={botao}>
                        <Link href={`/clientes/${a.cliente_id}`}>
                          <UserRoundIcon />
                          Ficha
                        </Link>
                      </Button>
                    ) : null}
                    {a.status !== "cancelado" ? (
                      <Button variant="outline" className={botao} onClick={() => aoEditar(a)}>
                        <CalendarClockIcon />
                        Remarcar
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <Button variant="outline" className={botao} onClick={() => aoEditar(a)}>
                    <PencilIcon />
                    Editar
                  </Button>
                )}
              </div>

              {/* 2) como foi: uma ação principal só; "Cancelar" fica separado, à direita */}
              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                {a.tipo === "atendimento" ? (
                  <>
                    {a.status === "pendente" ? (
                      <>
                        <Button className={cn(botao, "flex-1 sm:flex-none")} disabled={pendente} onClick={() => executar(() => alterarStatusAgendamento(a.id, "agendado"))}>
                          <CheckIcon />
                          Confirmar pedido
                        </Button>
                        <Button variant="ghost" className={cn(botao, "ml-auto text-destructive")} disabled={pendente} onClick={() => setConfirmando("cancelar")}>
                          <BanIcon />
                          Recusar
                        </Button>
                      </>
                    ) : null}
                    {a.status === "agendado" ? (
                      <>
                        <Button className={cn(botao, "flex-1 sm:flex-none")} disabled={pendente} onClick={() => mudarStatus(a.id, "concluido", a.status)}>
                          <CheckIcon />
                          Concluído
                        </Button>
                        <Button variant="secondary" className={cn(botao, "flex-1 sm:flex-none")} disabled={pendente} onClick={() => mudarStatus(a.id, "faltou", a.status)}>
                          <UserXIcon />
                          Faltou
                        </Button>
                        <Button variant="ghost" className={cn(botao, "w-full text-destructive sm:ml-auto sm:w-auto")} disabled={pendente} onClick={() => setConfirmando("cancelar")}>
                          <BanIcon />
                          Cancelar atendimento
                        </Button>
                      </>
                    ) : a.status !== "pendente" ? (
                      <Button variant="outline" className={botao} disabled={pendente} onClick={() => mudarStatus(a.id, "agendado", a.status)}>
                        <RotateCcwIcon />
                        Voltar para agendado
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <Button variant="ghost" className={cn(botao, "text-destructive")} disabled={pendente} onClick={() => setConfirmando("excluir")}>
                    <Trash2Icon />
                    Remover compromisso
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
            <AlertDialogTitle>
              {confirmando === "cancelar" ? (a?.status === "pendente" ? "Recusar este pedido?" : "Cancelar este atendimento?") : "Remover este compromisso?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmando === "cancelar"
                ? a?.status === "pendente"
                  ? "O horário volta a ficar livre. Se puder, avise pelo WhatsApp."
                  : "O horário volta a ficar livre. O registro continua no histórico como cancelado."
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
              {confirmando === "cancelar" ? (a?.status === "pendente" ? "Recusar" : "Cancelar atendimento") : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
