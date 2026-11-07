import "server-only";
import { cache } from "react";
import { criarClienteServidor } from "@/lib/supabase/server";
import { contaVencida } from "@/lib/datas";
import type { Profile } from "@/types/database";

/** Dados da sessão lidos do JWT (sem ida ao servidor de auth). */
export type UsuarioSessao = {
  id: string;
  email: string | null;
  app_metadata: { role?: string };
};

/**
 * Usuária logada (ou null). Memoizado por request.
 * Usa getClaims(): valida o token localmente, o que evita uma viagem de rede a cada página.
 */
export const obterUsuario = cache(async (): Promise<UsuarioSessao | null> => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const meta = (claims.app_metadata ?? {}) as { role?: string };
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    app_metadata: { role: meta.role },
  };
});

/** Perfil da usuária logada (ou null). Memoizado por request. */
export const obterPerfil = cache(async (): Promise<Profile | null> => {
  const usuario = await obterUsuario();
  if (!usuario) return null;

  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", usuario.id)
    .maybeSingle();

  return data ?? null;
});

export function ehAdmin(usuario: UsuarioSessao | null | undefined) {
  return usuario?.app_metadata?.role === "admin";
}

export type SituacaoConta = "pendente" | "aprovada" | "recusada" | "suspensa" | "vencida" | "sem_perfil";

/** Situação efetiva da conta, já considerando a validade (ativa_ate). */
export function situacaoDaConta(perfil: Profile | null): SituacaoConta {
  if (!perfil) return "sem_perfil";
  if (perfil.status === "aprovada" && contaVencida(perfil.ativa_ate)) return "vencida";
  return perfil.status;
}
