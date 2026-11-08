"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterUsuario } from "@/lib/auth";
import { valoresDoForm, type EstadoForm } from "@/components/formulario/tipos";
import { esquemaServico, SERVICOS_SUGERIDOS } from "./schema";
import { obterRamo } from "@/lib/ramos";

const CAMPOS = ["nome", "duracao_min", "valor"];

function revalidar() {
  revalidatePath("/servicos");
  revalidatePath("/");
}

async function sessao() {
  const usuario = await obterUsuario();
  if (!usuario) throw new Error("Sessão expirada. Entre de novo.");
  return { usuario, supabase: await criarClienteServidor() };
}

export async function salvarServico(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = valoresDoForm(formData, CAMPOS);
  const r = esquemaServico.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erros: z.flattenError(r.error).fieldErrors, valores };

  const { usuario, supabase } = await sessao();
  const id = formData.get("id");
  const dados = { nome: r.data.nome, duracao_min: r.data.duracao_min, valor: r.data.valor };

  if (typeof id === "string" && id) {
    const { error } = await supabase.from("servicos").update(dados).eq("id", id);
    if (error) return { erro: `Não foi possível salvar: ${error.message}`, valores };
    revalidar();
    return { ok: true, mensagem: "Serviço atualizado." };
  }

  // Novo: entra no fim da lista
  const { data: ultimo } = await supabase
    .from("servicos")
    .select("ordem")
    .eq("profissional_id", usuario.id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("servicos").insert({
    ...dados,
    profissional_id: usuario.id,
    ordem: (ultimo?.ordem ?? -1) + 1,
  });
  if (error) return { erro: `Não foi possível criar: ${error.message}`, valores };

  revalidar();
  return { ok: true, mensagem: "Serviço criado." };
}

export async function alternarAtivoServico(id: string, ativo: boolean): Promise<EstadoForm> {
  const { supabase } = await sessao();
  const { error } = await supabase.from("servicos").update({ ativo }).eq("id", id);
  if (error) return { erro: `Não foi possível alterar: ${error.message}` };
  revalidar();
  return { ok: true, mensagem: ativo ? "Serviço reativado." : "Serviço desativado." };
}

export async function excluirServico(id: string): Promise<EstadoForm> {
  const { supabase } = await sessao();
  const { error } = await supabase.from("servicos").delete().eq("id", id);
  if (error) {
    // 23503 = tem agendamentos ligados (módulo 5). Nesse caso, só desativa.
    if (error.code === "23503") {
      await supabase.from("servicos").update({ ativo: false }).eq("id", id);
      revalidar();
      return { ok: true, mensagem: "Este serviço já foi usado em atendimentos, então foi desativado em vez de apagado." };
    }
    return { erro: `Não foi possível excluir: ${error.message}` };
  }
  revalidar();
  return { ok: true, mensagem: "Serviço excluído." };
}

/** Move o serviço uma posição para cima (-1) ou para baixo (+1). */
export async function moverServico(id: string, direcao: -1 | 1): Promise<EstadoForm> {
  const { usuario, supabase } = await sessao();
  const { data: lista, error } = await supabase
    .from("servicos")
    .select("id, ordem")
    .eq("profissional_id", usuario.id)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });
  if (error || !lista) return { erro: "Não foi possível reordenar." };

  const i = lista.findIndex((s) => s.id === id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= lista.length) return { ok: true };

  // Renumera tudo em sequência, trocando i e j
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  await Promise.all(nova.map((s, idx) => supabase.from("servicos").update({ ordem: idx }).eq("id", s.id)));

  revalidar();
  return { ok: true };
}

/** Salva a ordem completa (arrastar e soltar). `ids` precisa conter exatamente os serviços da profissional. */
export async function reordenarServicos(ids: string[]): Promise<EstadoForm> {
  const { usuario, supabase } = await sessao();
  const { data: lista, error } = await supabase.from("servicos").select("id").eq("profissional_id", usuario.id);
  if (error || !lista) return { erro: "Não foi possível reordenar." };

  const meus = new Set(lista.map((s) => s.id));
  const validos = ids.length === meus.size && ids.every((id) => meus.has(id)) && new Set(ids).size === ids.length;
  if (!validos) return { erro: "A lista mudou. Recarregue a página e tente de novo." };

  const resultados = await Promise.all(ids.map((id, idx) => supabase.from("servicos").update({ ordem: idx }).eq("id", id)));
  if (resultados.some((r) => r.error)) return { erro: "Não foi possível salvar a nova ordem." };

  revalidar();
  return { ok: true };
}

/** Cria de uma vez os serviços sugeridos que ainda não existem (pelo nome). */
export async function adicionarSugeridos(): Promise<EstadoForm> {
  const { usuario, supabase } = await sessao();
  const [{ data: existentes }, { data: perfil }] = await Promise.all([
    supabase.from("servicos").select("nome, ordem").eq("profissional_id", usuario.id),
    supabase.from("profiles").select("ramo").eq("id", usuario.id).maybeSingle(),
  ]);
  const nomes = new Set((existentes ?? []).map((s) => s.nome.toLowerCase()));
  let ordem = Math.max(-1, ...(existentes ?? []).map((s) => s.ordem)) + 1;
  // sugestões do ramo da profissional; sem ramo (ou "Outros"), a lista genérica
  const sugeridos = obterRamo(perfil?.ramo)?.sugestoes ?? SERVICOS_SUGERIDOS;

  const novos = sugeridos.filter((s) => !nomes.has(s.nome.toLowerCase())).map((s) => ({
    ...s,
    profissional_id: usuario.id,
    ordem: ordem++,
  }));
  if (novos.length === 0) return { ok: true, mensagem: "As sugestões já estão na sua lista." };

  const { error } = await supabase.from("servicos").insert(novos);
  if (error) return { erro: `Não foi possível adicionar: ${error.message}` };

  revalidar();
  return { ok: true, mensagem: `${novos.length} serviços adicionados. Ajuste os valores como preferir.` };
}
