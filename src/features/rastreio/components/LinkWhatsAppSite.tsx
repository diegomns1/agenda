"use client";

import { LINK_WHATSAPP_SITE } from "../comum";
import { rastrear } from "../navegador";

/** Link para o WhatsApp oficial (a IA de vendas atende). Conta como "Contact" no Pixel da Meta. */
export function LinkWhatsAppSite({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <a href={LINK_WHATSAPP_SITE} target="_blank" rel="noopener" onClick={() => rastrear("Contact")} className={className}>
      {children}
    </a>
  );
}
