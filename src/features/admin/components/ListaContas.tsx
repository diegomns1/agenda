import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { PLANOS } from "@/lib/constantes";
import { formatarData, formatarDataISO } from "@/lib/datas";
import { formatarTelefone } from "@/lib/telefone";
import type { Profile } from "@/types/database";
import { BadgeStatus } from "./BadgeStatus";

export function ListaContas({ contas }: { contas: Profile[] }) {
  if (contas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
        Nenhuma conta aqui.
      </p>
    );
  }

  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {contas.map((c) => (
        <li key={c.id}>
          <Link
            href={`/admin/contas/${c.id}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{c.nome}</span>
                <BadgeStatus status={c.status} />
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {c.email}
                {c.telefone ? ` · ${formatarTelefone(c.telefone)}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {PLANOS[c.plano]}
                {c.ativa_ate ? ` até ${formatarDataISO(c.ativa_ate)}` : ""}
                {" · cadastro em "}
                {formatarData(c.created_at, "dd/MM/yyyy")}
              </p>
            </div>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
