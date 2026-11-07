import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { obterEnvSupabase } from "./env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Usa a sessão da profissional (cookies) → RLS aplicada.
 */
export async function criarClienteServidor() {
  const cookieStore = await cookies();
  const { url, chave } = obterEnvSupabase();

  return createServerClient<Database>(url, chave, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de um Server Component: não dá para gravar cookie.
            // Tudo bem — o proxy.ts renova a sessão a cada request.
          }
        },
      },
  });
}
