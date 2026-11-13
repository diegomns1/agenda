"use client";

import { useEffect, useRef, useState } from "react";
import { FileTextIcon, Loader2Icon, MicIcon, PaperclipIcon, SendHorizontalIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/*
 * Caixa de escrever da Central, no jeito do WhatsApp (13/11/2026):
 *  - clipe: foto (vai em JPEG, reduzida no navegador) ou documento, com legenda;
 *  - microfone (aparece quando não tem texto): grava, mostra o tempo, lixeira para desistir e seta para mandar;
 *  - texto: Enter manda, Shift+Enter quebra linha.
 * Foto, documento e áudio vão por /api/admin/whatsapp/enviar; o texto continua pela função de sempre.
 */

type Anexo = { arquivo: File; tipo: "imagem" | "documento"; previa: string | null };

const LADO_MAXIMO = 1600;

/** Foto em JPEG com no máximo 1600 px no lado maior (fica leve e o WhatsApp aceita). */
async function fotoParaJpeg(arquivo: File): Promise<File> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // PNG transparente não fica preto
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  if (!blob) throw new Error("Não consegui preparar a foto.");
  return new File([blob], arquivo.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

async function enviarArquivo(telefone: string, tipo: "imagem" | "audio" | "documento", arquivo: Blob, nome: string, legenda = "") {
  const form = new FormData();
  form.append("telefone", telefone);
  form.append("tipo", tipo);
  form.append("legenda", legenda);
  form.append("arquivo", arquivo, nome);
  const r = await fetch("/api/admin/whatsapp/enviar", { method: "POST", body: form });
  const json = (await r.json().catch(() => ({ ok: false, erro: "O servidor não respondeu. Recarregue a página e tente de novo." }))) as { ok: boolean; erro?: string };
  if (!json.ok) throw new Error(json.erro ?? "Não foi.");
}

function tempo(segundos: number) {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
}

export function Compositor({
  telefone,
  placeholder,
  enviarTexto,
  aoEnviar,
}: {
  telefone: string;
  placeholder: string;
  /** manda o texto; devolve true se foi */
  enviarTexto: (texto: string) => Promise<boolean>;
  /** depois de mandar qualquer coisa (recarrega a conversa) */
  aoEnviar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [legenda, setLegenda] = useState("");
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const gravador = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const descartar = useRef(false);

  // limpa a prévia da foto e o microfone ao sair
  useEffect(() => () => {
    if (anexo?.previa) URL.revokeObjectURL(anexo.previa);
  }, [anexo]);
  useEffect(() => () => gravador.current?.stream.getTracks().forEach((t) => t.stop()), []);

  useEffect(() => {
    if (!gravando) return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [gravando]);

  async function mandar(acao: () => Promise<void>) {
    setEnviando(true);
    try {
      await acao();
      aoEnviar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi.");
    } finally {
      setEnviando(false);
    }
  }

  function enviarDigitado() {
    const limpo = texto.trim();
    if (!limpo || enviando) return;
    void mandar(async () => {
      if (!(await enviarTexto(limpo))) throw new Error("Não foi.");
      setTexto("");
    });
  }

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    try {
      if (arquivo.type.startsWith("image/")) {
        const jpeg = await fotoParaJpeg(arquivo);
        setAnexo({ arquivo: jpeg, tipo: "imagem", previa: URL.createObjectURL(jpeg) });
      } else {
        if (arquivo.size > 10 * 1024 * 1024) throw new Error("Arquivo grande demais (máximo 10 MB).");
        setAnexo({ arquivo, tipo: "documento", previa: null });
      }
      setLegenda(texto);
      setTexto("");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não consegui abrir esse arquivo.");
    }
  }

  function enviarAnexo() {
    if (!anexo) return;
    void mandar(async () => {
      await enviarArquivo(telefone, anexo.tipo, anexo.arquivo, anexo.arquivo.name, legenda.trim());
      setAnexo(null);
      setLegenda("");
    });
  }

  async function comecarGravacao() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Este navegador não grava áudio. Use o Chrome ou o Safari atualizados.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      pedacos.current = [];
      descartar.current = false;
      rec.ondataavailable = (ev) => ev.data.size && pedacos.current.push(ev.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setGravando(false);
        if (descartar.current || !pedacos.current.length) return;
        const blob = new Blob(pedacos.current, { type: rec.mimeType || "audio/webm" });
        const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
        void mandar(() => enviarArquivo(telefone, "audio", blob, `audio.${ext}`));
      };
      gravador.current = rec;
      rec.start();
      setSegundos(0);
      setGravando(true);
    } catch {
      toast.error("Não consegui usar o microfone. Libere o microfone para este site nas configurações do navegador.");
    }
  }

  function pararGravacao(enviar: boolean) {
    descartar.current = !enviar;
    if (gravador.current?.state === "recording") gravador.current.stop();
  }

  // ---------------------------------------------------------------- gravando
  if (gravando) {
    return (
      <div className="flex items-center gap-2" role="group" aria-label="Gravando áudio">
        <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 rounded-full text-destructive" onClick={() => pararGravacao(false)} aria-label="Apagar áudio">
          <Trash2Icon />
        </Button>
        <div className="flex h-11 flex-1 items-center gap-2 rounded-full border bg-background px-4 text-sm" aria-live="polite">
          <span className="size-2.5 animate-pulse rounded-full bg-destructive" aria-hidden />
          <span className="tabular-nums">{tempo(segundos)}</span>
          <span className="text-muted-foreground">Gravando…</span>
        </div>
        <Button type="button" size="icon" className="size-11 shrink-0 rounded-full" onClick={() => pararGravacao(true)} aria-label="Enviar áudio">
          <SendHorizontalIcon />
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------- prévia do anexo
  if (anexo) {
    return (
      <div className="grid gap-2 rounded-2xl border bg-background p-2">
        <div className="flex items-center gap-3">
          {anexo.previa ? (
            // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:)
            <img src={anexo.previa} alt="Prévia da foto" className="size-16 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileTextIcon className="size-7 text-muted-foreground" aria-hidden />
            </span>
          )}
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{anexo.tipo === "imagem" ? "Foto" : anexo.arquivo.name}</p>
          <Button type="button" variant="ghost" size="icon" onClick={() => setAnexo(null)} disabled={enviando} aria-label="Tirar o anexo">
            <XIcon />
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <input
            value={legenda}
            onChange={(e) => setLegenda(e.target.value.slice(0, 1000))}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), enviarAnexo())}
            placeholder="Legenda (opcional)"
            aria-label="Legenda"
            className="h-11 min-w-0 flex-1 rounded-full border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-sm"
          />
          <Button type="button" size="icon" className="size-11 shrink-0 rounded-full" onClick={enviarAnexo} disabled={enviando} aria-label="Enviar anexo">
            {enviando ? <Loader2Icon className="animate-spin" /> : <SendHorizontalIcon />}
          </Button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- texto
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        enviarDigitado();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
        className="hidden"
        onChange={escolher}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 rounded-full text-muted-foreground"
        onClick={() => inputRef.current?.click()}
        disabled={enviando}
        aria-label="Anexar foto ou documento"
      >
        <PaperclipIcon />
      </Button>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value.slice(0, 4000))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            enviarDigitado();
          }
        }}
        rows={1}
        placeholder={placeholder}
        aria-label="Mensagem"
        className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-input bg-background px-3.5 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-sm"
      />
      {texto.trim() ? (
        <Button type="submit" size="icon" className="size-11 shrink-0 rounded-full" disabled={enviando} aria-label="Enviar">
          {enviando ? <Loader2Icon className="animate-spin" /> : <SendHorizontalIcon />}
        </Button>
      ) : (
        <Button type="button" size="icon" className="size-11 shrink-0 rounded-full" onClick={comecarGravacao} disabled={enviando} aria-label="Gravar áudio">
          {enviando ? <Loader2Icon className="animate-spin" /> : <MicIcon />}
        </Button>
      )}
    </form>
  );
}
