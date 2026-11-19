import type { Metadata } from "next";
import Link from "next/link";
import { STATUS_CONTA, type StatusConta } from "@/lib/constantes";
import { contarPorStatus, listarContas } from "@/features/admin/queries";
import { ListaContas } from "@/features/admin/components/ListaContas";
import { NIVEL_USO, usoDasContas, type NivelUso } from "@/features/admin/uso";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { BotaoChamarTodas, type ContaParaChamar } from "@/features/ativacao/components/BotoesAtivacao";
import { CopiarLista } from "@/features/admin/components/CopiarLista";
import { formatarData, formatarDataISO, hojeISO } from "@/lib/datas";
import { PLANOS } from "@/lib/planos";
import { formatarTelefone } from "@/lib/telefone";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Contas" };

function ehStatus(v: unknown): v is StatusConta {
  return typeof v === "string" && v in STATUS_CONTA;
}

function ehNivel(v: unknown): v is NivelUso {
  return typeof v === "string" && v in NIVEL_USO;
}

/** Endereço da lista com os filtros escolhidos (situação da conta, nível de uso e "teste acabou"). */
function endereco(status?: StatusConta, nivel?: NivelUso, fim?: boolean) {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  if (nivel) q.set("uso", nivel);
  if (fim) q.set("fim", "1");
  const texto = q.toString();
  return texto ? `/admin?${texto}` : "/admin";
}

export default async function PaginaAdmin({ searchParams }: PageProps<"/admin">) {
  const { status, uso: usoPedido, fim } = await searchParams;
  const filtro = ehStatus(status) ? status : undefined;
  // toque em "Usando", "Parou"...: mostra só as contas liberadas daquele nível
  const filtroUso = ehNivel(usoPedido) ? usoPedido : undefined;
  // "Teste acabou" (19/11/2026): contas no teste grátis cuja validade já passou e que não assinaram
  const soTesteAcabou = fim === "1";

  const [contas, contagem, uso, { data: envios }] = await Promise.all([
    listarContas(filtro),
    contarPorStatus(),
    usoDasContas(),
    criarClienteAdmin().from("ativacao_envios").select("profissional_id, tipo, canal, enviado_em").eq("ok", true).order("enviado_em", { ascending: false }),
  ]);
  // última chamada de cada conta (mensagem de ativação)
  const chamadas = new Map<string, { tipo: string; canal: string; enviado_em: string }>();
  for (const e of envios ?? []) if (!chamadas.has(e.profissional_id)) chamadas.set(e.profissional_id, e);
  // botão "Chamar no WhatsApp": contas liberadas, com número, de qualquer categoria menos "Usando".
  // Guarda quando a oferta de ajuda já saiu pelo WhatsApp (a lista vem do mais novo para o mais antigo).
  const ajudaNoZap = new Map<string, string>();
  for (const e of envios ?? []) {
    if (e.tipo === "ajuda_inicio" && e.canal === "whatsapp" && !ajudaNoZap.has(e.profissional_id)) ajudaNoZap.set(e.profissional_id, e.enviado_em);
  }
  const hoje = hojeISO();
  const paraChamar: ContaParaChamar[] = [];
  for (const c of contas) {
    const nivel = uso.get(c.id)?.nivel;
    if (c.status !== "aprovada" || !c.telefone || !nivel || nivel === "usando") continue;
    const jaFoi = ajudaNoZap.get(c.id);
    paraChamar.push({
      id: c.id,
      nome: c.nome,
      telefone: formatarTelefone(c.telefone),
      detalhe:
        c.plano !== "teste"
          ? `plano ${PLANOS[c.plano].nome}`
          : !c.ativa_ate
            ? "teste"
            : c.ativa_ate < hoje
              ? `teste acabou em ${formatarDataISO(c.ativa_ate)}`
              : `teste até ${formatarDataISO(c.ativa_ate)}`,
      categoria: nivel,
      jaChamada: jaFoi ? formatarData(jaFoi, "dd/MM") : null,
    });
  }
  const porNivel = { usando: 0, configurando: 0, parou: 0, so_entrou: 0 } as Record<NivelUso, number>;
  for (const c of contas) {
    const u = uso.get(c.id);
    if (u && c.status === "aprovada") porNivel[u.nivel]++;
  }
  const total = Object.values(contagem).reduce((a, b) => a + b, 0);
  const testeAcabou = (c: (typeof contas)[number]) => c.status === "aprovada" && c.plano === "teste" && Boolean(c.ativa_ate) && c.ativa_ate! < hoje;
  const qtdTesteAcabou = contas.filter(testeAcabou).length;
  const qtdTesteAcabouSemUsar = contas.filter((c) => testeAcabou(c) && uso.get(c.id)?.nivel === "so_entrou").length;
  const contasDaLista = contas.filter(
    (c) =>
      (!filtroUso || (c.status === "aprovada" && uso.get(c.id)?.nivel === filtroUso)) &&
      (!soTesteAcabou || testeAcabou(c)),
  );
  // para colar no WhatsApp ou numa planilha: nome e telefone de quem está na lista filtrada
  const textoDaLista = contasDaLista
    .map((c) => `${c.nome} — ${c.telefone ? formatarTelefone(c.telefone) : "sem WhatsApp"}${c.ativa_ate ? ` — teste até ${formatarDataISO(c.ativa_ate)}` : ""}`)
    .join("\n");

  const filtros: { chave?: StatusConta; rotulo: string; qtd: number }[] = [
    { rotulo: "Todas", qtd: total },
    ...(Object.keys(STATUS_CONTA) as StatusConta[]).map((s) => ({
      chave: s,
      rotulo: STATUS_CONTA[s].rotulo,
      qtd: contagem[s],
    })),
  ];

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contas</h1>
        <p className="text-sm text-muted-foreground">
          {contagem.pendente > 0
            ? `${contagem.pendente} aguardando aprovação.`
            : "Nenhuma conta aguardando aprovação."}
        </p>
      </div>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filtrar por situação">
        {filtros.map((f) => {
          const ativo = f.chave === filtro;
          return (
            <Link
              key={f.rotulo}
              href={endereco(f.chave, filtroUso, soTesteAcabou)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors",
                ativo
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {f.rotulo} <span className="tabular-nums opacity-70">{f.qtd}</span>
            </Link>
          );
        })}
      </nav>

      <section className="grid gap-2 rounded-xl border bg-card p-3" aria-label="Quem está usando">
        <p className="text-sm font-medium">Contas liberadas: quem está usando</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {(Object.keys(NIVEL_USO) as NivelUso[]).map((n) => {
            const ativo = filtroUso === n;
            return (
              <Link
                key={n}
                // tocar de novo no que já está escolhido tira o filtro
                href={endereco(filtro, ativo ? undefined : n, soTesteAcabou)}
                aria-current={ativo ? "true" : undefined}
                title={`${NIVEL_USO[n].explica}. Toque para ver só estas contas.`}
                className={cn(
                  "inline-flex min-h-8 items-center rounded-full px-3 font-semibold transition-shadow hover:ring-2 hover:ring-foreground/15",
                  NIVEL_USO[n].tom,
                  ativo && "ring-2 ring-foreground/60",
                  filtroUso && !ativo && "opacity-55",
                )}
              >
                {NIVEL_USO[n].rotulo} {porNivel[n]}
              </Link>
            );
          })}
          {/* combina com os níveis: "Teste acabou" + "Só entrou" = acabou o teste e não mexeu em nada */}
          <Link
            href={endereco(filtro, filtroUso, !soTesteAcabou)}
            aria-current={soTesteAcabou ? "true" : undefined}
            title="Contas no teste grátis que já passou da data e não assinaram. Toque de novo para tirar o filtro."
            className={cn(
              "inline-flex min-h-8 items-center rounded-full border border-foreground/15 bg-background px-3 font-semibold text-foreground transition-shadow hover:ring-2 hover:ring-foreground/15",
              soTesteAcabou && "ring-2 ring-foreground/60",
            )}
          >
            Teste acabou {qtdTesteAcabou}
          </Link>
          {filtroUso || soTesteAcabou ? (
            <Link href={endereco(filtro)} className="inline-flex min-h-8 items-center rounded-full border bg-background px-3 font-semibold text-muted-foreground hover:bg-muted">
              Ver todas
            </Link>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {filtroUso || soTesteAcabou
            ? `Mostrando ${contasDaLista.length} conta${contasDaLista.length === 1 ? "" : "s"}: ${[
                soTesteAcabou ? "teste grátis acabou" : null,
                filtroUso ? `"${NIVEL_USO[filtroUso].rotulo}"` : null,
              ]
                .filter(Boolean)
                .join(" e ")}.`
            : `Toque num dos níveis para ver só aquelas contas. ${qtdTesteAcabouSemUsar} conta${qtdTesteAcabouSemUsar === 1 ? "" : "s"} terminou o teste sem cadastrar nada: toque em "Teste acabou" e depois em "Só entrou".`}
        </p>
        {(filtroUso || soTesteAcabou) && contasDaLista.length ? <CopiarLista texto={textoDaLista} quantas={contasDaLista.length} /> : null}
        <p className="text-xs text-muted-foreground">
          Usando = marcou 3 horários ou mais (ou recebeu pelo link) e mexeu nos últimos 3 dias. Configurando = cadastrou serviços ou
          clientes nos últimos 2 dias, mas ainda marca pouco. Parou = mexeu e depois não fez mais nada. Só entrou = não cadastrou nada.
          Só números: ninguém vê os dados das clientes.
        </p>
        <p className="text-xs text-muted-foreground">
          Automático: quem só entrou recebe uma oferta de ajuda 1 dia depois do cadastro, e no último dia do teste vai um pedido de
          feedback (WhatsApp, ou e-mail para quem não deu o número). Das 9h às 20h, uma vez por conta.
        </p>
        <BotaoChamarTodas contas={paraChamar} />
      </section>

      <ListaContas contas={contasDaLista} uso={uso} chamadas={chamadas} />
    </div>
  );
}
