"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CheckIcon, MessageCircleIcon, UndoIcon } from "lucide-react";
import { marcarClienteAvisada } from "@/features/lembretes/actions";
import { linkMensagem } from "@/features/lembretes/mensagem";
import type { Mensagens } from "@/features/mensagens/modelos";
import { Button } from "@/components/ui/button";
import type { Agendamento } from "@/types/database";

type Props = {
  agendamento: Pick<Agendamento, "id" | "inicio" | "fim" | "valor" | "cliente_nome" | "servico_nome" | "cliente_avisada_em">;
  telefone: string | null;
  mensagens: Mensagens;
  tamanho?: "sm" | "default";
  /** Botão cheio (padrão, na lista de lembretes) ou contornado (no detalhe, onde a ação principal é outra). */
  destaque?: boolean;
  className?: string;
  aoConcluir?: () => void;
};

/**
 * Abre o WhatsApp da cliente com a mensagem pronta e marca o atendimento como "avisada".
 * Se não houver telefone, só permite marcar manualmente.
 */
export function BotaoLembrarCliente({ agendamento, telefone, mensagens, tamanho = "default", destaque = true, className, aoConcluir }: Props) {
  const [pendente, iniciar] = useTransition();
  const avisada = Boolean(agendamento.cliente_avisada_em);

  function marcar(valor: boolean) {
    iniciar(async () => {
      const r = await marcarClienteAvisada(agendamento.id, valor);
      if (r.ok) {
        if (valor && r.mensagem) toast.success(r.mensagem);
        aoConcluir?.();
      } else if (r.erro) toast.error(r.erro);
    });
  }

  if (avisada) {
    return (
      <Button variant="outline" size={tamanho} className={className} onClick={() => marcar(false)} disabled={pendente} title="Desmarcar">
        <CheckIcon className="text-sucesso-forte" />
        Lembrete enviado
        <UndoIcon className="opacity-50" />
      </Button>
    );
  }

  if (!telefone) {
    return (
      <Button variant="outline" size={tamanho} className={className} onClick={() => marcar(true)} disabled={pendente} title="Cliente sem WhatsApp cadastrado">
        <CheckIcon />
        Marcar lembrete como enviado
      </Button>
    );
  }

  return (
    <Button asChild size={tamanho} variant={destaque ? "default" : "outline"} className={className} disabled={pendente}>
      <a
        href={linkMensagem(telefone, mensagens.modelos.lembrete, agendamento, mensagens.contexto)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => marcar(true)}
      >
        <MessageCircleIcon className={destaque ? undefined : "text-whatsapp"} />
        Enviar lembrete
      </a>
    </Button>
  );
}
