import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClockIcon, BanIcon, PauseCircleIcon, CalendarXIcon, AlertTriangleIcon } from "lucide-react";
import { obterPerfil, situacaoDaConta, type SituacaoConta } from "@/lib/auth";
import { formatarDataISO } from "@/lib/datas";
import { linkWhatsApp } from "@/lib/telefone";
import { SUPORTE_WHATSAPP } from "@/lib/constantes";
import { BotaoSair } from "@/features/auth/components/BotaoSair";
import { aprovacaoAutomatica, aprovarTesteAutomatico } from "@/features/auth/aprovacao";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Situação da conta" };

const TEXTOS: Record<
  Exclude<SituacaoConta, "aprovada">,
  { titulo: string; texto: string; Icone: typeof ClockIcon }
> = {
  pendente: {
    titulo: "Cadastro recebido. Falta a liberação",
    texto:
      "Uma pessoa confere cada conta antes de liberar. Você recebe um e-mail quando a sua estiver pronta, e os 3 dias grátis começam nesse dia. Enquanto isso, vá separando a lista dos seus serviços com valores e duração, e a sua logo: é o primeiro passo depois de entrar.",
    Icone: ClockIcon,
  },
  recusada: {
    titulo: "Cadastro não aprovado",
    texto: "Não foi possível aprovar sua conta neste momento.",
    Icone: BanIcon,
  },
  suspensa: {
    titulo: "Conta suspensa",
    texto: "O acesso à sua agenda está suspenso temporariamente.",
    Icone: PauseCircleIcon,
  },
  vencida: {
    titulo: "Assinatura vencida",
    texto: "O período da sua assinatura terminou. Renove para continuar usando a agenda.",
    Icone: CalendarXIcon,
  },
  sem_perfil: {
    titulo: "Conta incompleta",
    texto: "Não encontramos os dados da sua conta. Fale com o suporte para resolver.",
    Icone: AlertTriangleIcon,
  },
};

export default async function PaginaAguardandoAprovacao() {
  const perfil = await obterPerfil();
  const situacao = situacaoDaConta(perfil);

  if (situacao === "aprovada") redirect("/");
  // Conta nova no teste grátis: libera sozinha na primeira entrada (ver features/auth/aprovacao.ts)
  if (situacao === "pendente" && (await aprovarTesteAutomatico(perfil))) redirect("/");

  const testeAcabou = situacao === "vencida" && perfil?.plano === "teste";
  const { titulo, texto, Icone } = testeAcabou
    ? {
        titulo: "Seu teste grátis terminou",
        texto: "Gostou? Escolha um plano para continuar usando a agenda. Seus clientes, serviços e horários continuam guardados.",
        Icone: TEXTOS.vencida.Icone,
      }
    : situacao === "pendente" && aprovacaoAutomatica()
      ? {
          // só aparece se a liberação automática falhou ou a conta não é de teste
          titulo: "Falta pouco para liberar sua conta",
          texto: "Não conseguimos liberar sua conta sozinhos desta vez. Toque em Falar com o suporte que a gente resolve rapidinho.",
          Icone: ClockIcon,
        }
      : TEXTOS[situacao];
  const suporte = SUPORTE_WHATSAPP;
  const motivo =
    (situacao === "recusada" || situacao === "suspensa") && perfil?.status_motivo
      ? perfil.status_motivo
      : null;

  return (
    <div className="grid gap-5 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icone className="size-7" />
      </div>
      <div>
        <h1 className="text-xl font-semibold">{titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
        {motivo ? (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="font-medium">Motivo:</span> {motivo}
          </p>
        ) : null}
        {situacao === "vencida" && perfil?.ativa_ate ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {testeAcabou ? "Teste válido até" : "Válida até"} {formatarDataISO(perfil.ativa_ate)}.
          </p>
        ) : null}
      </div>

      {perfil?.email ? (
        <p className="text-xs text-muted-foreground">Conta: {perfil.email}</p>
      ) : null}

      <div className="grid gap-2">
        {situacao === "vencida" ? (
          <Button asChild size="lg" className="h-toque sm:h-toque">
            <Link href="/assinatura">{testeAcabou ? "Escolher meu plano" : "Renovar agora"}</Link>
          </Button>
        ) : null}
        {suporte ? (
          <Button asChild size="lg" variant={situacao === "vencida" ? "outline" : "default"} className="h-toque sm:h-toque">
            <a
              href={linkWhatsApp(suporte, `Olá! Sou ${perfil?.nome ?? ""} e preciso de ajuda com minha conta.`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Falar com o suporte
            </a>
          </Button>
        ) : null}
        <div className="flex justify-center">
          <BotaoSair variante="outline" />
        </div>
      </div>
    </div>
  );
}
