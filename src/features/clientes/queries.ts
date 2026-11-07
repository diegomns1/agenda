import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Cliente } from "@/types/database";

/** Lista as clientes da profissional, com busca opcional por nome ou telefone. */
export async function listarClientes(busca?: string): Promise<Cliente[]> {
  const supabase = await criarClienteServidor();
  let consulta = supabase.from("clientes").select("*").order("nome", { ascending: true });

  const termo = busca?.trim();
  if (termo) {
    const digitos = termo.replace(/\D/g, "");
    const seguro = termo.replace(/[%_,]/g, " ");
    consulta =
      digitos.length >= 3
        ? consulta.or(`nome.ilike.%${seguro}%,telefone.ilike.%${digitos}%`)
        : consulta.ilike("nome", `%${seguro}%`);
  }

  const { data, error } = await consulta;
  if (error) throw new Error(`Erro ao listar clientes: ${error.message}`);
  return data;
}

export async function obterCliente(id: string): Promise<Cliente | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("clientes").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Erro ao buscar cliente: ${error.message}`);
  return data;
}

export async function contarClientes(): Promise<number> {
  const supabase = await criarClienteServidor();
  const { count, error } = await supabase.from("clientes").select("id", { count: "exact", head: true });
  if (error) throw new Error(`Erro ao contar clientes: ${error.message}`);
  return count ?? 0;
}

/**
 * Histórico de atendimentos da cliente.
 * Passa a devolver dados no módulo 5 (tabela agendamentos). Por enquanto, lista vazia.
 */
export async function listarHistoricoCliente(clienteId: string): Promise<[]> {
  void clienteId; // usado no módulo 5
  return [];
}
