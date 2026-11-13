import "server-only";
import type { criarClienteAdmin } from "@/lib/supabase/admin";
import type { TipoMensagemWhatsapp } from "@/types/database";
import { baixarMidia } from "./meta";

/*
 * Fotos, áudios e documentos do WhatsApp oficial (13/11/2026).
 * Ficam no bucket PRIVADO "whatsapp" (migração 0023), em <telefone>/<id da mensagem>.<extensão>.
 * A Central mostra por links temporários; depois de 90 dias o arquivo é apagado e fica só o texto.
 */

type Admin = ReturnType<typeof criarClienteAdmin>;

export const BUCKET_WHATSAPP = "whatsapp";
export const DIAS_GUARDAR_MIDIA = 90;

const EXTENSOES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/amr": "amr",
  "audio/webm": "webm",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "application/pdf": "pdf",
};

export function extensaoDe(mime: string, nome?: string | null) {
  const doNome = nome?.match(/\.([a-z0-9]{1,8})$/i)?.[1];
  return EXTENSOES[mime] ?? doNome?.toLowerCase() ?? mime.split("/")[1]?.replace(/[^a-z0-9]/gi, "").slice(0, 8) ?? "bin";
}

/** Texto curto que representa a mídia na lista de conversas e no histórico da IA. */
export function rotuloMidia(tipo: TipoMensagemWhatsapp, legenda?: string | null) {
  const base: Record<TipoMensagemWhatsapp, string> = {
    texto: "",
    imagem: "📷 Foto",
    audio: "🎤 Áudio",
    video: "🎥 Vídeo",
    documento: "📄 Documento",
    figurinha: "Figurinha",
    localizacao: "📍 Localização",
    contato: "👤 Contato",
    outro: "Mensagem",
  };
  return legenda?.trim() ? `${base[tipo]}: ${legenda.trim()}` : base[tipo];
}

/** Baixa da Meta e guarda no bucket. null se não deu (a mensagem fica registrada mesmo assim, sem o arquivo). */
export async function guardarMidiaRecebida(
  admin: Admin,
  telefone: string,
  wamid: string,
  mediaId: string,
  nome?: string | null,
): Promise<{ path: string; mime: string; bytes: number } | null> {
  const baixada = await baixarMidia(mediaId);
  if (!baixada) return null;
  const path = `${telefone}/${wamid.replace(/[^\w.-]/g, "_").slice(-80)}.${extensaoDe(baixada.mime, nome)}`;
  const { error } = await admin.storage.from(BUCKET_WHATSAPP).upload(path, baixada.dados, { contentType: baixada.mime, upsert: true });
  if (error) {
    console.error("[whatsapp] mídia: não guardou no bucket", error.message);
    return null;
  }
  return { path, mime: baixada.mime, bytes: baixada.dados.length };
}

/** Links temporários (1 hora) para a Central mostrar fotos e tocar áudios. */
export async function linksTemporarios(admin: Admin, paths: string[]): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  if (!paths.length) return mapa;
  const { data } = await admin.storage.from(BUCKET_WHATSAPP).createSignedUrls(paths, 3600);
  for (const item of data ?? []) if (item.path && item.signedUrl) mapa.set(item.path, item.signedUrl);
  return mapa;
}

/** Apaga arquivos com mais de 90 dias (o texto e a transcrição continuam). */
export async function apagarMidiaVelha(admin: Admin) {
  const limite = new Date(Date.now() - DIAS_GUARDAR_MIDIA * 86_400_000).toISOString();
  const { data } = await admin.from("whatsapp_mensagens").select("id, midia_path").not("midia_path", "is", null).lt("criado_em", limite).limit(500);
  const velhas = (data ?? []).filter((m): m is { id: number; midia_path: string } => Boolean(m.midia_path));
  if (!velhas.length) return;
  await admin.storage.from(BUCKET_WHATSAPP).remove(velhas.map((m) => m.midia_path));
  await admin.from("whatsapp_mensagens").update({ midia_path: null }).in("id", velhas.map((m) => m.id));
}
