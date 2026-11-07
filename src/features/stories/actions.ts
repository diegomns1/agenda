"use server";

import { obterPerfil } from "@/lib/auth";
import { ehDataISO } from "@/lib/datas";
import { temRecurso } from "@/lib/planos";
import { sugestaoStory, type SugestaoStory } from "./dados";
import type { TipoStory } from "./temas";

/** O que a agenda indica como livre, para a tela já vir pré-marcada. */
export async function sugerirStory(tipo: TipoStory, data: string): Promise<SugestaoStory> {
  const perfil = await obterPerfil();
  if (!perfil || !temRecurso(perfil.plano, "stories") || !ehDataISO(data)) return {};
  return sugestaoStory(perfil, tipo, data);
}
