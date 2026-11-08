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

export async function excluirCliente(id: string): Promise<EstadoForm> {
  const { supabase } = await sessao();
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) return { erro: `Não foi possível excluir: ${error.message}` };
  revalidar(id);
  redirect("/clientes?msg=excluida");
}
