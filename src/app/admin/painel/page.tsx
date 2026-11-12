import type { Metadata } from "next";
import { montarPainelDono } from "@/features/admin/painel";
import { BarrasRanking, Colunas } from "@/components/graficos/Colunas";
import { formatarMoeda } from "@/lib/moeda";

export const metadata: Metadata = { title: "Painel do dono" };

function Numero({ rotulo, valor, detalhe, destaque = false }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean }) {
  return (
    <div className={destaque ? "gradiente-marca rounded-2xl p-3 text-white" : "rounded-2xl border bg-card p-3"}>
      <p className={destaque ? "text-xs text-white/80" : "text-xs font-medium text-muted-foreground"}>{rotulo}</p>
      <p className="text-2xl font-extrabold tracking-tight">{valor}</p>
      {detalhe ? <p className={destaque ? "text-xs text-white/80" : "text-xs text-muted-foreground"}>{detalhe}</p> : null}
    </div>
  );
}

export default async function PaginaPainelDono() {
  const p = await montarPainelDono();
  const t = p.totais;
  const mesAtual = p.cadastrosPorMes.at(-1)?.chave;

  return (
    // grid-cols-1 (= minmax(0, 1fr)): sem isso a tabela larga do funil esticava a coluna e cortava tudo no celular
    <div className="grid grid-cols-1 gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel do dono</h1>
        <p className="text-sm text-muted-foreground">Quem está usando o Vaguinha, de qual ramo, e quanto entra por mês.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Números gerais">
        <Numero
          destaque
          rotulo="Receita mensal estimada"
          valor={formatarMoeda(t.receitaMensal)}
          detalhe={`${t.pagantes} conta${t.pagantes === 1 ? "" : "s"} em plano pago (inclui as liberadas por você)`}
        />
        <Numero rotulo="Recebido este mês (Asaas)" valor={t.recebidoNoMes === null ? "—" : formatarMoeda(t.recebidoNoMes)} />
        <Numero rotulo="Contas ativas" valor={String(t.ativas)} detalhe={`${t.emTeste} em teste grátis`} />
        <Numero rotulo="Aguardando aprovação" valor={String(t.pendentes)} detalhe={`${t.contas} contas no total`} />
        <Numero rotulo="Cadastros este mês" valor={String(t.cadastrosNoMes)} detalhe={`${t.cadastrosMesAnterior} no mês anterior`} />
        <Numero rotulo="Atendimentos marcados no mês" valor={t.atendimentosNoMes === null ? "—" : String(t.atendimentosNoMes)} detalhe="somando todas as profissionais" />
        <Numero rotulo="Pedidos pelo link no mês" valor={t.pedidosLinkNoMes === null ? "—" : String(t.pedidosLinkNoMes)} />
        <Numero
          rotulo="Assistente de IA no mês"
          valor={t.assistente === null ? "—" : `US$ ${t.assistente.custoUsd.toFixed(2)}`}
          detalhe={t.assistente === null ? undefined : `${t.assistente.mensagens} mensagens de ${t.assistente.usuarios} conta${t.assistente.usuarios === 1 ? "" : "s"} (crédito: US$ 100/mês)`}
        />
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Funil dos anúncios (últimos 30 dias)</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Aprovado = confirmou o e-mail e entrou no teste (liberado sozinho; vai para a Meta como StartTrial). Pagou = está num plano
          pago (Subscribe).
        </p>
        {p.porOrigem.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cadastro nos últimos 30 dias.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Campanha / anúncio</th>
                  <th className="px-2 py-2 text-right font-medium">Cadastros</th>
                  <th className="px-2 py-2 text-right font-medium">Aprovados</th>
                  <th className="px-2 py-2 text-right font-medium">Recusados</th>
                  <th className="px-2 py-2 text-right font-medium">Pagaram</th>
                  <th className="py-2 pl-2 text-right font-medium">Qualificação</th>
                </tr>
              </thead>
              <tbody>
                {p.porOrigem.map((l) => {
                  const decididos = l.aprovados + l.recusados;
                  return (
                    <tr key={`${l.campanha}|${l.anuncio}`} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <p className="font-medium">{l.campanha}</p>
                        {l.anuncio ? <p className="text-xs text-muted-foreground">{l.anuncio}</p> : null}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {l.cadastros}
                        {l.pendentes ? <span className="block text-xs text-muted-foreground">{l.pendentes} esperando</span> : null}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{l.aprovados}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{l.recusados}</td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums">{l.pagaram}</td>
                      <td className="py-2 pl-2 text-right tabular-nums">{decididos ? `${Math.round((l.aprovados / decididos) * 100)}%` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          Nos anúncios, em <b>Parâmetros de URL</b>, use:{" "}
          <code className="break-all font-mono text-foreground">utm_source=meta&amp;utm_medium=pago&amp;utm_campaign={"{{campaign.name}}"}&amp;utm_content={"{{ad.name}}"}</code>
        </p>
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Cadastros por mês</h2>
        <p className="mb-3 text-xs text-muted-foreground">Toque numa coluna para ver o número.</p>
        <Colunas pontos={p.cadastrosPorMes} destaque={mesAtual} />
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="mb-3 font-semibold">Ramos que mais usam</h2>
          <BarrasRanking itens={p.porRamo} vazio="Ninguém informou o ramo ainda." />
        </section>
        <section className="grid content-start gap-5">
          <div className="rounded-2xl border bg-card p-4">
            <h2 className="mb-3 font-semibold">Por área</h2>
            <BarrasRanking itens={p.porGrupo} />
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <h2 className="mb-3 font-semibold">Como preferem ser tratados</h2>
            <BarrasRanking itens={p.porTratamento} />
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <h2 className="mb-3 font-semibold">Contas ativas por plano</h2>
            <BarrasRanking itens={p.porPlano} />
          </div>
        </section>
      </div>

      {p.outrosDigitados.length > 0 ? (
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Ramos digitados em &quot;Outros&quot;</h2>
          <p className="mb-2 text-xs text-muted-foreground">Ideias de ramos para entrar na lista.</p>
          <ul className="flex flex-wrap gap-2">
            {p.outrosDigitados.map((o, i) => (
              <li key={`${o}-${i}`} className="rounded-full border bg-background px-3 py-1 text-sm">
                {o}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
