"use client";

import { useState } from "react";
import { DialogoSugestao } from "./DialogoSugestao";

/** Botão que abre a caixa de sugestão (usado no cartão "Falar com o suporte" do Perfil). */
export function BotaoSugestao({ className, children }: { className?: string; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setAberto(true)}>
        {children}
      </button>
      <DialogoSugestao aberto={aberto} aoMudar={setAberto} />
    </>
  );
}
