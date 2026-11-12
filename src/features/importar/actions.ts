"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterUsuario } from "@/lib/auth";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/* Importa compromissos já lidos no navegador (features/importar/ical.ts).
   O banco impede horários sobrepostos (EXCLUDE): o que bater com algo já marcado fica de fora e volta na lista. */

const MAX_ITENS = 3000;
const LOTE = 100;

const esquemaItem = z.object({
  tipo: z.enum(["atendimento", "bloqueio"]),
  nome: z.string().trim().min(1).max(80),
  observacao: z.string().trim().max(500).nullable(),
  inicio: z.iso.datetime(),
  fim: z.iso.datetime(),
});
const esquemaPedido = z.object({
  itens: z.array(esquemaItem).min(1).max(MAX_ITENS),
  criarClientes: z.boolean(),
});

export type ItemImportacao = z.infer<typeof esquemaItem>;

export type ResultadoImportacao =
  | { ok: true; importados: number; clientesNovas: number; recusados: { nome: string; inicio: string }[] }
  | { ok: false; erro: string };

/** "Ana  Clára" → "ana clara" (para achar o cadastro mesmo com acento/maiúscula diferente). */
function chaveNome(nome: string) {
  return nome.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export async function importarCompromissos(pedido: { itens: ItemImportacao[]; criarClientes: boolean }): Promise<ResultadoImportacao> {
  const usuario = await obterUsuario();
  if (!usuario) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const p = esquemaPedido.safeParse(pedido);
  if (!p.success) return { ok: false, erro: "Lista de compromissos inválida. Leia o arquivo de novo." };
  const { itens, criarClientes } = p.data;
  const supabase = await criarClienteServidor();

  // ---- clientes: liga ao cadastro pelo nome; cria as que faltam (se pedido)
  const { data: existentes, error: erroClientes } = await supabase.from("clientes").select("id, nome");
  if (erroClientes) return { ok: false, erro: `Não foi possível ler as clientes: ${erroClientes.message}` };
  const porNome = new Map<string, { id: string; nome: string }>();
  for (const c of existentes ?? []) if (!porNome.has(chaveNome(c.nome))) porNome.set(chaveNome(c.nome), c);

  let clientesNovas = 0;
  if (criarClientes) {
    const faltando = new Map<string, string>();
    for (const i of itens) {
      if (i.tipo !== "atendimento") continue;
      const k = chaveNome(i.nome);
      if (!porNome.has(k) && !faltando.has(k)) faltando.set(k, i.nome);
    }
    const novas = [...faltando.values()];
    for (let o = 0; o < novas.length; o += LOTE) {
      const { data, error } = await supabase
        .from("clientes")
        .insert(novas.slice(o, o + LOTE).map((nome) => ({ profissional_id: usuario.id, nome })))
        .select("id, nome");
      if (error) return { ok: false, erro: `Não foi possível cadastrar as clientes: ${error.message}` };
      for (const c of data ?? []) porNome.set(chaveNome(c.nome), c);
      clientesNovas += data?.length ?? 0;
    }
  }

  // ---- compromissos: o que já passou entra como concluído (vai para o histórico e os relatórios)
  const agora = Date.now();
  const linhas = itens.map((i) => {
    const cliente = i.tipo === "atendimento" ? porNome.get(chaveNome(i.nome)) : undefined;
    return {
      profissional_id: usuario.id,
      tipo: i.tipo,
      cliente_id: cliente?.id ?? null,
      cliente_nome: i.tipo === "atendimento" ? (cliente?.nome ?? i.nome) : null,
      titulo: i.tipo === "bloqueio" ? i.nome : null,
      inicio: i.inicio,
      fim: i.fim,
      status: i.tipo === "atendimento" && new Date(i.fim).getTime() < agora ? ("concluido" as const) : ("agendado" as const),
      observacoes: i.observacao ? `${i.observacao} (importado)` : "Importado do Google Agenda",
    };
  });

  let importados = 0;
  const recusados: { nome: string; inicio: string }[] = [];
  for (let o = 0; o < linhas.length; o += LOTE) {
    const lote = linhas.slice(o, o + LOTE);
    const { error } = await supabase.from("agendamentos").insert(lote);
    if (!error) {
      importados += lote.length;
      continue;
    }
    if (error.code !== "23P01" && error.code !== "23514") return { ok: false, erro: `Parou no meio: ${error.message}. ${importados} já tinham entrado.` };
    // algum horário bate com outro: tenta um por um para salvar o resto
    for (const linha of lote) {
      const { error: e } = await supabase.from("agendamentos").insert(linha);
      if (e) recusados.push({ nome: linha.cliente_nome ?? linha.titulo ?? "", inicio: linha.inicio });
      else importados += 1;
    }
  }

  revalidatePath("/agenda");
  revalidatePath("/");
  revalidatePath("/clientes");
  return { ok: true, importados, clientesNovas, recusados };
}


// ---------------------------------------------------------------- começar do zero

const esquemaLimpeza = z.object({
  escopo: z.enum(["importados", "tudo"]),
  clientes: z.boolean(),
  confirmacao: z.literal("APAGAR"),
});

export type ResultadoLimpeza = { ok: true; horarios: number; clientes: number } | { ok: false; erro: string };

/**
 * Apaga a agenda para importar de novo. "importados" = só o que veio do Google (marcado na observação);
 * "tudo" = todos os horários. O histórico desses horários também sai, senão cada um viraria "horário que vagou"
 * nos relatórios e nos stories. Clientes: no modo "importados", só os sem WhatsApp que ficaram sem nenhum horário.
 */
export async function limparAgenda(pedido: z.input<typeof esquemaLimpeza>): Promise<ResultadoLimpeza> {
  const usuario = await obterUsuario();
  if (!usuario) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const p = esquemaLimpeza.safeParse(pedido);
  if (!p.success) return { ok: false, erro: "Digite APAGAR para confirmar." };
  const { escopo, clientes } = p.data;
  const supabase = await criarClienteServidor();
  const admin = criarClienteAdmin();

  let apagar = supabase.from("agendamentos").delete().eq("profissional_id", usuario.id);
  if (escopo === "importados") apagar = apagar.ilike("observacoes", "%importado%");
  const { data: apagados, error } = await apagar.select("id");
  if (error) return { ok: false, erro: `Não foi possível apagar a agenda: ${error.message}` };
  const ids = (apagados ?? []).map((a) => a.id);

  // histórico (sem policy de delete para a profissional: vai pelo admin, sempre preso ao id dela)
  if (escopo === "tudo") {
    await admin.from("agendamento_eventos").delete().eq("profissional_id", usuario.id);
  } else {
    for (let o = 0; o < ids.length; o += 200) {
      await admin.from("agendamento_eventos").delete().eq("profissional_id", usuario.id).in("agendamento_id", ids.slice(o, o + 200));
    }
  }

  let clientesApagadas = 0;
  if (clientes) {
    if (escopo === "tudo") {
      const { data, error: e } = await supabase.from("clientes").delete().eq("profissional_id", usuario.id).select("id");
      if (e) return { ok: false, erro: `A agenda foi apagada, mas os clientes não: ${e.message}` };
      clientesApagadas = data?.length ?? 0;
    } else {
      const [{ data: semZap }, { data: usados }] = await Promise.all([
        supabase.from("clientes").select("id").eq("profissional_id", usuario.id).is("telefone", null),
        supabase.from("agendamentos").select("cliente_id").eq("profissional_id", usuario.id).not("cliente_id", "is", null),
      ]);
      const emUso = new Set((usados ?? []).map((u) => u.cliente_id));
      const sobrando = (semZap ?? []).map((c) => c.id).filter((id) => !emUso.has(id));
      for (let o = 0; o < sobrando.length; o += 200) {
        const { data, error: e } = await supabase.from("clientes").delete().in("id", sobrando.slice(o, o + 200)).select("id");
        if (e) return { ok: false, erro: `A agenda foi apagada, mas os clientes não: ${e.message}` };
        clientesApagadas += data?.length ?? 0;
      }
    }
  }

  revalidatePath("/agenda");
  revalidatePath("/");
  revalidatePath("/clientes");
  revalidatePath("/relatorios");
  return { ok: true, horarios: ids.length, clientes: clientesApagadas };
}
