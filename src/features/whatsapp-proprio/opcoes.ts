import { URL_APP } from "@/lib/constantes";

/** Para onde a Evolution manda os avisos (conexão e mensagens). */
export const URL_AVISOS_EVOLUTION = `${URL_APP}/api/webhooks/evolution`;

/** Quanto tempo antes o lembrete automático sai (horas). O banco aceita só estes valores (migração 0026). */
export const HORAS_LEMBRETE = [24, 12, 3, 2] as const;

export function rotuloHoras(h: number) {
  return h === 24 ? "1 dia antes" : `${h} horas antes`;
}
