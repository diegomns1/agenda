import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { obterEnvSupabase } from "./env";

export type ClaimsSessao = {
  sub: string;
  email?: string;
  app_metadata?: { role?: string; [k: string]: unknown };
} | null;

/**
 * Renova a sessão (refresh token) a cada request e devolve os claims do JWT.
 * Usado só pelo proxy.ts.
 */
export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, chave } = obterEnvSupabase();

  const supabase = createServerClient(url, chave, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
  });

  // getClaims valida o JWT localmente (sem ida ao servidor na maioria dos casos).
  const { data } = await supabase.auth.getClaims();
  const claims = (data?.claims ?? null) as ClaimsSessao;

  return { response, claims };
}
