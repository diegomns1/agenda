"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { obterPerfil } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { MAX_MENSAGEM, modeloPadrao, TIPOS_MENSAGEM, type ModelosMensagem } from "./modelos";

const esquema = z.object(
  Object.fromEntries(
    TIPOS_MENSAGEM.map((t) => [t, z.string().max(MAX_MENSAGEM, `Máximo de ${MAX_MENSAGEM} caracteres`)]),
  ) as Record<(typeof TIPOS_MENSAGEM)[number], z.ZodString>,
);

/**
 * Salva os textos das mensagens. Texto igual ao padrão (ou vazio) não é guardado: assim, se o padrão
 * melhorar no futuro, quem não mexeu recebe a melhoria. O lembrete também vai para `modelo_lembrete`
 * (coluna antiga, mantida para compatibilidade).
 */
export async function salvarModelos(entrada: unknown): Promise<{ ok: boolean; erro?: string }> {
  const perfil = await obterPerfil();
  if (!perfil) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const r = esquema.safeParse(entrada);
  if (!r.success) return { ok: false, erro: r.error.issues[0]?.message ?? "Texto inválido." };

  const modelos: ModelosMensagem = {};
  for (const tipo of TIPOS_MENSAGEM) {
    const texto = r.data[tipo].replace(/\r\n/g, "\n").trim();
    if (texto && texto !== modeloPadrao(tipo, perfil.tratamento)) modelos[tipo] = texto;
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("profiles")
    .update({ modelos_mensagem: modelos, modelo_lembrete: modelos.lembrete ?? modeloPadrao("lembrete", perfil.tratamento) })
    .eq("id", perfil.id);
  if (error) return { ok: false, erro: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/mensagens");
  revalidatePath("/lembretes");
  revalidatePath("/agenda");
  return { ok: true };
}
