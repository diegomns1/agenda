"use client";

import { useEffect } from "react";

/**
 * Copia o tema do painel (data-tema) para o <body>.
 * Janelas, menus e botões flutuantes são desenhados direto no <body> (fora da área do layout);
 * sem isso eles ficavam sempre no rosa padrão, mesmo com o tema Grafite/Azul/Verde/Lavanda.
 */
export function AplicarTema({ tema }: { tema: string }) {
  useEffect(() => {
    document.body.dataset.tema = tema;
    return () => {
      delete document.body.dataset.tema;
    };
  }, [tema]);
  return null;
}
