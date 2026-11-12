"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { ehAdmin, obterPerfil, obterUsuario } from "@/lib/auth";
import type { EstadoForm } from "@/components/formulario/tipos";

const esquema = z.object({
  texto: z
    .string()
    .trim()
    .min(3, "Escreva a sua ideia")
    .max(2000, "Máximo de 2000 caracteres"),
});

const LIMITE_POR_DIA = 10;

/** A profissional manda uma sugestão de melhoria. Cai em Admin > Sugestões com o nome de quem mandou. */
export async function enviarSugestao(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const r = esquema.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erros: z.flattenError(r.error).fieldErrors, valores: { texto: String(formData.get("texto") ?? "") } };

  const perfil = await obterPerfil();
  if (!perfil) return { erro: "Entre na sua conta para mandar a sugestão." };

  // trava contra envio repetido sem querer. A RLS não deixa a profissional ler as sugestões: conta pelo admin.
  const { count } = await criarClienteAdmin()
    .from("sugestoes")
    .select("id", { count: "exact", head: true })
    .eq("profissional_id", perfil.id)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if ((count ?? 0) >= LIMITE_POR_DIA) return { erro: "Você já mandou muitas sugestões hoje. Obrigado! Mande mais amanhã." };

  // grava com a sessão dela: a RLS garante que a sugestão é da própria conta
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("sugestoes").insert({
    profissional_id: perfil.id,
    nome: perfil.nome,
    email: perfil.email,
    telefone: perfil.telefone,
    texto: r.data.texto,
  });
  if (error) return { erro: "Não foi possível enviar agora. Tente de novo em instantes." };

  return { ok: true, mensagem: "Sugestão enviada! Obrigado por ajudar a melhorar o Vaguinha." };
}

/** Admin: marca uma sugestão como lida (ou volta para não lida). */
export async function marcarSugestao(id: string, lida: boolean): Promise<EstadoForm> {
  if (!ehAdmin(await obterUsuario())) return { erro: "Sem permissão." };
  if (!z.uuid().safeParse(id).success) return { erro: "Sugestão inválida." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("sugestoes")
    .update({ lida_em: lida ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/admin/sugestoes");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
