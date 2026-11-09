import "server-only";
import { horariosDisponiveis, janelaDoDia } from "@/features/agenda/disponibilidade";
import { montarRelatorio, mesAtual, somarMes } from "@/features/relatorios/dados";
import { diasEntre, fimDoDia, formatarData, formatarDataISO, hojeISO, inicioDoDia, minutosDoDia, horaParaMinutos, somarDias, type DataISO } from "@/lib/datas";
import { termosDoRamo } from "@/lib/ramos";
import type { Contexto } from "./ferramentas";
import { interpretar, type Comando } from "./interpretar";

/*
 * Respostas dos comandos prontos (sem IA). Leem a agenda com a sessão da profissional (RLS).
 * Os textos são curtos e "falados": servem para a tela e para a leitura em voz alta.
 */

const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function nomeDoDia(dia: DataISO) {
  const hoje = hojeISO();
  if (dia === hoje) return "hoje";
  if (dia === somarDias(hoje, 1)) return "amanhã";
  return formatarDataISO(dia, "EEEE, dd/MM");
}

const primeiraMaiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** ["09:00","09:30","10:00","14:00"] com passo 30 → "09:00 a 10:00, 14:00" */
function faixas(horarios: string[], passo: number) {
  const partes: string[] = [];
  let ini = 0;
  for (let i = 1; i <= horarios.length; i++) {
    const quebra = i === horarios.length || horaParaMinutos(horarios[i]) - horaParaMinutos(horarios[i - 1]) !== passo;
    if (quebra) {
      partes.push(i - 1 === ini ? horarios[ini] : `${horarios[ini]} a ${horarios[i - 1]}`);
      ini = i;
    }
  }
  return partes.join(", ");
}

async function agenda(ctx: Contexto, c: Extract<Comando, { tipo: "agenda" }>) {
  const termos = termosDoRamo(ctx.perfil.ramo);
  const { data } = await ctx.supabase
    .from("agendamentos")
    .select("tipo, cliente_nome, servico_nome, titulo, inicio, fim, status")
    .lt("inicio", fimDoDia(c.fim).toISOString())
    .gt("fim", inicioDoDia(c.inicio).toISOString())
    .neq("status", "cancelado")
    .order("inicio")
    .limit(80);
  const itens = data ?? [];
  const dias = diasEntre(c.inicio, c.fim);
  const umDia = dias.length === 1;

  if (umDia && janelaDoDia(c.inicio, ctx.perfil.expediente) === null && itens.length === 0) {
    return `${primeiraMaiuscula(nomeDoDia(c.inicio))} você não atende, e não tem nada marcado.`;
  }
  const atendimentos = itens.filter((a) => a.tipo === "atendimento");
  if (itens.length === 0) return `Nada marcado ${umDia ? nomeDoDia(c.inicio) : c.rotulo}.`;

  const linha = (a: (typeof itens)[number]) =>
    a.tipo === "bloqueio"
      ? `${formatarData(a.inicio, "HH:mm")}–${formatarData(a.fim, "HH:mm")} bloqueado${a.titulo ? ` (${a.titulo})` : ""}`
      : `${formatarData(a.inicio, "HH:mm")} ${a.cliente_nome ?? "Cliente"}${a.servico_nome ? ` · ${a.servico_nome}` : ""}${a.status === "pendente" ? " (pedido pelo link, falta confirmar)" : ""}`;

  const n = atendimentos.length;
  const contagem = n === 1 ? `1 ${termos.um}` : `${n} ${termos.varios}`;
  if (n === 0) return `Nada marcado ${umDia ? nomeDoDia(c.inicio) : c.rotulo}, só bloqueios:\n${itens.map(linha).join("\n")}`;
  if (umDia) return `${primeiraMaiuscula(nomeDoDia(c.inicio))} você tem ${contagem}:\n${itens.map(linha).join("\n")}`;

  const porDia = dias
    .map((d) => {
      const doDia = itens.filter((a) => formatarData(a.inicio, "yyyy-MM-dd") === d);
      return doDia.length ? `${primeiraMaiuscula(nomeDoDia(d))}:\n${doDia.map(linha).join("\n")}` : null;
    })
    .filter(Boolean);
  return `${primeiraMaiuscula(c.rotulo)} você tem ${contagem}.\n\n${porDia.join("\n\n")}`;
}

async function livres(ctx: Contexto, c: Extract<Comando, { tipo: "livres" }>) {
  const nome = nomeDoDia(c.dia);
  if (c.dia < hojeISO()) return `Esse dia já passou.`;
  if (janelaDoDia(c.dia, ctx.perfil.expediente) === null) return `${primeiraMaiuscula(nome)} você não atende.`;
  // duração de referência: o serviço mais curto (assim aparece todo encaixe possível)
  const { data: servicos } = await ctx.supabase.from("servicos").select("duracao_min").eq("ativo", true).order("duracao_min").limit(1);
  const duracao = servicos?.[0]?.duracao_min ?? ctx.perfil.intervalo_grade_min ?? 30;
  const { data } = await ctx.supabase
    .from("agendamentos")
    .select("id, inicio, fim")
    .neq("status", "cancelado")
    .lt("inicio", fimDoDia(c.dia).toISOString())
    .gt("fim", inicioDoDia(c.dia).toISOString());
  const horarios = horariosDisponiveis({
    dia: c.dia,
    expediente: ctx.perfil.expediente,
    intervaloMin: ctx.perfil.intervalo_grade_min,
    duracaoMin: duracao,
    ocupacoes: data ?? [],
    aPartirDeMin: c.dia === hojeISO() ? minutosDoDia(new Date()) : undefined,
  });
  if (horarios.length === 0) return `${primeiraMaiuscula(nome)} não tem horário livre.`;
  return `Horários livres ${nome} (para ${duracao} min): ${faixas(horarios, Math.max(5, ctx.perfil.intervalo_grade_min))}.`;
}

async function proximo(ctx: Contexto) {
  const { data } = await ctx.supabase
    .from("agendamentos")
    .select("cliente_nome, servico_nome, inicio, status")
    .eq("tipo", "atendimento")
    .in("status", ["agendado", "pendente"])
    .gte("fim", new Date().toISOString())
    .order("inicio")
    .limit(1);
  const a = data?.[0];
  if (!a) return `Nada marcado daqui para frente.`;
  const agora = new Date(a.inicio).getTime() <= Date.now();
  const dia = formatarData(a.inicio, "yyyy-MM-dd");
  return `${agora ? "Agora" : `Próximo: ${nomeDoDia(dia)} às ${formatarData(a.inicio, "HH:mm")}`}, ${a.cliente_nome ?? "cliente"}${a.servico_nome ? `, ${a.servico_nome}` : ""}${a.status === "pendente" ? " (falta confirmar o pedido)" : ""}.`;
}

async function faturamento(ctx: Contexto, c: Extract<Comando, { tipo: "faturamento" }>) {
  const mes = c.mesesAtras === 1 ? somarMes(mesAtual(), -1) : mesAtual();
  const r = await montarRelatorio(mes, ctx.supabase);
  const i = r.indicadores;
  const termos = termosDoRamo(ctx.perfil.ramo);
  const base = `Em ${r.rotuloMes} entraram ${reais(i.faturamento.valor)} em ${i.atendimentos.valor} ${i.atendimentos.valor === 1 ? termos.um : termos.varios}.`;
  const previsto = c.mesesAtras === 0 && i.previsto.valor > 0 ? ` Ainda devem entrar ${reais(i.previsto.valor)} do que está marcado.` : "";
  return base + previsto;
}

/** Tenta responder sem IA. null = não é comando pronto. */
export async function responderSemIA(ctx: Contexto, texto: string): Promise<string | null> {
  const c = interpretar(texto, hojeISO());
  if (!c) return null;
  switch (c.tipo) {
    case "agenda":
      return agenda(ctx, c);
    case "livres":
      return livres(ctx, c);
    case "proximo":
      return proximo(ctx);
    case "faturamento":
      return faturamento(ctx, c);
    case "confirmar":
    case "recusar":
      // a tela resolve quando há uma proposta esperando; aqui não há nada pendente
      return "Não tem nenhuma mudança esperando confirmação. O que você precisa?";
  }
}
