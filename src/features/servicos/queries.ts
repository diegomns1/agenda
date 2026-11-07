import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Servico } from "@/types/database";

/** Todos os serviços da profissional logada, na ordem definida por ela. */
export async function listarServicos(opcoes?: { somenteAtivos?: boolean }): Promise<Servico[]> {
  const supabase = await criarClienteServidor();
  let consulta = supabase
    .from("servicos")
    .select("*")
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });
  if (opcoes?.somenteAtivos) consulta = consulta.eq("ativo", true);

  const { data, error } = await consulta;
  if (error) throw new Error(`Erro ao listar serviços: ${error.message}`);
  return data;
}
