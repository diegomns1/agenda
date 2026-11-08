"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterUsuario } from "@/lib/auth";
import type { EstadoForm } from "@/components/formulario/tipos";

/** Tira o aviso "vagou um horário" da tela Hoje. */
export async function dispensarVaga(eventoId: string): Promise<EstadoForm> {
  if (!z.uuid().safeParse(eventoId).success) return { erro: "Aviso inválido." };
  const usuario = await obterUsuario();
  if (!usuario) return { erro: "Sessão expirada. Entre de novo." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("agendamento_eventos")
    .update({ vaga_dispensada_em: new Date().toISOString() })
    .eq("id", eventoId);
  if (error) return { erro: `Não foi possível dispensar: ${error.message}` };

  revalidatePath("/");
  return { ok: true };
}
