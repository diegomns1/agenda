"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarOffIcon, Loader2Icon, PlusIcon, SparklesIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { consultarHorarios, salvarAgendamento } from "@/features/agenda/actions";
import { EstadoVazio } from "@/components/layout/EstadoVazio";
import { Campo } from "@/components/formulario/Campo";
import { BotaoEnviar } from "@/components/formulario/BotaoEnviar";
import { Aviso } from "@/components/formulario/Aviso";
import { ESTADO_INICIAL, type EstadoForm } from "@/components/formulario/tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { dataDe, hojeISO, horaDe, rotuloRelativo, type DataISO } from "@/lib/datas";
import { formatarDuracao, formatarMoeda } from "@/lib/moeda";
import { mascararTelefone } from "@/lib/telefone";
import { cn } from "@/lib/utils";
import type { Agendamento, Servico, TipoAgendamento } from "@/types/database";

export type ClienteResumo = { id: string; nome: string; telefone: string | null };

export type InicialForm = {
  tipo?: TipoAgendamento;
  agendamento?: Agendamento | null; // editar / remarcar
  dia?: DataISO;
  hora?: string;
  clienteId?: string | null;
  servicoId?: string | null;
};

type Props = {
  clientes: ClienteResumo[];
  servicos: Servico[];
  inicial?: InicialForm;
  aoConcluir: () => void;
};

const selectClass =
  "h-toque w-full rounded-lg border border-input bg-background px-3 text-base disabled:opacity-50";

export function FormAgendamento({ clientes, servicos, inicial, aoConcluir }: Props) {
  const ag = inicial?.agendamento ?? null;
  const [tipo, setTipo] = useState<TipoAgendamento>(ag?.tipo ?? inicial?.tipo ?? "atendimento");

  const [estado, acao] = useActionState(async (prev: EstadoForm, fd: FormData) => {
    const r = await salvarAgendamento(prev, fd);
    if (r.ok) {
      if (r.mensagem) toast.success(r.mensagem);
      aoConcluir();
    } else if (r.erro) {
      toast.error(r.erro);
    }
    return r;
  }, ESTADO_INICIAL);

  return (
    <form action={acao} className="grid gap-4" noValidate>
      {ag ? <input type="hidden" name="id" value={ag.id} /> : null}
      <input type="hidden" name="tipo" value={tipo} />

      {!ag ? (
        <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-medium">
          {(["atendimento", "bloqueio"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={cn(
                "rounded-md py-2 transition-colors",
                tipo === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "atendimento" ? "Atendimento" : "Bloqueio"}
            </button>
          ))}
        </div>
      ) : null}

      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}

      {tipo === "atendimento" && servicos.length === 0 ? (
        <EstadoVazio
          Icone={SparklesIcon}
          titulo="Cadastre um serviço primeiro"
          descricao="Para marcar um atendimento, a agenda precisa saber o que você oferece e quanto tempo leva."
        >
          <Button asChild>
            <Link href="/servicos">
              <PlusIcon />
              Criar serviço
            </Link>
          </Button>
        </EstadoVazio>
      ) : (
        <>
          {tipo === "atendimento" ? (
            <CamposAtendimento clientes={clientes} servicos={servicos} inicial={inicial} estado={estado} />
          ) : (
            <CamposBloqueio inicial={inicial} estado={estado} />
          )}

          <BotaoEnviar textoCarregando="Salvando...">
            {ag ? "Salvar alterações" : tipo === "atendimento" ? "Marcar atendimento" : "Bloquear horário"}
          </BotaoEnviar>
        </>
      )}
    </form>
  );
}

// ===========================================================================
// Atendimento
// ===========================================================================

function CamposAtendimento({
  clientes,
  servicos,
  inicial,
  estado,
}: {
  clientes: ClienteResumo[];
  servicos: Servico[];
  inicial?: InicialForm;
  estado: EstadoForm;
}) {
  const ag = inicial?.agendamento ?? null;
  const v = estado.valores;

  const [novaCliente, setNovaCliente] = useState(clientes.length === 0);
  const [clienteId, setClienteId] = useState(v?.cliente_id ?? ag?.cliente_id ?? inicial?.clienteId ?? "");
  const [telefoneNova, setTelefoneNova] = useState(v?.nova_cliente_telefone ?? "");

  const servicoInicial =
    v?.servico_id ?? ag?.servico_id ?? inicial?.servicoId ?? servicos[0]?.id ?? "";
  const [servicoId, setServicoId] = useState(servicoInicial);
  const servico = servicos.find((s) => s.id === servicoId);

  const duracaoDoAgendamento = ag ? Math.round((new Date(ag.fim).getTime() - new Date(ag.inicio).getTime()) / 60_000) : null;
  const [duracao, setDuracao] = useState<string>(v?.duracao_min ?? String(duracaoDoAgendamento ?? servico?.duracao_min ?? 45));

  const [dia, setDia] = useState<DataISO>(v?.dia ?? (ag ? dataDe(ag.inicio) : inicial?.dia ?? hojeISO()));
  const [hora, setHora] = useState(v?.hora ?? (ag ? horaDe(ag.inicio) : inicial?.hora ?? ""));
  const [outroHorario, setOutroHorario] = useState(false);

  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [atende, setAtende] = useState(true);
  const [carregando, iniciar] = useTransition();

  // Ao trocar de serviço, a duração acompanha (a menos que a pessoa já tenha mexido)
  function aoTrocarServico(id: string) {
    setServicoId(id);
    const s = servicos.find((x) => x.id === id);
    if (s) setDuracao(String(s.duracao_min));
  }

  const duracaoNum = Number(duracao) || 0;
  useEffect(() => {
    if (!dia || duracaoNum < 5) return;
    iniciar(async () => {
      const r = await consultarHorarios(dia, duracaoNum, ag?.id ?? null);
      setHorarios(r.horarios);
      setAtende(r.atende);
    });
  }, [dia, duracaoNum, ag?.id]);

  const horaNaLista = horarios?.includes(hora) ?? false;
  const mostrarManual = outroHorario || (!!hora && horarios !== null && !horaNaLista);

  return (
    <>
      {/* Cliente */}
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={novaCliente ? "nova_cliente_nome" : "cliente_id"}>Cliente</Label>
          {clientes.length > 0 ? (
            <button
              type="button"
              onClick={() => setNovaCliente((x) => !x)}
              className="-my-2 inline-flex min-h-toque items-center gap-1 px-1 text-sm font-medium text-primary hover:underline"
            >
              {novaCliente ? <UsersIcon className="size-4" /> : <UserPlusIcon className="size-4" />}
              {novaCliente ? "Escolher da lista" : "Novo cadastro"}
            </button>
          ) : null}
        </div>

        {novaCliente ? (
          <div className="grid gap-2 rounded-lg border p-3">
            <Input
              id="nova_cliente_nome"
              name="nova_cliente_nome"
              placeholder="Nome (novo cadastro)"
              defaultValue={v?.nova_cliente_nome ?? ""}
              className="h-toque text-base"
              autoFocus
            />
            <Input
              name="nova_cliente_telefone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="WhatsApp (opcional)"
              value={telefoneNova}
              onChange={(e) => setTelefoneNova(mascararTelefone(e.target.value))}
              className="h-toque text-base"
            />
          </div>
        ) : (
          <select
            id="cliente_id"
            name="cliente_id"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className={selectClass}
            aria-invalid={estado.erros?.cliente_id ? true : undefined}
          >
            <option value="">Escolha na lista…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        )}
        {estado.erros?.cliente_id?.[0] ? <p className="text-sm text-destructive">{estado.erros.cliente_id[0]}</p> : null}
      </div>

      {/* Serviço */}
      <div className="grid gap-1.5">
        <Label htmlFor="servico_id">Serviço</Label>
        <select
          id="servico_id"
          name="servico_id"
          value={servicoId}
          onChange={(e) => aoTrocarServico(e.target.value)}
          className={selectClass}
        >
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome} · {formatarDuracao(s.duracao_min)}
              {s.valor > 0 ? ` · ${formatarMoeda(s.valor)}` : ""}
            </option>
          ))}
        </select>
        {estado.erros?.servico_id?.[0] ? <p className="text-sm text-destructive">{estado.erros.servico_id[0]}</p> : null}
      </div>

      {/* Data e duração */}
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Campo rotulo="Data" nome="dia" type="date" value={dia} onChange={(e) => setDia(e.target.value)} erros={estado.erros?.dia} />
        <div className="grid gap-1.5">
          <Label htmlFor="duracao_min">Duração</Label>
          <div className="flex items-center gap-1.5">
            <Input
              id="duracao_min"
              name="duracao_min"
              type="number"
              inputMode="numeric"
              min={5}
              max={600}
              step={5}
              value={duracao}
              onChange={(e) => setDuracao(e.target.value)}
              className="h-toque w-20 text-base"
            />
            <span className="text-sm text-muted-foreground">min</span>
          </div>
        </div>
      </div>

      {/* Horário */}
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label>
            Horário {dia ? <span className="font-normal text-muted-foreground">· {rotuloRelativo(dia)}</span> : null}
          </Label>
          <button
            type="button"
            onClick={() => setOutroHorario((x) => !x)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {mostrarManual ? "Ver horários livres" : "Outro horário"}
          </button>
        </div>

        {mostrarManual ? (
          <Input
            name="hora"
            type="time"
            step={300}
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="h-toque w-40 text-base"
          />
        ) : (
          <>
            <input type="hidden" name="hora" value={hora} />
            {carregando && horarios === null ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" /> Buscando horários…
              </p>
            ) : !atende ? (
              <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                <CalendarOffIcon className="size-4" /> Você não atende neste dia. Use &quot;Outro horário&quot; se quiser encaixar.
              </p>
            ) : horarios && horarios.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                Nenhum horário livre para essa duração. Tente outro dia ou &quot;Outro horário&quot;.
              </p>
            ) : (
              <div className={cn("flex flex-wrap gap-1.5", carregando && "opacity-60")}>
                {horarios?.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHora(h)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm tabular-nums transition-colors",
                      hora === h ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {estado.erros?.hora?.[0] ? <p className="text-sm text-destructive">{estado.erros.hora[0]}</p> : null}
        {!hora && !mostrarManual ? <p className="text-xs text-muted-foreground">Toque num horário para escolher.</p> : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="observacoes">Observações (opcional)</Label>
        <Textarea
          id="observacoes"
          name="observacoes"
          rows={2}
          maxLength={500}
          defaultValue={v?.observacoes ?? ag?.observacoes ?? ""}
          placeholder="Ex.: quer trocar a cor, trazer esmalte próprio…"
          className="text-base"
        />
      </div>

      {/* Dica de depuração para o Diego, não aparece: nada */}
      <Button type="button" variant="ghost" size="sm" className="hidden" />
    </>
  );
}

// ===========================================================================
// Bloqueio
// ===========================================================================

function CamposBloqueio({ inicial, estado }: { inicial?: InicialForm; estado: EstadoForm }) {
  const ag = inicial?.agendamento ?? null;
  const v = estado.valores;

  const diaInteiroInicial = ag
    ? horaDe(ag.inicio) === "00:00" && horaDe(ag.fim) === "00:00"
    : !inicial?.hora;
  const [diaInteiro, setDiaInteiro] = useState(diaInteiroInicial);

  const diasInicial = ag && diaInteiroInicial
    ? Math.max(1, Math.round((new Date(ag.fim).getTime() - new Date(ag.inicio).getTime()) / 86_400_000))
    : 1;

  return (
    <>
      <Campo
        rotulo="Motivo"
        nome="titulo"
        placeholder="Ex.: almoço, médico, folga, férias"
        defaultValue={v?.titulo ?? ag?.titulo ?? ""}
        erros={estado.erros?.titulo}
        autoFocus
      />

      <Campo
        rotulo="Data"
        nome="dia"
        type="date"
        defaultValue={v?.dia ?? (ag ? dataDe(ag.inicio) : inicial?.dia ?? hojeISO())}
        erros={estado.erros?.dia}
      />

      <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
        <Label htmlFor="dia_inteiro" className="font-medium">
          Dia inteiro
        </Label>
        <Switch id="dia_inteiro" name="dia_inteiro" checked={diaInteiro} onCheckedChange={setDiaInteiro} />
      </div>

      {diaInteiro ? (
        <div className="grid gap-1.5">
          <Label htmlFor="dias">Quantos dias seguidos</Label>
          <div className="flex items-center gap-2">
            <Input id="dias" name="dias" type="number" min={1} max={60} defaultValue={v?.dias ?? diasInicial} className="h-toque w-24 text-base" />
            <span className="text-sm text-muted-foreground">dia(s), contando a data acima</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Campo
            rotulo="Das"
            nome="hora_inicio"
            type="time"
            step={300}
            defaultValue={v?.hora_inicio ?? (ag && !diaInteiroInicial ? horaDe(ag.inicio) : inicial?.hora ?? "12:00")}
            erros={estado.erros?.hora_inicio}
          />
          <Campo
            rotulo="Até"
            nome="hora_fim"
            type="time"
            step={300}
            defaultValue={v?.hora_fim ?? (ag && !diaInteiroInicial ? horaDe(ag.fim) : "13:00")}
            erros={estado.erros?.hora_fim}
          />
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="observacoes_bloqueio">Observações (opcional)</Label>
        <Textarea id="observacoes_bloqueio" name="observacoes" rows={2} maxLength={500} defaultValue={v?.observacoes ?? ag?.observacoes ?? ""} className="text-base" />
      </div>
    </>
  );
}
