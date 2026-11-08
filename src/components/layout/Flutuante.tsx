"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renderiza os filhos direto no <body>. Necessário para botões `position: fixed`:
 * a animação de entrada das páginas (.surgir) usa transform, e um ancestral com transform
 * prende o "fixed" dentro dele (o botão ia parar no fim da página em vez do canto da tela).
 */
export function Flutuante({ children }: { children: React.ReactNode }) {
  const [destino, setDestino] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // só no navegador (no servidor não existe document.body); fora do render para não dar erro de hidratação
    const t = setTimeout(() => setDestino(document.body), 0);
    return () => clearTimeout(t);
  }, []);
  return destino ? createPortal(children, destino) : null;
}
