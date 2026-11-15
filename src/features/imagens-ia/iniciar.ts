import "server-only";
import { after } from "next/server";
import type { criarClienteAdmin } from "@/lib/supabase/admin";
import { gerarImagem, type Referencia } from "./openai";
import { BUCKET_IMAGENS_IA, LIMITE_MES, usadasNoMes } from "./regras";

/*
 * O que o chat ("Criar com IA") e o botão "Gerar com IA" do gerador de stories têm em comum:
 * conferir o limite do mês, abrir o pedido e gerar a imagem depois de responder (a tela acompanha o estado).
 */

type Admin = ReturnType<typeof criarClienteAdmin>;

/** Pode gerar agora? Confere as 30 do mês e se já não tem uma imagem sendo criada. */
export async function conferirLimite(admin: Admin, usuarioId: string): Promise<{ ok: true; usadas: number } | { ok: false; erro: string }> {
  const usadas = await usadasNoMes(admin, usuarioId);
  if (usadas >= LIMITE_MES) return { ok: false, erro: `Você já usou as ${LIMITE_MES} imagens deste mês. No mês que vem, renova.` };
  const { count } = await admin
    .from("imagens_ia")
    .select("id", { count: "exact", head: true })
    .eq("profissional_id", usuarioId)
    .eq("estado", "gerando")
    .gte("criado_em", new Date(Date.now() - 4 * 60_000).toISOString());
  if (count) return { ok: false, erro: "Espere a imagem anterior ficar pronta." };
  return { ok: true, usadas };
}

/**
 * Abre o pedido e gera a imagem depois que a resposta sai. Devolve o id (ou null se não abriu).
 * `referencias` só é chamada na hora de gerar (pode baixar arquivos).
 */
export async function iniciarGeracao(
  admin: Admin,
  p: { usuarioId: string; conversa: string; pedido: string; anexos: number; prompt: string; referencias: () => Promise<Referencia[]> },
): Promise<string | null> {
  const { data: linha, error } = await admin
    .from("imagens_ia")
    .insert({ profissional_id: p.usuarioId, conversa_id: p.conversa, pedido: p.pedido, anexos: p.anexos })
    .select("id")
    .single();
  if (error || !linha) return null;

  after(async () => {
    const r = await gerarImagem(p.prompt, await p.referencias().catch(() => []));
    if (!r.ok) {
      await admin.from("imagens_ia").update({ estado: "erro", erro: r.erro }).eq("id", linha.id);
      return;
    }
    const path = `${p.usuarioId}/${linha.id}.jpg`;
    const { error: erroUpload } = await admin.storage.from(BUCKET_IMAGENS_IA).upload(path, r.dados, { contentType: "image/jpeg", upsert: true });
    await admin
      .from("imagens_ia")
      .update(
        erroUpload
          ? { estado: "erro", erro: "Não consegui guardar a imagem. Tente de novo." }
          : { estado: "pronta", imagem_path: path, tokens: r.tokens, pronta_em: new Date().toISOString() },
      )
      .eq("id", linha.id);
  });

  return linha.id;
}
