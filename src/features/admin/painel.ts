import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";
import { contaVencida, dataDe, formatarDataISO, hojeISO, inicioDoDia, somarMeses } from "@/lib/datas";
import { GRUPOS, nomeDoRamo, obterRamo, OUTRO_RAMO, TRATAMENTOS, type Tratamento } from "@/lib/ramos";
import { PLANOS, type Plano } from "@/lib/planos";

/* Painel do dono (Admin). Lê com a service_role porque precisa de números de TODAS as contas
   (a RLS deixa cada profissional ver só o que é dela). Só é chamado depois de ehAdmin(). */

export type PainelDono = {
  totais: {
    contas: number;
    pendentes: number;
    ativas: number;
    emTeste: number;
    pagantes: number;
    receitaMensal: number;
    /** null = indisponível (sem service_role) */
    recebidoNoMes: number | null;
    cadastrosNoMes: number;
    cadastrosMesAnterior: number;
    atendimentosNoMes: number | null;
    pedidosLinkNoMes: number | null;
  };
  cadastrosPorMes: { chave: string; rotulo: string; valor: number }[];
  porRamo: { nome: string; valor: number; detalhe?: string }[];
  porGrupo: { nome: string; valor: number }[];
  porTratamento: { nome: string; valor: number }[];
  porPlano: { nome: string; valor: number; detalhe?: string }[];
  outrosDigitados: string[];
};

export async function montarPainelDono(): Promise<PainelDono> {
  const hoje = hojeISO();
  const mes = hoje.slice(0, 7);
  const mesAnterior = somarMeses(`${mes}-01`, -1).slice(0, 7);
  const inicioMes = inicioDoDia(`${mes}-01`).toISOString();

  // Sem a service_role (ex.: no computador de desenvolvimento), as contas vêm pela policy de admin
  // e os números de outras tabelas ficam indisponíveis (null).
  let admin: ReturnType<typeof criarClienteAdmin> | null = null;
  try {
    admin = criarClienteAdmin();
  } catch {
    admin = null;
  }
  const leitor = admin ?? (await criarClienteServidor());

  const [perfisRes, cobrRes, agRes, evRes] = await Promise.all([
    leitor.from("profiles").select("id, status, plano, ativa_ate, ramo, ramo_outro, tratamento, asaas_subscription_id, created_at"),
    admin ? admin.from("cobrancas").select("valor, status, pago_em").gte("pago_em", inicioMes) : Promise.resolve(null),
    admin ? admin.from("agendamentos").select("id", { count: "exact", head: true }).eq("tipo", "atendimento").gte("inicio", inicioMes) : Promise.resolve(null),
    admin
      ? admin.from("agendamento_eventos").select("id", { count: "exact", head: true }).eq("tipo", "marcado").eq("origem", "online").gte("created_at", inicioMes)
      : Promise.resolve(null),
  ]);
  if (perfisRes.error) throw new Error(`Erro no painel: ${perfisRes.error.message}`);
  const perfis = perfisRes.data;

  const ativas = perfis.filter((p) => p.status === "aprovada" && !contaVencida(p.ativa_ate));
  const pagantes = ativas.filter((p) => p.plano !== "teste");
  const receitaMensal = pagantes.reduce((s, p) => s + (PLANOS[p.plano as Plano]?.preco ?? 0), 0);
  const recebidoNoMes = cobrRes
    ? (cobrRes.data ?? [])
        .filter((c) => c.status === "RECEIVED" || c.status === "CONFIRMED" || c.status === "RECEIVED_IN_CASH")
        .reduce((s, c) => s + Number(c.valor), 0)
    : null;

  const mesDe = (iso: string) => dataDe(iso).slice(0, 7);

  // ramos
  const contagemRamo = new Map<string, number>();
  const contagemGrupo = new Map<string, number>();
  const outrosDigitados: string[] = [];
  for (const p of perfis) {
    const chave = p.ramo ? (p.ramo === OUTRO_RAMO ? `outro:${(p.ramo_outro ?? "").trim().toLowerCase()}` : p.ramo) : "nao_informado";
    contagemRamo.set(chave, (contagemRamo.get(chave) ?? 0) + 1);
    const grupo = obterRamo(p.ramo)?.grupo;
    const nomeGrupo = grupo ? GRUPOS[grupo] : p.ramo === OUTRO_RAMO ? "Outros" : "Não informado";
    contagemGrupo.set(nomeGrupo, (contagemGrupo.get(nomeGrupo) ?? 0) + 1);
    if (p.ramo === OUTRO_RAMO && p.ramo_outro) outrosDigitados.push(p.ramo_outro);
  }
  const porRamo = [...contagemRamo.entries()]
    .map(([chave, valor]) => {
      if (chave === "nao_informado") return { nome: "Não informado", valor, detalhe: "contas antigas" };
      if (chave.startsWith("outro:")) {
        const texto = perfis.find((p) => p.ramo === OUTRO_RAMO && (p.ramo_outro ?? "").trim().toLowerCase() === chave.slice(6))?.ramo_outro;
        return { nome: texto || "Outros", valor, detalhe: "digitado em Outros" };
      }
      return { nome: nomeDoRamo(chave), valor };
    })
    .sort((a, b) => b.valor - a.valor);

  const porTratamento = (["ela", "ele", "neutro"] as Tratamento[])
    .map((t) => ({ nome: t === "neutro" ? "Prefere não dizer" : TRATAMENTOS[t].rotulo, valor: perfis.filter((p) => p.tratamento === t).length }))
    .concat([{ nome: "Não informado", valor: perfis.filter((p) => !p.tratamento).length }])
    .filter((i) => i.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const porPlano = (Object.keys(PLANOS) as Plano[])
    .map((pl) => {
      const n = ativas.filter((p) => p.plano === pl).length;
      return { nome: PLANOS[pl].nome, valor: n, detalhe: PLANOS[pl].preco > 0 && n > 0 ? `R$ ${(n * PLANOS[pl].preco).toFixed(2).replace(".", ",")}/mês` : undefined };
    })
    .filter((i) => i.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const cadastrosPorMes = Array.from({ length: 6 }, (_, i) => {
    const m = somarMeses(`${mes}-01`, i - 5).slice(0, 7);
    return { chave: m, rotulo: formatarDataISO(`${m}-01`, "MMM").replace(".", ""), valor: perfis.filter((p) => mesDe(p.created_at) === m).length };
  });

  return {
    totais: {
      contas: perfis.length,
      pendentes: perfis.filter((p) => p.status === "pendente").length,
      ativas: ativas.length,
      emTeste: ativas.filter((p) => p.plano === "teste").length,
      pagantes: pagantes.length,
      receitaMensal,
      recebidoNoMes,
      cadastrosNoMes: perfis.filter((p) => mesDe(p.created_at) === mes).length,
      cadastrosMesAnterior: perfis.filter((p) => mesDe(p.created_at) === mesAnterior).length,
      atendimentosNoMes: agRes ? (agRes.count ?? 0) : null,
      pedidosLinkNoMes: evRes ? (evRes.count ?? 0) : null,
    },
    cadastrosPorMes,
    porRamo,
    porGrupo: [...contagemGrupo.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor),
    porTratamento,
    porPlano,
    outrosDigitados,
  };
}
