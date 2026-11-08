"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarXIcon, MegaphoneIcon, XIcon } from "lucide-react";
import { dispensarVaga } from "@/features/relatorios/actions";
import type { Vaga } from "@/features/relatorios/vagas";
import { dataDe, formatarData } from "@/lib/datas";
import { Button } from "@/components/ui/button";

function quando(iso: string) {
  return formatarData(iso, "EEE, dd/MM 'às' HH:mm");
}

/** Tela Hoje: "Fulana desmarcou: vagou sexta às 14:00 → Divulgar". */
export function VagasAbertas({ vagas }: { vagas: Vaga[] }) {
  const [escondidas, setEscondidas] = useState<string[]>([]);
  const [, iniciar] = useTransition();
  const visiveis = vagas.filter((v) => !escondidas.includes(v.id));
  if (visiveis.length === 0) return null;

  function dispensar(id: string) {
    setEscondidas((l) => [...l, id]);
    iniciar(async () => {
      const r = await dispensarVaga(id);
      if (r.erro) {
        toast.error(r.erro);
        setEscondidas((l) => l.filter((x) => x !== id));
      }
    });
  }

  return (
    <section className="surgir rounded-2xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
      <h2 className="flex items-center gap-2 font-semibold">
        <CalendarXIcon className="size-4 text-emerald-700 dark:text-emerald-400" />
        {visiveis.length === 1 ? "Vagou um horário" : `Vagaram ${visiveis.length} horários`}
      </h2>
      <p className="text-xs text-muted-foreground">Alguém desmarcou ou remarcou. Que tal divulgar o horário livre?</p>
      <ul className="mt-2 divide-y divide-emerald-200 dark:divide-emerald-900">
        {visiveis.map((v) => (
          <li key={v.id} className="flex items-center gap-2 py-2.5">
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold first-letter:uppercase">{quando(v.inicio)}</p>
              <p className="text-xs text-muted-foreground">
                {v.clienteNome} {v.tipo === "remarcado" && v.novoInicio ? `remarcou para ${quando(v.novoInicio)}` : "desmarcou"}
                {v.servicoNome ? ` · ${v.servicoNome}` : ""}
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0 rounded-full">
              <Link href={`/stories?tipo=dia&data=${dataDe(v.inicio)}`}>
                <MegaphoneIcon />
                Divulgar
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="shrink-0" aria-label="Dispensar aviso" onClick={() => dispensar(v.id)}>
              <XIcon />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
