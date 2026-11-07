"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  EyeIcon,
  EyeOffIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  WandSparklesIcon,
} from "lucide-react";
import {
  adicionarSugeridos,
  alternarAtivoServico,
  excluirServico,
  moverServico,
} from "@/features/servicos/actions";
import { FormServico } from "./FormServico";
import { EstadoVazio } from "@/components/layout/EstadoVazio";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatarDuracao, formatarMoeda } from "@/lib/moeda";
import { cn } from "@/lib/utils";
import type { EstadoForm } from "@/components/formulario/tipos";
import type { Servico } from "@/types/database";

type Dialogo = { modo: "novo" } | { modo: "editar"; servico: Servico } | null;

export function ListaServicos({ servicos }: { servicos: Servico[] }) {
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [excluindo, setExcluindo] = useState<Servico | null>(null);
  const [pendente, iniciar] = useTransition();

  function executar(fn: () => Promise<EstadoForm>) {
    iniciar(async () => {
      const r = await fn();
      if (r.ok && r.mensagem) toast.success(r.mensagem);
      else if (r.erro) toast.error(r.erro);
    });
  }

  const ativos = servicos.filter((s) => s.ativo).length;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {servicos.length === 0
            ? "Nenhum serviço ainda."
            : `${ativos} ativo${ativos === 1 ? "" : "s"} de ${servicos.length}.`}
        </p>
        <Button onClick={() => setDialogo({ modo: "novo" })}>
          <PlusIcon />
          Novo serviço
        </Button>
      </div>

      {servicos.length === 0 ? (
        <EstadoVazio
          Icone={SparklesIcon}
          titulo="Cadastre o que você oferece"
          descricao="Nome, quanto tempo leva e quanto custa. Isso alimenta a agenda e os stories."
        >
          <Button onClick={() => setDialogo({ modo: "novo" })}>
            <PlusIcon />
            Adicionar o primeiro
          </Button>
          <Button variant="outline" disabled={pendente} onClick={() => executar(adicionarSugeridos)}>
            <WandSparklesIcon />
            Usar lista de sugestões
          </Button>
        </EstadoVazio>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {servicos.map((s, i) => (
            <li
              key={s.id}
              className={cn("flex items-center gap-2 px-3 py-3 sm:px-4", !s.ativo && "bg-muted/40")}
            >
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Mover para cima"
                  disabled={pendente || i === 0}
                  onClick={() => executar(() => moverServico(s.id, -1))}
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Mover para baixo"
                  disabled={pendente || i === servicos.length - 1}
                  onClick={() => executar(() => moverServico(s.id, 1))}
                >
                  <ArrowDownIcon />
                </Button>
              </div>

              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setDialogo({ modo: "editar", servico: s })}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("truncate font-medium", !s.ativo && "text-muted-foreground line-through")}>
                    {s.nome}
                  </span>
                  {!s.ativo ? <Badge variant="outline">Inativo</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatarDuracao(s.duracao_min)}
                  {" · "}
                  {s.valor > 0 ? formatarMoeda(s.valor) : "sem valor"}
                </p>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Opções de ${s.nome}`}>
                    <MoreVerticalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDialogo({ modo: "editar", servico: s })}>
                    <PencilIcon />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => executar(() => alternarAtivoServico(s.id, !s.ativo))}>
                    {s.ativo ? <EyeOffIcon /> : <EyeIcon />}
                    {s.ativo ? "Desativar" : "Reativar"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setExcluindo(s)}>
                    <Trash2Icon />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      {servicos.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Toque no serviço para editar. Use as setas para mudar a ordem em que aparecem.
        </p>
      ) : null}

      {/* Novo / editar */}
      <Dialog open={dialogo !== null} onOpenChange={(aberto) => !aberto && setDialogo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogo?.modo === "editar" ? "Editar serviço" : "Novo serviço"}</DialogTitle>
            <DialogDescription>
              {dialogo?.modo === "editar"
                ? "As mudanças valem para os próximos agendamentos."
                : "Informe nome, duração e valor."}
            </DialogDescription>
          </DialogHeader>
          {dialogo ? (
            <FormServico
              key={dialogo.modo === "editar" ? dialogo.servico.id : "novo"}
              servico={dialogo.modo === "editar" ? dialogo.servico : null}
              aoConcluir={() => setDialogo(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={excluindo !== null} onOpenChange={(aberto) => !aberto && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir &quot;{excluindo?.nome}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Se preferir só tirar da lista por um tempo, use &quot;Desativar&quot;. Serviços já usados em
              atendimentos não são apagados, apenas desativados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (excluindo) executar(() => excluirServico(excluindo.id));
                setExcluindo(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
