"use client";

import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Copia a lista filtrada (nome, WhatsApp e fim do teste, uma por linha) para colar no WhatsApp ou numa planilha. */
export function CopiarLista({ texto, quantas }: { texto: string; quantas: number }) {
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(`${quantas === 1 ? "1 conta copiada" : `${quantas} contas copiadas`}. É só colar.`);
    } catch {
      toast.error("Não consegui copiar. Tente de novo.");
    }
  }
  return (
    <Button size="sm" variant="outline" onClick={copiar} className="w-fit">
      <CopyIcon />
      Copiar nomes e telefones
    </Button>
  );
}
