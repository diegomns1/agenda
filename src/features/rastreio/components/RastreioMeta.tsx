"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { capturarOrigem, carregarGoogle, carregarPixel, consentimento, salvarConsentimento } from "../navegador";

/**
 * Aviso de cookies + Pixel da Meta + tag do Google. Vai no site e nas telas públicas (cadastro, login, termos), nunca
 * dentro do painel. Os dois só carregam depois do "Aceitar". A origem (utm/fbclid) é guardada sempre: é dado nosso,
 * para o funil por anúncio.
 */
export function RastreioMeta({ pixelId }: { pixelId: string | null }) {
  const pathname = usePathname();
  const [escolha, setEscolha] = useState<"sim" | "nao" | null | "lendo">("lendo");

  useEffect(() => {
    capturarOrigem();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o cookie só existe no navegador
    setEscolha(consentimento());
  }, []);

  useEffect(() => {
    if (escolha === "sim" && pixelId) carregarPixel(pixelId);
    if (escolha === "sim") carregarGoogle();
  }, [escolha, pixelId]);

  useEffect(() => {
    if (escolha === "sim" && pixelId) window.fbq?.("track", "PageView");
  }, [pathname, escolha, pixelId]);

  if (escolha !== null) return null;

  function escolher(valor: "sim" | "nao") {
    salvarConsentimento(valor);
    setEscolha(valor);
  }

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rounded-2xl border bg-card p-4 text-sm shadow-alta sm:inset-x-auto sm:right-4 sm:bottom-4"
    >
      <p className="text-pretty text-muted-foreground">
        Usamos cookies para o site funcionar e, se você aceitar, para medir de onde vêm as visitas e melhorar nossos anúncios
        (Pixel da Meta e tag do Google). Saiba mais na{" "}
        <Link href="/privacidade" className="font-medium text-foreground underline underline-offset-2">
          Política de Privacidade
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => escolher("nao")}>
          Só os necessários
        </Button>
        <Button size="sm" onClick={() => escolher("sim")}>
          Aceitar
        </Button>
      </div>
    </div>
  );
}
