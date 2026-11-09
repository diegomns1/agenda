"use client";

import Link from "next/link";
import { Fragment, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon, RotateCcwIcon } from "lucide-react";
import { salvarModelos } from "@/features/mensagens/actions";
import {
  EMOJIS,
  MAX_MENSAGEM,
  preencher,
  SITUACOES,
  TIPOS_MENSAGEM,
  valoresDeExemplo,
  VARIAVEIS,
  type ContextoMensagem,
  type TipoMensagem,
} from "@/features/mensagens/modelos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  modelos: Record<TipoMensagem, string>;
  padroes: Record<TipoMensagem, string>;
  contexto: ContextoMensagem;
};

/** Mostra *negrito*, _itálico_ e ~riscado~ como o WhatsApp mostra. */
function FormatadoWhatsApp({ texto }: { texto: string }) {
  const partes = texto.split(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g);
  return (
    <>
      {partes.map((p, i) => {
        if (/^\*[^*\n]+\*$/.test(p)) return <strong key={i}>{p.slice(1, -1)}</strong>;
        if (/^_[^_\n]+_$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
        if (/^~[^~\n]+~$/.test(p)) return <s key={i}>{p.slice(1, -1)}</s>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

export function EditorMensagens({ modelos, padroes, contexto }: Props) {
  const [tipo, setTipo] = useState<TipoMensagem>("lembrete");
  const [textos, setTextos] = useState(modelos);
  const [salvos, setSalvos] = useState(modelos);
  const [salvando, iniciar] = useTransition();
  const campo = useRef<HTMLTextAreaElement>(null);

  const texto = textos[tipo];
  const alterado = TIPOS_MENSAGEM.some((t) => textos[t] !== salvos[t]);
  const exemplo = valoresDeExemplo(contexto);
  const usaEndereco = /\{endere[cç]o\}/i.test(texto);

  function mudar(novo: string) {
    setTextos((t) => ({ ...t, [tipo]: novo.slice(0, MAX_MENSAGEM) }));
  }

  /** Coloca o campo/emoji onde está o cursor (ou no fim) e devolve o foco ao texto. */
  function inserir(trecho: string) {
    const el = campo.current;
    const ini = el?.selectionStart ?? texto.length;
    const fim = el?.selectionEnd ?? texto.length;
    const novo = (texto.slice(0, ini) + trecho + texto.slice(fim)).slice(0, MAX_MENSAGEM);
    mudar(novo);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = Math.min(ini + trecho.length, novo.length);
      el.setSelectionRange(pos, pos);
    });
  }

  function salvar() {
    iniciar(async () => {
      const r = await salvarModelos(textos);
      if (r.ok) {
        setSalvos(textos);
        toast.success("Mensagens salvas.");
      } else toast.error(r.erro ?? "Não foi possível salvar.");
    });
  }

  return (
    <div className="grid gap-5 pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
      <div className="grid min-w-0 gap-4">
        {/* situações */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          {TIPOS_MENSAGEM.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              aria-pressed={tipo === t}
              className={cn(
                "inline-flex min-h-toque shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors",
                tipo === t ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              <span aria-hidden>{SITUACOES[t].emoji}</span>
              {SITUACOES[t].rotulo}
              {textos[t] !== salvos[t] ? <span className="size-1.5 rounded-full bg-current opacity-70" aria-label="alterado" /> : null}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{SITUACOES[tipo].quando}</p>

        <div className="grid gap-1.5">
          <label htmlFor="texto-mensagem" className="text-sm font-medium">
            Texto da mensagem
          </label>
          <textarea
            id="texto-mensagem"
            ref={campo}
            value={texto}
            onChange={(e) => mudar(e.target.value)}
            rows={12}
            maxLength={MAX_MENSAGEM}
            className="min-h-60 w-full resize-y rounded-2xl border border-input bg-background px-3.5 py-3 text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Dica: *negrito*, _itálico_. Linha com campo vazio (ex.: sem endereço) some sozinha.
            </span>
            <span className="shrink-0 tabular-nums">
              {texto.length}/{MAX_MENSAGEM}
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-medium">Campos que se preenchem sozinhos</p>
          <div className="flex flex-wrap gap-2">
            {VARIAVEIS.map((v) => (
              <button
                key={v.chave}
                type="button"
                onClick={() => inserir(`{${v.chave}}`)}
                title={`Ex.: ${exemplo[v.chave] || v.exemplo}`}
                className="inline-flex min-h-toque items-center rounded-full border border-dashed border-primary/40 bg-primary/5 px-3 text-sm text-primary hover:bg-primary/10 sm:min-h-9"
              >
                + {v.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-medium">Emojis</p>
          <div className="flex flex-wrap gap-1">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => inserir(e)}
                aria-label={`Inserir ${e}`}
                className="flex size-toque items-center justify-center rounded-xl text-xl hover:bg-muted sm:size-10"
              >
                {e}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">No celular, o teclado de emojis também funciona normalmente.</p>
        </div>

        <div>
          <Button type="button" variant="ghost" size="sm" disabled={texto === padroes[tipo]} onClick={() => mudar(padroes[tipo])}>
            <RotateCcwIcon />
            Voltar ao texto padrão
          </Button>
        </div>
      </div>

      {/* prévia */}
      <div className="grid gap-2 lg:sticky lg:top-20">
        <p className="text-sm font-medium">Como a pessoa recebe</p>
        <div className="rounded-3xl border bg-muted/60 p-4">
          <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-md bg-sucesso px-3.5 py-2.5 text-destaque leading-relaxed whitespace-pre-wrap text-foreground shadow-suave">
            {texto.trim() ? <FormatadoWhatsApp texto={preencher(texto, exemplo)} /> : <span className="text-muted-foreground">Mensagem vazia</span>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Prévia com dados de exemplo. Na hora de enviar, entram os dados do atendimento.</p>
        {usaEndereco && !contexto.endereco ? (
          <p className="rounded-xl bg-aviso px-3 py-2 text-sm text-aviso-texto">
            Você ainda não cadastrou o endereço: a linha do endereço não vai aparecer.{" "}
            <Link href="/perfil" className="font-semibold underline underline-offset-4">
              Cadastrar no Perfil
            </Link>
          </p>
        ) : null}
        {/\{link\}/i.test(texto) && !contexto.link ? (
          <p className="rounded-xl bg-aviso px-3 py-2 text-sm text-aviso-texto">
            Seu link de agendamento está desligado: a linha do link não vai aparecer.{" "}
            <Link href="/perfil#agendamento-online" className="font-semibold underline underline-offset-4">
              Ligar no Perfil
            </Link>
          </p>
        ) : null}
      </div>

      {/* salvar: aparece fixo (à mão no celular) só quando há mudança; senão, só um aviso discreto */}
      {alterado || salvando ? (
        <div className="sticky bottom-20 z-10 sm:bottom-4 lg:col-span-2">
          <Button type="button" onClick={salvar} disabled={salvando} className="h-12 w-full rounded-full text-base shadow-lg sm:h-12">
            {salvando ? <Loader2Icon className="animate-spin" /> : null}
            Salvar mensagens
          </Button>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground lg:col-span-2">Tudo salvo. As mensagens já valem nos botões do WhatsApp.</p>
      )}
    </div>
  );
}
