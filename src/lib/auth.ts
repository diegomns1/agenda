import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { criarClienteServidor } from "@/lib/supabase/server";
import { contaVencida } from "@/lib/datas";
import type { Profile } from "@/types/database";

/** Usuária logada (ou null). Memoizado por request. */
export const obterUsuario = cache(async (): Promise<User | null> => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
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

export function ehAdmin(usuario: User | null | undefined) {
  return usuario?.app_metadata?.role === "admin";
}

export type SituacaoConta = "pendente" | "aprovada" | "recusada" | "suspensa" | "vencida" | "sem_perfil";

/** Situação efetiva da conta, já considerando a validade (ativa_ate). */
export function situacaoDaConta(perfil: Profile | null): SituacaoConta {
  if (!perfil) return "sem_perfil";
  if (perfil.status === "aprovada" && contaVencida(perfil.ativa_ate)) return "vencida";
  return perfil.status;
}
