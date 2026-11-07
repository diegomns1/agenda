"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ImageUpIcon, Loader2Icon, StoreIcon, Trash2Icon } from "lucide-react";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { salvarLogoUrl } from "@/features/perfil/actions";
import { Button } from "@/components/ui/button";

const TAMANHO_MAX_ORIGINAL = 8 * 1024 * 1024; // 8 MB antes de redimensionar
const LADO_MAX = 800;

type Props = {
  usuarioId: string;
  logoUrl: string | null;
};

/** Redimensiona a imagem no navegador (máx. 800px) e devolve PNG, preservando transparência. */
async function redimensionar(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem");
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Falha ao converter a imagem"))), "image/png");
  });
}

export function UploadLogo({ usuarioId, logoUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();
  const ocupado = enviando || pendente;

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      toast.error("Escolha um arquivo de imagem (PNG, JPG, WEBP ou SVG).");
      return;
    }
    if (arquivo.size > TAMANHO_MAX_ORIGINAL) {
      toast.error("Imagem muito grande. Use uma com até 8 MB.");
      return;
    }

    setEnviando(true);
    try {
      const ehSvg = arquivo.type === "image/svg+xml";
      const conteudo = ehSvg ? arquivo : await redimensionar(arquivo);
      const ext = ehSvg ? "svg" : "png";
      const tipo = ehSvg ? "image/svg+xml" : "image/png";

      if (conteudo.size > 2 * 1024 * 1024) {
        toast.error("Mesmo reduzida, a imagem passou de 2 MB. Tente outra.");
        return;
      }

      const supabase = criarClienteNavegador();
      const pasta = usuarioId;
      const caminho = `${pasta}/logo.${ext}`;

      // Remove versões antigas com outra extensão
      const { data: existentes } = await supabase.storage.from("logos").list(pasta);
      const antigos = (existentes ?? []).filter((a) => a.name !== `logo.${ext}`).map((a) => `${pasta}/${a.name}`);
      if (antigos.length) await supabase.storage.from("logos").remove(antigos);

      const { error } = await supabase.storage
        .from("logos")
        .upload(caminho, conteudo, { upsert: true, contentType: tipo, cacheControl: "3600" });
      if (error) {
        toast.error(`Falha no envio: ${error.message}`);
        return;
      }

      const { data } = supabase.storage.from("logos").getPublicUrl(caminho);
      const url = `${data.publicUrl}?v=${Date.now()}`;

      iniciarTransicao(async () => {
        const r = await salvarLogoUrl(url);
        if (r.ok) toast.success(r.mensagem);
        else toast.error(r.erro ?? "Não foi possível salvar a logo.");
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setEnviando(false);
    }
  }

  function remover() {
    iniciarTransicao(async () => {
      const r = await salvarLogoUrl(null);
      if (r.ok) toast.success(r.mensagem);
      else toast.error(r.erro ?? "Não foi possível remover a logo.");
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Sua logo" className="size-full object-contain" />
        ) : (
          <StoreIcon className="size-8 text-muted-foreground" />
        )}
      </div>

      <div className="grid gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          onChange={aoEscolher}
          aria-label="Escolher arquivo da logo"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={ocupado}>
            {ocupado ? <Loader2Icon className="animate-spin" /> : <ImageUpIcon />}
            {logoUrl ? "Trocar logo" : "Enviar logo"}
          </Button>
          {logoUrl ? (
            <Button type="button" variant="ghost" onClick={remover} disabled={ocupado}>
              <Trash2Icon />
              Remover
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">PNG com fundo transparente fica melhor. Até 8 MB.</p>
      </div>
    </div>
  );
}
