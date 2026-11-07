import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/auth";
import { URL_APP } from "@/lib/constantes";
import { temRecurso } from "@/lib/planos";
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
    </div>
  );
}
