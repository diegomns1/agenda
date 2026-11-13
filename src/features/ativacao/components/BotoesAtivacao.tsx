"use client";

import { useTransition } from "react";
import { HandHelpingIcon, Loader2Icon, MessageSquareHeartIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

/** Na lista de contas: chamar de uma vez todas que só entraram e ainda não receberam. */
export function BotaoChamarTodas({ quantas }: { quantas: number }) {
  const [pendente, iniciar] = useTransition();
  if (!quantas) return null;
  return (
    <Button
      size="sm"
      onClick={() =>
        iniciar(async () => {
          const r = await chamarTodasQueSoEntraram();
          if (r.ok) toast.success(r.mensagem);
          else toast.error(r.mensagem);
        })
      }
      disabled={pendente}
      className="w-fit"
    >
      {pendente ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
      Chamar agora as {quantas} que só entraram
    </Button>
  );
}
