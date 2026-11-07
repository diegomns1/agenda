const formatador = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 45 → "R$ 45,00" */
export function formatarMoeda(valor: number | string | null | undefined): string {
  const n = typeof valor === "string" ? Number(valor) : (valor ?? 0);
  return formatador.format(Number.isFinite(n) ? n : 0);
}

/** "R$ 1.234,50" | "45,5" | "45.50" | "45" → 1234.5 / 45.5 / 45.5 / 45. Inválido → null. */
export function interpretarMoeda(texto: string | null | undefined): number | null {
  if (texto == null) return null;
  let s = String(texto).trim().replace(/[R$\s]/g, "");
  if (!s) return null;

  const temVirgula = s.includes(",");
  const temPonto = s.includes(".");
  if (temVirgula && temPonto) {
    // formato brasileiro completo: 1.234,50
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (temVirgula) {
    s = s.replace(",", ".");
  } else if (temPonto && /\.\d{3}$/.test(s)) {
    // "1.234" sem centavos = milhar
    s = s.replace(/\./g, "");
  }

  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

/** 45 → "45,00" (para preencher campos de edição) */
export function moedaParaCampo(valor: number | string | null | undefined): string {
  const n = typeof valor === "string" ? Number(valor) : (valor ?? 0);
  return (Number.isFinite(n) ? n : 0).toFixed(2).replace(".", ",");
}

/** 90 → "1h30" · 45 → "45 min" · 120 → "2h" */
export function formatarDuracao(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}
