"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotMessageSquareIcon } from "lucide-react";
import { Flutuante } from "@/components/layout/Flutuante";
import { IconeWhatsApp } from "@/components/marca/IconeWhatsApp";
import { cn } from "@/lib/utils";
import type { EstadoWhatsApp } from "@/features/whatsapp/estado";

/**
 * Botão da assistente: só na tela Hoje (15/11/2026; antes ficava em todas as telas e cobria o conteúdo).
 * Redondo, só com o ícone. Quem conectou o WhatsApp vai direto para a conversa com a Vaguinha; quem tem direito
 * e não conectou vai para a conexão no Perfil; o resto abre a tela Assistente.
 */
export function BotaoAssistente({ estado }: { estado: EstadoWhatsApp }) {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  const classe = cn(
    "fixed right-4 z-30 inline-flex size-12 items-center justify-center rounded-full text-white shadow-alta transition-transform active:scale-95",
    estado.via === "painel" ? "gradiente-marca" : "bg-whatsapp",
    "bottom-[calc(76px+env(safe-area-inset-bottom))] md:bottom-6",
  );

  return (
    <Flutuante>
      {estado.via === "whatsapp" ? (
        <a href={estado.link} target="_blank" rel="noopener" aria-label="Falar com a assistente no WhatsApp" title="Assistente no WhatsApp" className={classe}>
          <IconeWhatsApp className="size-6" />
        </a>
      ) : estado.via === "conectar" ? (
        <Link href="/perfil/assistente" aria-label="Conectar a assistente no WhatsApp" title="Conectar a assistente no WhatsApp" className={classe}>
          <IconeWhatsApp className="size-6" />
        </Link>
      ) : (
        <Link href="/assistente" aria-label="Abrir a assistente" title="Assistente" className={classe}>
          <BotMessageSquareIcon className="size-6" aria-hidden />
        </Link>
      )}
    </Flutuante>
  );
}
