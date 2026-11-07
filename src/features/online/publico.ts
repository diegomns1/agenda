import "server-only";
import { createClient } from "@supabase/supabase-js";
import { obterEnvSupabase } from "@/lib/supabase/env";
import type { Database, Expediente } from "@/types/database";

/** Cliente anônimo (sem sessão) para as funções públicas do agendamento online. */
export function criarClientePublico() {
  const { url, chave } = obterEnvSupabase();
  return createClient<Database>(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type ServicoPublico = { id: string; nome: string; duracao_min: number; valor: number };

export type PerfilPublico = {
  id: string;
  slug: string;
  nome: string;
  nome_negocio: string | null;
  instagram: string | null;
  telefone: string | null;
  logo_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  expediente: Expediente;
  intervalo_grade_min: number;
  confirmacao_online: "automatica" | "manual";
  antecedencia_min_horas: number;
  servicos: ServicoPublico[];
};

/** Perfil público pela URL. null = não existe, não está aprovada ou não atende online. */
export async function obterPerfilPublico(slug: string): Promise<PerfilPublico | null> {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  const supabase = criarClientePublico();
  const { data, error } = await supabase.rpc("perfil_publico", { p_slug: slug });
  if (error || !data) return null;
  return data as unknown as PerfilPublico;
}

/** Períodos ocupados (sem dados de clientes) entre dois instantes. */
export async function listarOcupacoesPublicas(slug: string, inicio: Date, fim: Date) {
  const supabase = criarClientePublico();
  const { data } = await supabase.rpc("horarios_ocupados", {
    p_slug: slug,
    p_inicio: inicio.toISOString(),
    p_fim: fim.toISOString(),
  });
  return (data ?? []) as { inicio: string; fim: string }[];
}
