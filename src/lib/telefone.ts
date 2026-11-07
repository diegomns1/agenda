/** Mantém só dígitos e garante o DDI 55 para números brasileiros (10 ou 11 dígitos). */
export function normalizarTelefone(valor: string | null | undefined): string | null {
  if (!valor) return null;
  let digitos = valor.replace(/\D/g, "");
  if (!digitos) return null;
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  return digitos;
}

/** 5511999999999 → (11) 99999-9999 */
export function formatarTelefone(valor: string | null | undefined): string {
  if (!valor) return "";
  const d = valor.replace(/\D/g, "");
  const local = d.startsWith("55") && d.length >= 12 ? d.slice(2) : d;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return valor;
}

/** Monta o link wa.me com mensagem pronta. */
export function linkWhatsApp(telefone: string, mensagem?: string) {
  const numero = normalizarTelefone(telefone) ?? "";
  const url = new URL(`https://wa.me/${numero}`);
  if (mensagem) url.searchParams.set("text", mensagem);
  return url.toString();
}
