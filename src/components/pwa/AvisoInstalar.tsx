"use client";

import { useEffect, useState } from "react";
import { SmartphoneIcon, ShareIcon, SquarePlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type EventoInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const CHAVE_DISPENSADO = "agenda:instalar-dispensado-em";
const DIAS_SILENCIO = 7;

function estaInstalado() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

function dispensadoRecentemente() {
  try {
    const v = localStorage.getItem(CHAVE_DISPENSADO);
    if (!v) return false;
    return Date.now() - Number(v) < DIAS_SILENCIO * 86_400_000;
  } catch {
    return false;
  }
}

/**
 * Faixa "Instale o app". No Android/Chrome usa o prompt nativo; no iPhone mostra o passo a passo.
 * Some quando o app já está instalado ou foi dispensado nos últimos 7 dias.
 */
export function AvisoInstalar() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [modo, setModo] = useState<"oculto" | "android" | "ios">("oculto");
  const [mostrarPassosIos, setMostrarPassosIos] = useState(false);

  useEffect(() => {
    if (estaInstalado() || dispensadoRecentemente()) return;

    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) && !("MSStream" in window);
    const t = ios ? setTimeout(() => setModo("ios"), 0) : null;

    const aoPrompt = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
      setModo("android");
    };
    const aoInstalar = () => {
      setModo("oculto");
      setEvento(null);
    };
    window.addEventListener("beforeinstallprompt", aoPrompt);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", aoPrompt);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  function dispensar() {
    try {
      localStorage.setItem(CHAVE_DISPENSADO, String(Date.now()));
    } catch {
      /* sem localStorage: só esconde nesta visita */
    }
    setModo("oculto");
  }

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "accepted") setModo("oculto");
    setEvento(null);
  }

  if (modo === "oculto") return null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-3">
      <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
        <SmartphoneIcon className="size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">Instale o app no celular</p>
          <p className="text-muted-foreground">Abre em tela cheia e recebe os lembretes.</p>
          {modo === "ios" && mostrarPassosIos ? (
            <ol className="mt-2 list-inside list-decimal space-y-1 text-muted-foreground">
              <li>
                Toque em <ShareIcon className="inline size-4 align-text-bottom" /> <strong>Compartilhar</strong> na barra do Safari
              </li>
              <li>
                Escolha <SquarePlusIcon className="inline size-4 align-text-bottom" /> <strong>Adicionar à Tela de Início</strong>
              </li>
              <li>Toque em <strong>Adicionar</strong></li>
            </ol>
          ) : null}
        </div>
        {modo === "android" ? (
          <Button size="sm" onClick={instalar}>
            Instalar
          </Button>
        ) : !mostrarPassosIos ? (
          <Button size="sm" onClick={() => setMostrarPassosIos(true)}>
            Como fazer
          </Button>
        ) : null}
        <button type="button" onClick={dispensar} aria-label="Fechar aviso" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
