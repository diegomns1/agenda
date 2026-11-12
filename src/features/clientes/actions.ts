"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterUsuario } from "@/lib/auth";
import { normalizarTelefone } from "@/lib/telefone";
import { valoresDoForm, type EstadoForm } from "@/components/formulario/tipos";
import { esquemaCliente } from "./schema";

const CAMPOS = ["nome", "telefone", "observacoes"];

function revalidar(id?: string) {
  revalidatePath("/clientes");
  if (id) revalidatePath(`/clientes/${id}`);
  revalidatePath("/");
}

async function sessao() {
  const usuario = await obterUsuario();
  if (!usuario) throw new Error("Sessão expirada. Entre de novo.");
  return { usuario, supabase: await criarClienteServidor() };
}

function traduzirErroBanco(mensagem: string, codigo?: string) {
  if (codigo === "23505") return "Já existe um cadastro com este WhatsApp.";
  return `Não foi possível salvar: ${mensagem}`;
}

export async function salvarCliente(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = valoresDoForm(formData, CAMPOS);
  const r = esquemaCliente.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erros: z.flattenError(r.error).fieldErrors, valores };

  const { usuario, supabase } = await sessao();
  const dados = {
    nome: r.data.nome,
    telefone: normalizarTelefone(r.data.telefone),
    observacoes: r.data.observacoes,
  };
  const id = formData.get("id");

  if (typeof id === "string" && id) {
    const { error } = await supabase.from("clientes").update(dados).eq("id", id);
    if (error) return { erro: traduzirErroBanco(error.message, error.code), valores };
    revalidar(id);
    return { ok: true, mensagem: "Cliente atualizada." };
  }

  const { data, error } = await supabase
    .from("clientes")
    .insert({ ...dados, profissional_id: usuario.id })
    .select("id")
    .single();
  if (error) return { erro: traduzirErroBanco(error.message, error.code), valores };

  revalidar(data.id);
  return { ok: true, mensagem: "Cadastro salvo.", valores: { id: data.id } };
}

/**
 * Já existe cadastro com este WhatsApp? Usado ao sair do campo, para avisar antes de salvar.
 * `ignorarId`: o próprio cadastro em edição.
 */
export async function clienteComTelefone(telefone: string, ignorarId?: string | null): Promise<{ id: string; nome: string } | null> {
  const numero = normalizarTelefone(telefone);
  if (!numero) return null;
  const { supabase } = await sessao();
  let consulta = supabase.from("clientes").select("id, nome").eq("telefone", numero).limit(1);
  if (ignorarId) consulta = consulta.neq("id", ignorarId);
  const { data } = await consulta.maybeSingle();
  return data ?? null;
}

export async function excluirCliente(id: string): Promise<EstadoForm> {
  const { supabase } = await sessao();
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) return { erro: `Não foi possível excluir: ${error.message}` };
  revalidar(id);
  redirect("/clientes?msg=excluida");
}

/**
 * "Não é cliente": o cadastro era um compromisso da própria profissional (ex.: "Academia", "Cílios" vindos do
 * Google Agenda). Os horários dela viram compromissos (tipo bloqueio, o horário continua ocupado) e o cadastro some.
 * Os cancelados ficam como estão (não voltam a ocupar o horário).
 */
export async function virarCompromisso(id: string): Promise<EstadoForm> {
  const { supabase } = await sessao();
  const { data: cliente, error: erroCliente } = await supabase.from("clientes").select("id, nome").eq("id", id).maybeSingle();
  if (erroCliente || !cliente) return { erro: "Cadastro não encontrado." };

  const { error } = await supabase
    .from("agendamentos")
    .update({
      tipo: "bloqueio",
      titulo: cliente.nome.slice(0, 60),
      cliente_id: null,
      cliente_nome: null,
      servico_id: null,
      servico_nome: null,
      valor: null,
      status: "agendado",
    })
    .eq("cliente_id", id)
    .eq("tipo", "atendimento")
    .neq("status", "cancelado");
  if (error) return { erro: `Não foi possível mudar os horários: ${error.message}` };

  const { error: erroExcluir } = await supabase.from("clientes").delete().eq("id", id);
  if (erroExcluir) return { erro: `Os horários viraram compromisso, mas o cadastro não foi apagado: ${erroExcluir.message}` };

  revalidar(id);
  revalidatePath("/agenda");
  redirect("/clientes?msg=compromisso");
}
