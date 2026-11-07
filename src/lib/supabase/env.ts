/** Lê e valida as variáveis públicas do Supabase, com erro claro quando falta configurar. */
export function obterEnvSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !chave || url.includes("SEU-PROJETO") || chave.includes("SUA_")) {
    throw new Error(
      "Supabase não configurado: preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "em .env.local (veja .env.example e o README) e reinicie o servidor.",
    );
  }

  return { url, chave };
}
