"use client";

import { FileTextIcon, ImageOffIcon, MapPinIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MensagemCentral } from "../central";

/** Tira o rótulo ("📷 Foto: ") do texto guardado e fica só com a legenda que a pessoa escreveu. */
function legendaDe(texto: string) {
  return texto.replace(/^(📷 Foto|🎥 Vídeo|📄 Documento|🎤 Áudio|Figurinha|📍 Localização|👤 Contato)(: )?/u, "").trim();
}

const NOME_TIPO: Record<string, string> = {
  imagem: "Foto",
  audio: "Áudio",
  video: "Vídeo",
  documento: "Documento",
  figurinha: "Figurinha",
};

/** Conteúdo de um balão com foto, áudio, vídeo, documento, figurinha ou localização. Texto comum não passa por aqui. */
export function MidiaMensagem({ m, escuro }: { m: MensagemCentral; escuro?: boolean }) {
  const legenda = legendaDe(m.texto);
  const sub = escuro ? "text-primary-foreground/75" : "text-muted-foreground";

  if (m.semArquivo || (!m.url && m.tipo !== "localizacao" && m.tipo !== "contato")) {
    return (
      <div className="grid gap-1">
        <p className={cn("inline-flex items-center gap-1.5 text-xs italic", sub)}>
          <ImageOffIcon className="size-3.5" aria-hidden />
          {NOME_TIPO[m.tipo] ?? "Arquivo"} indisponível (apagado depois de 90 dias ou não baixado)
        </p>
        {legenda ? <p>{legenda}</p> : null}
        {m.transcricao ? <p className={cn("text-xs", sub)}>“{m.transcricao}”</p> : null}
      </div>
    );
  }

  switch (m.tipo) {
    case "imagem":
      return (
        <div className="grid gap-1.5">
          <a href={m.url!} target="_blank" rel="noopener" className="block overflow-hidden rounded-xl" aria-label="Abrir a foto">
            {/* eslint-disable-next-line @next/next/no-img-element -- link temporário do Supabase (não passa pelo otimizador) */}
            <img src={m.url!} alt={legenda || "Foto recebida"} className="max-h-72 w-full object-cover" loading="lazy" />
          </a>
          {legenda ? <p>{legenda}</p> : null}
        </div>
      );
    case "figurinha":
      // eslint-disable-next-line @next/next/no-img-element -- link temporário do Supabase
      return <img src={m.url!} alt="Figurinha" className="size-32 object-contain" loading="lazy" />;
    case "audio":
      return (
        <div className="grid gap-1.5">
          <audio controls preload="none" src={m.url!} className="h-10 w-64 max-w-full" />
          {m.transcricao ? <p className={cn("text-xs", sub)}>“{m.transcricao}”</p> : null}
        </div>
      );
    case "video":
      return (
        <div className="grid gap-1.5">
          <video controls preload="metadata" src={m.url!} className="max-h-72 w-full rounded-xl" />
          {legenda ? <p>{legenda}</p> : null}
        </div>
      );
    case "documento":
      return (
        <div className="grid gap-1.5">
          <a
            href={m.url!}
            target="_blank"
            rel="noopener"
            className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 font-medium underline-offset-2 hover:underline", escuro ? "border-primary-foreground/30" : "bg-background")}
          >
            <FileTextIcon className="size-5 shrink-0" aria-hidden />
            <span className="truncate">{m.midia_nome || "Documento"}</span>
          </a>
          {legenda ? <p>{legenda}</p> : null}
        </div>
      );
    case "localizacao": {
      const link = m.texto.match(/https:\/\/maps\.google\.com\/\?q=[-\d.,]+/)?.[0];
      return (
        <a href={link} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-medium underline-offset-2 hover:underline">
          <MapPinIcon className="size-4" aria-hidden />
          {legenda.replace(/\(https:[^)]+\)/, "").trim() || "Ver no mapa"}
        </a>
      );
    }
    default:
      return <p>{m.texto}</p>;
  }
}
