"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotMessageSquareIcon } from "lucide-react";
import { Flutuante } from "@/components/layout/Flutuante";
import { cn } from "@/lib/utils";

/**
 * Botão da assistente sempre à vista, no canto de baixo de todas as telas do painel
 * (antes ela ficava escondida no topo; pedido do Diego em 09/11/2026).
 * Na Agenda, no celular, sobe um pouco para não cobrir o botão de marcar.
 */
export function BotaoAssistente() {
  const pathname = usePathname();
  if (pathname.startsWith("/assistente")) return null;
  const naAgenda = pathname.startsWith("/agenda");

  return (
    <Flutuante>
      <Link
        href="/assistente"
        aria-label="Abrir a assistente"
        className={cn(
          "gradiente-marca fixed right-4 z-30 inline-flex h-12 items-center gap-2 rounded-full pr-4 pl-3.5 text-sm font-semibold text-white shadow-alta transition-transform active:scale-95",
          "bottom-[calc(76px+env(safe-area-inset-bottom))] sm:bottom-[calc(80px+env(safe-area-inset-bottom))]",
          naAgenda && "max-sm:bottom-[calc(140px+env(safe-area-inset-bottom))]",
        )}
      >
        <BotMessageSquareIcon className="size-5" aria-hidden />
        Assistente
      </Link>
    </Flutuante>
  );
}
