import "server-only";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { SemConversor } from "./audio";

/*
 * Vídeo mandado pela Central → formato que o WhatsApp aceita (21/11/2026).
 * A Meta só aceita MP4 com vídeo H.264 e áudio AAC, até 16 MB. Vídeo de iPhone vem em MOV/HEVC e vídeo de celular
 * passa fácil de 16 MB, então o servidor converte com o ffmpeg (o mesmo do áudio): no máximo 1280 px no lado maior,
 * com a qualidade ajustada à duração para caber em ~15 MB. Se o vídeo já está no formato certo e cabe, vai como está.
 * A VPS tem 1 processador: a conversão leva mais ou menos o tempo do vídeo, por isso o limite de duração.
 */

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";

/** Tamanho máximo que a Meta aceita para vídeo. */
export const LIMITE_VIDEO_META = 16 * 1024 * 1024;
/**
 * Mais que isto a conversão não termina a tempo nesta VPS (o nginx espera 120 s pela resposta).
 * Medido em 21/11/2026: vídeo de 45 s em pé (1080x1920) levou 25 s para converter.
 */
export const DURACAO_MAXIMA_S = 120;
/** Alvo depois de converter: um pouco abaixo dos 16 MB, por segurança. */
const ALVO_BYTES = 15 * 1024 * 1024;

export class VideoInvalido extends Error {}

function rodar(programa: string, args: string[], limiteMs: number): Promise<string> {
  return new Promise((ok, falha) => {
    const p = spawn(programa, args, { stdio: ["ignore", "pipe", "pipe"] });
    let saida = "";
    let erro = "";
    p.stdout.on("data", (d) => (saida += String(d)));
    p.stderr.on("data", (d) => (erro += String(d)));
    p.on("error", (e: NodeJS.ErrnoException) => falha(e.code === "ENOENT" ? new SemConversor(`${programa} não instalado`) : e));
    p.on("close", (codigo) => (codigo === 0 ? ok(saida) : falha(new Error(`${programa} saiu com ${codigo}: ${erro.slice(-300)}`))));
    setTimeout(() => p.kill("SIGKILL"), limiteMs);
  });
}

type Info = { duracao: number; video: string | null; audio: string | null; formato: string };

async function informacoes(arquivo: string): Promise<Info> {
  const json = JSON.parse(
    await rodar(FFPROBE, ["-v", "error", "-show_entries", "format=duration,format_name:stream=codec_type,codec_name", "-of", "json", arquivo], 20_000),
  ) as { format?: { duration?: string; format_name?: string }; streams?: { codec_type?: string; codec_name?: string }[] };
  const streams = json.streams ?? [];
  return {
    duracao: Number(json.format?.duration ?? 0),
    video: streams.find((s) => s.codec_type === "video")?.codec_name ?? null,
    audio: streams.find((s) => s.codec_type === "audio")?.codec_name ?? null,
    formato: json.format?.format_name ?? "",
  };
}

/** Devolve o vídeo pronto para o WhatsApp (MP4 H.264/AAC, até 16 MB). Lança VideoInvalido com o motivo para mostrar. */
export async function paraVideoDoWhatsapp(dados: Buffer, mimeEntrada: string): Promise<Buffer> {
  const pasta = await mkdtemp(path.join(tmpdir(), "vaguinha-video-"));
  const ext = mimeEntrada.includes("quicktime") ? "mov" : mimeEntrada.includes("webm") ? "webm" : mimeEntrada.includes("3gpp") ? "3gp" : "mp4";
  const entrada = path.join(pasta, `${randomUUID()}.${ext}`);
  const saida = path.join(pasta, `${randomUUID()}.mp4`);
  try {
    await writeFile(entrada, dados);
    const info = await informacoes(entrada).catch((e) => {
      if (e instanceof SemConversor) throw e;
      throw new VideoInvalido("Não consegui ler esse vídeo. Tente outro arquivo.");
    });
    if (!info.video) throw new VideoInvalido("Esse arquivo não tem vídeo.");
    if (info.duracao > DURACAO_MAXIMA_S) {
      throw new VideoInvalido(`Vídeo longo demais: mande até ${DURACAO_MAXIMA_S / 60} minutos (este tem ${Math.round(info.duracao)} segundos).`);
    }

    // já está no formato do WhatsApp e cabe: vai como está, sem perder qualidade
    // (o ffprobe chama MOV e MP4 pelo mesmo nome; só o MP4 de verdade vai sem converter)
    const jaServe = mimeEntrada === "video/mp4" && info.video === "h264" && (info.audio === null || info.audio === "aac");
    if (jaServe && dados.length <= LIMITE_VIDEO_META) return dados;

    // qualidade conforme a duração, para caber no alvo (o áudio fica com 96 kbps)
    const duracao = Math.max(1, info.duracao || 30);
    const totalKbps = Math.floor((ALVO_BYTES * 8) / 1024 / duracao);
    const videoKbps = Math.min(2500, totalKbps - 96);
    if (videoKbps < 250) throw new VideoInvalido("Vídeo longo demais para caber nos 16 MB do WhatsApp. Mande um trecho menor.");
    const lado = videoKbps >= 900 ? 1280 : 854;

    const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", entrada, "-map_metadata", "-1"];
    // no máximo `lado` px no lado maior, sem distorcer, com largura e altura pares (o H.264 exige)
    args.push("-vf", `scale='min(${lado},iw)':'min(${lado},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30`);
    args.push("-c:v", "libx264", "-preset", "veryfast", "-profile:v", "main", "-pix_fmt", "yuv420p");
    args.push("-b:v", `${videoKbps}k`, "-maxrate", `${Math.round(videoKbps * 1.3)}k`, "-bufsize", `${videoKbps * 2}k`);
    if (info.audio) args.push("-c:a", "aac", "-b:a", "96k", "-ac", "2");
    else args.push("-an");
    args.push("-movflags", "+faststart", saida);
    await rodar(FFMPEG, args, 100_000).catch((e) => {
      if (e instanceof SemConversor) throw e;
      console.error("[whatsapp] conversão de vídeo", e instanceof Error ? e.message : e);
      throw new VideoInvalido("Não consegui converter o vídeo a tempo. Mande um vídeo mais curto.");
    });
    const pronto = await readFile(saida);
    if (pronto.length > LIMITE_VIDEO_META) throw new VideoInvalido("Mesmo convertido, o vídeo passou de 16 MB. Mande um trecho menor.");
    return pronto;
  } finally {
    await rm(pasta, { recursive: true, force: true });
  }
}
