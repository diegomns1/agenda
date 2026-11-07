"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckIcon, CopyIcon, ExternalLinkIcon, Share2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Mostra o link público com botões de copiar, compartilhar e abrir. */
export function LinkAgendamento({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      toast.success("Link copiado. Cole na bio do Instagram ou mande no WhatsApp.");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Segure o link para copiar manualmente.");
    }
  }

  async function compartilhar() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Agende seu horário", url });
      } catch {
        /* cancelado */
      }
    } else {
      await copiar();
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2">
        <a href={url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-mono text-sm text-primary">
          {url.replace(/^https?:\/\//, "")}
        </a>
        <Button type="button" size="icon-sm" variant="ghost" onClick={copiar} aria-label="Copiar link">
          {copiado ? <CheckIcon className="text-emerald-600" /> : <CopyIcon />}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={compartilhar} size="sm">
          <Share2Icon />
          Compartilhar
        </Button>
        <Button asChild type="button" variant="outline" size="sm">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon />
            Ver como a cliente vê
          </a>
        </Button>
      </div>
    </div>
  );
}
