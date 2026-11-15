"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DownloadIcon, Loader2Icon, Share2Icon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { situacaoImagem, type ItemImagemIA } from "../actions";

/*
 * Botão "Gerar com IA" do gerador de stories (16/11/2026): usa tudo o que a profissional escolheu no modelo pronto
 * (tipo, dia, horários, serviços, tema) e pede para a IA refazer com acabamento profissional. Gasta 1 imagem do mês.
 */

type Props = {
  /** dia | semana | mes | servicos */
  tipo: string;
  /** a mesma seleção que gera a prévia do modelo pronto (JSON) */
  selecao: string;
  /** a prévia ainda está carregando: espera para não gerar com dados antigos */
  desabilitado?: boolean;
  usadasInicial: number;
  limite: number;
};

export function GerarComIA({ tipo, selecao, desabilitado, usadasInicial, limite }: Props) {
  const [usadas, setUsadas] = useState(usadasInicial);
  const [enviando, setEnviando] = useState(false);
  const [item, setItem] = useState<ItemImagemIA | null>(null);
  const acabou = usadas >= limite;
  const gerando = enviando || item?.estado === "gerando";

  // enquanto a imagem é criada, pergunta de 3 em 3 s
  const idGerando = item?.estado === "gerando" ? item.id : null;
  useEffect(() => {
    if (!idGerando) return;
    const t = setInterval(async () => {
      const novo = await situacaoImagem(idGerando).catch(() => null);
      if (novo && novo.estado !== "gerando") {
        setItem(novo);
        if (novo.estado === "erro") setUsadas((u) => Math.max(0, u - 1));
        else toast.success("Seu story com IA ficou pronto!");
      }
    }, 3000);
    return () => clearInterval(t);
  }, [idGerando]);

  async function gerar() {
    if (gerando || acabou) return;
    setEnviando(true);
    try {
      const r = await fetch("/api/imagens-ia/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...JSON.parse(selecao), tipo }),
      });
      const json = (await r.json().catch(() => ({}))) as { ok?: boolean; erro?: string; id?: string; usadas?: number };
      if (!r.ok || !json.ok || !json.id) {
        toast.error(json.erro ?? "Não consegui começar. Tente de novo.");
        return;
      }
      setUsadas(json.usadas ?? usadas + 1);
      setItem({ id: json.id, conversa: "", pedido: "", anexos: 0, estado: "gerando", erro: null, url: null, criadoEm: new Date().toISOString() });
    } catch {
      toast.error("Sem conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function arquivo() {
    const blob = await fetch(item!.url!).then((r) => r.blob());
    return new File([blob], `story-ia-${item!.id.slice(0, 8)}.jpg`, { type: "image/jpeg" });
  }

  async function baixar() {
    try {
      const f = await arquivo();
      const url = URL.createObjectURL(f);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      toast.error("Não consegui baixar. Tente de novo.");
    }
  }

  async function compartilhar() {
    try {
      const f = await arquivo();
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: "Story" });
      else await baixar();
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast.error("Não consegui compartilhar. Use Baixar.");
    }
  }

  return (
    <section className="grid min-w-0 gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <SparklesIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Quer um story mais profissional?</h2>
          <p className="text-sm text-muted-foreground">
            A IA refaz este story com as mesmas informações que você escolheu acima e acabamento de designer. Usa 1 imagem do seu mês.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={gerar} disabled={gerando || acabou || desabilitado} className="h-toque sm:h-10">
          {gerando ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          {item?.estado === "pronta" ? "Gerar outra versão" : "Gerar com IA"}
        </Button>
        <span className={acabou ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
          {acabou ? `Você já usou as ${limite} imagens deste mês` : `${usadas} de ${limite} imagens usadas este mês`}
        </span>
      </div>

      {item?.estado === "gerando" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          <Loader2Icon className="size-4 animate-spin text-primary" />
          Criando o seu story… pode levar até 1 minuto. Pode continuar usando o painel.
        </p>
      ) : item?.estado === "erro" ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          {item.erro ?? "Não deu certo."} <span className="text-muted-foreground">(não contou no seu limite)</span>
        </p>
      ) : item?.url ? (
        <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
          <a href={item.url} target="_blank" rel="noreferrer" title="Abrir em tamanho cheio" className="mx-auto sm:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- link temporário do bucket privado */}
            <img src={item.url} alt="Story criado pela IA" className="w-48 rounded-2xl border shadow-sm" />
          </a>
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={compartilhar}>
                <Share2Icon />
                Compartilhar
              </Button>
              <Button size="sm" variant="outline" onClick={baixar}>
                <DownloadIcon />
                Baixar
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Confira os horários e os valores antes de postar: a IA às vezes troca um número. Para pedir um ajuste (“aumenta a letra”, “troca
              o fundo”), abra{" "}
              <Link href="/stories?aba=ia" className="font-medium text-primary underline underline-offset-4">
                Criar do zero com IA
              </Link>
              : a imagem já está lá.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
