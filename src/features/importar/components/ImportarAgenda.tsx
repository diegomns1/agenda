"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarCheckIcon, FileUpIcon, Loader2Icon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarData } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { importarCompromissos, type ResultadoImportacao } from "@/features/importar/actions";
import { lerIcs, separarTitulo, sugerirTipo, textosDoArquivo, type AgendaLida, type TipoImportacao } from "@/features/importar/ical";

type Linha = {
  chave: string;
  agenda: string;
  titulo: string;
  nome: string;
  observacao: string | null;
  inicio: string;
  fim: string;
  diaInteiro: boolean;
};

const ROTULO_TIPO: Record<TipoImportacao, string> = { atendimento: "Atendimento", bloqueio: "Compromisso meu", ignorar: "Não trazer" };
const POR_PAGINA = 150;

export function ImportarAgenda() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const [incluirPassado, setIncluirPassado] = useState(false);
  const [agendas, setAgendas] = useState<AgendaLida[] | null>(null);
  const [agendasMarcadas, setAgendasMarcadas] = useState<string[]>([]);
  const [tipos, setTipos] = useState<Record<string, TipoImportacao>>({});
  const [criarClientes, setCriarClientes] = useState(true);
  const [filtro, setFiltro] = useState<TipoImportacao | "todos">("todos");
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [resultado, setResultado] = useState<Extract<ResultadoImportacao, { ok: true }> | null>(null);
  const [enviando, iniciar] = useTransition();

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setLendo(true);
    setResultado(null);
    try {
      const textos = await textosDoArquivo(arquivo);
      if (textos.length === 0) throw new Error("Não achei nenhuma agenda (.ics) dentro desse arquivo.");
      const agora = new Date();
      const de = new Date(agora.getTime() - (incluirPassado ? 92 : 0) * 86_400_000);
      de.setUTCHours(3, 0, 0, 0); // começo do dia em Brasília
      const ate = new Date(agora.getTime() + 400 * 86_400_000);
      // uma agenda com defeito não derruba as outras do mesmo .zip
      const lidas: AgendaLida[] = [];
      for (const t of textos) {
        try {
          lidas.push(lerIcs(t.texto, t.nome, de, ate));
        } catch {
          // agenda ilegível: fica de fora
        }
      }
      if (lidas.length === 0) throw new Error("Não consegui ler as agendas desse arquivo. Exporte de novo no Google Agenda e tente outra vez.");
      const novosTipos: Record<string, TipoImportacao> = {};
      for (const a of lidas) for (const ev of a.eventos) novosTipos[`${a.arquivo}|${ev.chave}`] = sugerirTipo(ev, a.automatica);
      setAgendas(lidas);
      setAgendasMarcadas(lidas.filter((a) => !a.automatica && a.eventos.length > 0).map((a) => a.arquivo));
      setTipos(novosTipos);
      setFiltro("todos");
      setMostrar(POR_PAGINA);
      if (lidas.every((a) => a.eventos.length === 0)) toast.info("O arquivo foi lido, mas não tem compromissos no período escolhido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível ler o arquivo.");
    } finally {
      setLendo(false);
    }
  }

  const linhas: Linha[] = useMemo(() => {
    if (!agendas) return [];
    return agendas
      .filter((a) => agendasMarcadas.includes(a.arquivo))
      .flatMap((a) =>
        a.eventos.map((ev) => {
          const { nome, observacao } = separarTitulo(ev.titulo);
          return { chave: `${a.arquivo}|${ev.chave}`, agenda: a.nome, titulo: ev.titulo, nome, observacao, inicio: ev.inicio, fim: ev.fim, diaInteiro: ev.diaInteiro };
        }),
      )
      .sort((x, y) => x.inicio.localeCompare(y.inicio));
  }, [agendas, agendasMarcadas]);

  const contagem = useMemo(() => {
    const c = { atendimento: 0, bloqueio: 0, ignorar: 0 };
    for (const l of linhas) c[tipos[l.chave] ?? "ignorar"] += 1;
    return c;
  }, [linhas, tipos]);

  const filtradas = filtro === "todos" ? linhas : linhas.filter((l) => tipos[l.chave] === filtro);
  const aImportar = contagem.atendimento + contagem.bloqueio;

  function importar() {
    const itens = linhas
      .filter((l) => tipos[l.chave] === "atendimento" || tipos[l.chave] === "bloqueio")
      .map((l) => ({
        tipo: tipos[l.chave] as "atendimento" | "bloqueio",
        // compromisso: o título sem a hora da frente ("11h Academia" → "Academia")
        nome: tipos[l.chave] === "bloqueio" ? [l.nome, l.observacao].filter(Boolean).join(", ").slice(0, 80) || l.titulo.slice(0, 80) : l.nome,
        observacao: tipos[l.chave] === "atendimento" ? l.observacao : null,
        inicio: l.inicio,
        fim: l.fim,
      }));
    if (itens.length === 0) {
      toast.info("Nada marcado para trazer.");
      return;
    }
    iniciar(async () => {
      let r: ResultadoImportacao;
      try {
        r = await importarCompromissos({ itens, criarClientes });
      } catch {
        // quase sempre: o Vaguinha foi atualizado com esta tela aberta (a página antiga não acha mais o servidor novo)
        toast.error("Não consegui falar com o servidor. Toque em Recarregar e escolha o arquivo de novo.", {
          duration: Infinity,
          action: { label: "Recarregar", onClick: () => window.location.reload() },
        });
        return;
      }
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      setResultado(r);
      setAgendas(null);
      toast.success(`${r.importados} compromisso${r.importados === 1 ? "" : "s"} na sua agenda.`);
    });
  }

  // ------------------------------------------------------------ resultado
  if (resultado) {
    return (
      <section className="surgir grid grid-cols-1 gap-4 rounded-2xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <CalendarCheckIcon className="mt-0.5 size-6 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Pronto! {resultado.importados} compromisso{resultado.importados === 1 ? "" : "s"} na sua agenda.</h2>
            <p className="text-sm text-muted-foreground">
              {resultado.clientesNovas > 0 ? `${resultado.clientesNovas} cadastro${resultado.clientesNovas === 1 ? " novo" : "s novos"} em Clientes (sem WhatsApp: complete quando puder). ` : ""}
              Os lembretes já valem para os próximos atendimentos.
            </p>
          </div>
        </div>
        {resultado.recusados.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-aviso-borda/60 bg-aviso p-3 text-sm text-aviso-texto">
            <p className="flex items-center gap-2 font-medium">
              <TriangleAlertIcon className="size-4 text-aviso-forte" />
              {resultado.recusados.length === 1
                ? "1 ficou de fora porque o horário já estava ocupado"
                : `${resultado.recusados.length} ficaram de fora porque o horário já estava ocupado`}
            </p>
            <p className="text-xs text-muted-foreground">Pode ser algo que já estava na agenda (ou importado antes) ou dois compromissos no mesmo horário no Google.</p>
            <ul className="max-h-48 overflow-y-auto text-xs">
              {resultado.recusados.map((r, i) => (
                <li key={i} className="py-0.5">
                  <span className="tabular-nums">{formatarData(r.inicio, "dd/MM HH:mm")}</span> · {r.nome}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/agenda">Ver minha agenda</Link>
          </Button>
          <Button variant="ghost" onClick={() => setResultado(null)}>
            <RotateCcwIcon />
            Importar outro arquivo
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5">
      {/* 1. Como baixar */}
      <section className="grid grid-cols-1 gap-2 rounded-2xl border bg-card p-4 text-sm">
        <h2 className="font-semibold">1. Baixe sua agenda do Google</h2>
        <ol className="grid list-decimal gap-1 pl-5 text-muted-foreground">
          <li>
            Abra <strong className="text-foreground">calendar.google.com</strong> no computador. No celular, abra pelo Chrome e ative{" "}
            <em>&quot;Site para computador&quot;</em> no menu ⋮.
          </li>
          <li>
            Toque na engrenagem → <strong className="text-foreground">Configurações</strong> → <strong className="text-foreground">Importar e exportar</strong> →{" "}
            <strong className="text-foreground">Exportar</strong>.
          </li>
          <li>Vai baixar um arquivo .zip. Não precisa abrir: é só escolher ele aqui embaixo.</li>
        </ol>
        <p className="text-xs text-muted-foreground">
          Use a conta do Google onde estão os seus horários. Se aparecer &quot;nenhum compromisso&quot;, a agenda pode estar em outra conta.
        </p>
      </section>

      {/* 2. Escolher arquivo */}
      <section className="grid grid-cols-1 gap-3 rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-semibold">2. Escolha o arquivo</h2>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 size-4 accent-[var(--primary)]" checked={incluirPassado} onChange={(e) => setIncluirPassado(e.target.checked)} />
          <span>
            Trazer também os últimos 3 meses
            <span className="block text-xs text-muted-foreground">Entram como concluídos e aparecem no histórico e nos relatórios. Sem marcar, vem só de hoje em diante.</span>
          </span>
        </label>
        {/* sem `accept`: em alguns Android o .zip do Google vem com outro tipo e ficava cinza na hora de escolher.
            O arquivo é conferido pelo conteúdo depois (textosDoArquivo). */}
        <input ref={inputRef} type="file" className="hidden" onChange={aoEscolher} />
        <Button className="h-toque w-fit sm:h-toque" onClick={() => inputRef.current?.click()} disabled={lendo || enviando}>
          {lendo ? <Loader2Icon className="animate-spin" /> : <FileUpIcon />}
          {agendas ? "Escolher outro arquivo" : "Escolher arquivo (.zip ou .ics)"}
        </Button>
        <p className="text-xs text-muted-foreground">O arquivo é lido aqui no seu aparelho. Só os compromissos que você confirmar vão para a agenda.</p>
      </section>

      {/* 3. Prévia */}
      {agendas ? (
        <section className="surgir grid grid-cols-1 gap-3 rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-semibold">3. Confira antes de trazer</h2>
          <p className="text-xs text-muted-foreground">
            Academia, médico, seu cabelo, folga: marque <strong className="text-foreground">Compromisso meu</strong>. O horário fica ocupado, mas não vira cliente.
          </p>

          {agendas.length > 1 ? (
            <div className="grid grid-cols-1 gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Agendas encontradas no arquivo</p>
              {agendas.map((a) => (
                <label key={a.arquivo} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    checked={agendasMarcadas.includes(a.arquivo)}
                    onChange={(e) => setAgendasMarcadas((l) => (e.target.checked ? [...l, a.arquivo] : l.filter((x) => x !== a.arquivo)))}
                  />
                  <span className="min-w-0 flex-1 truncate">{a.nome}</span>
                  <span className="text-xs text-muted-foreground">
                    {a.eventos.length} {a.automatica ? "(aniversários/feriados)" : ""}
                  </span>
                </label>
              ))}
            </div>
          ) : null}

          {linhas.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
              Nenhum compromisso {incluirPassado ? "nos últimos 3 meses nem daqui para a frente" : "de hoje em diante"} nas agendas marcadas.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {(["todos", "atendimento", "bloqueio", "ignorar"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setFiltro(f);
                      setMostrar(POR_PAGINA);
                    }}
                    className={cn("min-h-toque sm:min-h-0 rounded-full border px-3 py-1 font-medium", filtro === f ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground")}
                  >
                    {f === "todos" ? `Todos ${linhas.length}` : `${ROTULO_TIPO[f]} ${contagem[f]}`}
                  </button>
                ))}
              </div>

              <ul className="divide-y rounded-xl border">
                {filtradas.slice(0, mostrar).map((l) => {
                  const tipo = tipos[l.chave] ?? "ignorar";
                  return (
                    <li key={l.chave} className={cn("flex items-center gap-2 px-3 py-2", tipo === "ignorar" && "opacity-55")}>
                      <div className="w-16 shrink-0 text-xs leading-tight tabular-nums">
                        <p className="font-semibold">{formatarData(l.inicio, "dd/MM")}</p>
                        <p className="text-muted-foreground">{l.diaInteiro ? "dia todo" : formatarData(l.inicio, "HH:mm")}</p>
                      </div>
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="truncate font-medium">{tipo === "atendimento" ? l.nome : l.titulo}</p>
                        {tipo === "atendimento" && (l.nome !== l.titulo || l.observacao) ? (
                          <p className="truncate text-xs text-muted-foreground">no Google: {l.titulo}</p>
                        ) : null}
                      </div>
                      <select
                        aria-label={`O que fazer com ${l.titulo}`}
                        value={tipo}
                        onChange={(e) => setTipos((t) => ({ ...t, [l.chave]: e.target.value as TipoImportacao }))}
                        className="h-8 shrink-0 rounded-md border bg-background px-1.5 text-xs"
                      >
                        {(Object.keys(ROTULO_TIPO) as TipoImportacao[]).map((t) => (
                          <option key={t} value={t}>
                            {ROTULO_TIPO[t]}
                          </option>
                        ))}
                      </select>
                    </li>
                  );
                })}
              </ul>
              {filtradas.length > mostrar ? (
                <Button variant="ghost" size="sm" className="w-fit" onClick={() => setMostrar((m) => m + POR_PAGINA)}>
                  Mostrar mais {Math.min(POR_PAGINA, filtradas.length - mostrar)}
                </Button>
              ) : null}
              {agendas.some((a) => a.cortada) ? <p className="text-xs text-muted-foreground">Arquivo muito grande: só os primeiros 3.000 compromissos entraram na lista.</p> : null}

              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1 size-4 accent-[var(--primary)]" checked={criarClientes} onChange={(e) => setCriarClientes(e.target.checked)} />
                <span>
                  Cadastrar em Clientes quem ainda não está lá
                  <span className="block text-xs text-muted-foreground">Quem já tem cadastro com o mesmo nome é ligado automaticamente.</span>
                </span>
              </label>

              <Button className="h-toque sm:h-toque" onClick={importar} disabled={enviando || aImportar === 0}>
                {enviando ? <Loader2Icon className="animate-spin" /> : <CalendarCheckIcon />}
                {enviando ? "Trazendo para a agenda…" : `Trazer ${aImportar} para a agenda`}
              </Button>
              <p className="text-xs text-muted-foreground">
                {contagem.atendimento} atendimento{contagem.atendimento === 1 ? "" : "s"} e {contagem.bloqueio} compromisso{contagem.bloqueio === 1 ? "" : "s"} seu{contagem.bloqueio === 1 ? "" : "s"}. Se algum
                horário bater com outro já marcado, ele fica de fora e você vê a lista no final.
              </p>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
