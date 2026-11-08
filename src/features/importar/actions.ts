"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterUsuario } from "@/lib/auth";

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
