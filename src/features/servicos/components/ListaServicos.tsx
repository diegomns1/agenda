"use client";

import { useRef, useState, useTransition, type CSSProperties } from "react";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
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
  reordenarServicos,
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

/** Estado visual de um arrasto em andamento (índices na lista exibida). */
type Arrasto = { de: number; para: number; dy: number; altura: number };

export function ListaServicos({ servicos }: { servicos: Servico[] }) {
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [excluindo, setExcluindo] = useState<Servico | null>(null);
  const [pendente, iniciar] = useTransition();

  // Ordem otimista enquanto o servidor salva; descartada quando a lista do servidor chega
  const [servicosAnteriores, setServicosAnteriores] = useState(servicos);
  const [ordemLocal, setOrdemLocal] = useState<Servico[] | null>(null);
  if (servicos !== servicosAnteriores) {
    setServicosAnteriores(servicos);
    setOrdemLocal(null);
  }
  const lista = ordemLocal ?? servicos;

  const ulRef = useRef<HTMLUListElement>(null);
  const arrastoRef = useRef<{ de: number; para: number; inicioY: number; retangulos: DOMRect[] } | null>(null);
  const [arrasto, setArrasto] = useState<Arrasto | null>(null);

  function executar(fn: () => Promise<EstadoForm>) {
    iniciar(async () => {
      const r = await fn();
      if (r.ok && r.mensagem) toast.success(r.mensagem);
      else if (r.erro) toast.error(r.erro);
    });
  }

  // ---- arrastar e soltar (pointer events: funciona com dedo e com mouse) ----
  function iniciarArrasto(e: React.PointerEvent<HTMLButtonElement>, i: number) {
    if (pendente || !ulRef.current) return;
    const retangulos = [...ulRef.current.children].map((el) => el.getBoundingClientRect());
    arrastoRef.current = { de: i, para: i, inicioY: e.clientY, retangulos };
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrasto({ de: i, para: i, dy: 0, altura: retangulos[i].height });
  }

  function moverArrasto(e: React.PointerEvent<HTMLButtonElement>) {
    const a = arrastoRef.current;
    if (!a) return;
    const dy = e.clientY - a.inicioY;
    const r = a.retangulos[a.de];
    const centro = r.top + r.height / 2 + dy;
    // Nova posição = quantos outros itens têm o centro acima do item arrastado
    const para = a.retangulos.filter((x, idx) => idx !== a.de && x.top + x.height / 2 < centro).length;
    a.para = para;
    setArrasto({ de: a.de, para, dy, altura: r.height });
  }

  function soltarArrasto() {
    const a = arrastoRef.current;
    arrastoRef.current = null;
    setArrasto(null);
    if (!a || a.para === a.de) return;
    const nova = [...lista];
    const [item] = nova.splice(a.de, 1);
    nova.splice(a.para, 0, item);
    setOrdemLocal(nova);
    iniciar(async () => {
      const r = await reordenarServicos(nova.map((s) => s.id));
      if (r.erro) {
        toast.error(r.erro);
        setOrdemLocal(null); // volta à ordem do servidor
      }
    });
  }

  function estiloArrasto(i: number): CSSProperties | undefined {
    if (!arrasto) return undefined;
    const { de, para, dy, altura } = arrasto;
    if (i === de) return { transform: `translateY(${dy}px)`, transition: "none", zIndex: 10, position: "relative" };
    if (de < para && i > de && i <= para) return { transform: `translateY(-${altura}px)` };
    if (de > para && i >= para && i < de) return { transform: `translateY(${altura}px)` };
    return undefined;
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
        <ul ref={ulRef} className={cn("divide-y rounded-xl border bg-card", !arrasto && "overflow-hidden")}>
          {lista.map((s, i) => (
            <li
              key={s.id}
              style={estiloArrasto(i)}
              className={cn(
                "flex items-center gap-1 bg-card px-2 py-3 transition-transform sm:px-3",
                !s.ativo && "bg-muted/40",
                arrasto?.de === i && "rounded-xl shadow-xl ring-2 ring-primary/30",
              )}
            >
              <button
                type="button"
                aria-label={`Arrastar ${s.nome} para mudar a ordem`}
                disabled={pendente}
                onPointerDown={(e) => iniciarArrasto(e, i)}
                onPointerMove={moverArrasto}
                onPointerUp={soltarArrasto}
                onPointerCancel={soltarArrasto}
                className={cn(
                  "flex h-toque w-8 shrink-0 touch-none items-center justify-center rounded-md text-muted-foreground",
                  "cursor-grab select-none hover:bg-muted hover:text-foreground active:cursor-grabbing disabled:opacity-50",
                )}
              >
                <GripVerticalIcon className="size-5" />
              </button>

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
                  <DropdownMenuItem disabled={i === 0} onClick={() => executar(() => moverServico(s.id, -1))}>
                    <ArrowUpIcon />
                    Mover para cima
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={i === lista.length - 1} onClick={() => executar(() => moverServico(s.id, 1))}>
                    <ArrowDownIcon />
                    Mover para baixo
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
          Toque no serviço para editar. Para mudar a ordem, segure o ícone ⋮⋮ e arraste.
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
