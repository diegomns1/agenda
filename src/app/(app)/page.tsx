import type { Metadata } from "next";
import { CheckCircle2Icon } from "lucide-react";
import { obterPerfil } from "@/lib/auth";
import { PLANOS } from "@/lib/constantes";
import { formatarDataISO } from "@/lib/datas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Hoje" };

const PROXIMOS_MODULOS = [
  "Perfil (nome, logo, cores e contato)",
  "Serviços e valores",
  "Clientes",
  "Agenda do dia, semana e mês",
  "Lembretes automáticos",
  "Stories prontos para o Instagram",
];

export default async function PaginaHoje() {
  const perfil = await obterPerfil();
  const primeiroNome = perfil?.nome.split(" ")[0] ?? "";

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {primeiroNome}!</h1>
        <p className="text-sm text-muted-foreground">Sua conta está ativa.</p>
      </div>

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
