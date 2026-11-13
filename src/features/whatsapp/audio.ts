import "server-only";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/*
 * Áudio gravado na Central → "áudio de voz" do WhatsApp (13/11/2026).
 * O WhatsApp só mostra como áudio de voz (bolinha de play) o formato OGG com Opus, mono. O navegador grava em
 * WebM (Chrome/Android) ou MP4 (iPhone), então o servidor converte com o ffmpeg instalado na VPS
 * (apt-get install -y ffmpeg). FFMPEG_PATH muda o caminho, se precisar.
 */

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

export class SemConversor extends Error {}

/** Converte qualquer áudio para OGG/Opus mono 48 kHz. Lança SemConversor se o ffmpeg não estiver instalado. */
export async function paraAudioDeVoz(dados: Buffer, mimeEntrada: string): Promise<Buffer> {
  const pasta = await mkdtemp(path.join(tmpdir(), "vaguinha-audio-"));
  const ext = mimeEntrada.includes("mp4") || mimeEntrada.includes("aac") ? "m4a" : mimeEntrada.includes("ogg") ? "ogg" : mimeEntrada.includes("mpeg") ? "mp3" : "webm";
  const entrada = path.join(pasta, `${randomUUID()}.${ext}`);
  const saida = path.join(pasta, `${randomUUID()}.ogg`);
  try {
    await writeFile(entrada, dados);
    await new Promise<void>((ok, falha) => {
      // sem metadados e com o tempo começando do zero: o WhatsApp do Android recusava o arquivo
      // ("há algo errado com o arquivo de áudio", 13/11/2026) com a versão anterior (32k, -application voip)
      const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", entrada, "-vn", "-map_metadata", "-1", "-ac", "1", "-ar", "48000"];
      args.push("-c:a", "libopus", "-b:a", "64k", "-vbr", "on", "-avoid_negative_ts", "make_zero", "-f", "ogg", saida);
      const p = spawn(FFMPEG, args, {
        stdio: ["ignore", "ignore", "pipe"],
      });
      let erro = "";
      p.stderr.on("data", (d) => (erro += String(d)));
      p.on("error", (e: NodeJS.ErrnoException) => falha(e.code === "ENOENT" ? new SemConversor("ffmpeg não instalado") : e));
      p.on("close", (codigo) => (codigo === 0 ? ok() : falha(new Error(`ffmpeg saiu com ${codigo}: ${erro.slice(0, 300)}`))));
      setTimeout(() => p.kill("SIGKILL"), 60_000);
    });
    return await readFile(saida);
  } finally {
    await rm(pasta, { recursive: true, force: true });
  }
}
