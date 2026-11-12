"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterPerfil, obterUsuario } from "@/lib/auth";
import { normalizarTelefone } from "@/lib/telefone";
import {
  diaDaSemana,
  fimDoDia,
  hojeISO,
  inicioDoDia,
  instanteEmSP,
  minutosDoDia,
  somarDias,
  type DataISO,
} from "@/lib/datas";
import { valoresDoForm, type EstadoForm } from "@/components/formulario/tipos";
import type { StatusAgendamento } from "@/types/database";
import { horariosDisponiveis } from "./disponibilidade";
import { esquemaAtendimento, esquemaBloqueio } from "./schema";

const CAMPOS = [
  "tipo", "cliente_id", "nova_cliente_nome", "nova_cliente_telefone", "servico_id",
  "dia", "hora", "duracao_min", "observacoes", "titulo", "hora_inicio", "hora_fim", "dias",
];

function revalidar(clienteId?: string | null) {
  revalidatePath("/agenda");
  revalidatePath("/");
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
}

async function sessao() {
  const usuario = await obterUsuario();
  if (!usuario) throw new Error("Sessão expirada. Entre de novo.");
  return { usuario, supabase: await criarClienteServidor() };
}

function traduzirErro(codigo: string | undefined, mensagem: string) {
  if (codigo === "23P01") return "Esse horário já está ocupado. Escolha outro.";
  if (codigo === "23514") return "Dados inválidos para o agendamento.";
  return `Não foi possível salvar: ${mensagem}`;
}

export async function salvarAgendamento(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = valoresDoForm(formData, CAMPOS);
  const bruto = Object.fromEntries(formData);
  const { usuario, supabase } = await sessao();
  const id = typeof bruto.id === "string" && bruto.id ? bruto.id : null;

  // ------------------------------------------------------------- bloqueio
  if (bruto.tipo === "bloqueio") {
    const r = esquemaBloqueio.safeParse(bruto);
    if (!r.success) return { erros: z.flattenError(r.error).fieldErrors, valores };
    const d = r.data;

    const inicio = d.dia_inteiro ? inicioDoDia(d.dia) : instanteEmSP(d.dia, d.hora_inicio!);
    const fim = d.dia_inteiro ? fimDoDia(somarDias(d.dia, d.dias - 1)) : instanteEmSP(d.dia, d.hora_fim!);

    const dados = {
      tipo: "bloqueio" as const,
      titulo: d.titulo,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      observacoes: d.observacoes,
    };

    const { data: salvo, error } = id
      ? await supabase.from("agendamentos").update(dados).eq("id", id).select("id").single()
      : await supabase.from("agendamentos").insert({ ...dados, profissional_id: usuario.id }).select("id").single();
    if (error) return { erro: traduzirErro(error.code, error.message), valores };

    revalidar();
    // id volta para a tela destacar o bloqueio na agenda
    return { ok: true, mensagem: id ? "Compromisso atualizado." : "Compromisso salvo. O horário fica ocupado.", valores: { id: salvo.id } };
  }

  // ---------------------------------------------------------- atendimento
  // servico_id pode nem vir no form (sem serviços cadastrados): garante mensagem em português
  const r = esquemaAtendimento.safeParse({ ...bruto, tipo: "atendimento", servico_id: bruto.servico_id ?? "" });
  if (!r.success) return { erros: z.flattenError(r.error).fieldErrors, valores };
  const d = r.data;

  // Serviço (nome e valor viram cópia no agendamento)
  const { data: servico } = await supabase
    .from("servicos")
    .select("id, nome, valor")
    .eq("id", d.servico_id)
    .maybeSingle();
  if (!servico) return { erro: "Serviço não encontrado.", valores };

  // Cliente existente ou cadastro rápido
  let clienteId = d.cliente_id;
  let clienteNome: string | null = null;
  if (!clienteId && d.nova_cliente_nome) {
    const { data: nova, error: erroCliente } = await supabase
      .from("clientes")
      .insert({
        profissional_id: usuario.id,
        nome: d.nova_cliente_nome,
        telefone: normalizarTelefone(d.nova_cliente_telefone),
      })
      .select("id, nome")
      .single();
    if (erroCliente) {
      return {
        erro: erroCliente.code === "23505" ? "Já existe um cadastro com este WhatsApp. Escolha na lista." : `Não foi possível fazer o cadastro: ${erroCliente.message}`,
        valores,
      };
    }
    clienteId = nova.id;
    clienteNome = nova.nome;
  } else if (clienteId) {
    const { data: cliente } = await supabase.from("clientes").select("nome").eq("id", clienteId).maybeSingle();
    if (!cliente) return { erro: "Cadastro não encontrado.", valores };
    clienteNome = cliente.nome;
  }

  const inicio = instanteEmSP(d.dia, d.hora);
  const fim = new Date(inicio.getTime() + d.duracao_min * 60_000);

  const dados = {
    tipo: "atendimento" as const,
    cliente_id: clienteId,
    cliente_nome: clienteNome,
    servico_id: servico.id,
    servico_nome: servico.nome,
    valor: servico.valor,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    observacoes: d.observacoes,
  };

  const { data: salvo, error } = id
    ? await supabase.from("agendamentos").update(dados).eq("id", id).select("id").single()
    : await supabase.from("agendamentos").insert({ ...dados, profissional_id: usuario.id }).select("id").single();
  if (error) return { erro: traduzirErro(error.code, error.message), valores };

  revalidar(clienteId);
  // id volta para a tela destacar o atendimento na agenda
  return { ok: true, mensagem: id ? "Atendimento remarcado." : "Atendimento marcado.", valores: { id: salvo.id } };
}

export async function alterarStatusAgendamento(id: string, status: StatusAgendamento): Promise<EstadoForm> {
  const { supabase } = await sessao();
  const { data, error } = await supabase
    .from("agendamentos")
    .update({ status })
    .eq("id", id)
    .select("cliente_id")
    .maybeSingle();
  if (error) return { erro: traduzirErro(error.code, error.message) };

  revalidar(data?.cliente_id);
  const mensagens: Record<StatusAgendamento, string> = {
    pendente: "Marcado como aguardando confirmação.",
    agendado: "Atendimento confirmado.",
    concluido: "Atendimento concluído.",
    faltou: "Marcado como falta.",
    cancelado: "Atendimento cancelado. O horário ficou livre.",
  };
  return { ok: true, mensagem: mensagens[status] };
}

export async function excluirAgendamento(id: string): Promise<EstadoForm> {
  const { supabase } = await sessao();
  const { error } = await supabase.from("agendamentos").delete().eq("id", id);
  if (error) return { erro: `Não foi possível excluir: ${error.message}` };
  revalidar();
  return { ok: true, mensagem: "Removido da agenda." };
}

/**
 * Horários de início livres para um dia e duração.
 * Usado pelo formulário enquanto a profissional escolhe data/serviço.
 */
export async function consultarHorarios(
  dia: DataISO,
  duracaoMin: number,
  ignorarId?: string | null,
): Promise<{ horarios: string[]; atende: boolean }> {
  const perfil = await obterPerfil();
  if (!perfil) return { horarios: [], atende: false };

  const supabase = await criarClienteServidor();
  const { data: ocupacoes } = await supabase
    .from("agendamentos")
    .select("id, inicio, fim")
    .neq("status", "cancelado")
    .lt("inicio", fimDoDia(dia).toISOString())
    .gt("fim", inicioDoDia(dia).toISOString());

  const ehHoje = dia === hojeISO();
  const horarios = horariosDisponiveis({
    dia,
    expediente: perfil.expediente,
    intervaloMin: perfil.intervalo_grade_min,
    duracaoMin,
    ocupacoes: ocupacoes ?? [],
    ignorarId: ignorarId ?? undefined,
    aPartirDeMin: ehHoje ? minutosDoDia(new Date()) : undefined,
  });

  const cfg = perfil.expediente[String(diaDaSemana(dia)) as keyof typeof perfil.expediente];
  return { horarios, atende: Boolean(cfg?.ativo) };
}
