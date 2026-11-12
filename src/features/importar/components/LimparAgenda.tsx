"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { limparAgenda } from "@/features/importar/actions";

/* "Começar do zero": apaga o que foi importado (ou a agenda toda) para importar de novo. Fica no pé da Agenda. */
export function LimparAgenda() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [escopo, setEscopo] = useState<"importados" | "tudo">("importados");
  const [clientes, setClientes] = useState(true);
  const [texto, setTexto] = useState("");
  const [pendente, iniciar] = useTransition();
  const confirmado = texto.trim().toUpperCase() === "APAGAR";

  function apagar() {
    iniciar(async () => {
      let r: Awaited<ReturnType<typeof limparAgenda>>;
      try {
        r = await limparAgenda({ escopo, clientes, confirmacao: "APAGAR" });
      } catch {
        toast.error("Não consegui falar com o servidor. Toque em Recarregar e tente de novo.", {
          duration: Infinity,
          action: { label: "Recarregar", onClick: () => window.location.reload() },
        });
        return;
      }
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      setAberto(false);
      setTexto("");
      toast.success(
        `${r.horarios} horário${r.horarios === 1 ? " apagado" : "s apagados"}` +
          (r.clientes > 0 ? ` e ${r.clientes} cliente${r.clientes === 1 ? "" : "s"}` : "") +
          ". Pode importar de novo.",
      );
      router.refresh();
    });
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="h-toque text-muted-foreground hover:text-destructive sm:h-8" onClick={() => setAberto(true)}>
        <Trash2Icon />
        Limpar agenda
      </Button>

      <AlertDialog open={aberto} onOpenChange={(v) => !pendente && setAberto(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar a agenda</AlertDialogTitle>
            <AlertDialogDescription>Para começar do zero (por exemplo, depois de importar errado). Não dá para desfazer. Escolha o que apagar:</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid grid-cols-1 gap-3 text-sm">
            <fieldset className="grid grid-cols-1 gap-2">
              <legend className="sr-only">O que apagar</legend>
              <label className="flex items-start gap-2 rounded-lg border p-3 has-[:checked]:border-primary">
                <input type="radio" name="escopo" className="mt-1 size-4 accent-[var(--primary)]" checked={escopo === "importados"} onChange={() => setEscopo("importados")} />
                <span>
                  <strong>Só o que veio do Google Agenda</strong>
                  <span className="block text-xs text-muted-foreground">O que você marcou direto no Vaguinha fica.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border p-3 has-[:checked]:border-destructive">
                <input type="radio" name="escopo" className="mt-1 size-4 accent-[var(--destructive)]" checked={escopo === "tudo"} onChange={() => setEscopo("tudo")} />
                <span>
                  <strong>A agenda inteira</strong>
                  <span className="block text-xs text-muted-foreground">Todos os atendimentos e compromissos, passados e futuros, inclusive os marcados pelo link.</span>
                </span>
              </label>
            </fieldset>

            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-1 size-4 accent-[var(--primary)]" checked={clientes} onChange={(e) => setClientes(e.target.checked)} />
              <span>
                Apagar também os clientes
                <span className="block text-xs text-muted-foreground">
                  {escopo === "tudo"
                    ? "Todos os cadastros de Clientes, com WhatsApp e observações."
                    : "Só os que vieram da importação: sem WhatsApp e sem nenhum horário que sobrou."}
                </span>
              </span>
            </label>

            <label className="grid grid-cols-1 gap-1">
              <span>
                Para confirmar, digite <strong>APAGAR</strong>
              </span>
              <Input value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" autoCapitalize="characters" className="text-base" />
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendente}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={apagar} disabled={!confirmado || pendente}>
              {pendente ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
              {pendente ? "Apagando…" : "Apagar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
