import { ExternalLinkIcon } from "lucide-react";
import { formaDePagamento, rotuloStatusCobranca } from "@/features/assinatura/regras";
import { formatarData, formatarDataISO } from "@/lib/datas";
import { PLANOS } from "@/lib/planos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Cobranca } from "@/types/database";

const TOM = {
  ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  aviso: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  erro: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  neutro: "bg-muted text-muted-foreground",
};

export function HistoricoCobrancas({ cobrancas }: { cobrancas: Cobranca[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mensalidades</CardTitle>
        <CardDescription>{cobrancas.length === 0 ? "Nenhuma cobrança ainda." : "Da mais recente para a mais antiga."}</CardDescription>
      </CardHeader>
      {cobrancas.length > 0 ? (
        <CardContent>
          <ul className="divide-y">
            {cobrancas.map((c) => {
              const s = rotuloStatusCobranca(c.status);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {c.plano ? PLANOS[c.plano].nome : "Mensalidade"} · R$ {Number(c.valor).toFixed(2).replace(".", ",")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vence em {formatarDataISO(c.vencimento)}
                      {c.pago_em ? ` · paga em ${formatarData(c.pago_em, "dd/MM/yyyy")}` : ""} · {formaDePagamento(c.forma)}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", TOM[s.tom])}>{s.texto}</span>
                  {c.link && (c.status === "PENDING" || c.status === "OVERDUE") ? (
                    <a href={c.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-4">
                      <ExternalLinkIcon className="size-3.5" />
                      Pagar
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}
