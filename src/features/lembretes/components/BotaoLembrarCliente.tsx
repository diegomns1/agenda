"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CheckIcon, MessageCircleIcon, UndoIcon } from "lucide-react";
import { marcarClienteAvisada } from "@/features/lembretes/actions";
import { linkLembrete } from "@/features/lembretes/mensagem";
import { Button } from "@/components/ui/button";
import type { Agendamento } from "@/types/database";

type Props = {
  agendamento: Pick<Agendamento, "id" | "inicio" | "cliente_nome" | "servico_nome" | "cliente_avisada_em">;
  telefone: string | null;
  modelo: string;
  tamanho?: "sm" | "default";
  aoConcluir?: () => void;
};

/**
 * Abre o WhatsApp da cliente com a mensagem pronta e marca o atendimento como "avisada".
 * Se não houver telefone, só permite marcar manualmente.
 */
export function BotaoLembrarCliente({ agendamento, telefone, modelo, tamanho = "default", aoConcluir }: Props) {
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
      <Button variant="outline" size={tamanho} onClick={() => marcar(false)} disabled={pendente} title="Desmarcar">
        <CheckIcon className="text-emerald-600" />
        Lembrete enviado
        <UndoIcon className="opacity-50" />
      </Button>
    );
  }

  if (!telefone) {
    return (
      <Button variant="outline" size={tamanho} onClick={() => marcar(true)} disabled={pendente} title="Cliente sem WhatsApp cadastrado">
        <CheckIcon />
        Marcar lembrete como enviado
      </Button>
    );
  }

  return (
    <Button asChild size={tamanho} disabled={pendente}>
      <a
        href={linkLembrete(telefone, modelo, agendamento)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => marcar(true)}
      >
        <MessageCircleIcon />
        Enviar lembrete
      </a>
    </Button>
  );
}
