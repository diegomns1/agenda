"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRightIcon, PlusIcon, UsersIcon } from "lucide-react";
import { IconeWhatsApp } from "@/components/marca/IconeWhatsApp";
import { FormCliente } from "./FormCliente";
import { EstadoVazio } from "@/components/layout/EstadoVazio";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatarTelefone, linkWhatsApp } from "@/lib/telefone";
import { iniciais } from "@/lib/texto";
import type { Cliente } from "@/types/database";

type Props = { clientes: Cliente[]; total: number; busca?: string };

export function ListaClientes({ clientes, total, busca }: Props) {
  const [aberto, setAberto] = useState(false);
  const router = useRouter();

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {busca
            ? `${clientes.length} resultado${clientes.length === 1 ? "" : "s"} para "${busca}"`
            : total === 0
              ? "Nenhum cadastro ainda."
              : `${total} cliente${total === 1 ? "" : "s"}`}
        </p>
        <Button onClick={() => setAberto(true)} className="h-toque px-4 sm:h-9">
          <PlusIcon />
          Novo cadastro
        </Button>
      </div>

      {clientes.length === 0 ? (
        busca ? (
          <EstadoVazio Icone={UsersIcon} titulo="Ninguém com esse nome" descricao="Confira a grafia ou faça um novo cadastro.">
            <Button onClick={() => setAberto(true)} className="h-toque px-4 sm:h-toque">
              <PlusIcon />
              Cadastrar &quot;{busca}&quot;
            </Button>
          </EstadoVazio>
        ) : (
          <EstadoVazio
            Icone={UsersIcon}
            titulo="Sua lista de clientes"
            descricao="Cadastre nome e WhatsApp. Depois, cada atendimento fica registrado no histórico."
          >
            <Button onClick={() => setAberto(true)} className="h-toque px-4 sm:h-toque">
              <PlusIcon />
              Fazer o primeiro cadastro
            </Button>
          </EstadoVazio>
        )
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {clientes.map((c) => (
            <li key={c.id} className="flex items-center gap-3 pr-2 pl-3 sm:pl-4">
              <Link href={`/clientes/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {iniciais(c.nome)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.nome}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {c.telefone ? formatarTelefone(c.telefone) : "sem WhatsApp"}
                  </span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Link>
              {c.telefone ? (
                <Button asChild variant="ghost" size="icon" className="size-toque text-whatsapp sm:size-toque" aria-label={`Abrir WhatsApp de ${c.nome}`}>
                  <a href={linkWhatsApp(c.telefone)} target="_blank" rel="noopener noreferrer">
                    <IconeWhatsApp className="size-5" />
                  </a>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo cadastro</DialogTitle>
            <DialogDescription>Só o nome é obrigatório.</DialogDescription>
          </DialogHeader>
          {aberto ? (
            <FormCliente
              nomeInicial={clientes.length === 0 ? busca : undefined}
              aoConcluir={(id) => {
                setAberto(false);
                if (id) router.push(`/clientes/${id}`);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
