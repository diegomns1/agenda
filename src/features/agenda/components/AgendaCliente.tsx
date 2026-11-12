"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { CalendarOffIcon, PlusIcon, UploadIcon, XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  diasEntre,
  formatarDataISO,
  hojeISO,
  horaParaMinutos,
  inicioDaSemana,
  minutosDoDia,
  somarDias,
  type DataISO,
} from "@/lib/datas";
import { datasDoDia } from "@/lib/feriados";
import { cn } from "@/lib/utils";
import type { Mensagens } from "@/features/mensagens/modelos";
import type { Agendamento, Expediente, Servico } from "@/types/database";
import { janelaDoDia } from "@/features/agenda/disponibilidade";
import { BarraAgenda, type Visao } from "./BarraAgenda";
import { FOLGA_GRADE, GradeHoraria, PX_POR_MIN, type Coluna } from "./GradeHoraria";
import { VisaoMes } from "./VisaoMes";
import { CartaoAgendamento } from "./CartaoAgendamento";
import { DetalheAgendamento } from "./DetalheAgendamento";
import { LegendaAgenda } from "./LegendaAgenda";
import { Flutuante } from "@/components/layout/Flutuante";
import { destacarAgendamento, LinkAgenda, ProvedorNavegacaoAgenda, useMovimentoAgenda } from "@/features/agenda/movimento";
import { SemanaLista } from "./SemanaLista";
import { VISUAL_DATA } from "@/features/agenda/visual";
import { FormAgendamento, type ClienteResumo, type InicialForm } from "./FormAgendamento";
import { LimparAgenda } from "@/features/importar/components/LimparAgenda";

type Props = {
  visao: Visao;
  data: DataISO;
  agendamentos: Agendamento[];
  clientes: ClienteResumo[];
  servicos: Servico[];
  expediente: Expediente;
  intervaloMin: number;
  mensagens: Mensagens;
  abrirInicial?: InicialForm | null; // vindo de ?novo=atendimento&cliente=...
};

const DIA_SEMANA_CURTO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

// Aviso "Importar agenda" pode ser fechado; lembra neste aparelho.
// useSyncExternalStore: no servidor o aviso aparece; no navegador lê o que ficou guardado, sem erro de hidratação.
const CHAVE_AVISO_IMPORTAR = "vaguinha-aviso-importar-fechado";
const ouvintesAviso = new Set<() => void>();
function lerAvisoFechado() {
  try {
    return window.localStorage.getItem(CHAVE_AVISO_IMPORTAR) === "1";
  } catch {
    return false;
  }
}
function assinarAviso(fn: () => void) {
  ouvintesAviso.add(fn);
  return () => ouvintesAviso.delete(fn);
}

function diaEmSP(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export function AgendaCliente({ visao, data, agendamentos, clientes, servicos, expediente, intervaloMin, mensagens, abrirInicial }: Props) {
  const router = useRouter();

  // Navegação entre períodos dentro de uma transição: "navegando" esmaece o conteúdo até o próximo chegar
  const [navegando, iniciarNavegacao] = useTransition();
  const navegar = useCallback((href: string) => iniciarNavegacao(() => router.push(href, { scroll: false })), [router]);
  const conteudoRef = useRef<HTMLDivElement>(null);
  useMovimentoAgenda(conteudoRef, visao, data, navegando);

  // Depois de salvar, destaca o atendimento quando ele aparecer na agenda (os dados chegam do servidor logo depois)
  const destacarRef = useRef<string | null>(null);
  useEffect(() => {
    const id = destacarRef.current;
    if (!id) return;
    const t = setTimeout(() => {
      if (destacarAgendamento(id)) destacarRef.current = null;
    }, 60);
    // se não aparecer (marcado para outro período), desiste depois de um tempo
    const desistir = setTimeout(() => {
      if (destacarRef.current === id) destacarRef.current = null;
    }, 6000);
    return () => {
      clearTimeout(t);
      clearTimeout(desistir);
    };
  }, [agendamentos]);
  const [form, setForm] = useState<InicialForm | null>(abrirInicial ?? null);
  const [selecionado, setSelecionado] = useState<Agendamento | null>(null);
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [agoraMin, setAgoraMin] = useState<number | null>(null);
  const hoje = hojeISO();
  const avisoImportarFechado = useSyncExternalStore(assinarAviso, lerAvisoFechado, () => false);
  function fecharAvisoImportar() {
    try {
      window.localStorage.setItem(CHAVE_AVISO_IMPORTAR, "1");
    } catch {
      // sem armazenamento: some só nesta visita
    }
    ouvintesAviso.forEach((fn) => fn());
  }

  useEffect(() => {
    const atualizar = () => setAgoraMin(minutosDoDia(new Date()));
    const t = setTimeout(atualizar, 0);
    const i = setInterval(atualizar, 60_000);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, []);

  // Limpa ?novo=... da URL depois de abrir o formulário
  useEffect(() => {
    if (abrirInicial) router.replace(`/agenda?visao=${visao}&data=${data}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visiveis = useMemo(
    () => agendamentos.filter((a) => mostrarCancelados || a.status !== "cancelado"),
    [agendamentos, mostrarCancelados],
  );
  const cancelados = agendamentos.filter((a) => a.status === "cancelado");

  // Janela de horas da grade: expediente dos dias exibidos, esticado para caber tudo que existe
  const dias = visao === "dia" ? [data] : visao === "semana" ? diasEntre(inicioDaSemana(data), somarDias(inicioDaSemana(data), 6)) : [];
  const colunas: Coluna[] = dias.map((d) => ({
    dia: d,
    atende: janelaDoDia(d, expediente) !== null,
    agendamentos: visiveis.filter((a) => {
      const ini = diaEmSP(a.inicio);
      const fim = diaEmSP(new Date(new Date(a.fim).getTime() - 1).toISOString());
      return ini <= d && fim >= d;
    }),
  }));

  let inicioMin = 8 * 60;
  let fimMin = 18 * 60;
  const janelas = dias.map((d) => janelaDoDia(d, expediente)).filter(Boolean) as { inicio: number; fim: number }[];
  if (janelas.length) {
    inicioMin = Math.min(...janelas.map((j) => j.inicio));
    fimMin = Math.max(...janelas.map((j) => j.fim));
  }
  for (const c of colunas) {
    for (const a of c.agendamentos) {
      const ini = diaEmSP(a.inicio) < c.dia ? 0 : minutosDoDia(a.inicio);
      const fimDia = diaEmSP(new Date(new Date(a.fim).getTime() - 1).toISOString());
      const fim = fimDia > c.dia ? 24 * 60 : minutosDoDia(a.fim) === 0 ? 24 * 60 : minutosDoDia(a.fim);
      if (ini < inicioMin) inicioMin = Math.floor(ini / 60) * 60;
      if (fim > fimMin) fimMin = Math.min(24 * 60, Math.ceil(fim / 60) * 60);
    }
  }
  inicioMin = Math.max(0, Math.floor(inicioMin / 60) * 60);
  fimMin = Math.min(24 * 60, Math.ceil(fimMin / 60) * 60);
  if (fimMin - inicioMin < 60) fimMin = inicioMin + 60;

  function abrirNovo(tipo: "atendimento" | "bloqueio", dia?: DataISO, hora?: string) {
    setSelecionado(null);
    setForm({ tipo, dia: dia ?? (visao === "mes" ? hoje : data), hora });
  }

  const diaAtendeHoje = visao === "dia" ? janelaDoDia(data, expediente) !== null : true;

  // Ao abrir um dia/semana, a grade já começa no ponto útil: 1 h antes de agora (se inclui hoje)
  // ou um pouco antes do primeiro atendimento; senão, no começo do expediente.
  const rolagemRef = useRef<HTMLDivElement>(null);
  const primeiroInicio = colunas
    .flatMap((c) => c.agendamentos)
    .reduce<number | null>((m, a) => {
      const v = diaEmSP(a.inicio) < (colunas[0]?.dia ?? data) ? inicioMin : minutosDoDia(a.inicio);
      return m === null || v < m ? v : m;
    }, null);
  const incluiHoje = dias.includes(hoje);
  useEffect(() => {
    const el = rolagemRef.current;
    if (!el) return;
    const alvo = incluiHoje ? minutosDoDia(new Date()) - 60 : primeiroInicio !== null ? primeiroInicio - 30 : inicioMin;
    el.scrollTop = Math.max(0, (alvo - inicioMin) * PX_POR_MIN + FOLGA_GRADE - 8);
    // só quando muda o período exibido (não a cada minuto/atualização)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visao, data]);

  return (
    // pb-20 no celular: espaço para os botões flutuantes ("Marcar" e "Assistente", um em cima do outro) não cobrirem o fim da página
    <ProvedorNavegacaoAgenda value={navegar}>
    <div className="grid gap-4 pb-20 sm:pb-0">
      <BarraAgenda visao={visao} data={data} aoMarcar={() => abrirNovo("atendimento")} aoBloquear={() => abrirNovo("bloqueio")} />

      {/* conteúdo do período: desliza ao trocar e esmaece enquanto o próximo carrega (movimento.tsx) */}
      <div ref={conteudoRef} aria-busy={navegando || undefined} className="grid gap-4">
      {visao === "mes" ? (
        <VisaoMes data={data} agendamentos={agendamentos} expediente={expediente} />
      ) : (
        <>
          {visao === "dia" && datasDoDia(data).length > 0 ? (
            <p className="flex flex-wrap items-center gap-1.5 text-sm">
              {datasDoDia(data).map((e) => (
                <span
                  key={e.nome}
                  className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", e.feriado ? VISUAL_DATA.feriado.etiqueta : VISUAL_DATA.comemorativa.etiqueta)}
                >
                  {e.feriado ? `Feriado: ${e.nome}` : e.nome}
                </span>
              ))}
            </p>
          ) : null}

          {visao === "dia" && !diaAtendeHoje ? (
            <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
              <CalendarOffIcon className="size-4" />
              Você não atende {DIA_SEMANA_CURTO[new Date(`${data}T12:00:00`).getDay()]}. Ainda dá para marcar um encaixe pela grade.
            </p>
          ) : null}

          {/* Semana no celular: lista dia a dia (a grade de 7 colunas não cabe numa tela de telefone) */}
          {visao === "semana" ? (
            <div className="sm:hidden">
              <SemanaLista
                colunas={colunas}
                expediente={expediente}
                intervaloMin={intervaloMin}
                hoje={hoje}
                agoraMin={agoraMin}
                aoSelecionar={setSelecionado}
                aoMarcar={(dia, hora) => abrirNovo("atendimento", dia, hora)}
              />
            </div>
          ) : null}

          <p className={cn("text-xs text-muted-foreground", visao === "semana" && "hidden sm:block")}>
            Toque num horário vazio e depois no <strong className="font-semibold text-foreground">+</strong> para marcar.
          </p>

          <div className={cn(visao === "semana" && "hidden sm:block")}>
          <GradeHoraria
            colunas={colunas}
            inicioMin={inicioMin}
            fimMin={fimMin}
            passoMin={intervaloMin}
            agoraMin={agoraMin}
            diaDeHoje={hoje}
            compacto={visao === "semana"}
            refRolagem={rolagemRef}
            aoClicarSlot={(dia, hora) => abrirNovo("atendimento", dia, hora)}
            aoSelecionar={setSelecionado}
            cabecalho={
              visao === "semana"
                ? (c) => (
                    <LinkAgenda
                      href={`/agenda?visao=dia&data=${c.dia}`}
                      aria-label={`Abrir ${formatarDataISO(c.dia, "EEEE, d 'de' MMMM")}`}
                      aria-current={c.dia === hoje ? "date" : undefined}
                      className={cn("flex flex-col items-center py-1.5 text-xs hover:bg-muted/60", c.dia === hoje && "text-primary")}
                    >
                      <span>{formatarDataISO(c.dia, "EEEEEE").toLowerCase()}.</span>
                      <span className={cn("text-base font-semibold tabular-nums", c.dia === hoje && "rounded-full bg-primary px-2 text-primary-foreground")}>
                        {Number(c.dia.slice(8, 10))}
                      </span>
                      {datasDoDia(c.dia)[0] ? (
                        <span
                          title={datasDoDia(c.dia)[0].nome}
                          className={cn(
                            "mt-0.5 max-w-full truncate rounded px-1 text-mini leading-tight font-semibold",
                            datasDoDia(c.dia)[0].feriado ? VISUAL_DATA.feriado.chip : VISUAL_DATA.comemorativa.chip,
                          )}
                        >
                          {datasDoDia(c.dia)[0].nome}
                        </span>
                      ) : null}
                    </LinkAgenda>
                  )
                : undefined
            }
          />
          </div>

          {visao === "dia" && colunas[0]?.agendamentos.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">Nada marcado {data === hoje ? "para hoje" : `em ${formatarDataISO(data)}`}.</p>
          ) : null}

          <LegendaAgenda comDatas={false} />

          {cancelados.length > 0 ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1 text-sm">
              <span className="text-muted-foreground">
                {cancelados.length} cancelado{cancelados.length === 1 ? "" : "s"} neste período
              </span>
              <Button variant="ghost" className="h-toque sm:h-8" onClick={() => setMostrarCancelados((x) => !x)}>
                {mostrarCancelados ? "Esconder da agenda" : "Mostrar na agenda"}
              </Button>
            </div>
          ) : null}

          {visao === "dia" && mostrarCancelados && cancelados.length > 0 ? (
            <ul className="grid gap-2">
              {cancelados.map((a) => (
                <li key={a.id}>
                  <CartaoAgendamento agendamento={a} onClick={() => setSelecionado(a)} />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
      </div>

      {!avisoImportarFechado ? (
        <div className="flex items-center gap-1 rounded-xl border border-dashed pl-3 text-sm text-muted-foreground">
          <Link href="/agenda/importar" className="flex min-h-toque flex-1 items-center gap-2 transition-colors hover:text-foreground">
            <UploadIcon className="size-4 shrink-0" />
            <span>
              Usa o Google Agenda? <span className="font-semibold text-primary">Importar agenda</span>
            </span>
          </Link>
          <Button variant="ghost" size="icon" className="size-toque sm:size-toque" aria-label="Fechar aviso de importar agenda" onClick={fecharAvisoImportar}>
            <XIcon />
          </Button>
        </div>
      ) : null}

      {/* importou errado? apaga e começa de novo */}
      <LimparAgenda />

      {/* Marcar ao alcance do polegar (no celular o botão do topo fica longe) */}
      <Flutuante>
        <Button
          onClick={() => abrirNovo("atendimento")}
          className="fixed right-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 h-14 gap-2 rounded-full px-5 text-base font-semibold shadow-alta sm:hidden"
        >
          <PlusIcon className="size-5" />
          Marcar
        </Button>
      </Flutuante>

      {/* Formulário: novo / editar / remarcar */}
      <Dialog open={form !== null} onOpenChange={(aberto) => !aberto && setForm(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form?.agendamento
                ? form.agendamento.tipo === "bloqueio"
                  ? "Editar compromisso"
                  : "Remarcar / editar atendimento"
                : form?.tipo === "bloqueio"
                  ? "Novo compromisso"
                  : "Marcar atendimento"}
            </DialogTitle>
            <DialogDescription>
              {form?.tipo === "bloqueio" || form?.agendamento?.tipo === "bloqueio"
                ? "Almoço, folga, férias ou qualquer período em que você não atende."
                : "Escolha quem vem, o serviço e um horário livre."}
            </DialogDescription>
          </DialogHeader>
          {form ? (
            <FormAgendamento
              key={form.agendamento?.id ?? `${form.tipo}-${form.dia}-${form.hora ?? ""}-${form.clienteId ?? ""}`}
              clientes={clientes}
              servicos={servicos}
              inicial={form}
              aoConcluir={(id) => {
                destacarRef.current = id ?? null;
                setForm(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <DetalheAgendamento
        agendamento={selecionado}
        clientes={clientes}
        mensagens={mensagens}
        aoFechar={() => setSelecionado(null)}
        aoEditar={(a) => {
          setSelecionado(null);
          setForm({ tipo: a.tipo, agendamento: a });
        }}
      />
    </div>
    </ProvedorNavegacaoAgenda>
  );
}

export { horaParaMinutos };
