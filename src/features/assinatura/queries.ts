import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Cobranca } from "@/types/database";

export async function listarCobrancas(limite = 24): Promise<Cobranca[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("cobrancas")
    .select("*")
    .order("vencimento", { ascending: false })
    .limit(limite);
  if (error) throw new Error(`Erro ao listar cobranças: ${error.message}`);
  return data;
}
