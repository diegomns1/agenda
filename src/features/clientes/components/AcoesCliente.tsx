"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarPlusIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { excluirCliente } from "@/features/clientes/actions";
import { FormCliente } from "./FormCliente";
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
import type { Cliente } from "@/types/database";

export function AcoesCliente({ cliente }: { cliente: Cliente }) {
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, iniciar] = useTransition();

  function excluir() {
    iniciar(async () => {
      const r = await excluirCliente(cliente.id);
      if (r?.erro) toast.error(r.erro);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Habilitado no módulo 5 (agenda) */}
      <Button disabled title="Disponível quando a agenda estiver pronta">
        <CalendarPlusIcon />
        Agendar de novo
      </Button>
      <Button variant="outline" onClick={() => setEditando(true)}>
        <PencilIcon />
        Editar
      </Button>
      <Button variant="ghost" className="text-destructive" onClick={() => setConfirmando(true)} disabled={pendente}>
        <Trash2Icon />
        Excluir
      </Button>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>Nome, WhatsApp e observações.</DialogDescription>
          </DialogHeader>
          {editando ? <FormCliente cliente={cliente} aoConcluir={() => setEditando(false)} /> : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {cliente.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              Os dados da cliente serão apagados. Atendimentos passados continuam na agenda, mas sem o nome dela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={excluir}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
