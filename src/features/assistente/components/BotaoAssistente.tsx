"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotMessageSquareIcon } from "lucide-react";
import { Flutuante } from "@/components/layout/Flutuante";
import { IconeWhatsApp } from "@/components/marca/IconeWhatsApp";
import { cn } from "@/lib/utils";
import type { EstadoWhatsApp } from "@/features/whatsapp/estado";

/**
 * Botão da assistente sempre à vista, no canto de baixo de todas as telas do painel.
 * Desde 10/11/2026 o caminho principal é o WhatsApp: quem conectou vai direto para a conversa com a Vaguinha;
 * quem tem direito e não conectou vai para o quadro de conexão no Perfil; o resto continua na tela Assistente.
 * Na Agenda, no celular, sobe um pouco para não cobrir o botão de marcar.
 */
export function BotaoAssistente({ estado }: { estado: EstadoWhatsApp }) {
  const pathname = usePathname();
  if (pathname.startsWith("/assistente")) return null;
  if (estado.via === "conectar" && pathname.startsWith("/perfil")) return null;
  const naAgenda = pathname.startsWith("/agenda");

  const classe = cn(
    "fixed right-4 z-30 inline-flex h-12 items-center gap-2 rounded-full pr-4 pl-3.5 text-sm font-semibold text-white shadow-alta transition-transform active:scale-95",
    estado.via === "painel" ? "gradiente-marca" : "bg-whatsapp",
    "bottom-[calc(76px+env(safe-area-inset-bottom))] sm:bottom-[calc(80px+env(safe-area-inset-bottom))]",
    naAgenda && "max-sm:bottom-[calc(140px+env(safe-area-inset-bottom))]",
  );

  return (
    <Flutuante>
      {estado.via === "whatsapp" ? (
        <a href={estado.link} target="_blank" rel="noopener" aria-label="Falar com a assistente no WhatsApp" className={classe}>
          <IconeWhatsApp className="size-5" />
          Assistente
        </a>
      ) : estado.via === "conectar" ? (
        <Link href="/perfil#whatsapp" aria-label="Conectar a assistente no WhatsApp" className={classe}>
          <IconeWhatsApp className="size-5" />
          Assistente
        </Link>
      ) : (
        <Link href="/assistente" aria-label="Abrir a assistente" className={classe}>
          <BotMessageSquareIcon className="size-5" aria-hidden />
          Assistente
        </Link>
      )}
    </Flutuante>
  );
}
