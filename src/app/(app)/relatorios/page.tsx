import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { obterPerfil } from "@/lib/auth";
import { temRecurso } from "@/lib/planos";
import { ehMes, mesAtual, montarRelatorio, somarMes } from "@/features/relatorios/dados";
import { PainelRelatorio } from "@/features/relatorios/components/PainelRelatorio";
import { BloqueioPlano } from "@/components/layout/BloqueioPlano";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Relatórios" };

export default async function PaginaRelatorios({ searchParams }: PageProps<"/relatorios">) {
  const perfil = await obterPerfil();
  if (!perfil) redirect("/aguardando-aprovacao");

  if (!temRecurso(perfil.plano, "relatorios")) {
    return (
      <BloqueioPlano
        recurso="relatorios"
        planoAtual={perfil.plano}
        titulo="Relatórios"
        descricao="Quanto entrou no mês, quem desmarcou, quem remarcou e como foi em relação ao mês anterior."
        beneficios={[
          "Faturamento do mês comparado com o mês anterior",
          "Quem desmarcou, remarcou ou faltou, com nome e horário",
          "Serviços que mais faturaram e clientes que mais gastaram",
          "Aviso de horário que vagou, com botão para divulgar nos stories",
        ]}
      />
    );
  }

  const sp = await searchParams;
  const atual = mesAtual();
  const mes = ehMes(sp.mes) ? sp.mes : atual;
  const relatorio = await montarRelatorio(mes);
  const anterior = somarMes(mes, -1);
  const proximo = somarMes(mes, 1);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Tudo o que aconteceu na sua agenda no mês.</p>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="outline" size="icon" aria-label="Mês anterior">
            <Link href={`/relatorios?mes=${anterior}`}>
              <ChevronLeftIcon />
            </Link>
          </Button>
          <span className="min-w-36 text-center text-sm font-semibold first-letter:uppercase">{relatorio.rotuloMes}</span>
          {mes < atual ? (
            <Button asChild variant="outline" size="icon" aria-label="Próximo mês">
              <Link href={`/relatorios?mes=${proximo}`}>
                <ChevronRightIcon />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="icon" disabled aria-label="Próximo mês">
              <ChevronRightIcon />
            </Button>
          )}
        </div>
      </div>

      <PainelRelatorio relatorio={relatorio} />
    </div>
  );
}
