"use client";

import Link from "next/link";
import { useState } from "react";
import { BellIcon, ChevronDownIcon, PhoneOffIcon } from "lucide-react";
import { BotaoLembrarCliente } from "./BotaoLembrarCliente";
import { EstadoVazio } from "@/components/layout/EstadoVazio";
import { dataDe, formatarData, horaDe, rotuloRelativo } from "@/lib/datas";
import { cn } from "@/lib/utils";
import type { LembreteItem } from "@/features/lembretes/queries";
import type { Mensagens } from "@/features/mensagens/modelos";

type Props = {
  pendentes: LembreteItem[];
  avisados: LembreteItem[];
  mensagens: Mensagens;
  destaqueId?: string | null;
};

function Item({ a, mensagens, destaque }: { a: LembreteItem; mensagens: Mensagens; destaque?: boolean }) {
  return (
    <li className={cn("flex flex-wrap items-center gap-3 px-4 py-3", destaque && "bg-primary/5")}>
      <div className="w-16 shrink-0 text-center">
        <p className="text-lg font-semibold tabular-nums leading-tight">{horaDe(a.inicio)}</p>
        <p className="text-mini text-muted-foreground first-letter:uppercase">{rotuloRelativo(dataDe(a.inicio))}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {a.cliente_id ? (
            <Link href={`/clientes/${a.cliente_id}`} className="hover:underline">
              {a.cliente_nome}
            </Link>
          ) : (
            a.cliente_nome
          )}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {a.servico_nome}
          {!a.telefone ? (
            <span className="ml-2 inline-flex items-center gap-1 text-aviso-forte">
              <PhoneOffIcon className="size-3" /> sem WhatsApp
            </span>
          ) : null}
        </p>
      </div>
      {/* no celular o botão vai para uma linha própria, largo: o nome aparece inteiro e o toque fica fácil */}
      <BotaoLembrarCliente agendamento={a} telefone={a.telefone} mensagens={mensagens} tamanho="sm" className="w-full sm:w-auto" />
    </li>
  );
}

export function ListaLembretes({ pendentes, avisados, mensagens, destaqueId }: Props) {
  const [mostrarAvisados, setMostrarAvisados] = useState(false);

  // Agrupa pendentes por dia
  const grupos = new Map<string, LembreteItem[]>();
  for (const a of pendentes) {
    const d = dataDe(a.inicio);
    grupos.set(d, [...(grupos.get(d) ?? []), a]);
  }

  return (
    <div className="grid gap-4">
      {pendentes.length === 0 ? (
        <EstadoVazio
          Icone={BellIcon}
          titulo="Nenhum lembrete pendente"
          descricao="Os atendimentos das próximas 48 horas aparecem aqui até você enviar o lembrete."
        />
      ) : (
        [...grupos.entries()].map(([dia, itens]) => (
          <section key={dia} className="grid gap-2">
            <h2 className="text-sm font-semibold first-letter:uppercase">{formatarData(itens[0].inicio, "EEEE, dd/MM")}</h2>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {itens.map((a) => (
                <Item key={a.id} a={a} mensagens={mensagens} destaque={a.id === destaqueId} />
              ))}
            </ul>
          </section>
        ))
      )}

      {avisados.length > 0 ? (
        <section className="grid gap-2">
          <button
            type="button"
            onClick={() => setMostrarAvisados((x) => !x)}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronDownIcon className={cn("size-4 transition-transform", mostrarAvisados && "rotate-180")} />
            {avisados.length} já avisado{avisados.length === 1 ? "" : "s"}
          </button>
          {mostrarAvisados ? (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card opacity-80">
              {avisados.map((a) => (
                <Item key={a.id} a={a} mensagens={mensagens} destaque={a.id === destaqueId} />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
