"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon, RefreshCwIcon, XCircleIcon } from "lucide-react";
import { cancelarAssinatura, sincronizarCobrancas } from "@/features/assinatura/actions";
import { formatarDataISO } from "@/lib/datas";
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

export function AcoesAssinatura({ temAssinatura, ativaAte }: { temAssinatura: boolean; ativaAte: string | null }) {
  const [confirmar, setConfirmar] = useState(false);
  const [pendente, iniciar] = useTransition();

  function atualizar() {
    iniciar(async () => {
      const r = await sincronizarCobrancas();
      if (r.ok && r.mensagem) toast.success(r.mensagem);
      else if (r.erro) toast.error(r.erro);
    });
  }

  function cancelar() {
    iniciar(async () => {
      const r = await cancelarAssinatura();
      if (r.ok) toast.success(r.mensagem);
      else if (r.erro) toast.error(r.erro);
      setConfirmar(false);
    });
  }

  if (!temAssinatura) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={atualizar} disabled={pendente}>
        {pendente ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
        Atualizar pagamentos
      </Button>
      <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmar(true)} disabled={pendente}>
        <XCircleIcon />
        Cancelar assinatura
      </Button>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar a assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Nenhuma nova mensalidade será gerada.{" "}
              {ativaAte ? `Seu acesso continua normalmente até ${formatarDataISO(ativaAte)}.` : ""} Seus dados ficam guardados e você pode
              assinar de novo quando quiser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter assinatura</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={cancelar}>
              Cancelar assinatura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
