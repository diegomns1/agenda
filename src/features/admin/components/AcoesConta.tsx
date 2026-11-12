"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon, BanIcon, PauseIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { alterarPlanoConta, alterarStatusConta, excluirConta } from "@/features/admin/actions";
import { PLANOS, type StatusConta } from "@/lib/constantes";
import { ESTADO_INICIAL, type EstadoForm } from "@/components/formulario/tipos";
import { BotaoEnviar } from "@/components/formulario/BotaoEnviar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Profile } from "@/types/database";

type Acao = (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;

/** Envolve a Server Action: mostra toast de sucesso/erro e executa um callback no sucesso. */
function comFeedback(acao: Acao, aoSucesso?: () => void): Acao {
  return async (estado, formData) => {
    const resultado = await acao(estado, formData);
    if (resultado.ok) {
      if (resultado.mensagem) toast.success(resultado.mensagem);
      aoSucesso?.();
    } else if (resultado.erro) {
      toast.error(resultado.erro);
    }
    return resultado;
  };
}

export function AcoesConta({ conta }: { conta: Profile }) {
  const [dialogo, setDialogo] = useState<Extract<StatusConta, "recusada" | "suspensa"> | null>(null);

  const [estadoStatus, acaoStatus, pendenteStatus] = useActionState(
    comFeedback(alterarStatusConta, () => setDialogo(null)),
    ESTADO_INICIAL,
  );
  const [estadoPlano, acaoPlano] = useActionState(comFeedback(alterarPlanoConta), ESTADO_INICIAL);

  const router = useRouter();
  const [excluindo, setExcluindo] = useState(false);
  const [estadoExcluir, acaoExcluir] = useActionState(
    comFeedback(excluirConta, () => {
      setExcluindo(false);
      router.push("/admin");
    }),
    ESTADO_INICIAL,
  );

  const podeAprovar = conta.status !== "aprovada";
  const podeRecusar = conta.status === "pendente";
  const podeSuspender = conta.status === "aprovada";
  const podeExcluir = conta.status === "suspensa" || conta.status === "recusada";

  return (
    <div className="grid gap-6">
      {/* ---------------- Status ---------------- */}
      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Situação da conta</h2>
        <div className="flex flex-wrap gap-2">
          {podeAprovar ? (
            <form action={acaoStatus}>
              <input type="hidden" name="id" value={conta.id} />
              <input type="hidden" name="status" value="aprovada" />
              <Button type="submit" disabled={pendenteStatus}>
                {conta.status === "pendente" ? <CheckIcon /> : <RotateCcwIcon />}
                {conta.status === "pendente" ? "Aprovar" : "Reativar"}
              </Button>
            </form>
          ) : null}

          {podeRecusar ? (
            <Button type="button" variant="destructive" onClick={() => setDialogo("recusada")}>
              <BanIcon />
              Recusar
            </Button>
          ) : null}

          {podeSuspender ? (
            <Button type="button" variant="outline" onClick={() => setDialogo("suspensa")}>
              <PauseIcon />
              Suspender
            </Button>
          ) : null}
        </div>
      </section>

      {/* ---------------- Plano ---------------- */}
      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Plano e validade</h2>
        <form action={acaoPlano} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="id" value={conta.id} />

          <div className="grid gap-1.5">
            <Label htmlFor="plano">Plano</Label>
            <select
              id="plano"
              name="plano"
              defaultValue={conta.plano}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              {Object.entries(PLANOS).map(([valor, p]) => (
                <option key={valor} value={valor}>
                  {p.nome}
                  {p.preco > 0 ? ` · R$ ${p.preco.toFixed(2).replace(".", ",")}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ativa_ate">Ativa até</Label>
            <Input
              id="ativa_ate"
              name="ativa_ate"
              type="date"
              defaultValue={conta.ativa_ate ?? ""}
              className="h-10"
            />
            {estadoPlano.erros?.ativa_ate?.[0] ? (
              <p className="text-sm text-destructive">{estadoPlano.erros.ativa_ate[0]}</p>
            ) : null}
          </div>

          <BotaoEnviar size="default" className="h-10 w-full sm:w-auto" textoCarregando="Salvando...">
            Salvar
          </BotaoEnviar>
        </form>
        <p className="text-xs text-muted-foreground">
          &quot;Ativa até&quot; em branco = sem data de término. Contas no plano Teste ganham 3 dias automaticamente quando são
          liberadas (sozinhas, ao confirmar o e-mail e entrar, ou quando você aprova).
        </p>
      </section>

      {/* ---------------- Excluir de vez ---------------- */}
      <section className="grid gap-3 rounded-xl border border-destructive/30 p-4">
        <h2 className="text-sm font-medium text-destructive">Excluir conta</h2>
        <p className="text-xs text-muted-foreground">
          {podeExcluir
            ? "Apaga de vez o login, a agenda, os clientes, os serviços e as conversas desta conta. Não dá para desfazer."
            : "Para excluir, primeiro suspenda ou recuse a conta. Contas que já pagaram não podem ser excluídas: deixe suspensas."}
        </p>
        {podeExcluir ? (
          <div>
            <Button type="button" variant="destructive" onClick={() => setExcluindo(true)}>
              <Trash2Icon />
              Excluir conta
            </Button>
          </div>
        ) : null}
      </section>

      <Dialog open={excluindo} onOpenChange={setExcluindo}>
        <DialogContent>
          <form action={acaoExcluir} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Excluir a conta de {conta.nome}?</DialogTitle>
              <DialogDescription>
                Tudo desta conta é apagado para sempre: login, agenda, clientes, serviços e conversas. Não dá para desfazer.
              </DialogDescription>
            </DialogHeader>

            <input type="hidden" name="id" value={conta.id} />
            <div className="grid gap-1.5">
              <Label htmlFor="confirmacao">Digite EXCLUIR para confirmar</Label>
              <Input id="confirmacao" name="confirmacao" autoComplete="off" autoCapitalize="characters" className="h-10" />
              {estadoExcluir.erros?.confirmacao?.[0] ? (
                <p className="text-sm text-destructive">{estadoExcluir.erros.confirmacao[0]}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExcluindo(false)}>
                Cancelar
              </Button>
              <BotaoEnviar size="default" className="h-8 w-auto text-sm" variant="destructive" textoCarregando="Excluindo...">
                Excluir de vez
              </BotaoEnviar>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------------- Diálogo recusar / suspender ---------------- */}
      <Dialog open={dialogo !== null} onOpenChange={(aberto) => !aberto && setDialogo(null)}>
        <DialogContent>
          <form action={acaoStatus} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{dialogo === "recusada" ? "Recusar cadastro" : "Suspender conta"}</DialogTitle>
              <DialogDescription>
                {dialogo === "recusada"
                  ? "A profissional verá que o cadastro não foi aprovado, junto com o motivo (se informado)."
                  : "A profissional perde o acesso à agenda até ser reativada. O motivo aparece para ela."}
              </DialogDescription>
            </DialogHeader>

            <input type="hidden" name="id" value={conta.id} />
            <input type="hidden" name="status" value={dialogo ?? ""} />

            <div className="grid gap-1.5">
              <Label htmlFor="motivo">Motivo (opcional)</Label>
              <Textarea id="motivo" name="motivo" rows={3} maxLength={300} placeholder="Ex.: pagamento em atraso" />
              {estadoStatus.erros?.motivo?.[0] ? (
                <p className="text-sm text-destructive">{estadoStatus.erros.motivo[0]}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogo(null)}>
                Cancelar
              </Button>
              <BotaoEnviar
                size="default"
                className="h-8 w-auto text-sm"
                variant={dialogo === "recusada" ? "destructive" : "default"}
                textoCarregando="Salvando..."
              >
                {dialogo === "recusada" ? "Recusar" : "Suspender"}
              </BotaoEnviar>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
