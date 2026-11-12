"use client";

import {
  COOKIE_CONSENTIMENTO,
  COOKIE_ORIGEM,
  GOOGLE_ADS_CONVERSAO_CADASTRO,
  GOOGLE_ADS_ID,
  PARAMS_ORIGEM,
  type OrigemCookie,
} from "./comum";

/* Funções de rastreio que rodam no navegador. Nada vai para a Meta nem para o Google sem o "Aceitar" do aviso de cookies. */

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Domínio dos cookies: .vaguinha.app em produção (site e painel); o host atual no computador. */
function dominio() {
  return location.hostname.endsWith("vaguinha.app") ? "; Domain=.vaguinha.app" : "";
}

export function gravarCookie(nome: string, valor: string, dias: number) {
  const seguro = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${nome}=${encodeURIComponent(valor)}; Max-Age=${dias * 86_400}; Path=/; SameSite=Lax${dominio()}${seguro}`;
}

export function lerCookie(nome: string) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${nome}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function consentimento(): "sim" | "nao" | null {
  const v = lerCookie(COOKIE_CONSENTIMENTO);
  return v === "sim" || v === "nao" ? v : null;
}

export function salvarConsentimento(valor: "sim" | "nao") {
  gravarCookie(COOKIE_CONSENTIMENTO, valor, 180);
}

/** Guarda utm_* e fbclid quando a pessoa chega por um link com esses dados (dura 90 dias). */
export function capturarOrigem() {
  const p = new URLSearchParams(location.search);
  const o: OrigemCookie = {};
  for (const k of PARAMS_ORIGEM) {
    const v = p.get(k);
    if (v) o[k] = v.slice(0, 200);
  }
  if (!Object.keys(o).length) return;
  o.pagina = `${location.origin}${location.pathname}`;
  o.em = Date.now();
  gravarCookie(COOKIE_ORIGEM, JSON.stringify(o), 90);
}

/** Código oficial do Pixel da Meta (carrega uma vez só). */
export function carregarPixel(pixelId: string) {
  if (window.fbq) return;
  const fbq: Fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue!.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  fbq("init", pixelId);
}

/** gtag.js do Google Ads (o código padrão do Google), carregado uma vez só e só com o "Aceitar". */
export function carregarGoogle() {
  if (window.gtag || consentimento() !== "sim") return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params -- a tag do Google precisa do objeto `arguments`
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ADS_ID);
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  document.head.appendChild(s);
}

const cadastrosEnviados = new Set<string>();

/**
 * Cadastro concluído: conversão "Inscrição" do Google Ads (1,00 BRL), uma vez por cadastro (o mesmo `id` não dispara
 * de novo nesta página, e o transaction_id faz o Google descartar repetidos).
 * `depois` roda quando o Google confirma o envio (event_callback) ou em 1,5 s, o que vier primeiro, e roda na hora
 * se não houver o que enviar (sem "Aceitar", sem tag). É ali que o cadastro abre a agenda.
 */
export function rastrearCadastroGoogle(id: string, depois?: () => void) {
  let feito = false;
  const seguir = () => {
    if (feito) return;
    feito = true;
    depois?.();
  };

  if (consentimento() !== "sim" || !window.gtag || !GOOGLE_ADS_CONVERSAO_CADASTRO || cadastrosEnviados.has(id)) {
    seguir();
    return;
  }
  cadastrosEnviados.add(id);
  window.gtag("event", "conversion", {
    send_to: GOOGLE_ADS_CONVERSAO_CADASTRO,
    value: 1.0,
    currency: "BRL",
    transaction_id: id,
    event_callback: seguir,
  });
  setTimeout(seguir, 1500); // segurança: se o Google não responder, abre a agenda mesmo assim
}

/** Manda um evento pelo pixel (só se a pessoa aceitou). `eventID` igual ao do servidor evita contar duas vezes. */
export function rastrear(evento: string, dados: Record<string, unknown> = {}, eventID?: string) {
  if (consentimento() !== "sim" || !window.fbq) return;
  window.fbq("track", evento, dados, eventID ? { eventID } : undefined);
}
