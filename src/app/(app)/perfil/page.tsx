import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCardIcon } from "lucide-react";
import { obterPerfil } from "@/lib/auth";
import { URL_APP } from "@/lib/constantes";
import { formatarDataISO } from "@/lib/datas";
import { PLANOS, temRecurso } from "@/lib/planos";
import { Button } from "@/components/ui/button";
import { FormPerfil } from "@/features/perfil/components/FormPerfil";
import { UploadLogo } from "@/features/perfil/components/UploadLogo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Perfil" };

export default async function PaginaPerfil() {
  const perfil = await obterPerfil();
  if (!perfil) redirect("/aguardando-aprovacao");

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">Sua marca, seus horários e sua mensagem de lembrete.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sua logo</CardTitle>
          <CardDescription>Aparece nos stories e no topo do app.</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadLogo usuarioId={perfil.id} logoUrl={perfil.logo_url} />
        </CardContent>
      </Card>

      <FormPerfil perfil={perfil} urlBase={URL_APP} podeAgendamentoOnline={temRecurso(perfil.plano, "agendamento_online")} />

      <Card>
        <CardHeader>
          <CardTitle>Assinatura</CardTitle>
          <CardDescription>
            Plano <strong>{PLANOS[perfil.plano].nome}</strong>
            {perfil.ativa_ate ? ` · acesso até ${formatarDataISO(perfil.ativa_ate)}` : perfil.plano === "teste" ? " · período de testes" : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/assinatura">
              <CreditCardIcon />
              Ver plano e mensalidades
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
