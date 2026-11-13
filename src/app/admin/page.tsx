import type { Metadata } from "next";
import Link from "next/link";
import { STATUS_CONTA, type StatusConta } from "@/lib/constantes";
import { contarPorStatus, listarContas } from "@/features/admin/queries";
import { ListaContas } from "@/features/admin/components/ListaContas";
import { NIVEL_USO, usoDasContas, type NivelUso } from "@/features/admin/uso";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { BotaoChamarTodas } from "@/features/ativacao/components/BotoesAtivacao";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Contas" };

function ehStatus(v: unknown): v is StatusConta {
  return typeof v === "string" && v in STATUS_CONTA;
}

export default async function PaginaAdmin({ searchParams }: PageProps<"/admin">) {
  const { status } = await searchParams;
  const filtro = ehStatus(status) ? status : undefined;

  const [contas, contagem, uso, { data: envios }] = await Promise.all([
    listarContas(filtro),
    contarPorStatus(),
    usoDasContas(),
    criarClienteAdmin().from("ativacao_envios").select("profissional_id, tipo, canal, enviado_em").eq("ok", true).order("enviado_em", { ascending: false }),
  ]);
  // última chamada de cada conta (mensagem de ativação)
  const chamadas = new Map<string, { tipo: string; canal: string; enviado_em: string }>();
  for (const e of envios ?? []) if (!chamadas.has(e.profissional_id)) chamadas.set(e.profissional_id, e);
  const ajudaRecebida = new Set((envios ?? []).filter((e) => e.tipo === "ajuda_inicio").map((e) => e.profissional_id));
  const paraChamar = contas.filter((c) => c.status === "aprovada" && c.plano === "teste" && uso.get(c.id)?.nivel === "so_entrou" && !ajudaRecebida.has(c.id)).length;
  const porNivel = { usando: 0, configurando: 0, parou: 0, so_entrou: 0 } as Record<NivelUso, number>;
  for (const c of contas) {
    const u = uso.get(c.id);
    if (u && c.status === "aprovada") porNivel[u.nivel]++;
  }
  const total = Object.values(contagem).reduce((a, b) => a + b, 0);

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
              href={f.chave ? `/admin?status=${f.chave}` : "/admin"}
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
          {(Object.keys(NIVEL_USO) as NivelUso[]).map((n) => (
            <span key={n} className={cn("rounded-full px-2.5 py-1 font-semibold", NIVEL_USO[n].tom)} title={NIVEL_USO[n].explica}>
              {NIVEL_USO[n].rotulo} {porNivel[n]}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Usando = marcou 3 horários ou mais nos últimos 3 dias (ou recebeu pelo link). Configurando = cadastrou serviços ou clientes,
          mas ainda marca pouco. Parou = nada nos últimos 3 dias. Só entrou = não cadastrou nada. Só números: ninguém vê os dados das clientes.
        </p>
        <p className="text-xs text-muted-foreground">
          Automático: quem só entrou recebe uma oferta de ajuda 1 dia depois do cadastro, e no último dia do teste vai um pedido de
          feedback (WhatsApp, ou e-mail para quem não deu o número). Das 9h às 20h, uma vez por conta.
        </p>
        <BotaoChamarTodas quantas={paraChamar} />
      </section>

      <ListaContas contas={contas} uso={uso} chamadas={chamadas} />
    </div>
  );
}
