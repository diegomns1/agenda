"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarOffIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { Agendamento, Expediente, Servico } from "@/types/database";
import { janelaDoDia } from "@/features/agenda/disponibilidade";
import { BarraAgenda, type Visao } from "./BarraAgenda";
import { GradeHoraria, type Coluna } from "./GradeHoraria";
import { VisaoMes } from "./VisaoMes";
import { CartaoAgendamento } from "./CartaoAgendamento";
import { DetalheAgendamento } from "./DetalheAgendamento";
import { FormAgendamento, type ClienteResumo, type InicialForm } from "./FormAgendamento";

type Props = {
  visao: Visao;
  data: DataISO;
  agendamentos: Agendamento[];
  clientes: ClienteResumo[];
  servicos: Servico[];
  expediente: Expediente;
  intervaloMin: number;
  modeloLembrete: string;
  abrirInicial?: InicialForm | null; // vindo de ?novo=atendimento&cliente=...
};

const DIA_SEMANA_CURTO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function diaEmSP(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export function AgendaCliente({ visao, data, agendamentos, clientes, servicos, expediente, intervaloMin, modeloLembrete, abrirInicial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<InicialForm | null>(abrirInicial ?? null);
  const [selecionado, setSelecionado] = useState<Agendamento | null>(null);
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [agoraMin, setAgoraMin] = useState<number | null>(null);
  const hoje = hojeISO();

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

  return (
    <div className="grid gap-4">
      <BarraAgenda visao={visao} data={data} aoMarcar={() => abrirNovo("atendimento")} aoBloquear={() => abrirNovo("bloqueio")} />

      {visao === "mes" ? (
        <VisaoMes data={data} agendamentos={agendamentos} expediente={expediente} />
      ) : (
        <>
          {visao === "dia" && !diaAtendeHoje ? (
            <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
              <CalendarOffIcon className="size-4" />
              Você não atende {DIA_SEMANA_CURTO[new Date(`${data}T12:00:00`).getDay()]}. Ainda dá para marcar um encaixe tocando na grade.
            </p>
          ) : null}

          <GradeHoraria
            colunas={colunas}
            inicioMin={inicioMin}
            fimMin={fimMin}
            passoMin={intervaloMin}
            agoraMin={agoraMin}
            diaDeHoje={hoje}
            compacto={visao === "semana"}
            aoClicarSlot={(dia, hora) => abrirNovo("atendimento", dia, hora)}
            aoSelecionar={setSelecionado}
            cabecalho={
              visao === "semana"
                ? (c) => (
                    <Link
                      href={`/agenda?visao=dia&data=${c.dia}`}
                      className={cn("flex flex-col items-center py-1.5 text-xs hover:bg-muted/60", c.dia === hoje && "text-primary")}
                    >
                      <span className="uppercase">{formatarDataISO(c.dia, "EEEEEE")}</span>
                      <span className={cn("text-base font-semibold", c.dia === hoje && "rounded-full bg-primary px-2 text-primary-foreground")}>
                        {Number(c.dia.slice(8, 10))}
                      </span>
                    </Link>
                  )
                : undefined
            }
          />

          {visao === "dia" && colunas[0]?.agendamentos.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              Nada marcado {data === hoje ? "para hoje" : `em ${formatarDataISO(data)}`}. Toque num horário da grade para marcar.
            </p>
          ) : null}

          {cancelados.length > 0 ? (
            <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {cancelados.length} cancelado{cancelados.length === 1 ? "" : "s"} neste período
              </span>
              <Button variant="ghost" size="sm" onClick={() => setMostrarCancelados((x) => !x)}>
                {mostrarCancelados ? "Ocultar" : "Mostrar"}
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

      {/* Formulário: novo / editar / remarcar */}
      <Dialog open={form !== null} onOpenChange={(aberto) => !aberto && setForm(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form?.agendamento
                ? form.agendamento.tipo === "bloqueio"
                  ? "Editar bloqueio"
                  : "Remarcar / editar atendimento"
                : form?.tipo === "bloqueio"
                  ? "Bloquear horário"
                  : "Marcar atendimento"}
            </DialogTitle>
            <DialogDescription>
              {form?.tipo === "bloqueio" || form?.agendamento?.tipo === "bloqueio"
                ? "Almoço, folga, férias ou qualquer período em que você não atende."
                : "Escolha a cliente, o serviço e um horário livre."}
            </DialogDescription>
          </DialogHeader>
          {form ? (
            <FormAgendamento
              key={form.agendamento?.id ?? `${form.tipo}-${form.dia}-${form.hora ?? ""}-${form.clienteId ?? ""}`}
              clientes={clientes}
              servicos={servicos}
              inicial={form}
              aoConcluir={() => setForm(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <DetalheAgendamento
        agendamento={selecionado}
        clientes={clientes}
        modeloLembrete={modeloLembrete}
        aoFechar={() => setSelecionado(null)}
        aoEditar={(a) => {
          setSelecionado(null);
          setForm({ tipo: a.tipo, agendamento: a });
        }}
      />
    </div>
  );
}

export { horaParaMinutos };
