/** "Maria da Silva" → "MD" (duas primeiras iniciais) */
export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

/** Primeiro nome, para saudações. */
export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? "";
}
