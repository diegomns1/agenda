import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { URL_SITE } from "@/lib/constantes";

/*
 * Vídeos que a Serena manda sozinha no WhatsApp (21/11/2026).
 * O arquivo fica em public/site/videos/ e é servido pelo site (www.vaguinha.app/site/videos/...), que não pede login:
 * a Meta busca o vídeo nesse endereço na hora de entregar. Tem de ser MP4 (H.264 + AAC) com até 16 MB.
 * Enquanto o arquivo não existir, a Serena nem sabe que o vídeo existe (a ferramenta não aparece para ela).
 */

export const VIDEO_INSTALAR = {
  /** caminho dentro de public/ */
  arquivo: "site/videos/instalar-app.mp4",
  url: `${URL_SITE}/site/videos/instalar-app.mp4`,
  legenda: "Como colocar o Vaguinha na tela do celular",
  /** como aparece na Central e no histórico que a Serena lê (é por ele que ela sabe que já mandou) */
  registro: "🎥 Vídeo: como colocar o Vaguinha na tela do celular",
};

let existe: boolean | null = null;

/** O vídeo de instalação está publicado? (olha o arquivo uma vez por processo) */
export function videoInstalarDisponivel() {
  if (existe === null) existe = existsSync(path.join(process.cwd(), "public", VIDEO_INSTALAR.arquivo));
  return existe;
}
