/*
 * Rastreio de anúncios (Pixel da Meta + API de Conversões), 11/11/2026.
 * Peças usadas no navegador e no servidor. Os cookies valem para .vaguinha.app (site e painel juntos),
 * assim o que a pessoa escolheu no site vale também na tela de cadastro do painel.
 */

import { SUPORTE_WHATSAPP } from "@/lib/constantes";

/** "sim" = aceitou os cookies de medição; "nao" = só os necessários. Sem o cookie, mostra o aviso. */
export const COOKIE_CONSENTIMENTO = "vg_consent";
/** De onde a pessoa veio (utm_* e fbclid da última visita que trouxe esses dados). */
export const COOKIE_ORIGEM = "vg_origem";

export const PARAMS_ORIGEM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const;
export type ParamOrigem = (typeof PARAMS_ORIGEM)[number];
export type OrigemCookie = Partial<Record<ParamOrigem, string>> & { pagina?: string; em?: number };

export function lerOrigemCookie(valor: string | null | undefined): OrigemCookie | null {
  if (!valor) return null;
  try {
    const o = JSON.parse(decodeURIComponent(valor)) as OrigemCookie;
    return o && typeof o === "object" ? o : null;
  } catch {
    return null;
  }
}

/** WhatsApp oficial da Vaguinha (a IA atende os leads). O mesmo número do suporte. */
export const WHATSAPP_VAGUINHA = SUPORTE_WHATSAPP;
export const LINK_WHATSAPP_SITE = `https://wa.me/${WHATSAPP_VAGUINHA}?text=${encodeURIComponent("Oi! Vim pelo site e quero saber mais sobre o Vaguinha.")}`;

/** Etiqueta de verificação do domínio vaguinha.app na Meta (Configurações do negócio → Domínios). Não é segredo. */
export const META_VERIFICACAO_DOMINIO = "62xj6bxqtp9k4fx721s1ooe99st4kc";

/** Tag do Google (Google Ads), 12/11/2026. Carrega só depois do "Aceitar", como o pixel da Meta. Não é segredo. */
export const GOOGLE_TAG_ID = "GTM-PBCD8PX2";
/**
 * Conversão "Inscrição" do Google Ads no formato "AW-123456789/AbCdEfGh" (Google Ads → Metas → Conversões →
 * a ação de inscrição → Configurar tag → "send_to"). Enquanto estiver null, o cadastro manda só o evento sign_up.
 */
export const GOOGLE_ADS_CONVERSAO_CADASTRO: string | null = "AW-18571039970/i-R6COKq_rYdEOKprpdF"; // "Inscrição", 12/11/2026
