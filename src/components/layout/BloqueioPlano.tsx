import Link from "next/link";
import { LockIcon, SparklesIcon } from "lucide-react";
import { formatarPreco, PLANOS, planoNecessario, type Plano, type Recurso } from "@/lib/planos";
import { linkWhatsApp } from "@/lib/telefone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  recurso: Recurso;
  planoAtual: Plano | string;
  titulo: string;
  descricao: string;
  /** Lista curta do que a pessoa ganha ao subir de plano. */
  beneficios?: string[];
};

/** Tela mostrada quando o plano da profissional não inclui o recurso. */
export function BloqueioPlano({ recurso, planoAtual, titulo, descricao, beneficios = [] }: Props) {
  const necessario = planoNecessario(recurso);
  const atual = PLANOS[planoAtual as Plano]?.nome ?? planoAtual;
  const suporte = process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP;
  const mensagem = `Olá! Quero mudar meu plano do Vaguinha para o ${necessario.nome}.`;

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </div>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockIcon className="size-4 text-primary" />
            Disponível no plano {necessario.nome}
          </CardTitle>
          <CardDescription>
            Seu plano atual é o <strong>{atual}</strong>. O {necessario.nome} custa {formatarPreco(necessario.preco)} e inclui:
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {beneficios.length ? (
            <ul className="grid gap-2 text-sm">
              {beneficios.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {suporte ? (
              <Button asChild>
                <a href={linkWhatsApp(suporte, mensagem)} target="_blank" rel="noopener noreferrer">
                  Quero mudar de plano
                </a>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/perfil">Ver meu plano</Link>
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link href="/">Voltar</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Em breve a troca de plano será feita aqui mesmo, pelo painel.</p>
        </CardContent>
      </Card>
    </div>
  );
}
