/* Estado do "Deixe sua agenda pronta" (passos pulados e lista escondida), guardado no cookie do aparelho. */

export const COOKIE_PASSOS = "vg_passos";

export type Passo = {
  id: string;
  feito: boolean;
  titulo: string;
  texto: string;
  href: string;
  botao: string;
  /** atalho opcional ao lado (ex.: importar do Google) */
  extra?: { href: string; rotulo: string };
};

export type EstadoPassos = { pulados: string[]; oculto: boolean };

/** Lê o cookie (no servidor, para a lista nem aparecer se estiver escondida). */
export function lerEstadoPassos(valor: string | undefined): EstadoPassos {
  try {
    const e = JSON.parse(decodeURIComponent(valor ?? "")) as Partial<EstadoPassos>;
    return { pulados: Array.isArray(e.pulados) ? e.pulados.filter((x) => typeof x === "string") : [], oculto: e.oculto === true };
  } catch {
    return { pulados: [], oculto: false };
  }
}
