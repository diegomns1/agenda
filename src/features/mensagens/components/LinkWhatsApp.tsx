"use client";

import type { ComponentProps } from "react";
import { abrirWhatsApp, sistemaDoNavegador } from "@/features/mensagens/abrirWhatsApp";
import { linkWhatsApp } from "@/lib/telefone";

type Props = Omit<ComponentProps<"a">, "href" | "target" | "rel"> & {
  telefone: string;
  mensagem?: string;
  aoAbrir?: () => void;
};

/** Link que abre a conversa com a cliente. No celular, pelo WhatsApp que a profissional escolheu (ou pergunta). */
export function LinkWhatsApp({ telefone, mensagem, aoAbrir, onClick, ...props }: Props) {
  return (
    <a
      {...props}
      href={linkWhatsApp(telefone, mensagem)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (sistemaDoNavegador() === "computador") return aoAbrir?.();
        e.preventDefault();
        abrirWhatsApp({ telefone, mensagem, aoAbrir });
      }}
    />
  );
}
