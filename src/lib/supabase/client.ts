import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { obterEnvSupabase } from "./env";

/** Cliente Supabase para Client Components (navegador). */
export function criarClienteNavegador() {
  const { url, chave } = obterEnvSupabase();
  return createBrowserClient<Database>(url, chave);
}
