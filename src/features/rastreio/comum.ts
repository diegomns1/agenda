/*
 * Rastreio de anúncios (Pixel da Meta + API de Conversões), 11/11/2026.
 * Peças usadas no navegador e no servidor. Os cookies valem para .vaguinha.app (site e painel juntos),
 * assim o que a pessoa escolheu no site vale também na tela de cadastro do painel.
 */

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

/** WhatsApp oficial da Vaguinha (a IA atende os leads). */
export const WHATSAPP_VAGUINHA = "5514998023550";
export const LINK_WHATSAPP_SITE = `https://wa.me/${WHATSAPP_VAGUINHA}?text=${encodeURIComponent("Oi! Vim pelo site e quero saber mais sobre o Vaguinha.")}`;

/** Etiqueta de verificação do domínio vaguinha.app na Meta (Configurações do negócio → Domínios). Não é segredo. */
export const META_VERIFICACAO_DOMINIO = "62xj6bxqtp9k4fx721s1ooe99st4kc";
