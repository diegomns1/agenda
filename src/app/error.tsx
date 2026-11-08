"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const CHAVE = "vaguinha-recarregou-apos-erro";

/** Erro típico de aba aberta antes de um deploy novo (código antigo pedindo arquivos/ações que não existem mais). */
function ehVersaoAntiga(erro: Error) {
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Failed to find Server Action|older or newer deployment/i.test(
    `${erro.name} ${erro.message}`,
  );
}

/**
 * Tela de erro do painel, em português (no lugar do "This page couldn't load" em inglês).
 * Se o erro for de versão antiga, recarrega sozinha uma vez: quase sempre resolve.
 */
export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    if (!ehVersaoAntiga(error)) return;
    try {
      if (sessionStorage.getItem(CHAVE)) return;
      sessionStorage.setItem(CHAVE, "1");
    } catch {
      return;
    }
    window.location.reload();
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Esta tela não carregou</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Pode ter sido a internet ou uma atualização do Vaguinha. Recarregar quase sempre resolve.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="h-toque sm:h-toque"
          onClick={() => {
            try {
              sessionStorage.removeItem(CHAVE);
            } catch {}
            reset();
            window.location.reload();
          }}
        >
          Recarregar a página
        </Button>
        <Button asChild variant="outline" className="h-toque sm:h-toque">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
