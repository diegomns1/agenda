"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowUpIcon, DownloadIcon, ImagePlusIcon, Loader2Icon, PlusIcon, Share2Icon, SparklesIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { situacaoImagem, type ItemImagemIA } from "../actions";

/*
 * "Criar com IA" nos Stories (15/11/2026): um chat que só gera imagem. Ela escreve, anexa fotos e recebe a imagem
 * em formato de story. Mandar outra mensagem na mesma conversa ajusta a última imagem; "Nova imagem" começa do zero.
 */

const MAX_ANEXOS = 4;
const LADO_MAXIMO = 1536;

const SUGESTOES = [
  "Story de promoção: 20% de desconto nas unhas em gel esta semana",
  "Story avisando que tenho horários livres hoje à tarde",
  "Arte de Feliz Natal para minhas clientes, com a minha logo",
  "Story de antes e depois com as fotos que vou anexar",
];

/** Reduz a foto no navegador (até 1536 px, JPEG): envia rápido e cabe no limite do servidor. */
async function reduzir(arquivo: File): Promise<File> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  if (!blob) throw new Error("não reduziu");
  return new File([blob], arquivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

type Anexo = { arquivo: File; preview: string };

export function ChatImagens({ inicial, usadasInicial, limite }: { inicial: ItemImagemIA[]; usadasInicial: number; limite: number }) {
  const [itens, setItens] = useState<ItemImagemIA[]>(inicial);
  const [usadas, setUsadas] = useState(usadasInicial);
  // continua a última conversa (se houver)
  const [conversa, setConversa] = useState<string | null>(inicial.at(-1)?.conversa ?? null);
  const [texto, setTexto] = useState("");
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const gerando = itens.some((i) => i.estado === "gerando");
  const acabou = usadas >= limite;

  // enquanto alguma imagem está sendo criada, pergunta de 3 em 3 s
  useEffect(() => {
    const pendentes = itens.filter((i) => i.estado === "gerando").map((i) => i.id);
    if (!pendentes.length) return;
    const t = setInterval(async () => {
      for (const id of pendentes) {
        const novo = await situacaoImagem(id).catch(() => null);
        if (novo && novo.estado !== "gerando") {
          setItens((atual) => atual.map((i) => (i.id === id ? novo : i)));
          if (novo.estado === "erro") setUsadas((u) => Math.max(0, u - 1));
        }
      }
    }, 3000);
    return () => clearInterval(t);
  }, [itens]);

  const ultimoEstado = itens.at(-1)?.estado;
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [itens.length, ultimoEstado]);

  async function anexar(lista: FileList | null) {
    if (!lista?.length) return;
    const livres = MAX_ANEXOS - anexos.length;
    if (lista.length > livres) toast.error(`Dá para anexar até ${MAX_ANEXOS} fotos por vez.`);
    const novos: Anexo[] = [];
    for (const f of Array.from(lista).slice(0, livres)) {
      if (!f.type.startsWith("image/")) continue;
      try {
        const r = await reduzir(f);
        novos.push({ arquivo: r, preview: URL.createObjectURL(r) });
      } catch {
        toast.error("Não consegui abrir uma das fotos.");
      }
    }
    setAnexos((a) => [...a, ...novos]);
  }

  function tirarAnexo(i: number) {
    setAnexos((a) => {
      URL.revokeObjectURL(a[i].preview);
      return a.filter((_, j) => j !== i);
    });
  }

  async function enviar(pedido = texto) {
    const p = pedido.trim();
    if (p.length < 3 || enviando || gerando || acabou) return;
    setEnviando(true);
    try {
      const form = new FormData();
      form.append("pedido", p);
      if (conversa) form.append("conversa", conversa);
      for (const a of anexos) form.append("anexo", a.arquivo);
      const r = await fetch("/api/imagens-ia", { method: "POST", body: form });
      const json = (await r.json().catch(() => ({}))) as { ok?: boolean; erro?: string; id?: string; conversa?: string; usadas?: number };
      if (!r.ok || !json.ok || !json.id || !json.conversa) {
        toast.error(json.erro ?? "Não consegui enviar. Tente de novo.");
        return;
      }
      setConversa(json.conversa);
      setUsadas(json.usadas ?? usadas + 1);
      setItens((atual) => [
        ...atual,
        { id: json.id!, conversa: json.conversa!, pedido: p, anexos: anexos.length, estado: "gerando", erro: null, url: null, criadoEm: new Date().toISOString() },
      ]);
      setTexto("");
      anexos.forEach((a) => URL.revokeObjectURL(a.preview));
      setAnexos([]);
    } catch {
      toast.error("Sem conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  function novaConversa() {
    setConversa(null);
    toast.success("Pronto: a próxima mensagem cria uma imagem nova, do zero.");
  }

  async function arquivoDaImagem(item: ItemImagemIA) {
    const blob = await fetch(item.url!).then((r) => r.blob());
    return new File([blob], `story-vaguinha-${item.id.slice(0, 8)}.jpg`, { type: "image/jpeg" });
  }

  async function baixar(item: ItemImagemIA) {
    try {
      const arquivo = await arquivoDaImagem(item);
      const url = URL.createObjectURL(arquivo);
      const a = document.createElement("a");
      a.href = url;
      a.download = arquivo.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      toast.error("Não consegui baixar. Tente de novo.");
    }
  }

  async function compartilhar(item: ItemImagemIA) {
    try {
      const arquivo = await arquivoDaImagem(item);
      if (navigator.canShare?.({ files: [arquivo] })) await navigator.share({ files: [arquivo], title: "Story" });
      else await baixar(item);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast.error("Não consegui compartilhar. Use Baixar.");
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn("text-sm", acabou ? "font-medium text-destructive" : "text-muted-foreground")}>
          {usadas} de {limite} imagens este mês
        </p>
        {itens.length ? (
          <Button variant="outline" size="sm" onClick={novaConversa} disabled={!conversa}>
            <PlusIcon />
            Nova imagem
          </Button>
        ) : null}
      </div>

      {/* conversa */}
      <div className="grid gap-4">
        {itens.length === 0 ? (
          <div className="grid gap-3 rounded-2xl border border-dashed p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <SparklesIcon className="size-4 text-primary" />
              Descreva a imagem que você quer, como se falasse com uma designer
            </p>
            <p className="text-sm text-muted-foreground">
              Dá para anexar a sua logo, fotos do seu trabalho ou uma inspiração. Depois é só pedir ajustes: “troca o fundo para rosa”, “aumenta o
              texto”.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTexto(s)}
                  className="min-h-toque rounded-full border px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted/60"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {itens.map((item, i) => (
          <div key={item.id} className="grid gap-2">
            {i > 0 && itens[i - 1].conversa !== item.conversa ? (
              <p className="my-1 text-center text-xs text-muted-foreground">— nova imagem —</p>
            ) : null}
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary/10 px-3 py-2 text-sm whitespace-pre-wrap">
              {item.pedido}
              {item.anexos ? <span className="mt-1 block text-xs text-muted-foreground">📎 {item.anexos} foto{item.anexos > 1 ? "s" : ""}</span> : null}
            </div>
            <div className="max-w-[85%]">
              {item.estado === "gerando" ? (
                <div className="flex aspect-[2/3] w-56 flex-col items-center justify-center gap-2 rounded-2xl border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                  <Loader2Icon className="size-5 animate-spin text-primary" />
                  Criando sua imagem… pode levar até 1 minuto.
                </div>
              ) : item.estado === "erro" ? (
                <p className="rounded-2xl rounded-bl-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                  {item.erro ?? "Não deu certo."} <span className="text-muted-foreground">(não contou no seu limite)</span>
                </p>
              ) : item.url ? (
                <div className="grid w-fit gap-2">
                  <a href={item.url} target="_blank" rel="noreferrer" title="Abrir em tamanho cheio">
                    {/* eslint-disable-next-line @next/next/no-img-element -- link temporário do bucket privado */}
                    <img src={item.url} alt={`Imagem criada: ${item.pedido.slice(0, 80)}`} className="w-56 rounded-2xl border shadow-sm sm:w-64" />
                  </a>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => compartilhar(item)}>
                      <Share2Icon />
                      Compartilhar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => baixar(item)}>
                      <DownloadIcon />
                      Baixar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">A imagem expirou da tela. Recarregue a página para ver de novo.</p>
              )}
            </div>
          </div>
        ))}
        <div ref={fimRef} />
      </div>

      {/* caixa de mensagem */}
      <div className="sticky bottom-24 grid gap-2 rounded-2xl border bg-card p-2 shadow-sm">
        {anexos.length ? (
          <div className="flex flex-wrap gap-2 px-1 pt-1">
            {anexos.map((a, i) => (
              <div key={a.preview} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- prévia local */}
                <img src={a.preview} alt={`Foto anexada ${i + 1}`} className="size-14 rounded-lg border object-cover" />
                <button
                  type="button"
                  onClick={() => tirarAnexo(i)}
                  aria-label={`Tirar a foto ${i + 1}`}
                  className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-foreground text-background"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <input ref={arquivoRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { anexar(e.target.files); e.target.value = ""; }} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 shrink-0"
            onClick={() => arquivoRef.current?.click()}
            disabled={anexos.length >= MAX_ANEXOS || acabou}
            aria-label="Anexar foto"
          >
            <ImagePlusIcon />
          </Button>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) {
                e.preventDefault();
                enviar();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={acabou ? "Você já usou as imagens deste mês" : conversa && itens.length ? "Peça um ajuste ou descreva outra imagem…" : "Descreva a imagem…"}
            disabled={acabou}
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-base outline-none field-sizing-content placeholder:text-muted-foreground"
          />
          <Button
            type="button"
            size="icon"
            className="size-10 shrink-0 rounded-full"
            onClick={() => enviar()}
            disabled={texto.trim().length < 3 || enviando || gerando || acabou}
            aria-label="Criar imagem"
          >
            {enviando ? <Loader2Icon className="animate-spin" /> : <ArrowUpIcon />}
          </Button>
        </div>
      </div>
    </div>
  );
}
