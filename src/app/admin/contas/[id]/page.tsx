import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { obterConta } from "@/features/admin/queries";
import { AcoesConta } from "@/features/admin/components/AcoesConta";
import { BadgeStatus } from "@/features/admin/components/BadgeStatus";
import { formatarData } from "@/lib/datas";
import { PLANOS } from "@/lib/planos";
import { formatarCpfCnpj } from "@/features/assinatura/regras";
import { formatarTelefone, linkWhatsApp } from "@/lib/telefone";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = { title: "Conta" };

export default async function PaginaConta({ params }: PageProps<"/admin/contas/[id]">) {
  const { id } = await params;
  const conta = await obterConta(id);
  if (!conta) notFound();

  const linhas: [string, React.ReactNode][] = [
    ["E-mail", conta.email],
    ["WhatsApp", conta.telefone ? (
      <a
        href={linkWhatsApp(conta.telefone)}
        target="_blank"
        rel="noopener noreferrer"
        className="underline-offset-4 hover:underline"
      >
        {formatarTelefone(conta.telefone)}
      </a>
    ) : "—"],
    ["Negócio", conta.nome_negocio ?? "—"],
    ["Cadastro", formatarData(conta.created_at, "dd/MM/yyyy 'às' HH:mm")],
    ["Status alterado", conta.status_alterado_em ? formatarData(conta.status_alterado_em, "dd/MM/yyyy 'às' HH:mm") : "—"],
    ["Motivo", conta.status_motivo ?? "—"],
    ["Plano assinado (Asaas)", conta.plano_assinado ? PLANOS[conta.plano_assinado].nome : "—"],
    ["Assinatura Asaas", conta.asaas_subscription_id ?? "—"],
    ["CPF/CNPJ", conta.cpf_cnpj ? formatarCpfCnpj(conta.cpf_cnpj) : "—"],
    ["Termos aceitos", conta.termos_aceitos_em ? `${formatarData(conta.termos_aceitos_em, "dd/MM/yyyy 'às' HH:mm")} (v. ${conta.termos_versao ?? "?"})` : "—"],
  ];

  return (
    <div className="grid gap-5">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        Todas as contas
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{conta.nome}</h1>
        <BadgeStatus status={conta.status} />
      </div>

      <Card>
        <CardContent>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {linhas.map(([rotulo, valor]) => (
              <div key={rotulo} className="flex flex-col">
                <dt className="text-xs text-muted-foreground">{rotulo}</dt>
                <dd className="break-words">{valor}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Separator />

      <AcoesConta conta={conta} />
    </div>
  );
}
