import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2Icon, ChevronRightIcon, UserRoundPenIcon } from "lucide-react";
import { obterPerfil } from "@/lib/auth";
import { PLANOS } from "@/lib/constantes";
import { formatarDataISO } from "@/lib/datas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Hoje" };

const PROXIMOS_MODULOS = [
  "Clientes",
  "Agenda do dia, semana e mês",
  "Lembretes automáticos",
  "Stories prontos para o Instagram",
];

export default async function PaginaHoje() {
  const perfil = await obterPerfil();
  const primeiroNome = perfil?.nome.split(" ")[0] ?? "";
  const perfilIncompleto = !perfil?.nome_negocio || !perfil?.logo_url || !perfil?.telefone;

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {primeiroNome}!</h1>
        <p className="text-sm text-muted-foreground">Sua conta está ativa.</p>
      </div>

      {perfilIncompleto ? (
        <Link
          href="/perfil"
          className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 transition-colors hover:bg-primary/10"
        >
          <UserRoundPenIcon className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Complete seu perfil</p>
            <p className="text-sm text-muted-foreground">Logo, nome do negócio, WhatsApp e horários.</p>
          </div>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2Icon className="size-4 text-emerald-600" />
            Conta aprovada
          </CardTitle>
          <CardDescription>
            Plano <Badge variant="secondary">{PLANOS[perfil?.plano ?? "teste"]}</Badge>
            {perfil?.ativa_ate ? ` · válida até ${formatarDataISO(perfil.ativa_ate)}` : " · sem data de término"}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Em construção</CardTitle>
          <CardDescription>Os próximos módulos chegam em breve, nesta ordem:</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            {PROXIMOS_MODULOS.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
