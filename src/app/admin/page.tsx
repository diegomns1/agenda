import type { Metadata } from "next";
import Link from "next/link";
import { STATUS_CONTA, type StatusConta } from "@/lib/constantes";
import { contarPorStatus, listarContas } from "@/features/admin/queries";
import { ListaContas } from "@/features/admin/components/ListaContas";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Contas" };

function ehStatus(v: unknown): v is StatusConta {
  return typeof v === "string" && v in STATUS_CONTA;
}

export default async function PaginaAdmin({ searchParams }: PageProps<"/admin">) {
  const { status } = await searchParams;
  const filtro = ehStatus(status) ? status : undefined;

  const [contas, contagem] = await Promise.all([listarContas(filtro), contarPorStatus()]);
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

      <ListaContas contas={contas} />
    </div>
  );
}
