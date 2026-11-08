"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  ImagePlusIcon,
  Loader2Icon,
  RefreshCwIcon,
  Share2Icon,
  XIcon,
} from "lucide-react";
import { sugerirStory } from "@/features/stories/actions";
import { gradeDoDia, gradeGenerica } from "@/features/stories/selecao";
import { caminhoFundo, ID_MEU_FUNDO, obterTema, TEMAS, TIPOS_STORY, type Tema, type TipoStory } from "@/features/stories/temas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { diaDaSemana, diasEntre, intervaloDoMes, somarDias, type DataISO } from "@/lib/datas";
import { formatarMoeda } from "@/lib/moeda";
import { cn } from "@/lib/utils";
import type { Expediente } from "@/types/database";

type ServicoResumo = { id: string; nome: string; valor: number };

type Props = {
  hoje: DataISO;
  corPrimaria: string;
  corSecundaria: string;
  expediente: Expediente;
  intervaloMin: number;
  servicos: ServicoResumo[];
  tipoInicial?: TipoStory;
  dataInicial?: DataISO;
  /** Horário que vagou ("Divulgar" na tela Hoje): o story do dia abre só com ele marcado. */
  horaInicial?: string;
};

const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const CABECALHO_MES = ["S", "T", "Q", "Q", "S", "S", "D"];
const LADO_FOTO = 1080;

/** Reduz a foto no navegador e devolve um data URL JPEG (cabe no corpo do pedido). */
async function reduzirFoto(arquivo: File): Promise<string> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_FOTO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a foto.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

const CHAVE_MEU_FUNDO = "vaguinha-stories-meu-fundo";

/** Recorta a imagem no formato do story (9:16, pelo centro) e devolve um JPEG 1080x1920. */
async function recortarFundo(arquivo: File): Promise<string> {
  const bitmap = await createImageBitmap(arquivo);
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  const escala = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height);
  const w = bitmap.width * escala;
  const h = bitmap.height * escala;
  ctx.drawImage(bitmap, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

/** Lê o fundo guardado neste aparelho (pode não existir ou o navegador bloquear). */
function lerMeuFundo(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CHAVE_MEU_FUNDO);
  } catch {
    return null;
  }
}

/** Miniatura de um tema: o papel de parede, o fundo da profissional, ou as cores (tema "Minhas cores"). */
function MiniaturaTema({
  tema,
  corPrimaria,
  corSecundaria,
  meuFundo,
  className,
}: {
  tema: Tema;
  corPrimaria: string;
  corSecundaria: string;
  meuFundo?: string | null;
  className?: string;
}) {
  if (tema.personalizado) {
    return meuFundo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={meuFundo} alt="" className={cn("aspect-[9/16] w-full rounded-lg object-cover ring-1 ring-black/10", className)} />
    ) : (
      <span className={cn("flex aspect-[9/16] w-full items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-primary", className)}>
        <ImagePlusIcon className="size-1/3" />
      </span>
    );
  }
  if (tema.imagem) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={caminhoFundo(tema.id, true)} alt="" loading="lazy" className={cn("aspect-[9/16] w-full rounded-lg object-cover ring-1 ring-black/10", className)} />
    );
  }
  return (
    <span
      className={cn("flex aspect-[9/16] w-full items-center justify-center rounded-lg ring-1 ring-black/10", className)}
      style={{ background: `linear-gradient(160deg, ${corSecundaria} 0%, #FFFFFF 100%)` }}
    >
      <span className="size-1/3 rounded-full" style={{ background: corPrimaria, opacity: 0.85 }} />
    </span>
  );
}

function SeletorTema({
  temaId,
  aoEscolher,
  corPrimaria,
  corSecundaria,
  meuFundo,
  aoPedirFundo,
  aoRemoverFundo,
}: {
  temaId: string;
  aoEscolher: (id: string) => void;
  corPrimaria: string;
  corSecundaria: string;
  meuFundo: string | null;
  aoPedirFundo: () => void;
  aoRemoverFundo: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const atual = obterTema(temaId);
  const grupos: { titulo: string; temas: Tema[] }[] = [
    { titulo: "Para qualquer época", temas: TEMAS.filter((t) => t.grupo === "sempre") },
    { titulo: "Datas especiais", temas: TEMAS.filter((t) => t.grupo === "datas") },
  ];

  return (
    <section className="grid gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">Tema</h2>
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
        className="flex items-center gap-3 rounded-xl border bg-background p-2 pr-3 text-left transition-colors hover:bg-muted/50"
      >
        <MiniaturaTema tema={atual} corPrimaria={corPrimaria} corSecundaria={corSecundaria} meuFundo={meuFundo} className="w-9 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted-foreground">Selecionar tema</span>
          <span className="block truncate font-medium">{atual.nome}</span>
        </span>
        <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", aberto && "rotate-180")} />
      </button>

      {atual.personalizado && !aberto ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-2.5">
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            {meuFundo
              ? "Seu fundo fica guardado só neste aparelho. Imagens em pé (formato de story) ficam melhores."
              : "Escolha uma imagem sua para usar de fundo. Imagens em pé (formato de story) ficam melhores."}
          </p>
          <div className="flex gap-1">
            <Button type="button" variant="outline" size="sm" onClick={aoPedirFundo}>
              <ImagePlusIcon />
              {meuFundo ? "Trocar imagem" : "Escolher imagem"}
            </Button>
            {meuFundo ? (
              <Button type="button" variant="ghost" size="sm" onClick={aoRemoverFundo}>
                <XIcon />
                Remover
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {aberto ? (
        <div className="surgir grid gap-4 rounded-xl border bg-card p-3">
          {grupos.map((g) => (
            <div key={g.titulo} className="grid gap-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g.titulo}</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {g.temas.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={temaId === t.id}
                    onClick={() => {
                      // "Meu fundo" sem imagem ainda: abre a galeria; o tema é escolhido quando a imagem chegar
                      if (t.personalizado && !meuFundo) aoPedirFundo();
                      else aoEscolher(t.id);
                      setAberto(false);
                    }}
                    className={cn("grid gap-1 rounded-xl p-1 text-left transition-colors hover:bg-muted", temaId === t.id && "bg-primary/10 ring-2 ring-primary")}
                  >
                    <MiniaturaTema tema={t} corPrimaria={corPrimaria} corSecundaria={corSecundaria} meuFundo={meuFundo} />
                    <span className="truncate text-[11px] leading-tight font-medium">{t.nome}</span>
                    {t.quando ? <span className="truncate text-[10px] leading-tight text-muted-foreground">{t.quando}</span> : null}
                    {t.personalizado ? <span className="truncate text-[10px] leading-tight text-muted-foreground">{meuFundo ? "sua imagem" : "subir imagem"}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Alternador({ ativo, onClick, children, className, disabled }: { ativo: boolean; onClick: () => void; children: React.ReactNode; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40",
        ativo ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GeradorStories({ hoje, corPrimaria, corSecundaria, expediente, intervaloMin, servicos, tipoInicial, dataInicial, horaInicial }: Props) {
  const [tipo, setTipo] = useState<TipoStory>(tipoInicial ?? "dia");
  const [temaId, setTemaId] = useState("neutro");
  const [dia, setDia] = useState<DataISO>(dataInicial ?? hoje);
  const [inicioSemana, setInicioSemana] = useState<DataISO>(dataInicial ?? hoje);
  const [mes, setMes] = useState((dataInicial ?? hoje).slice(0, 7)); // "AAAA-MM"
  const [horarios, setHorarios] = useState<string[]>([]);
  const [dias, setDias] = useState<DataISO[]>([]);
  const [servicosSel, setServicosSel] = useState<string[]>(servicos.map((s) => s.id));
  const [foto, setFoto] = useState<string | null>(null);
  // Fundo próprio: lido do aparelho já no início (não muda o que aparece antes de abrir a caixa de temas)
  const [meuFundo, setMeuFundo] = useState<string | null>(lerMeuFundo);
  const [versao, setVersao] = useState(0);
  const [ocupado, setOcupado] = useState<"baixar" | "compartilhar" | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const inputFundoRef = useRef<HTMLInputElement>(null);

  const dataBase: DataISO = tipo === "dia" ? dia : tipo === "semana" ? inicioSemana : tipo === "mes" ? `${mes}-01` : hoje;

  // ---- sugestão da agenda: pré-marca o que está livre sempre que muda o modelo ou a data ----
  const chaveSugestao = `${tipo}|${dataBase}`;
  const [sugestaoDe, setSugestaoDe] = useState<string | null>(null);
  // Veio do aviso "vagou um horário": na primeira carga do dia, marca só aquele horário
  const vagaPendente = useRef(horaInicial && dataInicial ? { chave: `dia|${dataInicial}`, hora: horaInicial } : null);
  useEffect(() => {
    if (tipo === "servicos") return;
    let ativo = true;
    sugerirStory(tipo, dataBase)
      .then((s) => {
        if (!ativo) return;
        const vaga = vagaPendente.current;
        if (vaga && vaga.chave === chaveSugestao) {
          vagaPendente.current = null; // só na primeira vez; depois volta a sugerir pela agenda
          setHorarios([vaga.hora]);
        } else {
          setHorarios(s.horarios ?? []);
        }
        setDias(s.dias ?? []);
        setSugestaoDe(chaveSugestao);
      })
      .catch(() => {
        if (ativo) setSugestaoDe(chaveSugestao);
      });
    return () => {
      ativo = false;
    };
  }, [tipo, dataBase, chaveSugestao]);
  const sugerindo = tipo !== "servicos" && sugestaoDe !== chaveSugestao;

  // ---- prévia: gerada no servidor a partir do que está marcado ----
  const corpo = useMemo(
    () =>
      JSON.stringify({
        tema: temaId,
        data: dataBase,
        ...(temaId === ID_MEU_FUNDO ? { fundo: meuFundo } : {}),
        ...(tipo === "dia" ? { horarios } : {}),
        ...(tipo === "semana" || tipo === "mes" ? { dias } : {}),
        ...(tipo === "servicos" ? { servicos: servicosSel, foto: servicosSel.length === 1 ? foto : null } : {}),
        v: versao,
      }),
    [tipo, temaId, dataBase, horarios, dias, servicosSel, foto, meuFundo, versao],
  );
  const chavePrevia = `${tipo}|${corpo}`;
  const [previa, setPrevia] = useState<{ chave: string; url: string; blob: Blob } | null>(null);
  const [erroPrevia, setErroPrevia] = useState<string | null>(null);

  useEffect(() => {
    if (sugerindo) return;
    let ativo = true;
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/stories/${tipo}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: corpo,
          cache: "no-store",
        });
        if (!r.ok) throw new Error("Não foi possível gerar a prévia.");
        const blob = await r.blob();
        if (!ativo) return;
        const url = URL.createObjectURL(blob);
        setPrevia((anterior) => {
          if (anterior) URL.revokeObjectURL(anterior.url);
          return { chave: chavePrevia, url, blob };
        });
      } catch {
        if (ativo) setErroPrevia(chavePrevia);
      }
    }, 350);
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [tipo, corpo, chavePrevia, sugerindo]);

  const previaPronta = previa?.chave === chavePrevia;
  const carregandoPrevia = !previaPronta && erroPrevia !== chavePrevia;

  // ---- ações ----
  const nomeArquivo = `vaguinha-${tipo}-${tipo === "servicos" ? "tabela" : tipo === "mes" ? mes : dataBase}.png`;

  function arquivoAtual() {
    if (!previa || !previaPronta) {
      toast.info("Aguarde a prévia terminar de carregar.");
      return null;
    }
    return new File([previa.blob], nomeArquivo, { type: "image/png" });
  }

  function baixar() {
    const arquivo = arquivoAtual();
    if (!arquivo) return;
    setOcupado("baixar");
    const href = URL.createObjectURL(arquivo);
    const a = document.createElement("a");
    a.href = href;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(href);
    toast.success("Imagem salva. Agora é só postar nos stories.");
    setOcupado(null);
  }

  async function compartilhar() {
    const arquivo = arquivoAtual();
    if (!arquivo) return;
    setOcupado("compartilhar");
    try {
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: "Story" });
      } else {
        toast.info("Este navegador não compartilha imagens direto. Baixe e poste pelo Instagram.");
        baixar();
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) toast.error("Não foi possível compartilhar.");
    } finally {
      setOcupado(null);
    }
  }

  async function aoEscolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
      toast.error("Escolha uma imagem (JPG, PNG ou WEBP).");
      return;
    }
    try {
      setFoto(await reduzirFoto(arquivo));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível usar essa foto.");
    }
  }

  async function aoEscolherFundo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
      toast.error("Escolha uma imagem (JPG, PNG ou WEBP).");
      return;
    }
    try {
      const imagem = await recortarFundo(arquivo);
      setMeuFundo(imagem);
      setTemaId(ID_MEU_FUNDO);
      try {
        window.localStorage.setItem(CHAVE_MEU_FUNDO, imagem);
      } catch {
        toast.info("Não deu para guardar o fundo neste aparelho: ele vale só até sair desta tela.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível usar essa imagem.");
    }
  }

  function removerFundo() {
    setMeuFundo(null);
    try {
      window.localStorage.removeItem(CHAVE_MEU_FUNDO);
    } catch {
      // sem acesso ao armazenamento: nada a apagar
    }
  }

  function alternar<T>(lista: T[], item: T) {
    return lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item];
  }

  // ---- dados derivados para os painéis ----
  const gradeDia = useMemo(() => gradeDoDia(dia, expediente, intervaloMin), [dia, expediente, intervaloMin]);
  const folgaNoDia = gradeDia.length === 0;
  const gradeBase = folgaNoDia ? gradeGenerica(intervaloMin) : gradeDia;
  // um horário marcado fora da grade (ex.: vaga às 14:15 com grade de 30 min) também aparece para desmarcar
  const gradeExibida = horarios.some((h) => !gradeBase.includes(h)) ? [...new Set([...gradeBase, ...horarios])].sort() : gradeBase;
  const mostrandoVaga = tipo === "dia" && !!horaInicial && dia === dataInicial && horarios.length === 1 && horarios[0] === horaInicial;
  const diasDaSemana = useMemo(() => diasEntre(inicioSemana, somarDias(inicioSemana, 6)), [inicioSemana]);
  const gradeMes = useMemo(() => {
    const { inicio, fim, primeiro, ultimo } = intervaloDoMes(`${mes}-01`);
    return diasEntre(inicio, fim).map((d) => (d < primeiro || d > ultimo ? null : d));
  }, [mes]);

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

        {/* Tema: caixinha que abre e fecha */}
        <input ref={inputFundoRef} type="file" accept="image/*" className="hidden" onChange={aoEscolherFundo} />
        <SeletorTema
          temaId={temaId}
          aoEscolher={setTemaId}
          corPrimaria={corPrimaria}
          corSecundaria={corSecundaria}
          meuFundo={meuFundo}
          aoPedirFundo={() => inputFundoRef.current?.click()}
          aoRemoverFundo={removerFundo}
        />

        {/* ---------------- Dia ---------------- */}
        {tipo === "dia" ? (
          <section className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="data-story">Dia</Label>
              <Input id="data-story" type="date" value={dia} onChange={(e) => e.target.value && setDia(e.target.value)} className="h-11 w-48 text-base" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {sugerindo ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2Icon className="size-3.5 animate-spin" /> Conferindo sua agenda…
                  </span>
                ) : mostrandoVaga ? (
                  "Só o horário que vagou está marcado. Toque em outros se quiser divulgar mais."
                ) : folgaNoDia ? (
                  "Pelo seu expediente você não atende nesse dia. Marque os horários que quiser abrir."
                ) : (
                  "Os horários livres já vêm marcados. Toque para marcar ou desmarcar."
                )}
              </p>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setHorarios(gradeExibida)}>
                  Marcar todos
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setHorarios([])}>
                  Limpar
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {gradeExibida.map((h) => (
                <Alternador key={h} ativo={horarios.includes(h)} onClick={() => setHorarios((l) => alternar(l, h))} className="min-w-[4.5rem] tabular-nums">
                  {h}
                </Alternador>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {horarios.length === 0 ? "Nenhum horário marcado: o story vai dizer que a agenda está cheia." : `${horarios.length} horário${horarios.length === 1 ? "" : "s"} no story.`}
            </p>
          </section>
        ) : null}

        {/* ---------------- Semana ---------------- */}
        {tipo === "semana" ? (
          <section className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="inicio-semana">A partir de</Label>
              <Input id="inicio-semana" type="date" value={inicioSemana} onChange={(e) => e.target.value && setInicioSemana(e.target.value)} className="h-11 w-48 text-base" />
            </div>
            <p className="text-sm text-muted-foreground">
              {sugerindo ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2Icon className="size-3.5 animate-spin" /> Conferindo sua agenda…
                </span>
              ) : (
                "Marque os dias com vaga. Os outros aparecem como fechados."
              )}
            </p>
            <div className="grid grid-cols-7 gap-1.5">
              {diasDaSemana.map((d) => {
                const ativo = dias.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => setDias((l) => alternar(l, d))}
                    className={cn(
                      "flex flex-col items-center rounded-xl border py-2 text-sm transition-colors",
                      ativo ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <span className="text-[11px] uppercase">{DIAS_CURTOS[diaDaSemana(d)]}</span>
                    <span className="text-base font-semibold">{d.slice(8)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* ---------------- Mês ---------------- */}
        {tipo === "mes" ? (
          <section className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="mes-story">Mês</Label>
              <Input id="mes-story" type="month" value={mes} onChange={(e) => /^\d{4}-\d{2}$/.test(e.target.value) && setMes(e.target.value)} className="h-11 w-48 text-base" />
            </div>
            <p className="text-sm text-muted-foreground">
              {sugerindo ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2Icon className="size-3.5 animate-spin" /> Conferindo sua agenda…
                </span>
              ) : (
                "Toque nos dias que estão disponíveis. Dias que já passaram ficam travados."
              )}
            </p>
            <div className="grid grid-cols-7 gap-1 text-center">
              {CABECALHO_MES.map((c, i) => (
                <span key={i} className="py-1 text-xs font-medium text-muted-foreground">
                  {c}
                </span>
              ))}
              {gradeMes.map((d, i) =>
                d ? (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={dias.includes(d)}
                    disabled={d < hoje}
                    onClick={() => setDias((l) => alternar(l, d))}
                    className={cn(
                      "aspect-square rounded-lg border text-sm font-medium transition-colors disabled:opacity-30",
                      dias.includes(d) ? "border-primary bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted",
                      d === hoje && "ring-1 ring-primary/50",
                    )}
                  >
                    {Number(d.slice(8))}
                  </button>
                ) : (
                  <span key={`vazio-${i}`} />
                ),
              )}
            </div>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setDias(gradeMes.filter((d): d is string => !!d && d >= hoje))}>
                Marcar todos
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDias([])}>
                Limpar
              </Button>
            </div>
          </section>
        ) : null}

        {/* ---------------- Serviços ---------------- */}
        {tipo === "servicos" ? (
          <section className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Escolha o que quer divulgar. Com <strong>um</strong> serviço só, o story ganha destaque e aceita uma foto.
              </p>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setServicosSel(servicos.map((s) => s.id))}>
                  Todos
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setServicosSel([])}>
                  Nenhum
                </Button>
              </div>
            </div>
            {servicos.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">Cadastre seus serviços na aba Serviços para montar este story.</p>
            ) : (
              <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                {servicos.map((s) => {
                  const ativo = servicosSel.includes(s.id);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => setServicosSel((l) => alternar(l, s.id))}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60"
                      >
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded border",
                            ativo ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
                          )}
                        >
                          {ativo ? <CheckIcon className="size-3.5" /> : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{s.nome}</span>
                        <span className="text-sm text-muted-foreground">{s.valor > 0 ? formatarMoeda(s.valor) : "consulte"}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {servicosSel.length === 1 ? (
              <div className="grid gap-2 rounded-xl border border-dashed p-3">
                <p className="text-sm font-medium">Foto do serviço (opcional)</p>
                <input ref={inputFotoRef} type="file" accept="image/*" className="hidden" onChange={aoEscolherFoto} />
                {foto ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={foto} alt="" className="size-16 rounded-lg object-cover ring-1 ring-black/10" />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => inputFotoRef.current?.click()}>
                        <ImagePlusIcon />
                        Trocar foto
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setFoto(null)}>
                        <XIcon />
                        Remover
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="w-fit" onClick={() => inputFotoRef.current?.click()}>
                    <ImagePlusIcon />
                    Anexar foto
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">Uma foto quadrada do resultado fica melhor. A foto não é salva: vale só para esta imagem.</p>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={compartilhar} disabled={ocupado !== null || carregandoPrevia} className="h-11">
            {ocupado === "compartilhar" ? <Loader2Icon className="animate-spin" /> : <Share2Icon />}
            Compartilhar
          </Button>
          <Button variant="outline" onClick={baixar} disabled={ocupado !== null || carregandoPrevia} className="h-11">
            {ocupado === "baixar" ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
            Baixar imagem
          </Button>
          <Button variant="ghost" onClick={() => setVersao((v) => v + 1)} className="h-11" aria-label="Atualizar prévia">
            <RefreshCwIcon />
            Atualizar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          No celular, &quot;Compartilhar&quot; abre direto o Instagram. A imagem sai em 1080×1920, sem nomes de clientes.
        </p>
      </div>

      {/* Prévia */}
      <div className="mx-auto w-full max-w-[300px] lg:sticky lg:top-6 lg:self-start">
        <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border bg-muted shadow-sm">
          {previa ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previa.url} alt="Prévia do story" className={cn("size-full object-cover transition-opacity", carregandoPrevia && "opacity-50")} />
          ) : null}
          {carregandoPrevia ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground" aria-live="polite">
              <Loader2Icon className="size-6 animate-spin" />
            </div>
          ) : null}
          {erroPrevia === chavePrevia ? (
            <div className="absolute inset-x-0 bottom-0 bg-destructive/90 px-3 py-2 text-center text-xs text-white">Não foi possível gerar a prévia. Toque em Atualizar.</div>
          ) : null}
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">Prévia em tamanho reduzido</p>
      </div>
    </div>
  );
}
