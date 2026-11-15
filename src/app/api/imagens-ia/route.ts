import { randomUUID } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { obterPerfil, obterUsuario } from "@/lib/auth";
import { temRecurso } from "@/lib/planos";
import { nomeDoRamo } from "@/lib/ramos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { gerarImagem, geracaoImagemConfigurada, type Referencia } from "@/features/imagens-ia/openai";
import { BUCKET_IMAGENS_IA, LIMITE_MES, MAX_ANEXOS, MAX_PEDIDO, montarPrompt, usadasNoMes } from "@/features/imagens-ia/regras";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/*
 * "Criar com IA" nos Stories (Premium), 15/11/2026.
 * Corpo multipart: pedido, conversa (uuid, opcional) e até 4 fotos em "anexo" (a tela já reduz para JPEG).
 * Responde na hora com o id; a imagem é gerada depois (after) e a tela pergunta o estado em situacaoImagem().
 * Se a conversa já tem uma imagem pronta, ela vai junto como primeira referência: o pedido vira um ajuste nela.
 */

const LIMITE_ANEXO = 4 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function erro(texto: string, status = 400) {
  return NextResponse.json({ ok: false, erro: texto }, { status });
}

export async function POST(request: NextRequest) {
  const [usuario, perfil] = await Promise.all([obterUsuario(), obterPerfil()]);
  if (!usuario || !perfil) return erro("Sessão expirada. Entre de novo.", 401);
  if (!temRecurso(perfil.plano, "stories")) return erro("O Criar com IA é do plano Premium.", 403);
  if (!geracaoImagemConfigurada()) return erro("A geração de imagens ainda não está ligada.", 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return erro("Fotos grandes demais ou envio interrompido.");
  }
  const pedido = String(form.get("pedido") ?? "").trim().slice(0, MAX_PEDIDO);
  if (pedido.length < 3) return erro("Escreva o que você quer na imagem.");
  const conversaRecebida = String(form.get("conversa") ?? "");
  const conversa = UUID.test(conversaRecebida) ? conversaRecebida : randomUUID();

  const arquivos = form.getAll("anexo").filter((f): f is File => f instanceof File && f.size > 0);
  if (arquivos.length > MAX_ANEXOS) return erro(`Anexe no máximo ${MAX_ANEXOS} fotos.`);
  const anexos: Referencia[] = [];
  for (const [i, f] of arquivos.entries()) {
    const mime = (f.type || "").split(";")[0];
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) return erro("Anexe fotos em JPG, PNG ou WEBP.");
    if (f.size > LIMITE_ANEXO) return erro("Uma das fotos é grande demais.");
    anexos.push({ dados: Buffer.from(await f.arrayBuffer()), mime, nome: `anexo-${i + 1}.${mime.split("/")[1]}` });
  }

  const admin = criarClienteAdmin();
  const usadas = await usadasNoMes(admin, usuario.id);
  if (usadas >= LIMITE_MES) return erro(`Você já usou as ${LIMITE_MES} imagens deste mês. No mês que vem, renova.`);

  // uma de cada vez
  const { count: emAndamento } = await admin
    .from("imagens_ia")
    .select("id", { count: "exact", head: true })
    .eq("profissional_id", usuario.id)
    .eq("estado", "gerando")
    .gte("criado_em", new Date(Date.now() - 4 * 60_000).toISOString());
  if (emAndamento) return erro("Espere a imagem anterior ficar pronta.");

  // imagem anterior da conversa: o pedido vira um ajuste nela
  const { data: anterior } = await admin
    .from("imagens_ia")
    .select("imagem_path")
    .eq("profissional_id", usuario.id)
    .eq("conversa_id", conversa)
    .eq("estado", "pronta")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: linha, error } = await admin
    .from("imagens_ia")
    .insert({ profissional_id: usuario.id, conversa_id: conversa, pedido, anexos: anexos.length })
    .select("id")
    .single();
  if (error || !linha) return erro("Não consegui começar. Tente de novo.", 500);

  const prompt = montarPrompt(pedido, {
    ramo: perfil.ramo ? nomeDoRamo(perfil.ramo, perfil.ramo_outro) : null,
    negocio: perfil.nome_negocio,
    ajuste: Boolean(anterior?.imagem_path),
    anexos: anexos.length,
  });

  after(async () => {
    const referencias: Referencia[] = [];
    if (anterior?.imagem_path) {
      const { data } = await admin.storage.from(BUCKET_IMAGENS_IA).download(anterior.imagem_path);
      if (data) referencias.push({ dados: Buffer.from(await data.arrayBuffer()), mime: "image/jpeg", nome: "anterior.jpg" });
    }
    referencias.push(...anexos);

    const r = await gerarImagem(prompt, referencias);
    if (!r.ok) {
      await admin.from("imagens_ia").update({ estado: "erro", erro: r.erro }).eq("id", linha.id);
      return;
    }
    const path = `${usuario.id}/${linha.id}.jpg`;
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

  return NextResponse.json({ ok: true, id: linha.id, conversa, usadas: usadas + 1, limite: LIMITE_MES });
}
