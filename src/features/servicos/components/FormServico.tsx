"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { salvarServico } from "@/features/servicos/actions";
import { DURACOES_SUGERIDAS } from "@/features/servicos/schema";
import { Campo } from "@/components/formulario/Campo";
import { BotaoEnviar } from "@/components/formulario/BotaoEnviar";
import { Aviso } from "@/components/formulario/Aviso";
import { ESTADO_INICIAL, type EstadoForm } from "@/components/formulario/tipos";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatarDuracao, moedaParaCampo } from "@/lib/moeda";
import { cn } from "@/lib/utils";
import type { Servico } from "@/types/database";

type Props = {
  servico?: Servico | null;
  aoConcluir: () => void;
};

export function FormServico({ servico, aoConcluir }: Props) {
  const [duracao, setDuracao] = useState<string>(String(servico?.duracao_min ?? 45));

  const [estado, acao] = useActionState(async (prev: EstadoForm, fd: FormData) => {
    const r = await salvarServico(prev, fd);
    if (r.ok) {
      if (r.mensagem) toast.success(r.mensagem);
      aoConcluir();
    } else if (r.erro) {
      toast.error(r.erro);
    }
    return r;
  }, ESTADO_INICIAL);

  const v = estado.valores;

  return (
    <form action={acao} className="grid gap-4" noValidate>
      {servico ? <input type="hidden" name="id" value={servico.id} /> : null}
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}

      <Campo
        rotulo="Nome do serviço"
        nome="nome"
        placeholder="Ex.: Manicure"
        defaultValue={v?.nome ?? servico?.nome ?? ""}
        erros={estado.erros?.nome}
        autoFocus
        required
      />

      <div className="grid gap-1.5">
        <Label htmlFor="duracao_min">Duração</Label>
        <div className="flex flex-wrap gap-1.5">
          {DURACOES_SUGERIDAS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuracao(String(d))}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                duracao === String(d)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted",
              )}
            >
              {formatarDuracao(d)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
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
            className="h-toque w-28 text-base"
            aria-invalid={estado.erros?.duracao_min ? true : undefined}
          />
          <span className="text-sm text-muted-foreground">minutos</span>
        </div>
        {estado.erros?.duracao_min?.[0] ? (
          <p className="text-sm text-destructive">{estado.erros.duracao_min[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="valor">Valor</Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
            R$
          </span>
          <Input
            id="valor"
            name="valor"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={v?.valor ?? (servico ? moedaParaCampo(servico.valor) : "")}
            className="h-toque pl-9 text-base"
            aria-invalid={estado.erros?.valor ? true : undefined}
          />
        </div>
        {estado.erros?.valor?.[0] ? (
          <p className="text-sm text-destructive">{estado.erros.valor[0]}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Pode deixar em branco se preferir não mostrar valor.</p>
        )}
      </div>

      <BotaoEnviar textoCarregando="Salvando...">{servico ? "Salvar alterações" : "Adicionar serviço"}</BotaoEnviar>
    </form>
  );
}
