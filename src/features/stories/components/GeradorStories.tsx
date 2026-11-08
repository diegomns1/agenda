"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  DownloadIcon,
  ImagePlusIcon,
  Loader2Icon,
  RefreshCwIcon,
  Share2Icon,
  XIcon,
} from "lucide-react";
import { sugerirStory } from "@/features/stories/actions";
import { gradeDoDia, gradeGenerica } from "@/features/stories/selecao";
import { TEMAS, TIPOS_STORY, type TipoStory } from "@/features/stories/temas";
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

export function GeradorStories({ hoje, corPrimaria, corSecundaria, expediente, intervaloMin, servicos, tipoInicial, dataInicial }: Props) {
  const [tipo, setTipo] = useState<TipoStory>(tipoInicial ?? "dia");
  const [temaId, setTemaId] = useState("neutro");
  const [dia, setDia] = useState<DataISO>(dataInicial ?? hoje);
  const [inicioSemana, setInicioSemana] = useState<DataISO>(dataInicial ?? hoje);
  const [mes, setMes] = useState((dataInicial ?? hoje).slice(0, 7)); // "AAAA-MM"
  const [horarios, setHorarios] = useState<string[]>([]);
  const [dias, setDias] = useState<DataISO[]>([]);
  const [servicosSel, setServicosSel] = useState<string[]>(servicos.map((s) => s.id));
  const [foto, setFoto] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const [ocupado, setOcupado] = useState<"baixar" | "compartilhar" | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const dataBase: DataISO = tipo === "dia" ? dia : tipo === "semana" ? inicioSemana : tipo === "mes" ? `${mes}-01` : hoje;

  // ---- sugestão da agenda: pré-marca o que está livre sempre que muda o modelo ou a data ----
  const chaveSugestao = `${tipo}|${dataBase}`;
  const [sugestaoDe, setSugestaoDe] = useState<string | null>(null);
  useEffect(() => {
    if (tipo === "servicos") return;
    let ativo = true;
    sugerirStory(tipo, dataBase)
      .then((s) => {
        if (!ativo) return;
        setHorarios(s.horarios ?? []);
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
        ...(tipo === "dia" ? { horarios } : {}),
        ...(tipo === "semana" || tipo === "mes" ? { dias } : {}),
        ...(tipo === "servicos" ? { servicos: servicosSel, foto: servicosSel.length === 1 ? foto : null } : {}),
        v: versao,
      }),
    [tipo, temaId, dataBase, horarios, dias, servicosSel, foto, versao],
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

  function alternar<T>(lista: T[], item: T) {
    return lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item];
  }

  // ---- dados derivados para os painéis ----
  const gradeDia = useMemo(() => gradeDoDia(dia, expediente, intervaloMin), [dia, expediente, intervaloMin]);
  const folgaNoDia = gradeDia.length === 0;
  const gradeExibida = folgaNoDia ? gradeGenerica(intervaloMin) : gradeDia;
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
