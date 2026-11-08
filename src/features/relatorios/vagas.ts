import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";

export type Vaga = {
  id: string; // id do evento
  tipo: "cancelado" | "excluido" | "remarcado";
  clienteNome: string;
  servicoNome: string | null;
  inicio: string; // horário que ficou livre
  fim: string;
  novoInicio: string | null; // quando remarcou: para onde foi
};

/**
 * Horários que ficaram livres porque uma cliente desmarcou ou remarcou (últimos 30 dias),
 * ainda no futuro, ainda livres na agenda e que a profissional não dispensou.
 */
export async function listarVagas(limite = 6): Promise<Vaga[]> {
  const supabase = await criarClienteServidor();
  const agora = new Date();
  const desde = new Date(agora.getTime() - 30 * 24 * 3_600_000);

  const { data: eventos, error } = await supabase
    .from("agendamento_eventos")
    .select("id, tipo, cliente_nome, servico_nome, inicio_anterior, fim_anterior, inicio")
    .in("tipo", ["cancelado", "excluido", "remarcado"])
    .is("vaga_dispensada_em", null)
    .gt("inicio_anterior", agora.toISOString())
    .gte("created_at", desde.toISOString())
    .order("inicio_anterior", { ascending: true })
    .limit(30);
  if (error || !eventos?.length) return [];

  // O horário voltou a ser ocupado? (outro atendimento ou bloqueio por cima)
  const minInicio = eventos.reduce((m, e) => (e.inicio_anterior! < m ? e.inicio_anterior! : m), eventos[0].inicio_anterior!);
  const maxFim = eventos.reduce((m, e) => (e.fim_anterior! > m ? e.fim_anterior! : m), eventos[0].fim_anterior!);
  const { data: ocupados } = await supabase
    .from("agendamentos")
    .select("inicio, fim")
    .neq("status", "cancelado")
    .lt("inicio", maxFim)
    .gt("fim", minInicio);

  const vistos = new Set<string>();
  const vagas: Vaga[] = [];
  for (const e of eventos) {
    const ini = new Date(e.inicio_anterior!).getTime();
    const fim = new Date(e.fim_anterior!).getTime();
    const chave = `${ini}-${fim}`;
    if (vistos.has(chave)) continue;
    const ocupado = (ocupados ?? []).some((o) => new Date(o.inicio).getTime() < fim && new Date(o.fim).getTime() > ini);
    if (ocupado) continue;
    vistos.add(chave);
    vagas.push({
      id: e.id,
      tipo: e.tipo as Vaga["tipo"],
      clienteNome: e.cliente_nome ?? "Alguém",
      servicoNome: e.servico_nome,
      inicio: e.inicio_anterior!,
      fim: e.fim_anterior!,
      novoInicio: e.tipo === "remarcado" ? e.inicio : null,
    });
    if (vagas.length >= limite) break;
  }
  return vagas;
}
