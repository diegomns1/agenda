import Link from "next/link";
import { CalendarIcon } from "lucide-react";
import { STATUS_AGENDAMENTO } from "@/features/agenda/schema";
import { EstadoVazio } from "@/components/layout/EstadoVazio";
import { dataDe, formatarData, horaDe } from "@/lib/datas";
import { formatarMoeda } from "@/lib/moeda";
import { cn } from "@/lib/utils";
import type { Agendamento } from "@/types/database";

export function HistoricoCliente({ historico }: { historico: Agendamento[] }) {
  if (historico.length === 0) {
    return (
      <EstadoVazio
        Icone={CalendarIcon}
        titulo="Nenhum atendimento registrado"
        descricao="Os atendimentos marcados na agenda vão aparecer aqui, do mais recente para o mais antigo."
      />
    );
  }

  const concluidos = historico.filter((a) => a.status === "concluido");
  const total = concluidos.reduce((s, a) => s + (a.valor ?? 0), 0);

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        {concluidos.length} concluído{concluidos.length === 1 ? "" : "s"}
        {total > 0 ? ` · ${formatarMoeda(total)} no total` : ""}
      </p>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {historico.map((a) => {
          const st = STATUS_AGENDAMENTO[a.status];
          return (
            <li key={a.id}>
              <Link
                href={`/agenda?visao=dia&data=${dataDe(a.inicio)}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
              >
                <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-muted py-1 text-center leading-tight">
                  <span className="text-mini uppercase text-muted-foreground">{formatarData(a.inicio, "MMM")}</span>
                  <span className="text-lg font-semibold">{formatarData(a.inicio, "dd")}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.servico_nome ?? "Atendimento"}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatarData(a.inicio, "yyyy")} · {horaDe(a.inicio)}
                    {a.valor ? ` · ${formatarMoeda(a.valor)}` : ""}
                  </p>
                </div>
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium", st.cor)}>{st.rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
