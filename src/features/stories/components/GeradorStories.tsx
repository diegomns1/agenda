"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DownloadIcon, Loader2Icon, RefreshCwIcon, Share2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TEMAS, TIPOS_STORY, type TipoStory } from "@/features/stories/temas";
// A prévia não usa estado de carregamento: o spinner fica atrás da <img> e some quando ela pinta.

type Props = { hoje: string; corPrimaria: string; corSecundaria: string };

export function GeradorStories({ hoje, corPrimaria, corSecundaria }: Props) {
  const [tipo, setTipo] = useState<TipoStory>("dia");
  const [temaId, setTemaId] = useState("neutro");
  const [data, setData] = useState(hoje);
  const [versao, setVersao] = useState(0);
  const [ocupado, setOcupado] = useState<"baixar" | "compartilhar" | null>(null);

  const url = useMemo(() => {
    const p = new URLSearchParams({ tema: temaId, data, v: String(versao) });
    return `/api/stories/${tipo}?${p.toString()}`;
  }, [tipo, temaId, data, versao]);

  const nomeArquivo = `vaguinha-${tipo}-${tipo === "servicos" ? "tabela" : data}.png`;

  async function obterArquivo() {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("Não foi possível gerar a imagem.");
    const blob = await r.blob();
    return new File([blob], nomeArquivo, { type: "image/png" });
  }

  async function baixar() {
    setOcupado("baixar");
    try {
      const arquivo = await obterArquivo();
      const href = URL.createObjectURL(arquivo);
      const a = document.createElement("a");
      a.href = href;
      a.download = nomeArquivo;
      a.click();
      URL.revokeObjectURL(href);
      toast.success("Imagem salva. Agora é só postar nos stories.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao baixar.");
    } finally {
      setOcupado(null);
    }
  }

  async function compartilhar() {
    setOcupado("compartilhar");
    try {
      const arquivo = await obterArquivo();
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: "Story" });
      } else {
        toast.info("Este navegador não compartilha imagens direto. Baixe e poste pelo Instagram.");
        await baixar();
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) toast.error("Não foi possível compartilhar.");
    } finally {
      setOcupado(null);
    }
  }

  const mostraData = tipo !== "servicos";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-5">
        {/* Modelo */}
        <section className="grid gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Modelo</h2>
          <div className="grid grid-cols-2 gap-2">
            {TIPOS_STORY.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTipo(t.id)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors",
                  tipo === t.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/60",
                )}
              >
                <p className="font-medium">{t.titulo}</p>
                <p className="text-xs text-muted-foreground">{t.descricao}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Tema */}
        <section className="grid gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Tema</h2>
          <div className="flex flex-wrap gap-2">
            {TEMAS.map((t) => {
              const cor = t.id === "neutro" ? corPrimaria : (t.primaria ?? corPrimaria);
              const fundo = t.id === "neutro" ? corSecundaria : t.fundo[1];
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemaId(t.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    temaId === t.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/60",
                  )}
                >
                  <span className="size-4 rounded-full ring-1 ring-black/10" style={{ background: `linear-gradient(135deg, ${cor} 50%, ${fundo} 50%)` }} />
                  {t.nome}
                </button>
              );
            })}
          </div>
        </section>

        {/* Data */}
        {mostraData ? (
          <section className="grid gap-1.5">
            <Label htmlFor="data-story">{tipo === "mes" ? "Qualquer dia do mês" : tipo === "semana" ? "Primeiro dia da semana" : "Dia"}</Label>
            <Input
              id="data-story"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="h-11 w-48 text-base"
            />
          </section>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={compartilhar} disabled={ocupado !== null} className="h-11">
            {ocupado === "compartilhar" ? <Loader2Icon className="animate-spin" /> : <Share2Icon />}
            Compartilhar
          </Button>
          <Button variant="outline" onClick={baixar} disabled={ocupado !== null} className="h-11">
            {ocupado === "baixar" ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
            Baixar imagem
          </Button>
          <Button
            variant="ghost"
            onClick={() => setVersao((v) => v + 1)}
            className="h-11"
            aria-label="Atualizar prévia"
          >
            <RefreshCwIcon />
            Atualizar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          No celular, &quot;Compartilhar&quot; abre direto o Instagram. A imagem sai em 1080×1920, sem nomes de clientes.
        </p>
      </div>

      {/* Prévia */}
      <div className="mx-auto w-full max-w-[300px]">
        <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border bg-muted shadow-sm">
          {/* O spinner fica atrás da imagem: aparece enquanto a nova prévia ainda não pintou */}
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground" aria-hidden="true">
            <Loader2Icon className="size-6 animate-spin" />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={url}
            src={url}
            alt="Prévia do story"
            className="relative size-full object-cover"
            onError={() => toast.error("Não foi possível gerar a prévia.")}
          />
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">Prévia em tamanho reduzido</p>
      </div>
    </div>
  );
}
