"use server";

import { obterUsuario } from "@/lib/auth";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { BUCKET_IMAGENS_IA, LIMITE_MES, usadasNoMes } from "./regras";

/*
 * "Criar com IA" (Stories): estado de um pedido e histórico recente. As imagens ficam num bucket privado
 * e a tela recebe links temporários (1 hora).
 */

export type ItemImagemIA = {
  id: string;
  conversa: string;
  pedido: string;
  anexos: number;
  estado: "gerando" | "pronta" | "erro";
  erro: string | null;
  url: string | null;
  criadoEm: string;
};

async function linksDe(admin: ReturnType<typeof criarClienteAdmin>, paths: string[]) {
  const mapa = new Map<string, string>();
  if (!paths.length) return mapa;
  const { data } = await admin.storage.from(BUCKET_IMAGENS_IA).createSignedUrls(paths, 3600);
  for (const d of data ?? []) if (d.path && d.signedUrl) mapa.set(d.path, d.signedUrl);
  return mapa;
}

/** Estado de um pedido (a tela pergunta de 3 em 3 s enquanto gera). */
export async function situacaoImagem(id: string): Promise<ItemImagemIA | null> {
  const usuario = await obterUsuario();
  if (!usuario) return null;
  const admin = criarClienteAdmin();
  const { data: l } = await admin.from("imagens_ia").select("*").eq("id", id).eq("profissional_id", usuario.id).maybeSingle();
  if (!l) return null;
  // passou muito do tempo e não terminou: considera erro (não conta no limite)
  if (l.estado === "gerando" && Date.now() - new Date(l.criado_em).getTime() > 5 * 60_000) {
    await admin.from("imagens_ia").update({ estado: "erro", erro: "A IA demorou demais. Tente de novo." }).eq("id", l.id);
    return { id: l.id, conversa: l.conversa_id, pedido: l.pedido, anexos: l.anexos, estado: "erro", erro: "A IA demorou demais. Tente de novo.", url: null, criadoEm: l.criado_em };
  }
  const links = await linksDe(admin, l.imagem_path ? [l.imagem_path] : []);
  return { id: l.id, conversa: l.conversa_id, pedido: l.pedido, anexos: l.anexos, estado: l.estado, erro: l.erro, url: l.imagem_path ? (links.get(l.imagem_path) ?? null) : null, criadoEm: l.criado_em };
}

/** As últimas imagens (para a conversa continuar depois de recarregar) e quantas ela já usou no mês. */
export async function historicoImagens(): Promise<{ itens: ItemImagemIA[]; usadas: number; limite: number }> {
  const usuario = await obterUsuario();
  if (!usuario) return { itens: [], usadas: 0, limite: LIMITE_MES };
  const admin = criarClienteAdmin();
  const [{ data }, usadas] = await Promise.all([
    admin.from("imagens_ia").select("*").eq("profissional_id", usuario.id).order("criado_em", { ascending: false }).limit(24),
    usadasNoMes(admin, usuario.id),
  ]);
  const linhas = (data ?? []).reverse();
  const links = await linksDe(admin, linhas.map((l) => l.imagem_path).filter((p): p is string => Boolean(p)));
  return {
    itens: linhas.map((l) => ({
      id: l.id,
      conversa: l.conversa_id,
      pedido: l.pedido,
      anexos: l.anexos,
      estado: l.estado,
      erro: l.erro,
      url: l.imagem_path ? (links.get(l.imagem_path) ?? null) : null,
      criadoEm: l.criado_em,
    })),
    usadas,
    limite: LIMITE_MES,
  };
}

/** Quantas imagens ela já usou este mês e o limite (para o botão "Gerar com IA" do gerador de stories). */
export async function creditosImagens(): Promise<{ usadas: number; limite: number }> {
  const usuario = await obterUsuario();
  if (!usuario) return { usadas: 0, limite: LIMITE_MES };
  return { usadas: await usadasNoMes(criarClienteAdmin(), usuario.id), limite: LIMITE_MES };
}
