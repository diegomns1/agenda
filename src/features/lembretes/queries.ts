import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Agendamento } from "@/types/database";

export const JANELA_PENDENTES_HORAS = 48;

export type LembreteItem = Agendamento & { telefone: string | null };

/**
 * Atendimentos agendados nas próximas 48 h, com o telefone da cliente.
 * "Pendente" = ainda sem cliente_avisada_em.
 */
export async function listarLembretes(): Promise<{ pendentes: LembreteItem[]; avisados: LembreteItem[] }> {
  const supabase = await criarClienteServidor();
  const agora = new Date();
  const limite = new Date(agora.getTime() + JANELA_PENDENTES_HORAS * 3_600_000);

  const { data, error } = await supabase
    .from("agendamentos")
    .select("*")
    .eq("tipo", "atendimento")
    .eq("status", "agendado")
    .gte("inicio", agora.toISOString())
    .lte("inicio", limite.toISOString())
    .order("inicio", { ascending: true });
  if (error) throw new Error(`Erro ao listar lembretes: ${error.message}`);

  const ids = [...new Set(data.map((a) => a.cliente_id).filter(Boolean))] as string[];
  const telefones = new Map<string, string | null>();
  if (ids.length) {
    const { data: clientes } = await supabase.from("clientes").select("id, telefone").in("id", ids);
    for (const c of clientes ?? []) telefones.set(c.id, c.telefone);
  }

  const itens: LembreteItem[] = data.map((a) => ({ ...a, telefone: a.cliente_id ? (telefones.get(a.cliente_id) ?? null) : null }));
  return {
    pendentes: itens.filter((a) => !a.cliente_avisada_em),
    avisados: itens.filter((a) => a.cliente_avisada_em),
  };
}

export async function contarLembretesPendentes(): Promise<number> {
  const supabase = await criarClienteServidor();
  const agora = new Date();
  const limite = new Date(agora.getTime() + JANELA_PENDENTES_HORAS * 3_600_000);
  const { count, error } = await supabase
    .from("agendamentos")
    .select("id", { count: "exact", head: true })
    .eq("tipo", "atendimento")
    .eq("status", "agendado")
    .is("cliente_avisada_em", null)
    .gte("inicio", agora.toISOString())
    .lte("inicio", limite.toISOString());
  if (error) return 0;
  return count ?? 0;
}

export async function contarInscricoesPush(): Promise<number> {
  const supabase = await criarClienteServidor();
  const { count } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true });
  return count ?? 0;
}
