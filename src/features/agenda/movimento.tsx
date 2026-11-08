"use client";

import Link from "next/link";
import { createContext, useContext, useRef, type ComponentProps, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/*
 * Movimento da agenda (etapa 4 do plano de design): pouco, rápido e com função.
 *  1. trocar de período/visão: o conteúdo desliza na direção da navegação (frente = da direita);
 *  2. carregando o período: o conteúdo esmaece um pouco (só se demorar mais que um piscar);
 *  3. atendimento recém-marcado/remarcado: aparece com um "pulo" curto e um anel na cor do tema.
 * Quem pede "menos movimento" no celular não vê nada disso (tudo troca na hora).
 * Durações e curva seguem os tokens --duracao-* / --curva-saida do DESIGN.md.
 */
export const MOVIMENTO = {
  periodo: 0.32,
  deslocamento: 28,
  esmaecer: 0.2,
  atrasoEsmaecer: 0.15,
  destaque: 0.5,
  curva: "power3.out",
} as const;

export function prefereMenosMovimento() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// --------------------------------------------------------- navegação com "carregando"

const NavegacaoAgenda = createContext<((href: string) => void) | null>(null);
export const ProvedorNavegacaoAgenda = NavegacaoAgenda.Provider;

/**
 * Link da agenda: navega dentro de uma transição para a tela saber que está carregando (e esmaecer).
 * Ctrl/Cmd/Shift-clique continuam abrindo em outra aba, como um link normal.
 */
export function LinkAgenda({ href, onClick, ...props }: ComponentProps<typeof Link>) {
  const navegar = useContext(NavegacaoAgenda);
  return (
    <Link
      href={href}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || !navegar || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navegar(typeof href === "string" ? href : String(href));
      }}
    />
  );
}

// --------------------------------------------------------- troca de período + esmaecer

/** Anima o conteúdo da agenda quando muda a visão/data e esmaece enquanto o próximo período carrega. */
export function useMovimentoAgenda(conteudo: RefObject<HTMLElement | null>, visao: string, data: string, carregando: boolean) {
  const anterior = useRef<{ visao: string; data: string } | null>(null);

  // 2) carregando: esmaece depois de um instante (navegação rápida não pisca)
  useGSAP(
    () => {
      const el = conteudo.current;
      if (!el || prefereMenosMovimento()) return;
      if (carregando) gsap.to(el, { opacity: 0.55, duration: MOVIMENTO.esmaecer, delay: MOVIMENTO.atrasoEsmaecer, ease: "power1.out", overwrite: "auto" });
      else gsap.to(el, { opacity: 1, duration: 0.15, overwrite: "auto", clearProps: "opacity" });
    },
    { dependencies: [carregando] },
  );

  // 1) troca de período: desliza na direção da navegação
  useGSAP(
    () => {
      const el = conteudo.current;
      const antes = anterior.current;
      anterior.current = { visao, data };
      if (!el || !antes || prefereMenosMovimento()) return;
      if (antes.visao === visao && antes.data === data) return;
      const direcao = antes.visao !== visao ? 0 : data > antes.data ? 1 : -1;
      gsap.fromTo(
        el,
        { autoAlpha: 0, x: direcao * MOVIMENTO.deslocamento, y: direcao === 0 ? 8 : 0 },
        { autoAlpha: 1, x: 0, y: 0, duration: MOVIMENTO.periodo, ease: MOVIMENTO.curva, overwrite: "auto", clearProps: "transform,opacity,visibility" },
      );
    },
    { dependencies: [visao, data] },
  );
}

// --------------------------------------------------------- destaque do recém-salvo

function hexParaRgb(hex: string) {
  const h = hex.trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(h)) return "215, 153, 175"; // rosa da marca
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(", ");
}

/**
 * Leva a tela até o atendimento/bloqueio salvo e dá um destaque curto.
 * Devolve false se ele não está visível no período aberto (ex.: marcado para outro mês).
 */
export function destacarAgendamento(id: string): boolean {
  const el = [...document.querySelectorAll<HTMLElement>(`[data-agendamento="${CSS.escape(id)}"]`)].find((e) => e.getClientRects().length > 0);
  if (!el) return false;
  const menos = prefereMenosMovimento();
  el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: menos ? "auto" : "smooth" });
  if (menos) return true;
  const rgb = hexParaRgb(getComputedStyle(el).getPropertyValue("--ring"));
  gsap
    .timeline({ onComplete: () => void gsap.set(el, { clearProps: "transform,boxShadow,zIndex" }) })
    .set(el, { zIndex: 20 })
    .fromTo(el, { scale: 0.88 }, { scale: 1, duration: MOVIMENTO.destaque, ease: "back.out(2.4)" }, 0)
    .fromTo(el, { boxShadow: `0 0 0 0px rgba(${rgb}, 0.9)` }, { boxShadow: `0 0 0 8px rgba(${rgb}, 0)`, duration: 0.9, ease: "power2.out" }, 0.05);
  return true;
}
