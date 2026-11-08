"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { CheckIcon, ExternalLinkIcon } from "lucide-react";
import { assinar } from "@/features/assinatura/actions";
import { formatarCpfCnpj, PLANOS_ASSINAVEIS, type PlanoAssinavel } from "@/features/assinatura/regras";
import { ESTADO_INICIAL, type EstadoForm } from "@/components/formulario/tipos";
import { Aviso } from "@/components/formulario/Aviso";
import { BotaoEnviar } from "@/components/formulario/BotaoEnviar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarPreco, PLANOS, type Plano } from "@/lib/planos";
import { cn } from "@/lib/utils";

const DESCRICAO: Record<PlanoAssinavel, string[]> = {
  essencial: ["Agenda por dia, semana e mês", "Clientes com histórico", "Serviços e valores", "App no celular"],
  profissional: ["Tudo do Essencial", "Link para marcarem sozinhos", "Lembretes 1 dia e 1 hora antes", "WhatsApp com mensagem pronta"],
  premium: ["Tudo do Profissional", "Stories do dia, semana e mês", "Relatórios do mês", "Aviso de horário que vagou"],
};

type Props = {
  planoAtual: Plano;
  planoAssinado: PlanoAssinavel | null;
  cpfCnpj: string | null;
  temAssinatura: boolean;
};

type Resultado = EstadoForm & { linkPagamento?: string };

export function EscolherPlano({ planoAtual, planoAssinado, cpfCnpj, temAssinatura }: Props) {
  const [plano, setPlano] = useState<PlanoAssinavel>(planoAssinado ?? (planoAtual === "teste" ? "profissional" : (planoAtual as PlanoAssinavel)));
  const [documento, setDocumento] = useState(formatarCpfCnpj(cpfCnpj));

  const [estado, acao] = useActionState(async (prev: Resultado, fd: FormData): Promise<Resultado> => {
    const r = (await assinar(prev, fd)) as Resultado;
    if (r.ok) {
      toast.success(r.mensagem);
      if (r.linkPagamento) window.open(r.linkPagamento, "_blank", "noopener");
    } else if (r.erro) {
      toast.error(r.erro);
    }
    return r;
  }, ESTADO_INICIAL as Resultado);

  const mesmoPlano = temAssinatura && planoAssinado === plano;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{temAssinatura ? "Trocar de plano" : "Assinar um plano"}</CardTitle>
        <CardDescription>
          Mensalidade por Pix, boleto ou cartão. O acesso é liberado assim que o pagamento é confirmado, e renova todo mês. Sem
          fidelidade.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={acao} className="grid gap-5" noValidate>
          {estado.erro && !estado.erros ? <Aviso>{estado.erro}</Aviso> : null}
          <input type="hidden" name="plano" value={plano} />

          <div className="grid gap-3 sm:grid-cols-3">
            {PLANOS_ASSINAVEIS.map((id) => {
              const p = PLANOS[id];
              const ativo = plano === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlano(id)}
                  aria-pressed={ativo}
                  className={cn(
                    "cartao-vivo grid gap-2 rounded-2xl border p-4 text-left transition-colors",
                    ativo ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.nome}</span>
                    {planoAssinado === id && temAssinatura ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">atual</span> : null}
                  </div>
                  <span className="text-xl font-extrabold tracking-tight">{formatarPreco(p.preco)}</span>
                  <ul className="grid gap-1 text-xs text-muted-foreground">
                    {DESCRICAO[id].map((t) => (
                      <li key={t} className="flex items-start gap-1.5">
                        <CheckIcon className="mt-0.5 size-3 shrink-0 text-primary" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="cpf_cnpj">CPF ou CNPJ</Label>
            <Input
              id="cpf_cnpj"
              name="cpf_cnpj"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={documento}
              onChange={(e) => setDocumento(formatarCpfCnpj(e.target.value) || e.target.value.replace(/[^\d.\-/]/g, ""))}
              className="h-11 max-w-xs text-base"
              aria-invalid={estado.erros?.cpf_cnpj ? true : undefined}
            />
            {estado.erros?.cpf_cnpj?.[0] ? (
              <p className="text-sm text-destructive">{estado.erros.cpf_cnpj[0]}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Obrigatório para emitir a cobrança (exigência do banco). Fica só no seu cadastro de pagamento.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <BotaoEnviar className="w-auto px-6" textoCarregando="Gerando cobrança..." disabled={mesmoPlano}>
              {temAssinatura ? `Mudar para ${PLANOS[plano].nome}` : `Assinar ${PLANOS[plano].nome}`}
            </BotaoEnviar>
            {estado.ok && estado.linkPagamento ? (
              <a href={estado.linkPagamento} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4">
                <ExternalLinkIcon className="size-4" />
                Abrir página de pagamento
              </a>
            ) : null}
            {mesmoPlano ? <span className="text-xs text-muted-foreground">Este já é o seu plano.</span> : null}
          </div>
          <p className="text-xs text-muted-foreground">
            A página de pagamento abre em uma nova aba, com o Pix copia-e-cola, o boleto e a opção de cartão. Depois de pagar, volte aqui:
            a confirmação costuma levar menos de um minuto.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
