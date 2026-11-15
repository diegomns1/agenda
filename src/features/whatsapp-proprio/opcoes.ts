/** Quanto tempo antes o lembrete automático sai (horas). O banco aceita só estes valores (migração 0026). */
export const HORAS_LEMBRETE = [24, 12, 3, 2] as const;

export function rotuloHoras(h: number) {
  return h === 24 ? "1 dia antes" : `${h} horas antes`;
}
