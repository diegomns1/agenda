"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { CheckIcon, ChevronDownIcon, PencilLineIcon } from "lucide-react";
import { marcarClienteAvisada } from "@/features/lembretes/actions";
import { linkMensagem } from "@/features/lembretes/mensagem";
import { SITUACOES, type Mensagens, type TipoMensagem } from "@/features/mensagens/modelos";
import { IconeWhatsApp } from "@/components/marca/IconeWhatsApp";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { linkWhatsApp } from "@/lib/telefone";
import type { Agendamento } from "@/types/database";

type Props = {
  agendamento: Pick<Agendamento, "id" | "inicio" | "fim" | "valor" | "status" | "cliente_nome" | "servico_nome" | "cliente_avisada_em">;
  telefone: string;
  mensagens: Mensagens;
  className?: string;
};

/** Quais mensagens fazem sentido em cada situação do atendimento (a primeira é a mais provável). */
function opcoes(a: Props["agendamento"]): TipoMensagem[] {
  if (a.status === "cancelado") return ["cancelamento"];
  if (a.status === "concluido") return ["agradecimento"];
  if (a.status === "faltou") return ["remarcacao"];
  const passou = new Date(a.fim).getTime() < Date.now();
  return passou ? ["agradecimento", "lembrete"] : ["lembrete", "confirmacao", "remarcacao", "cancelamento"];
}

/**
 * "Mandar mensagem": abre o WhatsApp de quem vem com o modelo escolhido já preenchido.
 * O lembrete também marca o atendimento como "avisado" (some da lista de Lembretes).
 */
export function MenuMensagens({ agendamento: a, telefone, mensagens, className }: Props) {
  const [, iniciar] = useTransition();
  const avisada = Boolean(a.cliente_avisada_em);

  function aoEnviar(tipo: TipoMensagem) {
    if (tipo !== "lembrete" || avisada) return;
    iniciar(async () => {
      const r = await marcarClienteAvisada(a.id, true);
      if (r.ok && r.mensagem) toast.success(r.mensagem);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>
          <IconeWhatsApp className="size-4 text-whatsapp" />
          Mandar mensagem
          <ChevronDownIcon className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Abre o WhatsApp com o texto pronto</DropdownMenuLabel>
        {opcoes(a).map((tipo) => (
          <DropdownMenuItem key={tipo} asChild className="min-h-toque gap-2.5 text-destaque">
            <a
              href={linkMensagem(telefone, mensagens.modelos[tipo], a, mensagens.contexto)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => aoEnviar(tipo)}
            >
              <span aria-hidden>{SITUACOES[tipo].emoji}</span>
              {SITUACOES[tipo].rotulo}
              {tipo === "lembrete" && avisada ? <CheckIcon className="ml-auto size-4 text-sucesso-forte" aria-label="já enviado" /> : null}
            </a>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem asChild className="min-h-toque gap-2.5 text-destaque">
          <a href={linkWhatsApp(telefone)} target="_blank" rel="noopener noreferrer">
            <span aria-hidden>💬</span>
            Conversa em branco
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-toque gap-2.5 text-sm text-muted-foreground">
          <Link href="/mensagens">
            <PencilLineIcon className="size-4" />
            Editar os textos
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
