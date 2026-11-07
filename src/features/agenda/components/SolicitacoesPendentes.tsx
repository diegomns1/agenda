"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { CheckIcon, HourglassIcon, XIcon } from "lucide-react";
import { alterarStatusAgendamento } from "@/features/agenda/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dataDe, formatarData, horaDe, rotuloRelativo } from "@/lib/datas";
import type { Agendamento } from "@/types/database";

/** Pedidos vindos do link, com Confirmar / Recusar direto na tela Hoje. */
export function SolicitacoesPendentes({ solicitacoes }: { solicitacoes: Agendamento[] }) {
  const [pendente, iniciar] = useTransition();
  if (solicitacoes.length === 0) return null;

  function decidir(id: string, status: "agendado" | "cancelado") {
    iniciar(async () => {
      const r = await alterarStatusAgendamento(id, status);
      if (r.ok) toast.success(status === "agendado" ? "Confirmado! A cliente já pode ser avisada." : "Pedido recusado. O horário ficou livre.");
      else if (r.erro) toast.error(r.erro);
    });
  }

  return (
    <Card className="surgir surgir-atraso-1 rounded-3xl border-amber-300/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HourglassIcon className="size-4 text-amber-600" />
          {solicitacoes.length === 1 ? "1 pedido aguardando sua confirmação" : `${solicitacoes.length} pedidos aguardando sua confirmação`}
        </CardTitle>
        <CardDescription>Vieram pelo seu link de agendamento. O horário já está reservado até você decidir.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {solicitacoes.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <div className="w-16 shrink-0 rounded-xl bg-amber-50 py-1 text-center dark:bg-amber-950">
                <p className="text-lg font-extrabold tabular-nums leading-tight">{horaDe(a.inicio)}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{rotuloRelativo(dataDe(a.inicio))}</p>
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/agenda?visao=dia&data=${dataDe(a.inicio)}`} className="block truncate font-semibold hover:underline">
                  {a.cliente_nome}
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                  {a.servico_nome} · {formatarData(a.inicio, "dd/MM")}
                  {a.observacoes ? ` · "${a.observacoes}"` : ""}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" disabled={pendente} onClick={() => decidir(a.id, "agendado")}>
                  <CheckIcon />
                  Confirmar
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" disabled={pendente} onClick={() => decidir(a.id, "cancelado")} aria-label="Recusar">
                  <XIcon />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
