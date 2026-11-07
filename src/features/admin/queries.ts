import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { StatusConta } from "@/lib/constantes";
import type { Profile } from "@/types/database";

const ORDEM_STATUS: Record<StatusConta, number> = {
  pendente: 0,
  aprovada: 1,
  suspensa: 2,
  recusada: 3,
};

export async function listarContas(status?: StatusConta): Promise<Profile[]> {
  const supabase = await criarClienteServidor();
  let consulta = supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (status) consulta = consulta.eq("status", status);

  const { data, error } = await consulta;
  if (error) throw new Error(`Erro ao listar contas: ${error.message}`);

  // Sem filtro: pendentes primeiro, para o admin ver o que precisa de ação
  return status
    ? data
    : [...data].sort((a, b) => ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status]);
}

export async function contarPorStatus(): Promise<Record<StatusConta, number>> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("profiles").select("status");
  if (error) throw new Error(`Erro ao contar contas: ${error.message}`);

  const contagem: Record<StatusConta, number> = { pendente: 0, aprovada: 0, recusada: 0, suspensa: 0 };
  for (const linha of data) contagem[linha.status] += 1;
  return contagem;
}

export async function obterConta(id: string): Promise<Profile | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Erro ao buscar conta: ${error.message}`);
  return data;
}
