"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ClockIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PLANOS, formatarPreco } from "@/lib/planos";
import { MAXIMO_NO_AVISO, NOVIDADES, type Novidade } from "../conteudo";

/*
 * Aviso que abre quando a profissional entra no painel (17/11/2026). Uma caixa só, com até duas partes:
 *   1. "Seu teste grátis termina em X dias", com o botão de assinar: nos últimos 3 dias do teste,
 *      só na primeira vez que ela entra em cada dia.
 *   2. Novidades do painel: uma vez por novidade (ela vê só o que ainda não viu).
 * O que já foi visto fica guardado no próprio aparelho (localStorage): sem tabela nova. Em outro aparelho o aviso
 * aparece de novo uma vez, o que é aceitável. Se o navegador não deixar guardar, o aviso não abre (melhor não
 * mostrar do que mostrar toda hora).
 */

/** O teste "está acabando" quando faltam estes dias ou menos. */
const AVISAR_FALTANDO = 3;

type Props = {
  usuarioId: string;
  hoje: string; // "AAAA-MM-DD" (Brasília), vindo do servidor
  /** dias que faltam do teste grátis (0 = termina hoje); null se não está no teste */
  diasDeTeste: number | null;
  /** dia em que a conta foi criada ("AAAA-MM-DD"): novidade mais antiga que a conta não é novidade para ela */
  contaCriadaEm: string;
};

const NOME_PLANO = { essencial: "Essencial", profissional: "Profissional", premium: "Premium" } as const;

function ler(chave: string): string | null | undefined {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return undefined; // navegador sem armazenamento (aba anônima restrita, por exemplo)
  }
}

function guardar(chave: string, valor: string) {
  try {
    window.localStorage.setItem(chave, valor);
  } catch {
    /* sem armazenamento: nada a fazer */
  }
}

export function AvisoAoEntrar({ usuarioId, hoje, diasDeTeste, contaCriadaEm }: Props) {
  const pathname = usePathname();
  const [aviso, setAviso] = useState<{ teste: boolean; novidades: Novidade[] } | null>(null);
  const chaveTeste = `vaguinha:aviso-teste:${usuarioId}`;
  const chaveNovidades = `vaguinha:novidades-vistas:${usuarioId}`;

  useEffect(() => {
    // na própria tela de assinatura o aviso só atrapalharia
    if (pathname.startsWith("/assinatura")) return;
    const vistoHoje = ler(chaveTeste);
    const vistas = ler(chaveNovidades);
    if (vistoHoje === undefined || vistas === undefined) return;

    const teste = diasDeTeste !== null && diasDeTeste >= 0 && diasDeTeste <= AVISAR_FALTANDO && vistoHoje !== hoje;
    // novas para ela: depois da última que viu e depois de a conta existir
    const desde = vistas && vistas > contaCriadaEm ? vistas : contaCriadaEm;
    const novidades = NOVIDADES.filter((n) => n.data > desde).slice(0, MAXIMO_NO_AVISO);
    if (!teste && novidades.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- só no navegador dá para saber o que este aparelho já mostrou
    setAviso({ teste, novidades });
    // só ao entrar: trocar de tela não reabre o aviso
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fechar() {
    if (aviso?.teste) guardar(chaveTeste, hoje);
    if (aviso?.novidades.length) guardar(chaveNovidades, NOVIDADES[0].data);
    setAviso(null);
  }

  if (!aviso) return null;
  const dias = diasDeTeste ?? 0;
  const quando = dias === 0 ? "termina hoje" : dias === 1 ? "termina amanhã" : `termina em ${dias} dias`;

  return (
    <Dialog open onOpenChange={(v) => !v && fechar()}>
      <DialogContent className="flex max-h-[88svh] flex-col gap-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {aviso.teste ? <ClockIcon className="size-5 shrink-0 text-primary" aria-hidden /> : <SparklesIcon className="size-5 shrink-0 text-primary" aria-hidden />}
            {aviso.teste ? `Seu teste grátis ${quando}` : "Novidades no Vaguinha"}
          </DialogTitle>
          <DialogDescription>
            {aviso.teste
              ? `Para continuar com a sua agenda, escolha um plano. A partir de ${formatarPreco(PLANOS.essencial.preco).replace("/mês", "")} por mês, por Pix ou cartão, sem fidelidade. Se o teste acabar antes, nada é apagado.`
              : "Veja o que chegou no painel desde a última vez."}
          </DialogDescription>
        </DialogHeader>

        {aviso.novidades.length ? (
          <div className="grid min-h-0 gap-2 overflow-y-auto">
            {aviso.teste ? <p className="text-sm font-semibold">Novidades no painel</p> : null}
            <ul className="grid gap-2">
              {aviso.novidades.map((n) => (
                <li key={n.titulo} className="grid gap-1 rounded-xl border bg-muted/40 p-3">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold">
                    {n.titulo}
                    {n.plano ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-mini font-bold text-primary">{NOME_PLANO[n.plano]}</span> : null}
                  </p>
                  <p className="text-sm text-muted-foreground">{n.texto}</p>
                  {n.acao ? (
                    <Link href={n.acao.href} onClick={fechar} className="w-fit text-sm font-semibold text-primary underline-offset-4 hover:underline">
                      {n.acao.rotulo}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <DialogFooter>
          {aviso.teste ? (
            <>
              <Button variant="outline" onClick={fechar}>
                Agora não
              </Button>
              <Button asChild>
                <Link href="/assinatura" onClick={fechar}>
                  Ver planos e assinar
                </Link>
              </Button>
            </>
          ) : (
            <Button onClick={fechar}>Entendi</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
