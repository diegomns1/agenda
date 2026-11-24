import { linkWhatsApp, normalizarTelefone } from "@/lib/telefone";

/*
 * Por qual WhatsApp a profissional fala com as clientes (24/11/2026).
 * Quem tem os dois aplicativos no celular (o normal e o Business) via o wa.me abrir sempre no que o celular escolhe,
 * que nem sempre é o número do trabalho. Agora o painel pergunta na primeira vez e lembra (neste aparelho).
 *
 * - Android: o link "intent" diz qual aplicativo abrir. Se ele não estiver instalado, cai no wa.me.
 * - iPhone: não existe endereço oficial só do Business. O wa.me abre no normal; o whatsapp:// costuma abrir no
 *   Business quando os dois estão instalados (e não dá erro se houver algum WhatsApp).
 * - Computador: sempre o wa.me (WhatsApp Web), sem perguntar.
 */

/** "celular" = não escolher aplicativo, deixar como o celular abre (wa.me). */
export type AppWhatsApp = "normal" | "business" | "celular";
export type Sistema = "android" | "iphone" | "computador";
export type Conversa = {
  telefone: string;
  mensagem?: string;
  /** chamado quando a conversa abre de fato (não quando a pessoa fecha a pergunta sem escolher) */
  aoAbrir?: () => void;
};

const CHAVE = "vaguinha:whatsapp";
const OPCOES: readonly string[] = ["normal", "business", "celular"];

export function sistemaDoNavegador(): Sistema {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  // o iPad se apresenta como Macintosh, mas tem toque
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "iphone";
  return "computador";
}

export function lerPreferencia(): AppWhatsApp | null {
  try {
    const v = localStorage.getItem(CHAVE);
    return v && OPCOES.includes(v) ? (v as AppWhatsApp) : null;
  } catch {
    return null; // navegação privada: pergunta toda vez
  }
}

const ouvintesPreferencia = new Set<() => void>();

/** null = perguntar toda vez. */
export function guardarPreferencia(app: AppWhatsApp | null) {
  try {
    if (app) localStorage.setItem(CHAVE, app);
    else localStorage.removeItem(CHAVE);
  } catch {
    // sem armazenamento: segue perguntando
  }
  ouvintesPreferencia.forEach((f) => f());
}

export function aoMudarPreferencia(f: () => void) {
  ouvintesPreferencia.add(f);
  return () => {
    ouvintesPreferencia.delete(f);
  };
}

/** Endereço que abre a conversa no aplicativo escolhido. */
export function enderecoDaConversa({ telefone, mensagem }: Conversa, app: AppWhatsApp, sistema: Sistema) {
  const web = linkWhatsApp(telefone, mensagem);
  if (sistema === "computador" || app === "celular") return web;
  // encodeURIComponent (espaço vira %20): fora da web, o "+" do wa.me apareceria no texto
  const parametros = `phone=${normalizarTelefone(telefone) ?? ""}${mensagem ? `&text=${encodeURIComponent(mensagem)}` : ""}`;
  if (sistema === "android") {
    const pacote = app === "business" ? "com.whatsapp.w4b" : "com.whatsapp";
    return `intent://send?${parametros}#Intent;scheme=whatsapp;package=${pacote};S.browser_fallback_url=${encodeURIComponent(web)};end`;
  }
  return app === "business" ? `whatsapp://send?${parametros}` : web;
}

/** Abre a conversa no aplicativo. Chamar sempre dentro de um toque (o navegador bloqueia fora dele). */
export function abrirNoApp(conversa: Conversa, app: AppWhatsApp) {
  conversa.aoAbrir?.();
  const endereco = enderecoDaConversa(conversa, app, sistemaDoNavegador());
  if (endereco.startsWith("https:")) window.open(endereco, "_blank", "noopener,noreferrer");
  else window.location.href = endereco; // intent:// e whatsapp:// abrem o aplicativo sem sair do painel
}

/** A janela que pergunta (EscolherWhatsApp, no layout do painel). */
let perguntar: ((c: Conversa) => void) | null = null;
export function registrarPergunta(f: ((c: Conversa) => void) | null) {
  perguntar = f;
}

/** Abre a conversa: no computador, direto; no celular, pelo aplicativo guardado ou perguntando. */
export function abrirWhatsApp(conversa: Conversa) {
  const guardado = lerPreferencia();
  if (sistemaDoNavegador() === "computador" || (!guardado && !perguntar)) return abrirNoApp(conversa, "celular");
  if (guardado) return abrirNoApp(conversa, guardado);
  // depois que o menu de onde veio o toque fechar
  setTimeout(() => perguntar?.(conversa), 0);
}
