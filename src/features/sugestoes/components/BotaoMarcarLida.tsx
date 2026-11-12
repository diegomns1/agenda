"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { marcarSugestao } from "../actions";
import { Button } from "@/components/ui/button";

/** Admin: marca a sugestão como lida (ou volta para nova). */
export function BotaoMarcarLida({ id, lida }: { id: string; lida: boolean }) {
  const [pendente, iniciar] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant={lida ? "ghost" : "outline"}
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await marcarSugestao(id, !lida);
          if (r.erro) toast.error(r.erro);
        })
      }
    >
      {lida ? <RotateCcwIcon /> : <CheckIcon />}
      {lida ? "Marcar como nova" : "Marcar como lida"}
    </Button>
  );
}
