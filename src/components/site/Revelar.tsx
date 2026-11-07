"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Atraso em ms (para escalonar cartões de uma mesma seção). */
  atraso?: number;
};

/** Faz o conteúdo surgir quando entra na tela (IntersectionObserver + classe .revelar). */
export function Revelar({ children, className, atraso = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.setAttribute("data-visivel", "");
      return;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            el.setAttribute("data-visivel", "");
            obs.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("revelar", className)} style={{ "--revelar-atraso": `${atraso}ms` } as React.CSSProperties}>
      {children}
    </div>
  );
}
