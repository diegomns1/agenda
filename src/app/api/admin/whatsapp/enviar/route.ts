import { NextResponse, type NextRequest } from "next/server";
import { ehAdmin, obterUsuario } from "@/lib/auth";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { paraAudioDeVoz, SemConversor } from "@/features/whatsapp/audio";
import { erroDeJanela } from "@/features/whatsapp/janela";
import { enviarMidia, subirMidia } from "@/features/whatsapp/meta";
import { BUCKET_WHATSAPP, extensaoDe, rotuloMidia } from "@/features/whatsapp/midia";

export const dynamic = "force-dynamic";

/*
 * Central do WhatsApp: mandar foto, áudio gravado ou documento (13/11/2026). Só admin.
 * Corpo multipart: telefone, tipo ("imagem" | "audio" | "documento"), legenda (opcional), arquivo.
 * Foto chega já em JPEG (a Central converte e reduz no navegador). Áudio é convertido para áudio de voz (OGG/Opus).
 * Vai para a Meta, fica guardado no bucket privado (para a Central mostrar) e o robô sai da conversa.
 */

const LIMITE = 10 * 1024 * 1024; // o nginx aceita até 10 MB
const TIPOS_DOCUMENTO = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain"];

function erro(texto: string, status = 400) {
  return NextResponse.json({ ok: false, erro: texto }, { status });
}

export async function POST(request: NextRequest) {
  if (!ehAdmin(await obterUsuario())) return erro("Só o admin pode mandar mensagens pela Central.", 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return erro("Arquivo grande demais ou envio interrompido (máximo 10 MB).");
  }
  const telefone = String(form.get("telefone") ?? "").replace(/\D/g, "");
  const tipo = String(form.get("tipo") ?? "");
  const legenda = String(form.get("legenda") ?? "").trim().slice(0, 1000);
  const arquivo = form.get("arquivo");
  if (!telefone || !(arquivo instanceof File) || !["imagem", "audio", "documento"].includes(tipo)) return erro("Envio incompleto.");
  if (arquivo.size > LIMITE) return erro("Arquivo grande demais (máximo 10 MB).");

  const admin = criarClienteAdmin();
  const janela = await erroDeJanela(admin, telefone);
  if (janela) return erro(janela);

  let dados: Buffer = Buffer.from(await arquivo.arrayBuffer());
  let mime = (arquivo.type || "application/octet-stream").split(";")[0].trim();
  let nome = arquivo.name || "arquivo";

  if (tipo === "imagem" && !["image/jpeg", "image/png"].includes(mime)) return erro("Mande a foto em JPG ou PNG.");
  if (tipo === "documento" && !TIPOS_DOCUMENTO.includes(mime)) return erro("Esse tipo de arquivo não vai pelo WhatsApp. Use PDF, Word, Excel ou texto.");
  if (tipo === "audio") {
    try {
      dados = await paraAudioDeVoz(dados, mime);
      mime = "audio/ogg";
      nome = "audio.ogg";
    } catch (e) {
      if (e instanceof SemConversor) return erro("O conversor de áudio (ffmpeg) ainda não está instalado no servidor.", 500);
      console.error("[whatsapp] conversão de áudio", e);
      return erro("Não consegui converter o áudio. Grave de novo.", 500);
    }
  }

  const mediaId = await subirMidia(dados, mime, nome);
  if (!mediaId) return erro("A Meta não aceitou o arquivo. Tente de novo; se continuar, me mande um print.", 502);
  const tipoMeta = tipo === "imagem" ? "image" : tipo === "audio" ? "audio" : "document";
  const wamid = await enviarMidia(telefone, tipoMeta, mediaId, { legenda, nome });
  if (wamid === null) return erro("A Meta não entregou a mensagem. Tente de novo; se continuar, me mande um print.", 502);

  // guarda uma cópia para a Central mostrar (se falhar, a mensagem foi mesmo assim)
  const path = `${telefone}/enviada-${Date.now()}.${extensaoDe(mime, nome)}`;
  const { error: erroBucket } = await admin.storage.from(BUCKET_WHATSAPP).upload(path, dados, { contentType: mime });
  if (erroBucket) console.error("[whatsapp] cópia da mídia enviada", erroBucket.message);

  const tipoBanco = tipo as "imagem" | "audio" | "documento";
  await admin.from("whatsapp_mensagens").insert({
    telefone,
    de: "equipe",
    texto: rotuloMidia(tipoBanco, legenda),
    wamid: wamid || null,
    tipo: tipoBanco,
    midia_path: erroBucket ? null : path,
    midia_mime: mime,
    midia_nome: tipo === "documento" ? nome.slice(0, 200) : null,
    midia_bytes: dados.length,
    status: "enviada",
  });
  await admin.from("whatsapp_contatos").update({ atendimento: "humano", ultima_msg_em: new Date().toISOString(), nao_lidas: 0 }).eq("telefone", telefone);

  return NextResponse.json({ ok: true });
}
