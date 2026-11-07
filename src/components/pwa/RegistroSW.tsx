"use client";

import { useEffect } from "react";

/** Registra o service worker (push agora; cache offline no módulo PWA). */
export function RegistroSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* sem suporte ou bloqueado: o app funciona normalmente, só sem push */
    });
  }, []);
  return null;
}
