import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import { fimDoDia, inicioDoDia, type DataISO } from "@/lib/datas";
import type { Agendamento } from "@/types/database";

/** Agendamentos que tocam o intervalo [inicio, fim) — inclui cancelados (a UI decide mostrar). */
export async function listarAgendamentosEntre(inicio: Date, fim: Date): Promise<Agendamento[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("agendamentos")
    .select("*")
    .lt("inicio", fim.toISOString())
    .gt("fim", inicio.toISOString())
    .order("inicio", { ascending: true });
  if (error) throw new Error(`Erro ao listar agenda: ${error.message}`);
  return data;
}

/** Agendamentos de um dia civil (SP), do primeiro ao último dia informado (inclusive). */
export async function listarAgendamentosDias(primeiroDia: DataISO, ultimoDia: DataISO = primeiroDia) {
  return listarAgendamentosEntre(inicioDoDia(primeiroDia), fimDoDia(ultimoDia));
}

export async function obterAgendamento(id: string): Promise<Agendamento | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("agendamentos").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Erro ao buscar agendamento: ${error.message}`);
  return data;
}

/** Histórico de uma cliente, do mais recente para o mais antigo. */
export async function listarHistoricoDaCliente(clienteId: string, limite = 50): Promise<Agendamento[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("agendamentos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("tipo", "atendimento")
    .order("inicio", { ascending: false })
    .limit(limite);
  if (error) throw new Error(`Erro ao listar histórico: ${error.message}`);
  return data;
}

/** Pedidos feitos pelo link que ainda aguardam confirmação (futuros). */
export async function listarSolicitacoesPendentes(): Promise<Agendamento[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("agendamentos")
    .select("*")
    .eq("tipo", "atendimento")
    .eq("status", "pendente")
    .gte("fim", new Date().toISOString())
    .order("inicio", { ascending: true })
    .limit(20);
  if (error) throw new Error(`Erro ao listar solicitações: ${error.message}`);
  return data;
}

/** Próximos atendimentos a partir de agora (para a tela Hoje). */
export async function listarProximosAtendimentos(limite = 5): Promise<Agendamento[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("agendamentos")
    .select("*")
    .eq("tipo", "atendimento")
    .eq("status", "agendado")
    .gte("fim", new Date().toISOString())
    .order("inicio", { ascending: true })
    .limit(limite);
  if (error) throw new Error(`Erro ao listar próximos: ${error.message}`);
  return data;
}
