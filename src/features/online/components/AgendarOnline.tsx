"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { CalendarCheckIcon, CalendarPlusIcon, CheckIcon, ChevronLeftIcon, ClockIcon, Loader2Icon, MessageCircleIcon } from "lucide-react";
import { consultarHorariosOnline, enviarPedidoOnline, type ResultadoPedido } from "@/features/online/actions";
import type { PerfilPublico, ServicoPublico } from "@/features/online/publico";
import { janelaDoDia } from "@/features/agenda/disponibilidade";
import { Aviso } from "@/components/formulario/Aviso";
import { ESTADO_INICIAL, type EstadoForm } from "@/components/formulario/tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { diasEntre, formatarData, formatarDataISO, hojeISO, horaDe, somarDias, type DataISO } from "@/lib/datas";
import { formatarDuracao, formatarMoeda } from "@/lib/moeda";
import { linkWhatsApp, mascararTelefone } from "@/lib/telefone";
import { cn } from "@/lib/utils";

type Props = { perfil: PerfilPublico };
type Etapa = "servico" | "horario" | "dados";

const DIAS_A_FRENTE = 21;

export function AgendarOnline({ perfil }: Props) {
  const [etapa, setEtapa] = useState<Etapa>("servico");
  const [servico, setServico] = useState<ServicoPublico | null>(perfil.servicos.length === 1 ? perfil.servicos[0] : null);
  const [dia, setDia] = useState<DataISO | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [carregando, iniciar] = useTransition();
  const [telefone, setTelefone] = useState("");

  const hoje = hojeISO();
  const dias = useMemo(
    () => diasEntre(hoje, somarDias(hoje, DIAS_A_FRENTE - 1)).filter((d) => janelaDoDia(d, perfil.expediente) !== null),
    [hoje, perfil.expediente],
  );

  useEffect(() => {
    if (!dia || !servico) return;
    iniciar(async () => {
      const r = await consultarHorariosOnline(perfil.slug, dia, servico.id);
      setHorarios(r.horarios);
    });
  }, [dia, servico, perfil.slug]);

  const [estado, acao] = useActionState(enviarPedidoOnline, ESTADO_INICIAL as EstadoForm & { pedido?: ResultadoPedido });

  if (estado.ok && estado.pedido) {
    return <Confirmacao perfil={perfil} pedido={estado.pedido} aoNovo={() => window.location.reload()} />;
  }

  return (
    <div className="grid gap-5">
      {/* Progresso */}
      <ol className="flex items-center gap-2 text-xs font-semibold">
        {(["servico", "horario", "dados"] as Etapa[]).map((e, i) => {
          const rotulo = e === "servico" ? "Serviço" : e === "horario" ? "Dia e hora" : "Seus dados";
          const feita = (e === "servico" && !!servico) || (e === "horario" && !!hora);
          const atual = etapa === e;
          return (
            <li key={e} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border text-[11px] transition-colors",
                  atual || feita ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
                )}
              >
                {feita && !atual ? <CheckIcon className="size-3.5" /> : i + 1}
              </span>
              <span className={cn(atual ? "text-foreground" : "text-muted-foreground")}>{rotulo}</span>
              {i < 2 ? <span className="h-px w-5 bg-border" /> : null}
            </li>
          );
        })}
      </ol>

      {/* Etapa 1: serviço */}
      {etapa === "servico" ? (
        <section className="surgir grid gap-3">
          <h2 className="text-lg font-bold">O que você quer fazer?</h2>
          {perfil.servicos.length === 0 ? (
            <Aviso>Esta profissional ainda não cadastrou serviços para agendamento online.</Aviso>
          ) : (
            <ul className="grid gap-2">
              {perfil.servicos.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setServico(s);
                      setHora(null);
                      setHorarios(null);
                      setEtapa("horario");
                    }}
                    className={cn(
                      "cartao-vivo flex w-full items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 text-left",
                      servico?.id === s.id && "border-primary ring-1 ring-primary",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{s.nome}</span>
                      <span className="text-sm text-muted-foreground">{formatarDuracao(s.duracao_min)}</span>
                    </span>
                    <span className="shrink-0 font-bold text-primary">{s.valor > 0 ? formatarMoeda(s.valor) : "consulte"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* Etapa 2: dia e hora */}
      {etapa === "horario" && servico ? (
        <section className="surgir grid gap-4">
          <button type="button" onClick={() => setEtapa("servico")} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <ChevronLeftIcon className="size-4" /> {servico.nome} · {formatarDuracao(servico.duracao_min)}
          </button>
          <h2 className="text-lg font-bold">Escolha o dia</h2>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {dias.map((d) => {
              const ativo = d === dia;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDia(d);
                    setHora(null);
                    setHorarios(null);
                  }}
                  className={cn(
                    "flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2 transition-colors",
                    ativo ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                  )}
                >
                  <span className="text-[11px] uppercase opacity-80">{formatarDataISO(d, "EEE").replace(".", "")}</span>
                  <span className="text-xl font-extrabold leading-tight">{Number(d.slice(8, 10))}</span>
                  <span className="text-[11px] opacity-80">{formatarDataISO(d, "MMM").replace(".", "")}</span>
                </button>
              );
            })}
          </div>

          {dia ? (
            <>
              <h2 className="text-lg font-bold">
                Horários livres <span className="text-sm font-normal text-muted-foreground">· {formatarDataISO(dia, "EEEE, dd/MM")}</span>
              </h2>
              {carregando && horarios === null ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" /> Buscando horários…
                </p>
              ) : horarios && horarios.length === 0 ? (
                <Aviso tipo="sucesso">Nenhum horário livre neste dia. Escolha outro dia.</Aviso>
              ) : (
                <div className={cn("flex flex-wrap gap-2", carregando && "opacity-60")}>
                  {horarios?.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHora(h)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-semibold tabular-nums transition-colors",
                        hora === h ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                      )}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
              {hora ? (
                <Button className="h-12 rounded-xl text-base" onClick={() => setEtapa("dados")}>
                  Continuar com {formatarDataISO(dia, "dd/MM")} às {hora}
                </Button>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Toque num dia para ver os horários.</p>
          )}
        </section>
      ) : null}

      {/* Etapa 3: dados */}
      {etapa === "dados" && servico && dia && hora ? (
        <form action={acao} className="surgir grid gap-4" noValidate>
          <input type="hidden" name="slug" value={perfil.slug} />
          <input type="hidden" name="servico_id" value={servico.id} />
          <input type="hidden" name="dia" value={dia} />
          <input type="hidden" name="hora" value={hora} />

          <button type="button" onClick={() => setEtapa("horario")} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <ChevronLeftIcon className="size-4" /> Trocar dia ou horário
          </button>

          <div className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Resumo</p>
            <p className="font-bold">{servico.nome}</p>
            <p className="flex items-center gap-1.5 text-sm">
              <ClockIcon className="size-4 text-primary" />
              <span className="capitalize">{formatarDataISO(dia, "EEEE, dd 'de' MMMM")}</span> às {hora} · {formatarDuracao(servico.duracao_min)}
              {servico.valor > 0 ? ` · ${formatarMoeda(servico.valor)}` : ""}
            </p>
          </div>

          {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}

          <div className="grid gap-1.5">
            <Label htmlFor="nome">Seu nome</Label>
            <Input id="nome" name="nome" autoComplete="name" defaultValue={estado.valores?.nome ?? ""} className="h-12 text-base" required />
            {estado.erros?.nome?.[0] ? <p className="text-sm text-destructive">{estado.erros.nome[0]}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="telefone">Seu WhatsApp</Label>
            <Input
              id="telefone"
              name="telefone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(11) 99999-9999"
              value={telefone || (estado.valores?.telefone ?? "")}
              onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
              className="h-12 text-base"
              required
            />
            {estado.erros?.telefone?.[0] ? <p className="text-sm text-destructive">{estado.erros.telefone[0]}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="observacoes">Observação (opcional)</Label>
            <Textarea id="observacoes" name="observacoes" rows={2} maxLength={300} defaultValue={estado.valores?.observacoes ?? ""} className="text-base" />
          </div>

          <BotaoPedido modo={perfil.confirmacao_online} />
          <p className="text-center text-xs text-muted-foreground">
            {perfil.confirmacao_online === "manual"
              ? "A profissional vai confirmar seu pedido. Você recebe o retorno pelo WhatsApp."
              : "Seu horário fica confirmado na hora."}
          </p>
        </form>
      ) : null}
    </div>
  );
}

function BotaoPedido({ modo }: { modo: "automatica" | "manual" }) {
  // useFormStatus precisa estar dentro do <form>; aqui já está
  return (
    <Button type="submit" className="brilho h-12 rounded-xl text-base font-semibold">
      <CalendarCheckIcon />
      {modo === "manual" ? "Enviar pedido de horário" : "Confirmar agendamento"}
    </Button>
  );
}

function Confirmacao({ perfil, pedido, aoNovo }: { perfil: PerfilPublico; pedido: ResultadoPedido; aoNovo: () => void }) {
  const confirmado = pedido.status === "agendado";
  const inicio = new Date(pedido.inicio);
  const fim = new Date(pedido.fim);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const titulo = encodeURIComponent(`${pedido.servico} · ${perfil.nome_negocio || perfil.nome}`);
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${fmt(inicio)}/${fmt(fim)}`;
  const nomeNegocio = perfil.nome_negocio || perfil.nome;
  const msg = `Oi! Acabei de ${confirmado ? "agendar" : "pedir"} ${pedido.servico} para ${formatarData(pedido.inicio, "dd/MM 'às' HH:mm")} pelo seu link.`;

  return (
    <div className="surgir grid gap-5 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CalendarCheckIcon className="size-8" />
      </div>
      <div>
        <h2 className="text-2xl font-extrabold">{confirmado ? "Horário confirmado!" : "Pedido enviado!"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {confirmado
            ? `Te esperamos em ${nomeNegocio}.`
            : `${nomeNegocio} vai confirmar seu horário em breve pelo WhatsApp.`}
        </p>
      </div>
      <div className="rounded-2xl border bg-card p-4 text-left">
        <p className="font-bold">{pedido.servico}</p>
        <p className="text-sm capitalize">{formatarData(pedido.inicio, "EEEE, dd 'de' MMMM")}</p>
        <p className="text-sm">
          {horaDe(pedido.inicio)} às {horaDe(pedido.fim)}
        </p>
        {!confirmado ? (
          <p className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            Aguardando confirmação
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        {perfil.telefone ? (
          <Button asChild className="h-12 rounded-xl text-base">
            <a href={linkWhatsApp(perfil.telefone, msg)} target="_blank" rel="noopener noreferrer">
              <MessageCircleIcon />
              Falar com {primeiroNomeDe(perfil.nome)} no WhatsApp
            </a>
          </Button>
        ) : null}
        {confirmado ? (
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <a href={google} target="_blank" rel="noopener noreferrer">
              <CalendarPlusIcon />
              Adicionar ao Google Agenda
            </a>
          </Button>
        ) : null}
        <Button variant="ghost" onClick={aoNovo}>
          Fazer outro agendamento
        </Button>
      </div>
    </div>
  );
}

function primeiroNomeDe(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? nome;
}
