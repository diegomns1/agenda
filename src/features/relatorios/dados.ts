import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { dataDe, fimDoDia, formatarDataISO, hojeISO, inicioDoDia, intervaloDoMes, somarMeses, type DataISO } from "@/lib/datas";

/* Relatório do mês (Premium). Tudo calculado aqui, no servidor, a partir de:
   - agendamentos (atendimentos do período): faturamento, atendimentos, faltas, serviços, clientes;
   - agendamento_eventos (histórico, migração 0015): cancelamentos, remarcações, pedidos pelo link;
   - clientes: novas clientes.
   Regra do faturamento: atendimento do mês que JÁ ACONTECEU e não está como falta/cancelado
   (muita profissional não marca "concluído"; não marcar não pode zerar o relatório). */

export type Mes = string; // "AAAA-MM"

export type ItemDetalhe = {
  id: string;
  titulo: string; // nome da cliente
  subtitulo: string; // o que aconteceu
  valor?: number | null;
};

export type Indicador = {
  chave: Chave;
  valor: number;
  anterior: number;
  detalhes?: ItemDetalhe[];
};

export type Chave =
  | "faturamento"
  | "atendimentos"
  | "ticket"
  | "previsto"
  | "clientesAtendidas"
  | "novasClientes"
  | "cancelamentos"
  | "remarcacoes"
  | "faltas"
  | "pedidosLink";

export type Relatorio = {
  mes: Mes;
  rotuloMes: string; // "novembro de 2026"
  rotuloAnterior: string; // "outubro"
  mesEmAndamento: boolean;
  indicadores: Record<Chave, Indicador>;
  serieMeses: { mes: Mes; rotulo: string; faturamento: number; atendimentos: number }[];
  servicos: { nome: string; valor: number; quantidade: number }[];
  topClientes: { nome: string; valor: number; quantidade: number }[];
};

const STATUS_REALIZADO = new Set(["agendado", "concluido"]);

export function mesAtual(): Mes {
  return hojeISO().slice(0, 7);
}

export function ehMes(v: unknown): v is Mes {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

export function somarMes(mes: Mes, n: number): Mes {
  return somarMeses(`${mes}-01`, n).slice(0, 7);
}

function limitesDoMes(mes: Mes) {
  const { primeiro, ultimo } = intervaloDoMes(`${mes}-01`);
  return { primeiro, ultimo, inicio: inicioDoDia(primeiro), fim: fimDoDia(ultimo) };
}

function rotulo(mes: Mes, formato: string) {
  return formatarDataISO(`${mes}-01` as DataISO, formato);
}

function quando(iso: string | null) {
  return iso ? formatarDataISO(dataDe(iso), "EEE dd/MM") + " às " + new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "";
}

/** `cliente`: opcional; sem ele usa a sessão do navegador (a assistente no WhatsApp passa o cliente escopado). */
export async function montarRelatorio(mes: Mes, cliente?: SupabaseClient<Database>): Promise<Relatorio> {
  const supabase = cliente ?? (await criarClienteServidor());
  const anterior = somarMes(mes, -1);
  const primeiroDaSerie = somarMes(mes, -5);
  const atual = limitesDoMes(mes);
  const serie = limitesDoMes(primeiroDaSerie);
  const ant = limitesDoMes(anterior);

  const [agRes, evRes, clRes] = await Promise.all([
    supabase
      .from("agendamentos")
      .select("id, cliente_id, cliente_nome, servico_nome, valor, inicio, fim, status, origem")
      .eq("tipo", "atendimento")
      .gte("inicio", serie.inicio.toISOString())
      .lt("inicio", atual.fim.toISOString())
      .order("inicio", { ascending: true }),
    supabase
      .from("agendamento_eventos")
      .select("id, tipo, origem, cliente_nome, servico_nome, valor, inicio_anterior, inicio, created_at")
      .in("tipo", ["cancelado", "excluido", "remarcado", "marcado"])
      .gte("created_at", ant.inicio.toISOString())
      .lt("created_at", atual.fim.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("clientes")
      .select("id, nome, created_at")
      .gte("created_at", ant.inicio.toISOString())
      .lt("created_at", atual.fim.toISOString())
      .order("created_at", { ascending: false }),
  ]);
  if (agRes.error) throw new Error(`Erro ao montar relatório: ${agRes.error.message}`);
  if (evRes.error) throw new Error(`Erro ao montar relatório: ${evRes.error.message}`);
  if (clRes.error) throw new Error(`Erro ao montar relatório: ${clRes.error.message}`);

  const agora = Date.now();
  const atendimentos = agRes.data;
  const eventos = evRes.data;
  const clientes = clRes.data;

  const doMes = (m: Mes) => atendimentos.filter((a) => dataDe(a.inicio).slice(0, 7) === m);
  const realizados = (m: Mes) => doMes(m).filter((a) => STATUS_REALIZADO.has(a.status) && new Date(a.fim).getTime() <= agora);
  const previstos = (m: Mes) => doMes(m).filter((a) => a.status === "agendado" && new Date(a.fim).getTime() > agora);
  const soma = (l: { valor: number | null }[]) => l.reduce((s, a) => s + Number(a.valor ?? 0), 0);
  const eventosDo = (m: Mes, tipos: string[]) => eventos.filter((e) => tipos.includes(e.tipo) && dataDe(e.created_at).slice(0, 7) === m);
  const distintas = (l: { cliente_id: string | null; cliente_nome: string | null }[]) => new Set(l.map((a) => a.cliente_id ?? a.cliente_nome)).size;

  const rAtual = realizados(mes);
  const rAnt = realizados(anterior);
  const fatAtual = soma(rAtual);
  const fatAnt = soma(rAnt);

  const indicadores: Record<Chave, Indicador> = {
    faturamento: { chave: "faturamento", valor: fatAtual, anterior: fatAnt },
    atendimentos: {
      chave: "atendimentos",
      valor: rAtual.length,
      anterior: rAnt.length,
      detalhes: [...rAtual].reverse().map((a) => ({ id: a.id, titulo: a.cliente_nome ?? "Cliente", subtitulo: `${a.servico_nome ?? "Atendimento"} · ${quando(a.inicio)}`, valor: a.valor })),
    },
    ticket: {
      chave: "ticket",
      valor: rAtual.length ? fatAtual / rAtual.length : 0,
      anterior: rAnt.length ? fatAnt / rAnt.length : 0,
    },
    previsto: {
      chave: "previsto",
      valor: soma(previstos(mes)),
      anterior: 0,
      detalhes: previstos(mes).map((a) => ({ id: a.id, titulo: a.cliente_nome ?? "Cliente", subtitulo: `${a.servico_nome ?? "Atendimento"} · ${quando(a.inicio)}`, valor: a.valor })),
    },
    clientesAtendidas: { chave: "clientesAtendidas", valor: distintas(rAtual), anterior: distintas(rAnt) },
    novasClientes: {
      chave: "novasClientes",
      valor: clientes.filter((c) => dataDe(c.created_at).slice(0, 7) === mes).length,
      anterior: clientes.filter((c) => dataDe(c.created_at).slice(0, 7) === anterior).length,
      detalhes: clientes
        .filter((c) => dataDe(c.created_at).slice(0, 7) === mes)
        .map((c) => ({ id: c.id, titulo: c.nome, subtitulo: `Cadastro em ${formatarDataISO(dataDe(c.created_at))}` })),
    },
    cancelamentos: {
      chave: "cancelamentos",
      valor: eventosDo(mes, ["cancelado", "excluido"]).length,
      anterior: eventosDo(anterior, ["cancelado", "excluido"]).length,
      detalhes: eventosDo(mes, ["cancelado", "excluido"]).map((e) => ({
        id: e.id,
        titulo: e.cliente_nome ?? "Cliente",
        subtitulo: `Desmarcou ${e.servico_nome ?? "o atendimento"} de ${quando(e.inicio_anterior)} · avisou em ${formatarDataISO(dataDe(e.created_at))}`,
        valor: e.valor,
      })),
    },
    remarcacoes: {
      chave: "remarcacoes",
      valor: eventosDo(mes, ["remarcado"]).length,
      anterior: eventosDo(anterior, ["remarcado"]).length,
      detalhes: eventosDo(mes, ["remarcado"]).map((e) => ({
        id: e.id,
        titulo: e.cliente_nome ?? "Cliente",
        subtitulo: `De ${quando(e.inicio_anterior)} para ${quando(e.inicio)}`,
      })),
    },
    faltas: {
      chave: "faltas",
      valor: doMes(mes).filter((a) => a.status === "faltou").length,
      anterior: doMes(anterior).filter((a) => a.status === "faltou").length,
      detalhes: doMes(mes)
        .filter((a) => a.status === "faltou")
        .map((a) => ({ id: a.id, titulo: a.cliente_nome ?? "Cliente", subtitulo: `Não veio: ${a.servico_nome ?? "atendimento"} · ${quando(a.inicio)}`, valor: a.valor })),
    },
    pedidosLink: {
      chave: "pedidosLink",
      valor: eventosDo(mes, ["marcado"]).filter((e) => e.origem === "online").length,
      anterior: eventosDo(anterior, ["marcado"]).filter((e) => e.origem === "online").length,
      detalhes: eventosDo(mes, ["marcado"])
        .filter((e) => e.origem === "online")
        .map((e) => ({ id: e.id, titulo: e.cliente_nome ?? "Cliente", subtitulo: `Pediu ${e.servico_nome ?? "um horário"} para ${quando(e.inicio)}` })),
    },
  };

  const serieMeses = Array.from({ length: 6 }, (_, i) => {
    const m = somarMes(primeiroDaSerie, i);
    const r = realizados(m);
    return { mes: m, rotulo: rotulo(m, "MMM").replace(".", ""), faturamento: soma(r), atendimentos: r.length };
  });

  const agrupar = (chave: (a: (typeof rAtual)[number]) => string) => {
    const mapa = new Map<string, { nome: string; valor: number; quantidade: number }>();
    for (const a of rAtual) {
      const k = chave(a);
      const atualItem = mapa.get(k) ?? { nome: k, valor: 0, quantidade: 0 };
      atualItem.valor += Number(a.valor ?? 0);
      atualItem.quantidade += 1;
      mapa.set(k, atualItem);
    }
    return [...mapa.values()].sort((x, y) => y.valor - x.valor || y.quantidade - x.quantidade);
  };

  return {
    mes,
    rotuloMes: rotulo(mes, "MMMM 'de' yyyy"),
    rotuloAnterior: rotulo(anterior, "MMMM"),
    mesEmAndamento: mes === mesAtual(),
    indicadores,
    serieMeses,
    servicos: agrupar((a) => a.servico_nome ?? "Outros"),
    topClientes: agrupar((a) => a.cliente_nome ?? "Cliente").slice(0, 5),
  };
}

/** Resumo curto para a tela Hoje. */
export async function resumoDoMes(): Promise<{ faturamento: number; atendimentos: number; previsto: number }> {
  const r = await montarRelatorio(mesAtual());
  return { faturamento: r.indicadores.faturamento.valor, atendimentos: r.indicadores.atendimentos.valor, previsto: r.indicadores.previsto.valor };
}
