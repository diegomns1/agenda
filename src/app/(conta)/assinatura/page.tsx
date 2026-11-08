import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterPerfil, situacaoDaConta } from "@/lib/auth";
import { asaasConfigurado, ambienteAsaas, obterAssinatura } from "@/lib/asaas";
import { formatarDataISO, hojeISO } from "@/lib/datas";
import { PLANOS } from "@/lib/planos";
import { listarCobrancas } from "@/features/assinatura/queries";
import { EscolherPlano } from "@/features/assinatura/components/EscolherPlano";
import { HistoricoCobrancas } from "@/features/assinatura/components/HistoricoCobrancas";
import { AcoesAssinatura } from "@/features/assinatura/components/AcoesAssinatura";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Assinatura" };

export default async function PaginaAssinatura() {
  const perfil = await obterPerfil();
  if (!perfil) redirect("/aguardando-aprovacao");

  const situacao = situacaoDaConta(perfil);
  const configurado = asaasConfigurado();
  const cobrancas = configurado ? await listarCobrancas() : [];
  // forma de pagamento da assinatura atual (Pix ou cartão), para já vir marcada
  const assinatura = configurado && perfil.asaas_subscription_id ? await obterAssinatura(perfil.asaas_subscription_id).catch(() => null) : null;
  const formaAtual = assinatura?.billingType === "CREDIT_CARD" ? "CREDIT_CARD" : assinatura?.billingType === "PIX" ? "PIX" : null;
  const hoje = hojeISO();
  const emTeste = perfil.plano === "teste";
  const planoAtual = PLANOS[perfil.plano];
  const pendente = cobrancas.find((c) => c.status === "PENDING" || c.status === "OVERDUE");

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assinatura</h1>
        <p className="text-sm text-muted-foreground">Seu plano, a validade do acesso e as mensalidades.</p>
      </div>

      {/* Situação atual */}
      <Card className={situacao === "vencida" ? "border-destructive/40" : undefined}>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Plano {planoAtual.nome}
            {situacao === "vencida" ? (
              <Badge variant="destructive">Vencida</Badge>
            ) : perfil.asaas_subscription_id ? (
              <Badge>Assinatura ativa</Badge>
            ) : emTeste ? (
              <Badge variant="secondary">Teste grátis</Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            {situacao === "vencida"
              ? emTeste
                ? `Seu teste grátis terminou em ${formatarDataISO(perfil.ativa_ate!)}. Escolha um plano abaixo para continuar usando a agenda. Nada foi apagado.`
                : `Seu acesso venceu em ${formatarDataISO(perfil.ativa_ate!)}. Pague a mensalidade para voltar a usar a agenda.`
              : emTeste
                ? `Teste grátis${perfil.ativa_ate ? ` até ${formatarDataISO(perfil.ativa_ate)}` : ""}, com os recursos do Essencial: agenda, clientes e serviços. Assine para continuar depois e liberar o link de agendamento, os lembretes e os stories.`
                : perfil.ativa_ate
                  ? `Acesso liberado até ${formatarDataISO(perfil.ativa_ate)}${perfil.ativa_ate >= hoje ? "" : " (vencido)"}.`
                  : "Sem data de término definida."}
          </CardDescription>
        </CardHeader>
        {pendente ? (
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-aviso-borda/60 bg-aviso px-3 py-2.5 text-sm text-aviso-texto">
              <span>
                Mensalidade de <strong>R$ {pendente.valor.toFixed(2).replace(".", ",")}</strong> com vencimento em{" "}
                <strong>{formatarDataISO(pendente.vencimento)}</strong> aguardando pagamento.
              </span>
              {pendente.link ? (
                <a href={pendente.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-4">
                  Pagar agora
                </a>
              ) : null}
            </div>
          </CardContent>
        ) : null}
      </Card>

      {!configurado ? (
        <Card>
          <CardHeader>
            <CardTitle>Pagamento online em breve</CardTitle>
            <CardDescription>
              A assinatura pelo painel ainda não está ativa. Por enquanto, a renovação é combinada direto com o suporte (Pix) e liberada
              manualmente.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <EscolherPlano
            planoAtual={perfil.plano}
            planoAssinado={perfil.plano_assinado}
            cpfCnpj={perfil.cpf_cnpj}
            temAssinatura={Boolean(perfil.asaas_subscription_id)}
            formaAtual={formaAtual}
          />
          <AcoesAssinatura temAssinatura={Boolean(perfil.asaas_subscription_id)} ativaAte={perfil.ativa_ate} />
          <HistoricoCobrancas cobrancas={cobrancas} />
          {ambienteAsaas() === "sandbox" ? (
            <p className="text-xs text-muted-foreground">Ambiente de testes do Asaas: nenhuma cobrança real é feita.</p>
          ) : null}
        </>
      )}
    </div>
  );
}
